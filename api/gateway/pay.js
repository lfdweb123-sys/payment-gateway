import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}
const db = admin.firestore();

/* ─── Rate limiting ─────────────────────────────────── */
const requestCounts = new Map();
const MAX_REQUESTS = 30;
const WINDOW_MS = 60 * 1000;

function checkRateLimit(apiKey) {
  const now = Date.now();
  const key = apiKey || 'anonymous';
  if (!requestCounts.has(key)) requestCounts.set(key, []);
  const timestamps = requestCounts.get(key).filter(t => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) {
    return { allowed: false };
  }
  timestamps.push(now);
  requestCounts.set(key, timestamps);
  return { allowed: true };
}

/* ─── safeFetch — jamais de crash sur réponse HTML ── */
async function safeFetch(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    console.error(`Non-JSON response from ${url} (${res.status}):`, text.substring(0, 200));
    return { ok: false, status: res.status, data: { message: `Invalid response from provider (HTTP ${res.status})` } };
  }
}

/* ─── Commission 1% vers compte propriétaire ────────── */
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

/* ─── PROVIDERS ─────────────────────────────────────── */
const PROVIDER_CALLS = {

  /* ── FeexPay — doc officielle vérifiée ── */
  feexpay: async (config, { amount, phone, method, description }) => {
    const endpoints = {
      // Bénin
      mtn_money:     'https://api.feexpay.me/api/transactions/public/requesttopay/mtn',
      moov_money:    'https://api.feexpay.me/api/transactions/public/requesttopay/moov',
      celtiis_money: 'https://api.feexpay.me/api/transactions/public/requesttopay/celtiis_bj',
      wallet:        'https://api.feexpay.me/api/transactions/public/requesttopay/coris',
      // Côte d'Ivoire
      mtn_ci:        'https://api.feexpay.me/api/transactions/public/requesttopay/mtn_ci',
      moov_ci:       'https://api.feexpay.me/api/transactions/public/requesttopay/moov_ci',
      wave_ci:       'https://api.feexpay.me/api/transactions/public/requesttopay/wave_ci',
      orange_ci:     'https://api.feexpay.me/api/transactions/public/requesttopay/orange_ci',
      // Sénégal
      orange_sn:     'https://api.feexpay.me/api/transactions/public/requesttopay/orange_sn',
      wave_sn:       'https://api.feexpay.me/api/transactions/public/requesttopay/wave_sn',
      free_sn:       'https://api.feexpay.me/api/transactions/public/requesttopay/free_sn',
      // Congo Brazzaville
      mtn_cg:        'https://api.feexpay.me/api/transactions/public/requesttopay/mtn_cg',
      // Togo
      togocom_money: 'https://api.feexpay.me/api/transactions/public/requesttopay/togocom_tg',
      // Génériques
      orange_money:  'https://api.feexpay.me/api/transactions/public/requesttopay/orange',
      wave_money:    'https://api.feexpay.me/api/transactions/public/requesttopay/wave',
    };
    const url = endpoints[method] || endpoints.mtn_money;
    const { ok, data } = await safeFetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.FEEXPAY_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop: config.FEEXPAY_SHOP_ID,
        amount: Math.round(amount),
        phoneNumber: phone,
        description: (description || 'Paiement').replace(/[^a-zA-Z0-9 ]/g, ''),
      }),
    });
    if (!ok) return { success: false, error: data.message || 'Erreur FeexPay' };
    return { success: true, reference: data.reference, url: data.payment_url || null, status: data.status || 'PENDING', provider: 'feexpay' };
  },

  /* ── Stripe — endpoint vérifié ── */
  stripe: async (config, { amount, currency, description }) => {
    const { ok, data } = await safeFetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': (currency || 'eur').toLowerCase(),
        'line_items[0][price_data][product_data][name]': description || 'Paiement',
        'line_items[0][price_data][unit_amount]': Math.round(parseFloat(amount) * 100),
        'line_items[0][quantity]': '1',
        mode: 'payment',
        success_url: `${process.env.VITE_APP_URL}/success`,
        cancel_url: `${process.env.VITE_APP_URL}/cancel`,
      }),
    });
    if (!ok) return { success: false, error: data.error?.message };
    return { success: true, reference: data.id, url: data.url, status: 'pending', provider: 'stripe' };
  },

  /* ── Paystack — endpoint vérifié ── */
  paystack: async (config, { amount, email, currency, method }) => {
    const { ok, data } = await safeFetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(parseFloat(amount) * 100), // en kobo/pesewas/cents
        email: email || 'customer@gateway.com',
        currency: currency || 'NGN',
        channels: method === 'card' ? ['card'] : [method],
      }),
    });
    if (!ok || !data.status) return { success: false, error: data.message };
    return { success: true, reference: data.data.reference, url: data.data.authorization_url, status: 'pending', provider: 'paystack' };
  },

  /* ── Flutterwave v3 — endpoint vérifié, v3 maintenu ── */
  flutterwave: async (config, { amount, email, phone, currency, country, description }) => {
    const { ok, data } = await safeFetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.FLW_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: `GW-${Date.now()}`,
        amount: parseFloat(amount),
        currency: currency || 'XOF',
        redirect_url: `${process.env.VITE_APP_URL}/callback`,
        customer: { email: email || 'customer@gateway.com', phonenumber: phone },
        customizations: { title: description || 'Paiement' },
        country,
      }),
    });
    if (!ok || data.status !== 'success') return { success: false, error: data.message };
    return { success: true, reference: data.data.tx_ref, url: data.data.link, status: 'pending', provider: 'flutterwave' };
  },

  /* ── KKiaPay — SDK JS uniquement, pas d'API REST directe publique
       On utilise le SDK JS côté client — cet appel serveur est un fallback non officiel ── */
        kkiapay: async (config, { amount, phone, email, description }) => {
          try {
            // Import dynamique du JS SDK KKiaPay (npm i -s kkiapay)
            const kkiapayModule = await import('kkiapay');
            const kkiapay = kkiapayModule.kkiapay || kkiapayModule.default;

            // Initialisation avec la PUBLIC KEY uniquement pour le débit
            const k = kkiapay(config.KKIAPAY_PUBLIC_KEY);

            // Envoi direct USSD push sur le téléphone du client
            const result = await k.debit(
              phone,              // numéro mobile money ex: 22961000000
              Math.round(amount), // montant en XOF
              {
                firstname: '',
                lastname:  '',
                email:     email || '',
                callback:  `${process.env.VITE_APP_URL}/api/webhook?provider=kkiapay`,
              }
            );

            if (!result || !result.transactionId) {
              return { success: false, error: result?.failureMessage || 'Erreur KKiaPay' };
            }

            return {
              success:   true,
              reference: result.transactionId,
              status:    'PENDING',
              provider:  'kkiapay',
              url:       null,
            };

          } catch (err) {
            console.error('KKiaPay error:', err);
            return { success: false, error: err.message || 'Erreur KKiaPay' };
          }
        },

  /* ── FedaPay — 2 étapes : créer transaction + générer token + payer ── */
  fedapay: async (config, { amount, email, phone, description }) => {
    const base = config.FEDAPAY_ENV === 'sandbox'
      ? 'https://sandbox-api.fedapay.com/v1'
      : 'https://api.fedapay.com/v1';
    const headers = { 'Authorization': `Bearer ${config.FEDAPAY_SECRET_KEY}`, 'Content-Type': 'application/json' };

    // Étape 1 — Créer la transaction
    const { ok: ok1, data: tx } = await safeFetch(`${base}/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: Math.round(amount),
        currency: { iso: 'XOF' },
        description: (description || 'Paiement').substring(0, 200),
        callback_url: `${process.env.VITE_APP_URL}/callback`,
        customer: {
          email: email || 'client@email.com',
          phone_number: phone ? { number: phone, country: 'bj' } : undefined,
        },
      }),
    });
    if (!ok1) return { success: false, error: tx.message };

    const txId = tx['v1/transaction']?.id || tx.id;
    if (!txId) return { success: false, error: 'FedaPay: ID transaction manquant' };

    // Étape 2 — Générer le token de paiement
    const { ok: ok2, data: tokenData } = await safeFetch(`${base}/transactions/${txId}/token`, {
      method: 'POST',
      headers,
    });
    if (!ok2) return { success: false, error: tokenData.message };

    return {
      success: true,
      reference: String(txId),
      url: tokenData.url || tokenData['v1/transaction_token']?.url,
      status: 'pending',
      provider: 'fedapay',
    };
  },

  /* ── CinetPay — endpoint vérifié, code succès = "201" ── */
  cinetpay: async (config, { amount, phone, email, description }) => {
    const { ok, data } = await safeFetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: config.CINETPAY_API_KEY,
        site_id: config.CINETPAY_SITE_ID,
        transaction_id: `GW-${Date.now()}`,
        amount: Math.round(amount), // doit être multiple de 5
        currency: 'XOF',
        description: (description || 'Paiement').replace(/[#/$_&]/g, '').substring(0, 200),
        notify_url: `${process.env.VITE_APP_URL}/api/webhook/cinetpay`,
        return_url: `${process.env.VITE_APP_URL}/success`,
        channels: 'MOBILE_MONEY',
        customer_name: email || 'Client',
        customer_email: email || 'client@email.com',
        customer_phone_number: phone || '',
      }),
    });
    if (!ok || data.code !== '201') return { success: false, error: data.message || data.description };
    return { success: true, reference: data.data?.payment_token, url: data.data?.payment_url, status: 'pending', provider: 'cinetpay' };
  },

  /* ── Lygos — endpoint vérifié depuis doc officielle ── */
  lygos: async (config, { amount, phone, description, country, currency }) => {
    // Lygos Collecte directe (payin sans redirection)
    const { ok, data } = await safeFetch('https://api.lygosapp.com/v1/api/deposit/', {
      method: 'POST',
      headers: { 'api-key': config.LYGOS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track_id: `GW-${Date.now()}`,
        amount: Math.round(amount),
        phone_number: phone,
        country: country?.toUpperCase() || 'CI',
        currency: currency || 'XOF',
        operator: config.LYGOS_OPERATOR || 'MTN_MOMO_CI', // ex: MTN_MOMO_CI, ORANGE_CI
      }),
    });
    if (!ok) return { success: false, error: data.message };
    return { success: true, reference: data.track_id, status: data.status || 'pending', provider: 'lygos' };
  },

  /* ── MbiyoPay — endpoint vérifié depuis doc officielle ── */
  mbiyopay: async (config, { amount, phone, currency, country, description }) => {
    const { ok, data } = await safeFetch('https://dashboard.mbiyo.africa/api/v1/merchant/payin', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.MBIYOPAY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(amount),
        currency: currency || 'XOF',
        payment_method: 'mobile_money',
        order_id: `GW-${Date.now()}`,
        callback_url: `${process.env.VITE_APP_URL}/api/webhook/mbiyopay`,
        metadata: {
          network: config.MBIYOPAY_NETWORK || 'mtn', // mtn, moov, orange, etc.
          phone_number: phone,
          country_code: (country || 'bj').toUpperCase(),
        },
      }),
    });
    if (!ok || data.status === 'error') return { success: false, error: data.message };
    return {
      success: true,
      reference: data.data?.transaction_id,
      url: data.data?.redirect_url || null,
      status: data.data?.status || 'pending',
      provider: 'mbiyopay',
    };
  },

  /* ── Qosic — endpoint vérifié depuis doc officielle ── */
  qosic: async (config, { amount, phone, description }) => {
    // Auth: Basic Authentication (clientid + password en base64)
    const credentials = Buffer.from(`${config.QOSIC_CLIENT_ID}:${config.QOSIC_PASSWORD}`).toString('base64');
    const { ok, data } = await safeFetch('https://www.qosic.net/QosicBridge/user/requestpayment', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msisdn: phone,
        amount: String(Math.round(amount)),
        transref: `GW-${Date.now()}`,
        clientid: config.QOSIC_CLIENT_ID,
        firstname: '',
        lastname: '',
      }),
    });
    if (!ok) return { success: false, error: data.message || 'Erreur Qosic' };
    return { success: true, reference: data.transref || `GW-${Date.now()}`, status: 'pending', provider: 'qosic' };
  },

  /* ── Hub2 — 2 étapes : créer PaymentIntent + attempt ── */
  hub2: async (config, { amount, phone, email, description, currency, country }) => {
    const env = config.HUB2_ENV || 'live'; // live ou sandbox
    const headers = {
      'ApiKey': config.HUB2_API_KEY,
      'MerchantId': config.HUB2_MERCHANT_ID,
      'Environment': env,
      'Content-Type': 'application/json',
    };

    // Étape 1 — Créer le PaymentIntent
    const { ok: ok1, data: pi } = await safeFetch('https://api.hub2.io/payment-intents', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerReference: phone || email || `cust-${Date.now()}`,
        purchaseReference: `GW-${Date.now()}`,
        amount: Math.round(amount),
        currency: currency || 'XOF',
      }),
    });
    if (!ok1) return { success: false, error: pi.message };

    const intentId = pi.id;
    if (!intentId) return { success: false, error: 'Hub2: PaymentIntent ID manquant' };

    // Étape 2 — Attempt (déclencher le paiement mobile)
    const { ok: ok2, data: attempt } = await safeFetch(
      `https://api.hub2.io/payment-intents/${intentId}/payments`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          method: 'mobile_money',
          country: (country || 'CI').toUpperCase(),
          number: phone,
        }),
      }
    );
    if (!ok2) return { success: false, error: attempt.message };

    return {
      success: true,
      reference: intentId,
      url: attempt.nextAction?.data?.url || null,
      status: pi.status || 'pending',
      provider: 'hub2',
    };
  },

  /* ── PayPal — endpoint vérifié ── */
  paypal: async (config, { amount, currency, description }) => {
    const { ok: authOk, data: authData } = await safeFetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.PAYPAL_CLIENT_ID}:${config.PAYPAL_SECRET_KEY}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    if (!authOk) return { success: false, error: 'Erreur auth PayPal' };
    const { ok, data } = await safeFetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authData.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: currency || 'EUR', value: parseFloat(amount).toFixed(2) },
          description: (description || '').substring(0, 127),
        }],
        application_context: { return_url: `${process.env.VITE_APP_URL}/success`, cancel_url: `${process.env.VITE_APP_URL}/cancel` },
      }),
    });
    if (!ok) return { success: false, error: data.message };
    return { success: true, reference: data.id, url: data.links?.find(l => l.rel === 'approve')?.href, status: 'pending', provider: 'paypal' };
  },
};

