import admin from 'firebase-admin';
import crypto from 'crypto';

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

  // Décoder le token avec signature HMAC
  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(rawToken, 'base64').toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Token invalide' });
  }

  const { amount, description, timestamp, sig, country, method, apiKey: tokenApiKey } = decoded;
  
  // Vérifier expiration (15 minutes)
  if (timestamp && Date.now() - timestamp > 15 * 60 * 1000) {
    return res.status(400).json({ error: 'Token expiré' });
  }

  // Vérifier signature HMAC si présente (token signé)
  if (sig) {
    const payloadToVerify = { amount, description, timestamp };
    if (country) payloadToVerify.country = country;
    if (method) payloadToVerify.method = method;
    
    const expectedSig = crypto
      .createHmac('sha256', process.env.GATEWAY_SECRET)
      .update(JSON.stringify(payloadToVerify))
      .digest('hex');

    if (sig !== expectedSig) {
      return res.status(403).json({ error: 'Token falsifié' });
    }
  }

  // Token simple (ancien format) ou token signé avec apiKey
  let token = rawToken;
  
  // Si c'est un token signé avec apiKey
  if (tokenApiKey && tokenApiKey.startsWith('gw_')) {
    token = tokenApiKey;
  }
  // Si c'est l'ancien format (base64 simple contenant l'apiKey)
  else if (!rawToken.startsWith('gw_')) {
    try {
      const simpleDecoded = Buffer.from(rawToken, 'base64').toString('utf8');
      if (simpleDecoded.startsWith('gw_')) token = simpleDecoded;
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
      amount: amount || null,
      description: description || 'Paiement en ligne',
      country: country || null,
      method: method || null,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}