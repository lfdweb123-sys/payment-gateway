/**
 * api/gateway/merchant/[token].js
 *
 * Charge les infos du marchand pour afficher la page de paiement.
 *
 * ── DEUX MODES ────────────────────────────────────────────────────────────
 *
 * MODE 1 — pid (nouveau, sécurisé) :
 *   URL : /pay?pid=a1b2c3d4-e5f6-...
 *   → on charge le payment_link depuis Firestore
 *   → l'apiKey n'est jamais dans l'URL
 *   → le pid expire après 15 minutes
 *
 * MODE 2 — token simple base64 (ancien format, rétrocompatibilité) :
 *   URL : /pay?token=Z3dfeHh4...  (btoa('gw_xxx'))
 *   → on décode et on charge directement le marchand
 *   → à déprécier progressivement
 *
 * ── RATE LIMITING ─────────────────────────────────────────────────────────
 *
 * Deux niveaux de protection contre le brute-force de PIDs :
 *
 * 1. Par IP — 20 requêtes/min par adresse IP
 *    Un attaquant ne peut pas tester plus de 20 UUID/min depuis la même IP.
 *
 * 2. Par PID manqué — si une IP fait X "not found" consécutifs → bannissement
 *    Détecte les tentatives de brute-force même depuis des IPs différentes.
 *
 * Note : En production sur Vercel, les fonctions sont stateless (reset entre
 * les invocations cold-start). Pour un rate limiting persistant, utiliser
 * Upstash Redis ou Vercel KV. La solution ci-dessous est efficace pour les
 * attaques intra-instance (même worker Vercel).
 * ─────────────────────────────────────────────────────────────────────────
 */

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

/* ─── Rate limiting en mémoire ───────────────────────────────────────────
   Deux Maps :
   - requestCounts  : nb de requêtes par IP dans la fenêtre de temps
   - failCounts     : nb de PIDs introuvables par IP (détection brute-force)
──────────────────────────────────────────────────────────────────────────*/
const requestCounts = new Map(); // { ip → [timestamps] }
const failCounts    = new Map(); // { ip → { count, bannedUntil } }

const RATE_LIMIT = {
  MAX_REQUESTS_PER_MIN:  20,    // max 20 requêtes/min par IP
  WINDOW_MS:             60_000, // fenêtre de 1 minute
  MAX_FAILS_BEFORE_BAN:  5,     // 5 PIDs "not found" → ban temporaire
  BAN_DURATION_MS:       5 * 60_000, // ban de 5 minutes
};

/**
 * Vérifie si l'IP est autorisée à faire une requête.
 * Retourne { allowed: false, reason } si bloquée.
 */
function checkRateLimit(ip) {
  const now = Date.now();

  // ── Vérifier si l'IP est bannie (trop de PIDs manqués) ─────────────────
  if (failCounts.has(ip)) {
    const fc = failCounts.get(ip);
    if (fc.bannedUntil && now < fc.bannedUntil) {
      const remaining = Math.ceil((fc.bannedUntil - now) / 1000);
      return { allowed: false, reason: `Trop de tentatives. Réessayez dans ${remaining}s.`, status: 429 };
    }
    // Ban expiré — réinitialiser
    if (fc.bannedUntil && now >= fc.bannedUntil) {
      failCounts.delete(ip);
    }
  }

  // ── Vérifier le rate limit général (requêtes/min) ───────────────────────
  if (!requestCounts.has(ip)) requestCounts.set(ip, []);
  const timestamps = requestCounts.get(ip).filter(t => now - t < RATE_LIMIT.WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT.MAX_REQUESTS_PER_MIN) {
    return { allowed: false, reason: 'Trop de requêtes. Réessayez dans 1 minute.', status: 429 };
  }
  timestamps.push(now);
  requestCounts.set(ip, timestamps);

  return { allowed: true };
}

/**
 * Enregistre un échec "PID not found" pour une IP.
 * Si le seuil est atteint, bannit l'IP temporairement.
 */
function recordFail(ip) {
  const now = Date.now();
  if (!failCounts.has(ip)) failCounts.set(ip, { count: 0, bannedUntil: null });
  const fc = failCounts.get(ip);
  fc.count += 1;
  if (fc.count >= RATE_LIMIT.MAX_FAILS_BEFORE_BAN) {
    fc.bannedUntil = now + RATE_LIMIT.BAN_DURATION_MS;
    fc.count = 0; // reset le compteur — le ban prend le relais
    console.warn(`[merchant] IP ${ip} bannie pour ${RATE_LIMIT.BAN_DURATION_MS / 1000}s (brute-force PID détecté)`);
  }
  failCounts.set(ip, fc);
}

/**
 * Réinitialise le compteur d'échecs pour une IP (après un succès).
 */
function recordSuccess(ip) {
  failCounts.delete(ip);
}

