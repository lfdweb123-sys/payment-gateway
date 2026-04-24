const admin = require('firebase-admin');

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

function checkRateLimit(key) {
  const now = Date.now();
  const k = key || 'anonymous';
  if (!requestCounts.has(k)) requestCounts.set(k, []);
  const timestamps = requestCounts.get(k).filter(t => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000) };
  }
  timestamps.push(now);
  requestCounts.set(k, timestamps);
  return { allowed: true };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET requis' });

  const apiKey = req.headers['x-api-key'] || req.query.token;
  if (!apiKey) return res.status(401).json({ error: 'Clé API requise' });

  const rateLimit = checkRateLimit(apiKey);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Trop de requêtes', retryAfter: rateLimit.retryAfter });
  }

  try {
    const merchantSnap = await db.collection('gateway_merchants').where('apiKey', '==', apiKey).limit(1).get();
    if (merchantSnap.empty) return res.status(401).json({ error: 'Clé API invalide' });

    const merchant = merchantSnap.docs[0];
    const txSnap = await db.collection('gateway_transactions')
      .where('merchantId', '==', merchant.id).orderBy('createdAt', 'desc')
      .limit(50).get();

    const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ success: true, transactions, total: txSnap.size });
  } catch (error) {
    console.error('Erreur transactions:', error);
    return res.status(500).json({ error: error.message });
  }
}