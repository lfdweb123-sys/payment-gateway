import { log, logRequest, logError } from '../logs/logger.js';
import { validatePhone } from '../../src/services/phoneValidator.js';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:   (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

/* ─── Rate limiting ──────────────────────────────────────────────────────── */
const requestCounts = new Map();
const MAX_REQUESTS  = 30;
const WINDOW_MS     = 60 * 1000;

function checkRateLimit(apiKey) {
  const now  = Date.now();
  const key  = apiKey || 'anonymous';
  if (!requestCounts.has(key)) requestCounts.set(key, []);
  const timestamps = requestCounts.get(key).filter(t => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) return { allowed: false };
  timestamps.push(now);
  requestCounts.set(key, timestamps);
  return { allowed: true };
}

/* ─── safeFetch ──────────────────────────────────────────────────────────── */
async function safeFetch(url, options) {
  const res  = await fetch(url, options);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    console.error(`Non-JSON from ${url} (${res.status}):`, text.substring(0, 200));
    return { ok: false, status: res.status, data: { message: `Invalid response (HTTP ${res.status})` } };
  }
}

/* ─── Commission 1% vers compte propriétaire ────────────────────────────── */
async function sendCommissionToOwner(commission) {
  const token   = process.env.OWNER_FEEXPAY_TOKEN;
  const shopId  = process.env.OWNER_FEEXPAY_SHOP_ID;
  const phone   = process.env.OWNER_FEEXPAY_PHONE;
  const network = process.env.OWNER_FEEXPAY_NETWORK || 'mtn';
  if (!token || !shopId || !phone) { console.warn('Commission owner config manquante'); return null; }
  if (commission < 100) { console.info(`Commission ${commission} XOF < 100 minimum`); return null; }
  const endpointMap = { mtn: 'mtn', moov: 'moov', celtiis: 'celtiis_bj' };
  const { ok, data } = await safeFetch(
    `https://api.feexpay.me/api/transactions/public/payout/${endpointMap[network] || 'mtn'}`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop: shopId, amount: Math.round(commission), phoneNumber: phone, description: 'Commission passerelle 1%' }),
    }
  );
  if (!ok) { console.error('Erreur envoi commission:', data); return null; }
  return data.reference || data.id || 'ok';
}