/**
 * Extrait l'IP réelle du client depuis les headers Vercel/proxy.
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/* ─── Handler principal ──────────────────────────────────────────────────*/
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token: rawToken } = req.query;
  if (!rawToken) return res.status(400).json({ error: 'Token requis' });

  // ── Rate limiting ───────────────────────────────────────────────────────
  const clientIp = getClientIp(req);
  const rl = checkRateLimit(clientIp);
  if (!rl.allowed) {
    res.setHeader('Retry-After', '60');
    return res.status(rl.status || 429).json({ error: rl.reason });
  }

  try {

    /* ══════════════════════════════════════════════════════════════════════
       MODE 1 — PID (UUID Firestore) — format sécurisé
    ══════════════════════════════════════════════════════════════════════ */
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (UUID_REGEX.test(rawToken)) {
      const linkDoc = await db.collection('payment_links').doc(rawToken).get();

      if (!linkDoc.exists) {
        // ← enregistrer l'échec — potentiel brute-force
        recordFail(clientIp);
        // Réponse volontairement vague — ne pas indiquer si le PID existe ou non
        return res.status(404).json({ error: 'Lien de paiement introuvable ou expiré.' });
      }

      const link = linkDoc.data();

      // Vérifier expiration
      if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
        recordFail(clientIp);
        return res.status(400).json({ error: 'Lien de paiement expiré. Veuillez en générer un nouveau.' });
      }

      // Charger le marchand
      const merchantDoc = await db.collection('gateway_merchants').doc(link.merchantId).get();

      if (!merchantDoc.exists) {
        recordFail(clientIp);
        return res.status(404).json({ error: 'Marchand introuvable.' });
      }

      const merchant = merchantDoc.data();

      if (!merchant.active || merchant.verificationStatus !== 'approved') {
        return res.status(403).json({ error: 'Compte marchand non activé.' });
      }

      // ← succès : réinitialiser le compteur d'échecs pour cette IP
      recordSuccess(clientIp);

      const providers       = merchant.providers || {};
      const activeProviders = Object.entries(providers)
        .filter(([, cfg]) => cfg.active)
        .map(([key]) => key);

      const kkiapayPublicKey = providers.kkiapay?.active
        ? (providers.kkiapay?.KKIAPAY_PUBLIC_KEY || null)
        : null;

      return res.status(200).json({
        success:            true,
        id:                 link.merchantId,
        name:               merchant.name,
        active:             merchant.active,
        verificationStatus: merchant.verificationStatus,
        activeProviders,
        kkiapayPublicKey,
        apiKey:             link.apiKey,
        amount:             link.amount      || null,
        description:        link.description || 'Paiement en ligne',
        country:            link.country     || null,
        method:             link.method      || null,
      });
    }

    /* ══════════════════════════════════════════════════════════════════════
       MODE 2 — TOKEN BASE64 SIMPLE (rétrocompatibilité)
    ══════════════════════════════════════════════════════════════════════ */
    let apiKey = null;

    if (rawToken.startsWith('gw_')) {
      apiKey = rawToken;
    } else {
      try {
        const decoded = Buffer.from(rawToken, 'base64').toString('utf8');
        if (decoded.startsWith('gw_')) {
          apiKey = decoded;
        } else {
          recordFail(clientIp);
          return res.status(400).json({ error: 'Format de token non reconnu.' });
        }
      } catch {
        recordFail(clientIp);
        return res.status(400).json({ error: 'Token invalide.' });
      }
    }

    if (!apiKey) {
      recordFail(clientIp);
      return res.status(400).json({ error: 'Impossible d\'extraire la clé API.' });
    }

    const merchantSnap = await db.collection('gateway_merchants')
      .where('apiKey', '==', apiKey)
      .limit(1)
      .get();

    if (merchantSnap.empty) {
      recordFail(clientIp);
      return res.status(404).json({ error: 'Marchand introuvable.' });
    }

    const merchantDoc = merchantSnap.docs[0];
    const merchant    = merchantDoc.data();

    recordSuccess(clientIp);

    const providers       = merchant.providers || {};
    const activeProviders = Object.entries(providers)
      .filter(([, cfg]) => cfg.active)
      .map(([key]) => key);

    const kkiapayPublicKey = providers.kkiapay?.active
      ? (providers.kkiapay?.KKIAPAY_PUBLIC_KEY || null)
      : null;

    return res.status(200).json({
      success:            true,
      id:                 merchantDoc.id,
      name:               merchant.name,
      active:             merchant.active,
      verificationStatus: merchant.verificationStatus,
      activeProviders,
      kkiapayPublicKey,
      apiKey,
      amount:             null,
      description:        'Paiement en ligne',
      country:            null,
      method:             null,
    });

  } catch (error) {
    console.error('Erreur merchant/[token]:', error);
    return res.status(500).json({ error: error.message });
  }
}