/* ─── Sélection provider ────────────────────────────── */
function getBestProvider(method, providers) {
  const priority = {
    mtn_money:      ['feexpay','fedapay','cinetpay','mbiyopay','lygos','qosic','hub2'],
    moov_money:     ['feexpay','fedapay','cinetpay','mbiyopay','lygos','qosic'],
    celtiis_money:  ['feexpay','cinetpay'],
    orange_money:   ['feexpay','fedapay','cinetpay','mbiyopay','lygos','qosic'],
    free_money:     ['feexpay','fedapay','cinetpay'],
    wave_money:     ['feexpay','fedapay','cinetpay','hub2'],
    togocom_money:  ['feexpay','fedapay','cinetpay'],
    mtn_ci:         ['feexpay','cinetpay','flutterwave','lygos'],
    moov_ci:        ['feexpay','cinetpay','lygos'],
    wave_ci:        ['feexpay','cinetpay','lygos'],
    orange_ci:      ['feexpay','cinetpay','lygos'],
    orange_sn:      ['feexpay','cinetpay','mbiyopay'],
    wave_sn:        ['feexpay','cinetpay'],
    free_sn:        ['feexpay','fedapay','cinetpay'],
    mtn_cg:         ['feexpay','cinetpay','mbiyopay'],
    card:           ['stripe','paystack','flutterwave','cinetpay','paypal'],
    paypal:         ['paypal'],
    bank_transfer:  ['paystack','flutterwave'],
    ussd:           ['paystack','flutterwave','qosic'],
    mpesa:          ['paystack','flutterwave','mbiyopay'],
    airtel_money:   ['fedapay','cinetpay','mbiyopay','lygos'],
    wallet:         ['feexpay'],
  };
  for (const pid of (priority[method] || ['feexpay'])) {
    if (providers[pid]?.active) return pid;
  }
  return null;
}

