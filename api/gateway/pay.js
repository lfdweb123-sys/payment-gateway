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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  const apiKey = req.body?.token || req.headers['x-api-key'];
  
  const rateLimit = checkRateLimit(apiKey);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Trop de requêtes', retryAfter: rateLimit.retryAfter });
  }

  const { amount, description } = req.body;

  if (!apiKey) return res.status(401).json({ error: 'Clé API requise' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });

  try {
    const merchantSnap = await db.collection('gateway_merchants')
      .where('apiKey', '==', apiKey).limit(1).get();

    if (merchantSnap.empty) return res.status(401).json({ error: 'Token marchand invalide' });
    const merchant = { id: merchantSnap.docs[0].id, ...merchantSnap.docs[0].data() };
    if (!merchant.active) return res.status(403).json({ error: 'Compte marchand désactivé' });

    const transactionRef = await db.collection('gateway_transactions').add({
      merchantId: merchant.id,
      amount: parseFloat(amount),
      commission: Math.round(parseFloat(amount) * 0.01),
      description: description || 'Paiement',
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      transactionId: transactionRef.id,
      paymentUrl: `${process.env.VITE_APP_URL || 'https://payment-gateway.vercel.app'}/pay?token=${apiKey}&amount=${amount}&desc=${encodeURIComponent(description || '')}`,
      status: 'pending'
    });
  } catch (error) {
    console.error('Erreur gateway:', error);
    return res.status(500).json({ error: error.message });
  }
}