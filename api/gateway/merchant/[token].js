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
 *   → utilisé quand le marchand encode juste sa clé en base64
 *   → l'apiKey EST récupérable depuis ce token (base64 non sécurisé)
 *   → à déprécier progressivement
 *
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token: rawToken } = req.query;
  if (!rawToken) return res.status(400).json({ error: 'Token requis' });

  try {

    /* ══════════════════════════════════════════════════════════════════════
       MODE 1 — PID (UUID Firestore) — format sécurisé
       Détection : UUID v4 → xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    ══════════════════════════════════════════════════════════════════════ */
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (UUID_REGEX.test(rawToken)) {
      // Charger le payment link depuis Firestore
      const linkDoc = await db.collection('payment_links').doc(rawToken).get();

      if (!linkDoc.exists) {
        return res.status(404).json({ error: 'Lien de paiement introuvable ou expiré.' });
      }

      const link = linkDoc.data();

      // Vérifier expiration
      if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
        return res.status(400).json({ error: 'Lien de paiement expiré. Veuillez en générer un nouveau.' });
      }

      // Vérifier que le lien n'a pas déjà été utilisé (optionnel)
      // if (link.used) return res.status(400).json({ error: 'Lien déjà utilisé.' });

      // Charger le marchand
      const merchantDoc = await db.collection('gateway_merchants').doc(link.merchantId).get();

      if (!merchantDoc.exists) {
        return res.status(404).json({ error: 'Marchand introuvable.' });
      }

      const merchant = merchantDoc.data();

      if (!merchant.active || merchant.verificationStatus !== 'approved') {
        return res.status(403).json({ error: 'Compte marchand non activé.' });
      }

      const providers       = merchant.providers || {};
      const activeProviders = Object.entries(providers)
        .filter(([, cfg]) => cfg.active)
        .map(([key]) => key);

      const kkiapayPublicKey = providers.kkiapay?.active
        ? (providers.kkiapay?.KKIAPAY_PUBLIC_KEY || null)
        : null;

      // L'apiKey est retournée UNIQUEMENT pour que pay.js puisse l'utiliser
      // dans le header x-api-key — elle ne s'affiche PAS dans l'URL
      return res.status(200).json({
        success:            true,
        id:                 link.merchantId,
        name:               merchant.name,
        active:             merchant.active,
        verificationStatus: merchant.verificationStatus,
        activeProviders,
        kkiapayPublicKey,
        // ← apiKey retournée pour le header, pas pour l'URL
        apiKey:             link.apiKey,
        // Données du paiement préremplies
        amount:             link.amount      || null,
        description:        link.description || 'Paiement en ligne',
        country:            link.country     || null,
        method:             link.method      || null,
      });
    }

    /* ══════════════════════════════════════════════════════════════════════
       MODE 2 — TOKEN BASE64 SIMPLE (rétrocompatibilité)
       btoa('gw_xxx') → décodage direct
       ⚠️  La clé est techniquement récupérable depuis le token
       mais ce mode reste utilisable pour les intégrations existantes.
    ══════════════════════════════════════════════════════════════════════ */
    let apiKey = null;

    // Cas A : rawToken est déjà la clé brute
    if (rawToken.startsWith('gw_')) {
      apiKey = rawToken;
    }
    // Cas B : rawToken est du base64 simple de la clé
    else {
      try {
        const decoded = Buffer.from(rawToken, 'base64').toString('utf8');
        if (decoded.startsWith('gw_')) {
          apiKey = decoded;
        } else {
          return res.status(400).json({
            error: 'Format de token non reconnu. Utilisez pid= pour les nouveaux liens.',
          });
        }
      } catch {
        return res.status(400).json({ error: 'Token invalide.' });
      }
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'Impossible d\'extraire la clé API.' });
    }

    // Charger le marchand depuis l'apiKey
    const merchantSnap = await db.collection('gateway_merchants')
      .where('apiKey', '==', apiKey)
      .limit(1)
      .get();

    if (merchantSnap.empty) {
      return res.status(404).json({ error: 'Marchand introuvable.' });
    }

    const merchantDoc = merchantSnap.docs[0];
    const merchant    = merchantDoc.data();

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