/* ─── Handler principal ─────────────────────────────── */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  const apiKey = req.body?.token || req.headers['x-api-key'];
  if (!checkRateLimit(apiKey).allowed) return res.status(429).json({ error: 'Trop de requêtes' });

  const { amount, country, method, phone, email, description } = req.body;
  if (!apiKey)                return res.status(401).json({ error: 'Clé API requise' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });

  try {
    const merchantSnap = await db.collection('gateway_merchants').where('apiKey', '==', apiKey).limit(1).get();
    if (merchantSnap.empty) return res.status(401).json({ error: 'Token marchand invalide' });

    const merchant = { id: merchantSnap.docs[0].id, ...merchantSnap.docs[0].data() };
    if (!merchant.active || merchant.verificationStatus !== 'approved') {
      return res.status(403).json({ error: 'Compte non activé' });
    }

    const providers  = merchant.providers || {};
    const providerId = getBestProvider(method, providers);
    if (!providerId) return res.status(400).json({ error: 'Aucun provider disponible pour cette méthode' });

    const callFn = PROVIDER_CALLS[providerId];
    if (!callFn) return res.status(400).json({ error: `Provider ${providerId} non supporté` });

    const amountNum  = parseFloat(amount);
    const commission = Math.round(amountNum * 0.01);
    const netAmount  = amountNum - commission;

    const result = await callFn(providers[providerId], {
      amount: netAmount, phone, email, country, method, description, currency: 'XOF',
    });

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
      url:           result.url || null,
      message:       result.success ? 'Paiement initié. Vérifiez votre téléphone.' : result.error,
    });

  } catch (error) {
    console.error('Erreur pay.js:', error);
    return res.status(500).json({ error: error.message });
  }
}