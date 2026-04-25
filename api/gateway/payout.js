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

// Payout réel via FeexPay
async function processFeexPayPayout({ token, shopId, amount, phone, network }) {
  const url = 'https://api.feexpay.me/api/payouts/public/transfer/global';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop: shopId, amount: Math.round(amount), phoneNumber: phone, network: network || 'MTN', motif: 'Retrait' })
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message || 'Erreur FeexPay' };
    return { success: true, reference: data.reference, status: data.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function detectNetwork(phone) {
  const p = String(phone).replace(/[^0-9]/g, '');
  if (p.startsWith('229')) {
    const prefix = p.substring(3,5);
    if (['01','61','62','63','64','65','66','67','68','69'].includes(prefix)) return 'MTN';
    if (['51','52','53','54','55','56','57','58','59'].includes(prefix)) return 'MOOV';
    if (['41','42','43','44','45','46','47','48','49'].includes(prefix)) return 'CELTIIS BJ';
  }
  return 'MTN';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  const { withdrawalId } = req.body;
  if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId requis' });

  try {
    const wSnap = await db.collection('withdrawals').doc(withdrawalId).get();
    if (!wSnap.exists) return res.status(404).json({ error: 'Retrait introuvable' });
    const w = { id: wSnap.id, ...wSnap.data() };
    if (w.status !== 'pending') return res.status(400).json({ error: 'Ce retrait a déjà été traité' });

    // Récupérer les clés FeexPay du marchand
    const merchantSnap = await db.collection('gateway_merchants').doc(w.merchantId).get();
    if (!merchantSnap.exists) return res.status(404).json({ error: 'Marchand introuvable' });
    const merchant = merchantSnap.data();
    const feexpay = merchant.providers?.feexpay;
    if (!feexpay?.active) return res.status(400).json({ error: 'FeexPay non configuré' });

    // Vérifier le solde
    if ((merchant.balance || 0) < w.amount) return res.status(400).json({ error: 'Solde insuffisant' });

    const network = detectNetwork(w.phone);
    const result = await processFeexPayPayout({
      token: feexpay.FEEXPAY_TOKEN,
      shopId: feexpay.FEEXPAY_SHOP_ID,
      amount: w.amount,
      phone: w.phone,
      network
    });

    if (result.success) {
      await db.collection('withdrawals').doc(withdrawalId).update({
        status: result.status === 'SUCCESSFUL' ? 'completed' : 'pending',
        payoutRef: result.reference,
        processedAt: new Date().toISOString()
      });

      if (result.status === 'SUCCESSFUL') {
        await db.collection('gateway_merchants').doc(w.merchantId).update({
          balance: admin.firestore.FieldValue.increment(-w.amount),
          updatedAt: new Date().toISOString()
        });
      }
    }

    return res.status(200).json({ success: result.success, reference: result.reference, status: result.status });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}