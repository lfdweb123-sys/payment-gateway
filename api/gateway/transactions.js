// api/gateway/transactions.js
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET requis' });

  const apiKey = req.headers['x-api-key'] || req.query.token;
  const page = parseInt(req.query.page) || 1;
  const limit = 50;

  if (!apiKey) {
    return res.status(401).json({ error: 'Clé API requise' });
  }

  try {
    const merchantSnap = await db.collection('gateway_merchants')
      .where('apiKey', '==', apiKey)
      .limit(1)
      .get();

    if (merchantSnap.empty) {
      return res.status(401).json({ error: 'Clé API invalide' });
    }

    const merchant = { id: merchantSnap.docs[0].id, ...merchantSnap.docs[0].data() };

    const txSnap = await db.collection('gateway_transactions')
      .where('merchantId', '==', merchant.id)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();

    const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return res.status(200).json({
      success: true,
      transactions,
      page,
      total: txSnap.size
    });
  } catch (error) {
    console.error('Erreur transactions:', error);
    return res.status(500).json({ error: error.message });
  }
}