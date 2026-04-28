import crypto from 'crypto';
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'Clé API requise' });

  const { amount, description, country, method } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });
  if (!description) return res.status(400).json({ error: 'Description requise' });

  try {
    // Vérifier le marchand
    const merchantSnap = await db.collection('gateway_merchants')
      .where('apiKey', '==', apiKey)
      .limit(1)
      .get();

    if (merchantSnap.empty) return res.status(404).json({ error: 'Marchand introuvable' });

    // Générer le payload
    const payload = { amount, description, timestamp: Date.now() };
    if (country) payload.country = country;
    if (method) payload.method = method;

    // Signer avec HMAC (GATEWAY_SECRET est dans les variables d'env Vercel)
    const sig = crypto
      .createHmac('sha256', process.env.GATEWAY_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    const tokenData = { ...payload, sig };
    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

    const baseUrl = process.env.VITE_APP_URL || 'https://payment-gateway-iota-bay.vercel.app';
    const url = `${baseUrl}/pay?token=${token}`;

    return res.status(200).json({ success: true, url, token });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}