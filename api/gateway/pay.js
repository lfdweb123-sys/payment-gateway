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

const requestCounts = new Map();
const MAX_REQUESTS = 30;
const WINDOW_MS = 60 * 1000;

function checkRateLimit(apiKey) {
  const now = Date.now();
  const key = apiKey || 'anonymous';
  if (!requestCounts.has(key)) requestCounts.set(key, []);
  const timestamps = requestCounts.get(key).filter(t => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000) };
  }
  timestamps.push(now);
  requestCounts.set(key, timestamps);
  return { allowed: true };
}

// ═══════════════════════════════════════════
// 15 PROVIDERS - APPELS RÉELS
// ═══════════════════════════════════════════

const PROVIDER_CALLS = {
  feexpay: async (config, { amount, phone, method }) => {
    const networkMap = { mtn_money: 'MTN', moov_money: 'MOOV', celtiis_money: 'CELTIIS BJ', orange_money: 'ORANGE', wave_money: 'WAVE', togocom_money: 'TOGOCOM TG' };
    const res = await fetch('https://api.feexpay.me/api/payouts/public/transfer/global', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.FEEXPAY_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop: config.FEEXPAY_SHOP_ID, amount: Math.round(amount), phoneNumber: phone, network: networkMap[method] || 'MTN', motif: 'Paiement' })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message };
    return { success: true, reference: data.reference, status: data.status, provider: 'feexpay' };
  },

  stripe: async (config, { amount, currency, description }) => {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'payment_method_types[]': 'card', 'line_items[0][price_data][currency]': (currency || 'eur').toLowerCase(), 'line_items[0][price_data][product_data][name]': description || 'Paiement', 'line_items[0][price_data][unit_amount]': Math.round(parseFloat(amount) * 100), 'line_items[0][quantity]': '1', mode: 'payment', success_url: `${process.env.VITE_APP_URL}/success`, cancel_url: `${process.env.VITE_APP_URL}/cancel` })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error?.message };
    return { success: true, reference: data.id, url: data.url, status: 'pending', provider: 'stripe' };
  },

  paystack: async (config, { amount, email, currency, method }) => {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(parseFloat(amount) * 100), email: email || 'customer@gateway.com', currency: currency || 'NGN', channels: method === 'card' ? ['card'] : [method] })
    });
    const data = await res.json();
    if (!data.status) return { success: false, error: data.message };
    return { success: true, reference: data.data.reference, url: data.data.authorization_url, status: 'pending', provider: 'paystack' };
  },

  flutterwave: async (config, { amount, email, phone, currency, country }) => {
    const res = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.FLW_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_ref: `GW-${Date.now()}`, amount: parseFloat(amount), currency: currency || 'XOF', payment_type: 'mobilemoney', redirect_url: `${process.env.VITE_APP_URL}/callback`, customer: { email: email || 'customer@gateway.com', phonenumber: phone }, customizations: { title: 'Paiement' }, country })
    });
    const data = await res.json();
    if (data.status !== 'success') return { success: false, error: data.message };
    return { success: true, reference: data.data.tx_ref, url: data.data.link, status: 'pending', provider: 'flutterwave' };
  },

  kkiapay: async (config, { amount, phone, email, description }) => {
    const res = await fetch('https://api.kkiapay.me/api/v1/transactions', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Api-Key': config.KKIAPAY_PUBLIC_KEY, 'X-Private-Key': config.KKIAPAY_PRIVATE_KEY, 'X-Secret-Key': config.KKIAPAY_SECRET_KEY },
      body: JSON.stringify({ amount: Math.round(amount), phone: phone || '', email: email || '', description: (description || 'Paiement').substring(0, 100) })
    });
    const data = await res.json();
    if (!res.ok || data.status === 'failed') return { success: false, error: data.message };
    return { success: true, reference: data.transaction_id, url: data.payment_url, status: 'pending', provider: 'kkiapay' };
  },

  fedapay: async (config, { amount, email, phone, description }) => {
    const res = await fetch('https://api.fedapay.com/v1/transactions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.FEDAPAY_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(amount), currency: { iso: 'XOF' }, description: (description || 'Paiement').substring(0, 200), customer: { email: email || 'client@email.com', phone_number: phone ? { number: phone } : null } })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message };
    return { success: true, reference: data.id?.toString(), url: data.payment_url, status: 'pending', provider: 'fedapay' };
  },

  paydunya: async (config, { amount, description }) => {
    const res = await fetch('https://paydunya.com/api/v1/checkout-invoice/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice: { items: [{ name: (description || 'Paiement').substring(0, 50), quantity: 1, unit_price: Math.round(amount), total_price: Math.round(amount) }], total_amount: Math.round(amount), description: (description || '').substring(0, 200) }, store: { name: 'Passerelle' }, actions: { cancel_url: `${process.env.VITE_APP_URL}/cancel`, return_url: `${process.env.VITE_APP_URL}/success` } })
    });
    const data = await res.json();
    if (data.response_code !== '00') return { success: false, error: data.response_text };
    return { success: true, reference: data.invoice.token, url: data.response_text, status: 'pending', provider: 'paydunya' };
  },

  cinetpay: async (config, { amount, phone, email, description }) => {
    const res = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: config.CINETPAY_API_KEY, site_id: config.CINETPAY_SITE_ID, transaction_id: `GW-${Date.now()}`, amount: Math.round(amount), currency: 'XOF', description: (description || 'Paiement').substring(0, 200), customer_name: email || 'Client', customer_email: email || 'client@email.com', customer_phone_number: phone || '', notify_url: `${process.env.VITE_APP_URL}/api/webhook/cinetpay`, return_url: `${process.env.VITE_APP_URL}/success` })
    });
    const data = await res.json();
    if (data.code !== '201') return { success: false, error: data.message };
    return { success: true, reference: data.data.transaction_id, url: data.data.payment_url, status: 'pending', provider: 'cinetpay' };
  },

  lygos: async (config, { amount, phone, email, description }) => {
    const res = await fetch('https://api.lygosapp.com/v1/payments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.LYGOS_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(amount), currency: 'XOF', phone: phone, email: email || '', description: (description || 'Paiement').substring(0, 100), callback_url: `${process.env.VITE_APP_URL}/api/webhook/lygos` })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message };
    return { success: true, reference: data.reference || data.id, status: 'pending', provider: 'lygos' };
  },

  paypal: async (config, { amount, currency, description }) => {
    const authRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Authorization': `Basic ${Buffer.from(`${config.PAYPAL_CLIENT_ID}:${config.PAYPAL_SECRET_KEY}`).toString('base64')}` },
      body: 'grant_type=client_credentials'
    });
    const authData = await authRes.json();
    const token = authData.access_token;
    const res = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: currency || 'EUR', value: parseFloat(amount).toFixed(2) }, description: (description || '').substring(0, 127) }], application_context: { return_url: `${process.env.VITE_APP_URL}/success`, cancel_url: `${process.env.VITE_APP_URL}/cancel` } })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message };
    return { success: true, reference: data.id, url: data.links?.find(l => l.rel === 'approve')?.href, status: 'pending', provider: 'paypal' };
  },

  mbiyopay: async (config, { amount, phone, description }) => {
    const res = await fetch('https://api.mbiyopay.com/v1/payments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.MBIYOPAY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(amount), phone: phone, description: (description || 'Paiement').substring(0, 100), callback: `${process.env.VITE_APP_URL}/api/webhook/mbiyopay` })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message };
    return { success: true, reference: data.reference, status: 'pending', provider: 'mbiyopay' };
  },

  qosic: async (config, { amount, phone, description }) => {
    const res = await fetch('https://api.qosic.com/v1/payment/init', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.QOSIC_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_id: config.QOSIC_MERCHANT_ID, amount: Math.round(amount), currency: 'XOF', phone: phone, description: (description || 'Paiement').substring(0, 50), callback_url: `${process.env.VITE_APP_URL}/api/webhook/qosic` })
    });
    const data = await res.json();
    if (!res.ok || data.status === 'error') return { success: false, error: data.message };
    return { success: true, reference: data.reference || data.transaction_id, status: 'pending', provider: 'qosic' };
  },

  bizao: async (config, { amount, phone, description }) => {
    const res = await fetch('https://api.bizao.com/v1/payments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.BIZAO_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_id: config.BIZAO_MERCHANT_ID, amount: Math.round(amount), phone_number: phone, description: (description || 'Paiement').substring(0, 100), currency: 'XOF' })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message };
    return { success: true, reference: data.reference, status: 'pending', provider: 'bizao' };
  },

  hub2: async (config, { amount, phone, email, description }) => {
    const res = await fetch('https://api.hub2.io/v1/payments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.HUB2_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(amount), currency: 'XOF', customer: { phone: phone, email: email || '' }, description: (description || 'Paiement').substring(0, 200), callback_url: `${process.env.VITE_APP_URL}/api/webhook/hub2` })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message };
    return { success: true, reference: data.id, status: 'pending', provider: 'hub2' };
  },

  chipper: async (config, { amount, phone, email, description }) => {
    const res = await fetch('https://api.chipperpayments.com/v1/charges', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.CHIPPER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(amount), currency: 'USD', customer: { email: email || 'customer@email.com', phone_number: phone }, description: (description || 'Paiement').substring(0, 100), redirect_url: `${process.env.VITE_APP_URL}/callback` })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message };
    return { success: true, reference: data.id, url: data.payment_url, status: 'pending', provider: 'chipper' };
  }
};

