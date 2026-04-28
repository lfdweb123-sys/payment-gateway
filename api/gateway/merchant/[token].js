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

/* ─── Rate limiting simple en mémoire ─────────────────────
   Max 20 requêtes / minute par IP.
   En production, remplacer par Redis (Upstash, etc.)
──────────────────────────────────────────────────────────── */
const rateLimitMap = new Map();
function isRateLimited(ip) {
  const now   = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count > 20;
}

export default async function handler(req, res) {
  /* ── CORS : autoriser uniquement votre domaine ── */
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://votre-domaine.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Méthode non autorisée' });

  /* ── Rate limiting ── */
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Trop de requêtes' });

  const { token: rawToken } = req.query;
  if (!rawToken) return res.status(400).json({ error: 'Token requis' });

  /* ── Décodage base64 → clé brute ── */
  let apiKey = rawToken;
  if (!rawToken.startsWith('gw_')) {
    try {
      const decoded = Buffer.from(rawToken, 'base64').toString('utf8');
      if (decoded.startsWith('gw_')) apiKey = decoded;
    } catch {
      return res.status(400).json({ error: 'Token invalide' });
    }
  }

  /* ── Validation format de la clé ── */
  if (!/^gw_[a-zA-Z0-9_-]{10,}$/.test(apiKey)) {
    return res.status(400).json({ error: 'Format de token invalide' });
  }

  try {
    const snap = await db.collection('gateway_merchants')
      .where('apiKey', '==', apiKey)
      .limit(1)
      .get();

    if (snap.empty) {
      /* Délai volontaire pour ralentir le brute-force */
      await new Promise(r => setTimeout(r, 300));
      return res.status(404).json({ error: 'Marchand introuvable' });
    }

    const merchantDoc  = snap.docs[0];
    const merchant     = { id: merchantDoc.id, ...merchantDoc.data() };

    if (!merchant.active) {
      return res.status(403).json({ error: 'Compte marchand inactif' });
    }

    const providers = merchant.providers || {};
    const activeProviders = Object.entries(providers)
      .filter(([, cfg]) => cfg.active)
      .map(([key]) => key);

    /* Exposer uniquement la clé PUBLIQUE KKiaPay — jamais les clés secrètes */
    const kkiapayPublicKey = providers.kkiapay?.active
      ? providers.kkiapay?.KKIAPAY_PUBLIC_KEY || null
      : null;

    return res.status(200).json({
      success:            true,
      id:                 merchant.id,
      name:               merchant.name,
      active:             merchant.active,
      verificationStatus: merchant.verificationStatus,
      activeProviders,
      kkiapayPublicKey,
    });

  } catch (error) {
    console.error('[merchant] Erreur:', error.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}