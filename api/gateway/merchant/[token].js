// api/gateway/merchant/[token].js
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET requis' });

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token requis' });
  }

  try {
    const merchantSnap = await db.collection('gateway_merchants')
      .where('apiKey', '==', token)
      .limit(1)
      .get();

    if (merchantSnap.empty) {
      return res.status(404).json({ error: 'Marchand introuvable' });
    }

    const merchant = { id: merchantSnap.docs[0].id, ...merchantSnap.docs[0].data() };

    return res.status(200).json({
      success: true,
      name: merchant.name,
      website: merchant.website,
      country: merchant.country,
      active: merchant.active
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}