// Priorité des providers par méthode
function getBestProvider(method, providers) {
  const priority = {
    mtn_money: ['feexpay', 'kkiapay', 'fedapay', 'cinetpay', 'paydunya', 'lygos', 'mbiyopay', 'qosic', 'bizao', 'hub2'],
    moov_money: ['feexpay', 'kkiapay', 'fedapay', 'cinetpay', 'lygos', 'mbiyopay', 'qosic', 'bizao'],
    celtiis_money: ['feexpay', 'cinetpay'],
    orange_money: ['feexpay', 'kkiapay', 'fedapay', 'cinetpay', 'paydunya', 'lygos', 'mbiyopay', 'qosic', 'bizao', 'hub2'],
    free_money: ['feexpay', 'kkiapay', 'fedapay', 'cinetpay', 'paydunya', 'bizao'],
    wave_money: ['feexpay', 'kkiapay', 'fedapay', 'cinetpay', 'paydunya', 'hub2'],
    togocom_money: ['feexpay', 'kkiapay', 'fedapay', 'cinetpay'],
    card: ['stripe', 'paystack', 'flutterwave', 'fedapay', 'kkiapay', 'cinetpay', 'paypal'],
    paypal: ['paypal'],
    bank_transfer: ['paystack', 'flutterwave'],
    ussd: ['paystack', 'flutterwave'],
    mpesa: ['paystack', 'flutterwave'],
    chipper_wallet: ['chipper'],
    airtel_money: ['kkiapay', 'fedapay', 'cinetpay', 'lygos', 'mbiyopay', 'qosic', 'bizao']
  };

  for (const pid of (priority[method] || ['feexpay'])) {
    if (providers[pid]?.active) return pid;
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  const apiKey = req.body?.token || req.headers['x-api-key'];
  if (checkRateLimit(apiKey).allowed === false) return res.status(429).json({ error: 'Trop de requêtes' });

  const { amount, country, method, phone, email, description } = req.body;
  if (!apiKey) return res.status(401).json({ error: 'Clé API requise' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });

  try {
    const merchantSnap = await db.collection('gateway_merchants').where('apiKey', '==', apiKey).limit(1).get();
    if (merchantSnap.empty) return res.status(401).json({ error: 'Token marchand invalide' });
    const merchant = { id: merchantSnap.docs[0].id, ...merchantSnap.docs[0].data() };
    if (!merchant.active || merchant.verificationStatus !== 'approved') return res.status(403).json({ error: 'Compte non activé' });

    const providers = merchant.providers || {};
    const providerId = getBestProvider(method, providers);
    if (!providerId) return res.status(400).json({ error: 'Aucun provider disponible pour cette méthode' });

    const providerConfig = providers[providerId];
    const amountNum = parseFloat(amount);
    const commission = Math.round(amountNum * 0.01);
    const netAmount = amountNum - commission;

    const callFn = PROVIDER_CALLS[providerId];
    if (!callFn) return res.status(400).json({ error: `Provider ${providerId} non implémenté` });

    const result = await callFn(providerConfig, { amount: netAmount, phone, email, country, method, description, currency: 'XOF' });

    await db.collection('gateway_transactions').add({
      merchantId: merchant.id, amount: amountNum, commission, netAmount,
      country, method, provider: providerId, providerRef: result.reference || null,
      status: result.success ? (result.status === 'SUCCESSFUL' ? 'completed' : 'pending') : 'failed',
      description: description || 'Paiement', providerResponse: result, createdAt: new Date().toISOString()
    });

    if (result.success && result.status === 'SUCCESSFUL') {
      await db.collection('gateway_merchants').doc(merchant.id).update({
        balance: admin.firestore.FieldValue.increment(netAmount),
        totalTransactions: admin.firestore.FieldValue.increment(1),
        updatedAt: new Date().toISOString()
      });
    }

    return res.status(200).json({ success: result.success, transactionId: merchant.id, reference: result.reference, status: result.status, provider: providerId, message: result.success ? 'Paiement initié' : result.error });
  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({ error: error.message });
  }
}