/* ─── PROVIDER CALLS ─────────────────────────────────────────────────────── */
const PROVIDER_CALLS = {

  // ══════════════════════════════════════════════════════════════════════
  // AGRÉGATEURS AFRIQUE DE L'OUEST
  // ══════════════════════════════════════════════════════════════════════

  feexpay: async (config, { amount, phone, method, description }) => {
    const endpoints = {
      mtn_money:     'https://api.feexpay.me/api/transactions/public/requesttopay/mtn',
      moov_money:    'https://api.feexpay.me/api/transactions/public/requesttopay/moov',
      celtiis_money: 'https://api.feexpay.me/api/transactions/public/requesttopay/celtiis_bj',
      wallet:        'https://api.feexpay.me/api/transactions/public/requesttopay/coris',
      coris:         'https://api.feexpay.me/api/transactions/public/requesttopay/coris',
      mtn_ci:        'https://api.feexpay.me/api/transactions/public/requesttopay/mtn_ci',
      moov_ci:       'https://api.feexpay.me/api/transactions/public/requesttopay/moov_ci',
      wave_ci:       'https://api.feexpay.me/api/transactions/public/requesttopay/wave_ci',
      orange_ci:     'https://api.feexpay.me/api/transactions/public/requesttopay/orange_ci',
      orange_sn:     'https://api.feexpay.me/api/transactions/public/requesttopay/orange_sn',
      wave_sn:       'https://api.feexpay.me/api/transactions/public/requesttopay/wave_sn',
      free_sn:       'https://api.feexpay.me/api/transactions/public/requesttopay/free_sn',
      mtn_cg:        'https://api.feexpay.me/api/transactions/public/requesttopay/mtn_cg',
      togocom_money: 'https://api.feexpay.me/api/transactions/public/requesttopay/togocom_tg',
      moov_tg:       'https://api.feexpay.me/api/transactions/public/requesttopay/moov_tg',
      orange_money:  'https://api.feexpay.me/api/transactions/public/requesttopay/orange',
      wave_money:    'https://api.feexpay.me/api/transactions/public/requesttopay/wave',
      free_money:    'https://api.feexpay.me/api/transactions/public/requesttopay/free_sn',
    };
    const url = endpoints[method] || endpoints.mtn_money;
    const { ok, data } = await safeFetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.FEEXPAY_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop:        config.FEEXPAY_SHOP_ID,
        amount:      Math.round(amount),
        phoneNumber: phone,
        description: (description || 'Paiement').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 50),
      }),
    });
    if (!ok) return { success: false, error: data.message || 'Erreur FeexPay' };
    return { success: true, reference: data.reference, url: data.payment_url || null, status: data.status || 'PENDING', provider: 'feexpay' };
  },

  kkiapay: async (config, { amount, phone, email }) => {
    // KKiaPay : pas d'API REST serveur — widget uniquement
    // On retourne une URL vers le widget hébergé
    const params = new URLSearchParams({
      amount:   String(Math.round(amount)),
      key:      config.KKIAPAY_PUBLIC_KEY,
      callback: `${process.env.VITE_APP_URL}/success`,
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(config.KKIAPAY_SANDBOX === 'true' ? { sandbox: 'true' } : {}),
    });
    return {
      success:   true,
      reference: `kkia-${Date.now()}`,
      url:       `https://widget.kkiapay.me/?${params.toString()}`,
      status:    'pending',
      provider:  'kkiapay',
    };
  },

  cinetpay: async (config, { amount, phone, email, description, method }) => {
    const channel = method === 'card' ? 'CREDIT_CARD' : 'MOBILE_MONEY';
    const { ok, data } = await safeFetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey:                config.CINETPAY_API_KEY,
        site_id:               config.CINETPAY_SITE_ID,
        transaction_id:        `GW-${Date.now()}`,
        amount:                Math.round(amount),
        currency:              'XOF',
        description:           (description || 'Paiement').replace(/[#/$_&]/g, '').substring(0, 200),
        channels:              channel,
        notify_url:            `${process.env.VITE_APP_URL}/api/webhook/cinetpay`,
        return_url:            `${process.env.VITE_APP_URL}/success`,
        customer_name:         'Client',
        customer_email:        email || 'client@email.com',
        customer_phone_number: phone || '',
        lang:                  'FR',
      }),
    });
    if (!ok || data.code !== '201') return { success: false, error: data.message || data.description };
    return { success: true, reference: data.data?.payment_token, url: data.data?.payment_url, status: 'pending', provider: 'cinetpay' };
  },

  hub2: async (config, { amount, phone, email, currency, country }) => {
    const headers = {
      'ApiKey':       config.HUB2_API_KEY,
      'MerchantId':   config.HUB2_MERCHANT_ID,
      'Environment':  config.HUB2_ENV || 'live',
      'Content-Type': 'application/json',
    };
    const { ok: ok1, data: pi } = await safeFetch('https://api.hub2.io/payment-intents', {
      method: 'POST', headers,
      body: JSON.stringify({
        customerReference: phone || email || `cust-${Date.now()}`,
        purchaseReference: `GW-${Date.now()}`,
        amount:    Math.round(amount),
        currency:  currency || 'XOF',
      }),
    });
    if (!ok1 || !pi.id) return { success: false, error: pi.message || 'Hub2: PaymentIntent ID manquant' };
    const { ok: ok2, data: attempt } = await safeFetch(
      `https://api.hub2.io/payment-intents/${pi.id}/payments`,
      {
        method: 'POST', headers,
        body: JSON.stringify({
          token:         pi.token,
          paymentMethod: 'mobile_money',
          country:       (country || 'CI').toUpperCase(),
          provider:      'mtn',
          mobileMoney:   { msisdn: phone },
        }),
      }
    );
    if (!ok2) return { success: false, error: attempt.message };
    return { success: true, reference: pi.id, url: attempt.nextAction?.data?.url || null, status: 'pending', provider: 'hub2' };
  },

  fedapay: async (config, { amount, email, phone, description, country }) => {
    const base    = config.FEDAPAY_ENV === 'sandbox' ? 'https://sandbox-api.fedapay.com/v1' : 'https://api.fedapay.com/v1';
    const headers = { 'Authorization': `Bearer ${config.FEDAPAY_SECRET_KEY}`, 'Content-Type': 'application/json' };
    const { ok: ok1, data: tx } = await safeFetch(`${base}/transactions`, {
      method: 'POST', headers,
      body: JSON.stringify({
        amount:       Math.round(amount),
        currency:     { iso: 'XOF' },
        description:  (description || 'Paiement').substring(0, 200),
        callback_url: `${process.env.VITE_APP_URL}/success`,
        customer: {
          email:        email || 'client@email.com',
          ...(phone ? { phone_number: { number: phone, country: country || 'bj' } } : {}),
        },
      }),
    });
    if (!ok1) return { success: false, error: tx.message };
    const txId = tx['v1/transaction']?.id || tx.id;
    if (!txId) return { success: false, error: 'FedaPay: ID transaction manquant' };
    const { ok: ok2, data: tokenData } = await safeFetch(`${base}/transactions/${txId}/token`, { method: 'POST', headers });
    if (!ok2) return { success: false, error: tokenData.message };
    return { success: true, reference: String(txId), url: tokenData.url || null, status: 'pending', provider: 'fedapay' };
  },

  qosic: async (config, { amount, phone, country, method }) => {
    const credentials = Buffer.from(`${config.QOSIC_CLIENT_ID}:${config.QOSIC_PASSWORD}`).toString('base64');
    // Endpoint selon opérateur et pays
    let endpoint = '/QosicBridge/user/requestpayment';
    if (method === 'moov_money' && country === 'tg') endpoint = '/QosicBridge/tg/v1/requestpayment';
    else if (method === 'moov_money') endpoint = '/QosicBridge/user/requestpaymentmv';
    else if (method === 'celtiis_money') endpoint = '/QosicBridge/sb/v1/requestpayment';
    const baseUrl = config.QOSIC_BASE_URL || 'https://www.qosic.net';
    const { ok, data } = await safeFetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msisdn:    phone,
        amount:    String(Math.round(amount)),
        transref:  `GW-${Date.now()}`,
        clientid:  config.QOSIC_CLIENT_ID,
        firstname: '',
        lastname:  '',
      }),
    });
    if (!ok || data.responsecode !== '01') return { success: false, error: data.responsemsg || data.message || 'Erreur Qosic' };
    return { success: true, reference: data.serviceref || `GW-${Date.now()}`, status: 'pending', provider: 'qosic' };
  },

  lygos: async (config, { amount, description }) => {
    const orderId = `GW-${Date.now()}`;
    const { ok, data } = await safeFetch('https://api.lygosapp.com/v1/gateway', {
      method: 'POST',
      headers: { 'api-key': config.LYGOS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:      Math.round(amount),
        shop_name:   config.LYGOS_SHOP_NAME || 'Ma Boutique',
        message:     (description || 'Paiement').substring(0, 200),
        success_url: `${process.env.VITE_APP_URL}/success`,
        failure_url: `${process.env.VITE_APP_URL}/cancel`,
        order_id:    orderId,
      }),
    });
    if (!ok) return { success: false, error: data.message || data.detail || 'Erreur Lygos' };
    return { success: true, reference: data.order_id || orderId, url: data.link || null, status: 'pending', provider: 'lygos' };
  },

  bizao: async (config, { amount, currency, country, method, description }) => {
    const OPERATOR_MAP = { mtn_money: 'orange', moov_money: 'moov', orange_money: 'orange', card: null };
    const COUNTRY_MAP  = { bj: 'BJ', ci: 'CI', sn: 'SN', cm: 'CM', bf: 'BF', ml: 'ML', gn: 'GN', ne: 'NE', cd: 'CD', cg: 'CG', ga: 'GA' };
    const isCard = method === 'card';
    const orderId = `GW-${Date.now()}`;
    const countryCode = COUNTRY_MAP[country] || 'CI';
    const operator    = OPERATOR_MAP[method] || 'orange';
    const body = JSON.stringify({
      order_id:    orderId,
      amount:      String(Math.round(amount)),
      currency:    currency || 'XOF',
      reference:   orderId,
      state:       orderId,
      return_url:  `${process.env.VITE_APP_URL}/success`,
      cancel_url:  `${process.env.VITE_APP_URL}/cancel`,
      notif_url:   `${process.env.VITE_APP_URL}/api/webhook/bizao`,
      description: (description || 'Paiement').substring(0, 100),
    });
    const url = isCard
      ? 'https://api.www.bizao.com/debitCard/v2'
      : 'https://api.www.bizao.com/mobilemoney/v1';
    const headers = {
      'Authorization': `Bearer ${config.BIZAO_TOKEN}`,
      'Content-Type':  'application/json',
      'country-code':  countryCode,
      'lang':          'fr',
      ...(!isCard ? {
        'operator':    operator,
        'channel':     'web',
        'bizao-alias': config.BIZAO_ALIAS || '',
        'bizao-token': config.BIZAO_TOKEN2 || config.BIZAO_TOKEN,
      } : {}),
    };
    const { ok, data } = await safeFetch(url, { method: 'POST', headers, body });
    if (!ok) return { success: false, error: data.message || 'Erreur Bizao' };
    return { success: true, reference: orderId, url: data.payment_url || null, status: 'pending', provider: 'bizao' };
  },

  paydunya: async (config, { amount, email, phone, description }) => {
    const base = config.PAYDUNYA_SANDBOX === 'true'
      ? 'https://app.paydunya.com/sandbox-api/v1'
      : 'https://app.paydunya.com/api/v1';
    const { ok, data } = await safeFetch(`${base}/checkout-invoice/create`, {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'PAYDUNYA-MASTER-KEY':  config.PAYDUNYA_MASTER_KEY,
        'PAYDUNYA-PRIVATE-KEY': config.PAYDUNYA_PRIVATE_KEY,
        'PAYDUNYA-TOKEN':       config.PAYDUNYA_TOKEN,
      },
      body: JSON.stringify({
        invoice: {
          total_amount: Math.round(amount),
          description:  (description || 'Paiement').substring(0, 200),
          customer:     { email: email || '', phone: phone || '' },
        },
        store:   { name: config.PAYDUNYA_STORE_NAME || 'Ma Boutique' },
        actions: {
          cancel_url:   `${process.env.VITE_APP_URL}/cancel`,
          return_url:   `${process.env.VITE_APP_URL}/success`,
          callback_url: `${process.env.VITE_APP_URL}/api/webhook/paydunya`,
        },
      }),
    });
    if (data.response_code !== '00') return { success: false, error: data.response_text || 'Erreur PayDunya' };
    return { success: true, reference: data.token, url: data.response_text, status: 'pending', provider: 'paydunya' };
  },

  mbiyopay: async (config, { amount, phone, currency, country, method }) => {
    const NETWORK_MAP = {
      mtn_money: 'mtn', moov_money: 'moov', orange_money: 'orange',
      celtiis_money: 'celtiis', wave_money: 'wave', free_money: 'free',
      togocom_money: 'togocom', airtel_money: 'airtel', mpesa: 'mpesa',
      afrimoney: 'afrimoney', coris: 'coris', qmoney: 'qmoney',
    };
    const { ok, data } = await safeFetch('https://dashboard.mbiyo.africa/api/v1/merchant/payin', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.MBIYOPAY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:         parseFloat(amount),
        currency:       currency || 'XOF',
        payment_method: 'mobile_money',
        order_id:       `GW-${Date.now()}`,
        callback_url:   `${process.env.VITE_APP_URL}/api/webhook/mbiyopay`,
        metadata: {
          network:      NETWORK_MAP[method] || 'mtn',
          phone_number: phone,
          country_code: (country || 'bj').toUpperCase(),
        },
      }),
    });
    if (!ok || data.status === 'error') return { success: false, error: typeof data.message === 'string' ? data.message : JSON.stringify(data.message) };
    return { success: true, reference: data.data?.transaction_id, url: data.data?.redirect_url || null, status: 'pending', provider: 'mbiyopay' };
  },

  // ══════════════════════════════════════════════════════════════════════
  // MOBILE MONEY DIRECT (OPÉRATEURS)
  // ══════════════════════════════════════════════════════════════════════

  wave: async (config, { amount, description }) => {
    const crypto = await import('crypto');
    const body   = JSON.stringify({
      amount:      String(Math.round(amount)),
      currency:    'XOF',
      error_url:   `${process.env.VITE_APP_URL}/cancel`,
      success_url: `${process.env.VITE_APP_URL}/success`,
      ...(description ? { client_reference: description.substring(0, 255) } : {}),
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const sig = crypto.default.createHmac('sha256', config.WAVE_SIGNING_SECRET)
      .update(`${timestamp}${body}`).digest('hex');
    const { ok, data } = await safeFetch('https://api.wave.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${config.WAVE_API_KEY}`,
        'Wave-Signature': `t=${timestamp},v1=${sig}`,
        'Content-Type':   'application/json',
      },
      body,
    });
    if (!ok) return { success: false, error: data.message || 'Erreur Wave' };
    return { success: true, reference: data.id, url: data.wave_launch_url, status: 'pending', provider: 'wave' };
  },

  mtn: async (config, { amount, phone, currency }) => {
    const crypto  = await import('crypto');
    const sandbox = config.MTN_SANDBOX !== 'false';
    const baseUrl = sandbox ? 'https://sandbox.momodeveloper.mtn.com' : 'https://proxy.momoapi.mtn.com';
    const env     = sandbox ? 'sandbox' : 'production';
    const creds   = Buffer.from(`${config.MTN_API_USER}:${config.MTN_API_KEY}`).toString('base64');
    const { ok: authOk, data: authData } = await safeFetch(`${baseUrl}/collection/token/`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Ocp-Apim-Subscription-Key': config.MTN_SUBSCRIPTION_KEY },
    });
    if (!authOk) return { success: false, error: 'MTN MoMo: erreur auth' };
    const referenceId = crypto.default.randomUUID();
    const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization':           `Bearer ${authData.access_token}`,
        'Ocp-Apim-Subscription-Key': config.MTN_SUBSCRIPTION_KEY,
        'X-Reference-Id':          referenceId,
        'X-Target-Environment':    env,
        'X-Callback-Url':          `${process.env.VITE_APP_URL}/api/webhook/mtn`,
        'Content-Type':            'application/json',
      },
      body: JSON.stringify({
        amount:       String(Math.round(amount)),
        currency:     currency || 'EUR',
        externalId:   referenceId,
        payer:        { partyIdType: 'MSISDN', partyId: phone },
        payerMessage: 'Paiement',
        payeeNote:    'Paiement',
      }),
    });
    if (res.status !== 202) return { success: false, error: `MTN MoMo HTTP ${res.status}` };
    return { success: true, reference: referenceId, url: null, status: 'pending', provider: 'mtn' };
  },

  mpesa: async (config, { amount, phone, description }) => {
    const sandbox  = config.MPESA_SANDBOX !== 'false';
    const baseUrl  = sandbox ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';
    const creds    = Buffer.from(`${config.MPESA_CONSUMER_KEY}:${config.MPESA_CONSUMER_SECRET}`).toString('base64');
    const { ok: authOk, data: authData } = await safeFetch(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { method: 'GET', headers: { 'Authorization': `Basic ${creds}` } }
    );
    if (!authOk) return { success: false, error: 'M-Pesa: erreur auth' };
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14);
    const password  = Buffer.from(`${config.MPESA_SHORTCODE}${config.MPESA_PASSKEY}${timestamp}`).toString('base64');
    let p = (phone || '').replace(/\s+/g, '').replace(/^\+/, '');
    if (p.startsWith('0')) p = '254' + p.substring(1);
    if (p.startsWith('7') || p.startsWith('1')) p = '254' + p;
    const { ok, data } = await safeFetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authData.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: config.MPESA_SHORTCODE,
        Password:          password,
        Timestamp:         timestamp,
        TransactionType:   'CustomerPayBillOnline',
        Amount:            Math.round(amount),
        PartyA:            p,
        PartyB:            config.MPESA_SHORTCODE,
        PhoneNumber:       p,
        CallBackURL:       `${process.env.VITE_APP_URL}/api/webhook/mpesa`,
        AccountReference:  'GW-' + Date.now(),
        TransactionDesc:   (description || 'Paiement').substring(0, 20),
      }),
    });
    if (!ok || data.ResponseCode !== '0') return { success: false, error: data.ResponseDescription || data.errorMessage || 'Erreur M-Pesa' };
    return { success: true, reference: data.CheckoutRequestID, url: null, status: 'pending', provider: 'mpesa' };
  },

  orange: async (config, { amount, currency, country, description }) => {
    const COUNTRY_MAP = { ci: 'civ', sn: 'sn', ml: 'ml', cm: 'cm', gn: 'gin', cd: 'cd', cf: 'cf' };
    const segment  = COUNTRY_MAP[country] || 'sn';
    const creds    = Buffer.from(`${config.ORANGE_CLIENT_ID}:${config.ORANGE_CLIENT_SECRET}`).toString('base64');
    const { ok: authOk, data: authData } = await safeFetch('https://api.orange.com/oauth/v3/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    if (!authOk) return { success: false, error: 'Orange Money: erreur auth' };
    const orderId  = `GW-${Date.now()}`;
    const { ok, data } = await safeFetch(
      `https://api.orange.com/orange-money-webpay/${segment}/v1/webpayment`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authData.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_key: config.ORANGE_MERCHANT_KEY,
          currency:     currency || 'XOF',
          order_id:     orderId,
          amount:       Math.round(amount),
          return_url:   `${process.env.VITE_APP_URL}/success`,
          cancel_url:   `${process.env.VITE_APP_URL}/cancel`,
          notif_url:    `${process.env.VITE_APP_URL}/api/webhook/orange`,
          lang:         'fr',
          reference:    description || 'Paiement',
        }),
      }
    );
    if (!ok || !data.payment_url) return { success: false, error: data.message || data.error || 'Erreur Orange Money' };
    return { success: true, reference: orderId, url: data.payment_url, status: 'pending', provider: 'orange' };
  },

  airtel: async (config, { amount, phone, currency, country }) => {
    const countryUpper = (country || 'KE').toUpperCase();
    const { ok: authOk, data: authData } = await safeFetch('https://openapi.airtel.africa/auth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: config.AIRTEL_CLIENT_ID, client_secret: config.AIRTEL_CLIENT_SECRET, grant_type: 'client_credentials' }),
    });
    if (!authOk) return { success: false, error: 'Airtel Money: erreur auth' };
    const referenceId = `GW-${Date.now()}`;
    const { ok, data } = await safeFetch('https://openapi.airtel.africa/merchant/v2/payments/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type':  'application/json',
        'X-Country':     countryUpper,
        'X-Currency':    currency || 'KES',
      },
      body: JSON.stringify({
        reference: referenceId,
        subscriber: { country: countryUpper, currency: currency || 'KES', msisdn: phone },
        transaction: { amount: Math.round(amount), country: countryUpper, currency: currency || 'KES', id: referenceId },
      }),
    });
    if (!ok || data.status?.response_code !== 'DP00800001006') return { success: false, error: data.status?.message || 'Erreur Airtel Money' };
    return { success: true, reference: data.data?.transaction?.id || referenceId, url: null, status: 'pending', provider: 'airtel' };
  },

  // ══════════════════════════════════════════════════════════════════════
  // AFRIQUE ANGLOPHONE
  // ══════════════════════════════════════════════════════════════════════

  paystack: async (config, { amount, email, currency, method }) => {
    const ZERO_DECIMAL = new Set(['XOF','XAF','GNF','KMF','MGA','RWF','UGX']);
    const cur = (currency || 'NGN').toUpperCase();
    const amt = ZERO_DECIMAL.has(cur) ? Math.round(amount) : Math.round(parseFloat(amount) * 100);
    const { ok, data } = await safeFetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:       amt,
        email:        email || 'customer@gateway.com',
        currency:     cur,
        channels:     method === 'card' ? ['card'] : [method],
        callback_url: `${process.env.VITE_APP_URL}/success`,
      }),
    });
    if (!ok || !data.status) return { success: false, error: data.message };
    return { success: true, reference: data.data.reference, url: data.data.authorization_url, status: 'pending', provider: 'paystack' };
  },

  flutterwave: async (config, { amount, email, phone, currency, country, description, method }) => {
    const PAYMENT_OPTIONS = { card: 'card', bank_transfer: 'banktransfer', ussd: 'ussd', mpesa: 'mpesa', mobile_money: 'mobilemoney', mtn_money: 'mobilemoney', moov_money: 'mobilemoney' };
    const { ok, data } = await safeFetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.FLW_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref:          `GW-${Date.now()}`,
        amount:          parseFloat(amount),
        currency:        currency || 'NGN',
        payment_options: PAYMENT_OPTIONS[method] || 'card',
        redirect_url:    `${process.env.VITE_APP_URL}/success`,
        customer:        { email: email || 'customer@gateway.com', phonenumber: phone || '', name: 'Customer' },
        customizations:  { title: description || 'Paiement' },
        ...(country ? { country: country.toUpperCase() } : {}),
      }),
    });
    if (!ok || data.status !== 'success') return { success: false, error: data.message };
    return { success: true, reference: data.data.tx_ref, url: data.data.link, status: 'pending', provider: 'flutterwave' };
  },

  // ══════════════════════════════════════════════════════════════════════
  // TUNISIE
  // ══════════════════════════════════════════════════════════════════════

  flouci: async (config, { amount, description }) => {
    const { ok, data } = await safeFetch('https://developers.flouci.com/api/generate_payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_token:             config.FLOUCI_APP_TOKEN,
        app_secret:            config.FLOUCI_APP_SECRET,
        amount:                String(Math.round(amount)),
        accept_card:           'true',
        session_timeout_secs:  1200,
        success_link:          `${process.env.VITE_APP_URL}/success`,
        fail_link:             `${process.env.VITE_APP_URL}/cancel`,
        developer_tracking_id: `GW-${Date.now()}`,
      }),
    });
    if (!data.result?.success) return { success: false, error: data.message || 'Erreur Flouci' };
    return { success: true, reference: data.result.payment_id, url: data.result.link, status: 'pending', provider: 'flouci' };
  },

  paymee: async (config, { amount, email, phone, description }) => {
    const { ok, data } = await safeFetch('https://app.paymee.tn/api/v2/payments/create', {
      method: 'POST',
      headers: { 'Authorization': `Token ${config.PAYMEE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:      parseFloat(amount),
        note:        (description || 'Paiement').substring(0, 255),
        first_name:  '',
        last_name:   '',
        email:       email || '',
        phone:       phone || '',
        return_url:  `${process.env.VITE_APP_URL}/success`,
        cancel_url:  `${process.env.VITE_APP_URL}/cancel`,
        webhook_url: `${process.env.VITE_APP_URL}/api/webhook/paymee`,
        order_id:    `GW-${Date.now()}`,
      }),
    });
    if (!data.status) return { success: false, error: data.message || 'Erreur Paymee' };
    return { success: true, reference: data.data?.token, url: `https://app.paymee.tn/gateway/${data.data?.token}`, status: 'pending', provider: 'paymee' };
  },

  // ══════════════════════════════════════════════════════════════════════
  // AFRIQUE DU SUD
  // ══════════════════════════════════════════════════════════════════════

  yoco: async (config, { amount, description, email }) => {
    const { ok, data } = await safeFetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.YOCO_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:     Math.round(parseFloat(amount) * 100),
        currency:   'ZAR',
        successUrl: `${process.env.VITE_APP_URL}/success`,
        cancelUrl:  `${process.env.VITE_APP_URL}/cancel`,
        failureUrl: `${process.env.VITE_APP_URL}/cancel`,
        metadata:   { description: (description || 'Paiement').substring(0, 255), ...(email ? { email } : {}) },
      }),
    });
    if (!ok || data.errorCode) return { success: false, error: data.displayMessage || data.message || 'Erreur Yoco' };
    return { success: true, reference: data.id, url: data.redirectUrl, status: 'pending', provider: 'yoco' };
  },

  // ══════════════════════════════════════════════════════════════════════
  // INTERNATIONAL
  // ══════════════════════════════════════════════════════════════════════

  paypal: async (config, { amount, currency, description }) => {
    const sandbox  = config.PAYPAL_SANDBOX === 'true';
    const baseUrl  = sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    const creds    = Buffer.from(`${config.PAYPAL_CLIENT_ID}:${config.PAYPAL_SECRET_KEY}`).toString('base64');
    const { ok: authOk, data: authData } = await safeFetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Authorization': `Basic ${creds}` },
      body: 'grant_type=client_credentials',
    });
    if (!authOk) return { success: false, error: 'Erreur auth PayPal' };
    const { ok, data } = await safeFetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authData.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: (currency || 'EUR').toUpperCase(), value: parseFloat(amount).toFixed(2) }, description: (description || '').substring(0, 127) }],
        payment_source: { paypal: { experience_context: { return_url: `${process.env.VITE_APP_URL}/success`, cancel_url: `${process.env.VITE_APP_URL}/cancel` } } },
      }),
    });
    if (!ok) return { success: false, error: data.message };
    return { success: true, reference: data.id, url: data.links?.find(l => l.rel === 'approve')?.href, status: 'pending', provider: 'paypal' };
  },

  stripe: async (config, { amount, currency, description, email }) => {
    const ZERO_DECIMAL = new Set(['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','XAF','XOF','XPF']);
    const cur = (currency || 'EUR').toLowerCase();
    const amt = ZERO_DECIMAL.has(cur.toUpperCase()) ? Math.round(amount) : Math.round(parseFloat(amount) * 100);
    const params = new URLSearchParams({
      'payment_method_types[]':                        'card',
      'line_items[0][price_data][currency]':            cur,
      'line_items[0][price_data][product_data][name]':  (description || 'Paiement').substring(0, 250),
      'line_items[0][price_data][unit_amount]':         String(amt),
      'line_items[0][quantity]':                        '1',
      mode:                                             'payment',
      success_url:                                      `${process.env.VITE_APP_URL}/success`,
      cancel_url:                                       `${process.env.VITE_APP_URL}/cancel`,
      ...(email ? { customer_email: email } : {}),
    });
    const { ok, data } = await safeFetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    if (!ok) return { success: false, error: data.error?.message };
    return { success: true, reference: data.id, url: data.url, status: 'pending', provider: 'stripe' };
  },

  mollie: async (config, { amount, currency, description, email, method }) => {
    const METHOD_MAP = { card: 'creditcard', ideal: 'ideal', giropay: 'giropay', sofort: 'sofort', bancontact: 'bancontact' };
    const params = new URLSearchParams({
      'amount[value]':    parseFloat(amount).toFixed(2),
      'amount[currency]': (currency || 'EUR').toUpperCase(),
      description:        (description || 'Paiement').substring(0, 255),
      redirectUrl:        `${process.env.VITE_APP_URL}/success`,
      webhookUrl:         `${process.env.VITE_APP_URL}/api/webhook/mollie`,
      method:             METHOD_MAP[method] || 'creditcard',
      ...(email ? { billingEmail: email } : {}),
    });
    const { ok, data } = await safeFetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.MOLLIE_API_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    if (!ok) return { success: false, error: data.detail || data.title || 'Erreur Mollie' };
    return { success: true, reference: data.id, url: data._links?.checkout?.href || null, status: 'pending', provider: 'mollie' };
  },

  adyen: async (config, { amount, currency, email, country, description }) => {
    const sandbox    = config.ADYEN_SANDBOX !== 'false';
    const version    = 'v71';
    const checkoutUrl = sandbox
      ? `https://checkout-test.adyen.com/${version}`
      : `https://${config.ADYEN_LIVE_PREFIX}-checkout-live.adyenpayments.com/${version}`;
    const { ok, data } = await safeFetch(`${checkoutUrl}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': config.ADYEN_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantAccount: config.ADYEN_MERCHANT_ACCOUNT,
        amount:          { currency: (currency || 'EUR').toUpperCase(), value: Math.round(parseFloat(amount) * 100) },
        returnUrl:       `${process.env.VITE_APP_URL}/success`,
        reference:       `GW-${Date.now()}`,
        countryCode:     (country || 'FR').toUpperCase(),
        shopperEmail:    email || undefined,
        channel:         'Web',
      }),
    });
    if (!ok || data.status) return { success: false, error: data.message || 'Erreur Adyen' };
    return { success: true, reference: data.id, url: `${process.env.VITE_APP_URL}/checkout/adyen?session=${data.id}`, status: 'pending', provider: 'adyen' };
  },

  checkout: async (config, { amount, currency, email, country, description }) => {
    const sandbox = config.CHECKOUT_SANDBOX !== 'false';
    const baseUrl = sandbox ? 'https://api.sandbox.checkout.com' : `https://${config.CHECKOUT_PREFIX}.api.checkout.com`;
    const { ok, data } = await safeFetch(`${baseUrl}/hosted-payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.CHECKOUT_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:      Math.round(parseFloat(amount) * 100),
        currency:    (currency || 'EUR').toUpperCase(),
        reference:   `GW-${Date.now()}`,
        description: (description || 'Paiement').substring(0, 100),
        success_url: `${process.env.VITE_APP_URL}/success`,
        cancel_url:  `${process.env.VITE_APP_URL}/cancel`,
        failure_url: `${process.env.VITE_APP_URL}/cancel`,
        ...(email  ? { customer: { email } } : {}),
        ...(country ? { billing: { address: { country: country.toUpperCase() } } } : {}),
      }),
    });
    if (!ok) return { success: false, error: data.error_type || data.message || 'Erreur Checkout.com' };
    return { success: true, reference: data.id, url: data._links?.redirect?.href || null, status: 'pending', provider: 'checkout' };
  },

  braintree: async (config, { amount, description }) => {
    // Braintree nécessite le SDK npm — retourne un clientToken pour le front
    try {
      const bt      = await import('braintree');
      const BT      = bt.default || bt;
      const gateway = new BT.BraintreeGateway({
        environment: config.BRAINTREE_SANDBOX !== 'false' ? BT.Environment.Sandbox : BT.Environment.Production,
        merchantId:  config.BRAINTREE_MERCHANT_ID,
        publicKey:   config.BRAINTREE_PUBLIC_KEY,
        privateKey:  config.BRAINTREE_PRIVATE_KEY,
      });
      const tokenResult = await gateway.clientToken.generate({});
      if (!tokenResult.success) return { success: false, error: 'Braintree: erreur génération client token' };
      return { success: true, reference: `BT-${Date.now()}`, clientToken: tokenResult.clientToken, url: null, status: 'pending', provider: 'braintree' };
    } catch (e) {
      return { success: false, error: `Braintree: ${e.message} — vérifiez que npm install braintree a été exécuté` };
    }
  },

  // ══════════════════════════════════════════════════════════════════════
  // INDE
  // ══════════════════════════════════════════════════════════════════════

  razorpay: async (config, { amount, currency, description }) => {
    const creds = Buffer.from(`${config.RAZORPAY_KEY_ID}:${config.RAZORPAY_KEY_SECRET}`).toString('base64');
    const { ok, data } = await safeFetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:   Math.round(parseFloat(amount) * 100),
        currency: (currency || 'INR').toUpperCase(),
        receipt:  `GW-${Date.now()}`,
        notes:    { description: (description || 'Paiement').substring(0, 256) },
      }),
    });
    if (!ok || data.error) return { success: false, error: data.error?.description || 'Erreur Razorpay' };
    return { success: true, reference: data.id, url: `https://rzp.io/i/${data.id}`, status: data.status, provider: 'razorpay' };
  },

  // ══════════════════════════════════════════════════════════════════════
  // USA / CANADA
  // ══════════════════════════════════════════════════════════════════════

  square: async (config, { amount, currency, description, email }) => {
    const crypto  = await import('crypto');
    const sandbox = config.SQUARE_SANDBOX === 'true';
    const baseUrl = sandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
    const { ok, data } = await safeFetch(`${baseUrl}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.SQUARE_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'Square-Version': '2026-01-22' },
      body: JSON.stringify({
        idempotency_key: crypto.default.randomUUID(),
        quick_pay: {
          name:        (description || 'Paiement').substring(0, 255),
          price_money: { amount: Math.round(parseFloat(amount) * 100), currency: (currency || 'USD').toUpperCase() },
          location_id: config.SQUARE_LOCATION_ID,
        },
        checkout_options:   { redirect_url: `${process.env.VITE_APP_URL}/success` },
        ...(email ? { pre_populated_data: { buyer_email: email } } : {}),
      }),
    });
    if (!ok || data.errors?.length) return { success: false, error: data.errors?.[0]?.detail || 'Erreur Square' };
    return { success: true, reference: data.payment_link?.id, url: data.payment_link?.url, status: 'pending', provider: 'square' };
  },

  authnet: async (config, { amount, description, email }) => {
    const sandbox   = config.AUTHORIZENET_SANDBOX !== 'false';
    const endpoint  = sandbox ? 'https://apitest.authorize.net/xml/v1/request.api' : 'https://api.authorize.net/xml/v1/request.api';
    const hostedUrl = sandbox ? 'https://test.authorize.net/payment/payment' : 'https://accept.authorize.net/payment/payment';
    const auth      = { name: config.AUTHORIZENET_API_LOGIN_ID, transactionKey: config.AUTHORIZENET_TRANSACTION_KEY };
    const { ok, data } = await safeFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        getHostedPaymentPageRequest: {
          merchantAuthentication: auth,
          transactionRequest: {
            transactionType: 'authCaptureTransaction',
            amount:          parseFloat(amount).toFixed(2),
            order:           { description: (description || 'Paiement').substring(0, 255) },
            ...(email ? { customer: { email } } : {}),
          },
          hostedPaymentSettings: {
            setting: [
              { settingName: 'hostedPaymentReturnOptions', settingValue: JSON.stringify({ url: `${process.env.VITE_APP_URL}/success`, cancelUrl: `${process.env.VITE_APP_URL}/cancel`, showReceipt: false }) },
              { settingName: 'hostedPaymentIFrameCommunicatorUrl', settingValue: JSON.stringify({ url: `${process.env.VITE_APP_URL}/authnet-relay` }) },
            ],
          },
        },
      }),
    });
    if (data.messages?.resultCode !== 'Ok') return { success: false, error: data.messages?.message?.[0]?.text || 'Erreur Authorize.net' };
    return { success: true, reference: data.token, url: `${hostedUrl}?token=${data.token}`, status: 'pending', provider: 'authnet' };
  },
};

/* ─── Sélection du meilleur provider ────────────────────────────────────── */
function getBestProvider(method, country, providers) {
  // Priorités par méthode de paiement
  const PRIORITY = {
    // Mobile Money Afrique de l'Ouest
    mtn_money:      ['feexpay', 'kkiapay', 'cinetpay', 'hub2', 'fedapay', 'mbiyopay', 'lygos', 'qosic', 'bizao', 'mtn'],
    moov_money:     ['feexpay', 'kkiapay', 'cinetpay', 'fedapay', 'mbiyopay', 'lygos', 'qosic', 'bizao'],
    celtiis_money:  ['feexpay', 'cinetpay', 'mbiyopay', 'qosic'],
    orange_money:   ['feexpay', 'kkiapay', 'cinetpay', 'fedapay', 'mbiyopay', 'lygos', 'qosic', 'bizao', 'orange'],
    free_money:     ['feexpay', 'kkiapay', 'cinetpay', 'fedapay', 'paydunya'],
    wave_money:     ['feexpay', 'kkiapay', 'cinetpay', 'hub2', 'paydunya', 'wave'],
    togocom_money:  ['feexpay', 'kkiapay', 'cinetpay', 'fedapay'],
    wallet:         ['feexpay'],
    coris:          ['feexpay', 'mbiyopay'],
    // Mobile Money Afrique de l'Est
    mpesa:          ['mpesa', 'paystack', 'flutterwave', 'mbiyopay'],
    airtel_money:   ['airtel', 'mbiyopay', 'fedapay', 'cinetpay', 'lygos'],
    afrimoney:      ['mbiyopay'],
    qmoney:         ['mbiyopay'],
    // Wave direct
    wave_money_direct: ['wave'],
    // MTN direct
    mtn_money_direct:  ['mtn'],
    // Carte bancaire
    card:           ['stripe', 'checkout', 'adyen', 'paystack', 'flutterwave', 'paypal', 'mollie', 'square', 'braintree', 'cinetpay', 'kkiapay', 'yoco', 'razorpay', 'authnet'],
    // Wallets internationaux
    paypal:         ['paypal', 'braintree'],
    venmo:          ['braintree', 'paypal'],
    apple_pay:      ['stripe', 'checkout', 'adyen', 'square', 'braintree', 'authnet'],
    google_pay:     ['stripe', 'checkout', 'adyen', 'square', 'braintree'],
    cash_app:       ['square'],
    // Virements & locaux
    bank_transfer:  ['paystack', 'flutterwave', 'paymee', 'razorpay', 'authnet'],
    ussd:           ['paystack', 'flutterwave'],
    eft:            ['paystack'],
    qr:             ['paystack'],
    upi:            ['razorpay'],
    ideal:          ['mollie', 'adyen', 'stripe'],
    giropay:        ['mollie', 'adyen', 'stripe'],
    sofort:         ['mollie', 'adyen', 'stripe'],
    bancontact:     ['mollie', 'adyen', 'stripe'],
    bacs:           ['stripe'],
    bizum:          ['stripe'],
    // Tunisie
    flouci_wallet:  ['flouci'],
    // Mobile Money générique
    mobile_money:   ['flutterwave', 'paystack', 'mbiyopay'],
  };

  const candidates = PRIORITY[method] || ['feexpay'];
  for (const pid of candidates) {
    if (providers[pid]?.active) return pid;
  }
  return null;
}

/* ─── Handler principal ──────────────────────────────────────────────────── */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'POST requis' });

  await logRequest(req, 'pay');

  const apiKey = req.body?.token || req.headers['x-api-key'];
  if (!checkRateLimit(apiKey).allowed) return res.status(429).json({ error: 'Trop de requêtes' });

  const { amount, country, method, phone, email, description, currency } = req.body;
  if (!apiKey)                return res.status(401).json({ error: 'Clé API requise' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });

  // Validation numéro de téléphone (uniquement pour les méthodes mobile money)
  const MOBILE_METHODS = ['mtn_money','moov_money','orange_money','free_money','wave_money',
    'celtiis_money','togocom_money','airtel_money','mpesa','afrimoney','wallet','coris','qmoney'];
  if (MOBILE_METHODS.includes(method)) {
    const phoneCheck = validatePhone(phone, country, method);
    if (!phoneCheck.valid) return res.status(400).json({ error: phoneCheck.error });
  }

  try {
    const merchantSnap = await db.collection('gateway_merchants').where('apiKey', '==', apiKey).limit(1).get();
    if (merchantSnap.empty) return res.status(401).json({ error: 'Token marchand invalide' });

    const merchant = { id: merchantSnap.docs[0].id, ...merchantSnap.docs[0].data() };
    if (!merchant.active || merchant.verificationStatus !== 'approved') {
      return res.status(403).json({ error: 'Compte non activé' });
    }

    const providers  = merchant.providers || {};
    const providerId = getBestProvider(method, country, providers);
    if (!providerId) return res.status(400).json({ error: `Aucun provider disponible pour ${method} en ${country}` });

    await log('pay', 'INFO', 'Provider sélectionné', { method, country, providerId, merchantId: merchant.id });

    const callFn = PROVIDER_CALLS[providerId];
    if (!callFn) return res.status(400).json({ error: `Provider ${providerId} non implémenté` });

    const amountNum  = parseFloat(amount);
    const commission = Math.round(amountNum * 0.01);
    const netAmount  = amountNum - commission;

    const result = await callFn(providers[providerId], {
      amount: netAmount, phone, email, country, method, description,
      currency: currency || 'XOF',
    });

    await log('pay', result.success ? 'INFO' : 'WARN', result.success ? 'Paiement initié' : 'Paiement échoué', { providerId, amount: amountNum, status: result.status, error: result.error || null, merchantId: merchant.id });

    const isCompleted = result.success && (result.status === 'SUCCESSFUL' || result.status === 'completed');

    const txRef = await db.collection('gateway_transactions').add({
      merchantId:       merchant.id,
      amount:           amountNum,
      commission,
      netAmount,
      country,
      method,
      provider:         providerId,
      providerRef:      result.reference || null,
      status:           result.success ? (isCompleted ? 'completed' : 'pending') : 'failed',
      description:      description || 'Paiement',
      providerResponse: result,
      createdAt:        new Date().toISOString(),
    });

    if (isCompleted) {
      await db.collection('gateway_merchants').doc(merchant.id).update({
        balance:           admin.firestore.FieldValue.increment(netAmount),
        totalTransactions: admin.firestore.FieldValue.increment(1),
        updatedAt:         new Date().toISOString(),
      });
      const commissionRef = await sendCommissionToOwner(commission);
      await db.collection('gateway_commissions').add({
        transactionId: txRef.id,
        merchantId:    merchant.id,
        amount:        amountNum,
        commission,
        commissionRef,
        network:       process.env.OWNER_FEEXPAY_NETWORK || 'mtn',
        status:        commissionRef ? 'sent' : 'pending',
        createdAt:     new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success:       result.success,
      transactionId: txRef.id,
      reference:     result.reference,
      status:        result.status,
      provider:      providerId,
      url:           result.url    || null,
      clientToken:   result.clientToken || null, // pour Braintree
      message:       result.success ? 'Paiement initié.' : result.error,
    });

  } catch (error) {
    console.error('Erreur pay.js:', error);
    await logError('pay', error, { body: req.body });
    return res.status(500).json({ error: error.message });
  }
}