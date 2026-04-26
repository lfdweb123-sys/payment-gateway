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

/* ─── Email Brevo ────────────────────────────────────────────────────────── */
function getPayoutSentTemplate(name, amount, reference) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#f9fafb;">
      <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:12px;">📤</div>
        <h2 style="color:#111827;margin:0 0 8px;">Retrait en cours</h2>
        <p style="color:#6b7280;font-size:14px;">Bonjour ${name},</p>
        <p style="color:#6b7280;font-size:14px;">Votre retrait de <strong>${Number(amount).toLocaleString('fr-FR')} XOF</strong> a été initié.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:8px;">Réf: ${reference}</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:4px;">Vous recevrez les fonds dans quelques minutes.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Passerelle de Paiement</p>
      </div>
    </div>`;
}

async function sendBrevoEmail({ to, toName, subject, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: 'Passerelle de Paiement', email: process.env.BREVO_SENDER_EMAIL || 'noreply@payment-gateway.com' },
        to: [{ email: to, name: toName || to }],
        subject, htmlContent,
      }),
    });
  } catch (e) { console.error('Erreur Brevo:', e); }
}

/* ─── Providers payout ───────────────────────────────────────────────────── */
const PAYOUT_PROVIDERS = {
  feexpay: {
    name: 'FeexPay',
    payout: async (config, { amount, phone, network }) => {
      const NETWORK_MAP = { MTN: 'mtn', MOOV: 'moov', 'CELTIIS BJ': 'celtiis_bj', TOGOCOM: 'togocom_tg', ORANGE: 'orange' };
      const segment = NETWORK_MAP[network] || 'mtn';
      const res = await fetch(
        `https://api.feexpay.me/api/transactions/public/payout/${segment}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${config.FEEXPAY_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ shop: config.FEEXPAY_SHOP_ID, amount: Math.round(amount), phoneNumber: phone, description: 'Retrait' }),
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };
      return { success: true, reference: data.reference, status: data.status || 'pending', provider: 'feexpay' };
    },
  },

  kkiapay: {
    name: 'KKiaPay',
    payout: async (config, { amount, phone }) => {
      const res = await fetch('https://api.kkiapay.me/api/v1/payouts', {
        method: 'POST',
        headers: {
          'Accept': 'application/json', 'Content-Type': 'application/json',
          'X-Api-Key':     config.KKIAPAY_PUBLIC_KEY,
          'X-Private-Key': config.KKIAPAY_PRIVATE_KEY,
          'X-Secret-Key':  config.KKIAPAY_SECRET_KEY,
        },
        body: JSON.stringify({ amount: Math.round(amount), phone, description: 'Retrait' }),
      });
      const data = await res.json();
      if (!res.ok || data.status === 'failed') return { success: false, error: data.message };
      return { success: true, reference: data.transaction_id, status: data.status || 'pending', provider: 'kkiapay' };
    },
  },

  fedapay: {
    name: 'FedaPay',
    payout: async (config, { amount, phone }) => {
      const base = config.FEDAPAY_ENV === 'sandbox'
        ? 'https://sandbox-api.fedapay.com/v1'
        : 'https://api.fedapay.com/v1';
      const res = await fetch(`${base}/payouts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.FEDAPAY_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:    Math.round(amount),
          currency:  { iso: 'XOF' },
          recipient: { phone_number: { number: phone } },
          description: 'Retrait',
        }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };
      return { success: true, reference: data.id?.toString(), status: data.status || 'pending', provider: 'fedapay' };
    },
  },

  cinetpay: {
    name: 'CinetPay',
    payout: async (config, { amount, phone, network }) => {
      const res = await fetch('https://api-checkout.cinetpay.com/v2/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey:         config.CINETPAY_API_KEY,
          site_id:        config.CINETPAY_SITE_ID,
          transaction_id: `PW-${Date.now()}`,
          amount:         Math.round(amount),
          currency:       'XOF',
          phone_number:   phone,
          network:        network || 'MTN',
          description:    'Retrait',
          notify_url:     `${process.env.VITE_APP_URL}/api/webhook/cinetpay`,
        }),
      });
      const data = await res.json();
      if (data.code !== '201') return { success: false, error: data.message };
      return { success: true, reference: data.data?.transaction_id, status: 'pending', provider: 'cinetpay' };
    },
  },
};

/* ─── Détection réseau depuis le numéro ──────────────────────────────────── */
function detectNetwork(phone) {
  const p = String(phone).replace(/[^0-9]/g, '');
  if (p.startsWith('229')) {
    const prefix = p.substring(3, 5);
    if (['01','61','62','63','64','65','66','67','68','69'].includes(prefix)) return 'MTN';
    if (['51','52','53','54','55','56','57','58','59'].includes(prefix)) return 'MOOV';
    if (['41','42','43','44','45','46','47','48','49'].includes(prefix)) return 'CELTIIS BJ';
  }
  if (p.startsWith('228')) return 'TOGOCOM';
  if (p.startsWith('225')) return 'MTN';
  if (p.startsWith('221')) return 'ORANGE';
  return 'MTN';
}

const PAYOUT_PRIORITY = ['feexpay', 'kkiapay', 'fedapay', 'cinetpay'];

/* ─── Handler ────────────────────────────────────────────────────────────── */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'POST requis' });

  const { withdrawalId, providerId } = req.body;
  if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId requis' });

  try {
    const wSnap = await db.collection('withdrawals').doc(withdrawalId).get();
    if (!wSnap.exists)        return res.status(404).json({ error: 'Retrait introuvable' });
    const w = { id: wSnap.id, ...wSnap.data() };
    if (w.status !== 'pending') return res.status(400).json({ error: 'Déjà traité' });

    const merchantSnap = await db.collection('gateway_merchants').doc(w.merchantId).get();
    if (!merchantSnap.exists) return res.status(404).json({ error: 'Marchand introuvable' });
    const merchant  = merchantSnap.data();
    const providers = merchant.providers || {};

    if ((merchant.balance || 0) < w.amount) {
      return res.status(400).json({ error: 'Solde insuffisant' });
    }

    // ⚠️  Décrémenter le solde IMMÉDIATEMENT pour éviter les doubles retraits
    // Le statut du retrait reste 'processing' jusqu'à confirmation webhook
    await db.collection('gateway_merchants').doc(w.merchantId).update({
      balance:   admin.firestore.FieldValue.increment(-w.amount),
      updatedAt: new Date().toISOString(),
    });

    const network = detectNetwork(w.phone);

    // Exécuter le payout avec le provider choisi ou par ordre de priorité
    const providerIds = providerId ? [providerId] : PAYOUT_PRIORITY;

    for (const pid of providerIds) {
      const provider = PAYOUT_PROVIDERS[pid];
      if (!provider) continue;
      const config = providers[pid];
      if (!config?.active) continue;

      const result = await provider.payout(config, { amount: w.amount, phone: w.phone, network });

      if (result.success) {
        // Marquer le retrait comme 'processing' (confirmation via webhook)
        await db.collection('withdrawals').doc(withdrawalId).update({
          status:      'processing',
          payoutRef:   result.reference,
          provider:    pid,
          processedAt: new Date().toISOString(),
        });

        // Email d'initiation (pas de confirmation — ça viendra via webhook)
        await sendBrevoEmail({
          to:          merchant.email,
          toName:      merchant.name || merchant.email,
          subject:     `📤 Retrait en cours — ${Number(w.amount).toLocaleString('fr-FR')} XOF`,
          htmlContent: getPayoutSentTemplate(merchant.name || merchant.email, w.amount, result.reference),
        });

        return res.status(200).json({
          success:   true,
          reference: result.reference,
          status:    result.status,
          provider:  pid,
        });
      }

      console.warn(`Payout ${pid} échoué: ${result.error}`);
    }

    // Tous les providers ont échoué — rembourser le solde
    await db.collection('gateway_merchants').doc(w.merchantId).update({
      balance:   admin.firestore.FieldValue.increment(w.amount),
      updatedAt: new Date().toISOString(),
    });
    await db.collection('withdrawals').doc(withdrawalId).update({
      status:    'failed',
      updatedAt: new Date().toISOString(),
    });

    return res.status(400).json({ error: 'Aucun provider payout disponible.' });

  } catch (error) {
    console.error('Erreur payout:', error);
    return res.status(500).json({ error: error.message });
  }
}