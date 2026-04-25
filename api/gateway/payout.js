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

// Templates email
function getPayoutSentTemplate(name, amount, reference) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#f9fafb;">
      <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:12px;">📤</div>
        <h2 style="color:#111827;margin:0 0 8px;">Retrait envoyé</h2>
        <p style="color:#6b7280;font-size:14px;">Bonjour ${name},</p>
        <p style="color:#6b7280;font-size:14px;">Retrait de <strong>${amount.toLocaleString()} XOF</strong> envoyé sur votre numéro.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:8px;">Réf: ${reference}</p>
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
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        sender: { name: 'Passerelle de Paiement', email: process.env.BREVO_SENDER_EMAIL || 'noreply@payment-gateway.com' },
        to: [{ email: to, name: toName || to }],
        subject, htmlContent
      })
    });
  } catch (e) { console.error('Erreur Brevo:', e); }
}

const PAYOUT_PROVIDERS = {
  feexpay: {
    name: 'FeexPay',
    payout: async (config, { amount, phone, network }) => {
      const res = await fetch('https://api.feexpay.me/api/payouts/public/transfer/global', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.FEEXPAY_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: config.FEEXPAY_SHOP_ID, amount: Math.round(amount), phoneNumber: phone, network: network || 'MTN', motif: 'Retrait' })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };
      return { success: true, reference: data.reference, status: data.status, provider: 'feexpay' };
    }
  },
  kkiapay: {
    name: 'KKiaPay',
    payout: async (config, { amount, phone }) => {
      const res = await fetch('https://api.kkiapay.me/api/v1/payouts', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Api-Key': config.KKIAPAY_PUBLIC_KEY, 'X-Private-Key': config.KKIAPAY_PRIVATE_KEY, 'X-Secret-Key': config.KKIAPAY_SECRET_KEY },
        body: JSON.stringify({ amount: Math.round(amount), phone: phone, description: 'Retrait' })
      });
      const data = await res.json();
      if (!res.ok || data.status === 'failed') return { success: false, error: data.message };
      return { success: true, reference: data.transaction_id, status: data.status, provider: 'kkiapay' };
    }
  },
  fedapay: {
    name: 'FedaPay',
    payout: async (config, { amount, phone }) => {
      const res = await fetch('https://api.fedapay.com/v1/payouts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.FEDAPAY_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amount), currency: { iso: 'XOF' }, recipient: { phone_number: { number: phone } }, description: 'Retrait' })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };
      return { success: true, reference: data.id?.toString(), status: data.status, provider: 'fedapay' };
    }
  },
  cinetpay: {
    name: 'CinetPay',
    payout: async (config, { amount, phone, network }) => {
      const res = await fetch('https://api-checkout.cinetpay.com/v2/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apikey: config.CINETPAY_API_KEY, site_id: config.CINETPAY_SITE_ID, transaction_id: `PW-${Date.now()}`, amount: Math.round(amount), currency: 'XOF', phone_number: phone, network: network || 'MTN', description: 'Retrait', notify_url: `${process.env.VITE_APP_URL}/api/webhook/cinetpay` })
      });
      const data = await res.json();
      if (data.code !== '201') return { success: false, error: data.message };
      return { success: true, reference: data.data.transaction_id, status: 'pending', provider: 'cinetpay' };
    }
  }
};

function detectNetwork(phone) {
  const p = String(phone).replace(/[^0-9]/g, '');
  if (p.startsWith('229')) {
    const prefix = p.substring(3, 5);
    if (['01','61','62','63','64','65','66','67','68','69'].includes(prefix)) return 'MTN';
    if (['51','52','53','54','55','56','57','58','59'].includes(prefix)) return 'MOOV';
    if (['41','42','43','44','45','46','47','48','49'].includes(prefix)) return 'CELTIIS BJ';
  }
  if (p.startsWith('228')) return 'TOGOCOM TG';
  if (p.startsWith('225')) return 'MTN';
  if (p.startsWith('221')) return 'ORANGE';
  return 'MTN';
}

const PAYOUT_PRIORITY = ['feexpay', 'kkiapay', 'fedapay', 'cinetpay'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  const { withdrawalId, providerId } = req.body;
  if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId requis' });

  try {
    const wSnap = await db.collection('withdrawals').doc(withdrawalId).get();
    if (!wSnap.exists) return res.status(404).json({ error: 'Retrait introuvable' });
    const w = { id: wSnap.id, ...wSnap.data() };
    if (w.status !== 'pending') return res.status(400).json({ error: 'Déjà traité' });

    const merchantSnap = await db.collection('gateway_merchants').doc(w.merchantId).get();
    if (!merchantSnap.exists) return res.status(404).json({ error: 'Marchand introuvable' });
    const merchant = merchantSnap.data();
    const providers = merchant.providers || {};

    if ((merchant.balance || 0) < w.amount) return res.status(400).json({ error: 'Solde insuffisant' });

    const network = detectNetwork(w.phone);

    if (providerId) {
      const provider = PAYOUT_PROVIDERS[providerId];
      if (!provider) return res.status(400).json({ error: 'Provider non supporté' });
      const config = providers[providerId];
      if (!config?.active) return res.status(400).json({ error: `${provider.name} non configuré` });

      const result = await provider.payout(config, { amount: w.amount, phone: w.phone, network });
      if (result.success && result.status === 'SUCCESSFUL') {
        await db.collection('withdrawals').doc(withdrawalId).update({
          status: 'completed', payoutRef: result.reference, provider: providerId, processedAt: new Date().toISOString()
        });
        await db.collection('gateway_merchants').doc(w.merchantId).update({
          balance: admin.firestore.FieldValue.increment(-w.amount), updatedAt: new Date().toISOString()
        });
        // Email
        await sendBrevoEmail({
          to: merchant.email,
          toName: merchant.name || merchant.email,
          subject: `📤 Retrait envoyé - ${w.amount.toLocaleString()} XOF`,
          htmlContent: getPayoutSentTemplate(merchant.name || merchant.email, w.amount, result.reference)
        });
      }
      return res.status(200).json({ success: result.success, reference: result.reference, status: result.status, provider: providerId });
    }

    for (const pid of PAYOUT_PRIORITY) {
      const provider = PAYOUT_PROVIDERS[pid];
      if (!provider) continue;
      const config = providers[pid];
      if (!config?.active) continue;

      const result = await provider.payout(config, { amount: w.amount, phone: w.phone, network });
      if (result.success) {
        await db.collection('withdrawals').doc(withdrawalId).update({
          status: result.status === 'SUCCESSFUL' ? 'completed' : 'pending',
          payoutRef: result.reference, provider: pid, processedAt: new Date().toISOString()
        });
        if (result.status === 'SUCCESSFUL') {
          await db.collection('gateway_merchants').doc(w.merchantId).update({
            balance: admin.firestore.FieldValue.increment(-w.amount), updatedAt: new Date().toISOString()
          });
          // Email
          await sendBrevoEmail({
            to: merchant.email,
            toName: merchant.name || merchant.email,
            subject: `📤 Retrait envoyé - ${w.amount.toLocaleString()} XOF`,
            htmlContent: getPayoutSentTemplate(merchant.name || merchant.email, w.amount, result.reference)
          });
        }
        return res.status(200).json({ success: true, reference: result.reference, status: result.status, provider: pid });
      }
    }

    return res.status(400).json({ error: 'Aucun provider payout disponible.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}