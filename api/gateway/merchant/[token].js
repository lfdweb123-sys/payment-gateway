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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token: rawToken } = req.query;
  if (!rawToken) return res.status(400).json({ error: 'Token requis' });

  // Décoder le token si encodé en base64
  let token = rawToken;
  if (!rawToken.startsWith('gw_')) {
    try {
      const decoded = Buffer.from(rawToken, 'base64').toString('utf8');
      if (decoded.startsWith('gw_')) token = decoded;
    } catch {}
  }

  try {
    const merchantSnap = await db.collection('gateway_merchants')
      .where('apiKey', '==', token)
      .limit(1)
      .get();

    if (merchantSnap.empty) return res.status(404).json({ error: 'Marchand introuvable' });

    const merchantDoc = merchantSnap.docs[0];
    const merchant = { id: merchantDoc.id, ...merchantDoc.data() };

    const providers = merchant.providers || {};
    const activeProviders = Object.entries(providers)
      .filter(([, config]) => config.active)
      .map(([key]) => key);

    // Exposer uniquement la PUBLIC KEY de KKiaPay (jamais private/secret)
    const kkiapayPublicKey = providers.kkiapay?.active
      ? providers.kkiapay?.KKIAPAY_PUBLIC_KEY || null
      : null;

    return res.status(200).json({
      success: true,
      id: merchant.id,
      name: merchant.name,
      active: merchant.active,
      verificationStatus: merchant.verificationStatus,
      activeProviders,
      kkiapayPublicKey,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}