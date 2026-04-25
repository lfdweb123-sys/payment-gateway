import admin from 'firebase-admin';
import { kkiapay } from '@kkiapay-org/nodejs-sdk';

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = req.headers['x-api-key'];
  const { transactionId } = req.body;

  if (!apiKey || !transactionId) return res.status(400).json({ error: 'Paramètres manquants' });

  try {
    // Récupérer le marchand
    const merchantSnap = await db.collection('gateway_merchants')
      .where('apiKey', '==', apiKey).limit(1).get();
    if (merchantSnap.empty) return res.status(401).json({ error: 'Marchand introuvable' });

    const merchant = { id: merchantSnap.docs[0].id, ...merchantSnap.docs[0].data() };
    const config = merchant.providers?.kkiapay;

    if (!config) return res.status(400).json({ error: 'KKiaPay non configuré' });

    // Vérifier avec le Admin SDK — les 3 clés viennent de Firestore
    const k = kkiapay({
      privatekey: config.KKIAPAY_PRIVATE_KEY,
      publickey:  config.KKIAPAY_PUBLIC_KEY,
      secretkey:  config.KKIAPAY_SECRET_KEY,
      sandbox:    false,
    });

    const tx = await k.verify(transactionId);
    if (tx.status !== 'SUCCESS') return res.status(400).json({ success: false, error: 'Transaction non confirmée' });

    const amount     = tx.amount;
    const commission = Math.round(amount * 0.01);
    const netAmount  = amount - commission;

    // Enregistrer
    await db.collection('gateway_transactions').add({
      merchantId:  merchant.id,
      amount, commission, netAmount,
      provider:    'kkiapay',
      providerRef: transactionId,
      status:      'completed',
      createdAt:   new Date().toISOString(),
    });

    // Créditer le marchand
    await db.collection('gateway_merchants').doc(merchant.id).update({
      balance:           admin.firestore.FieldValue.increment(netAmount),
      totalTransactions: admin.firestore.FieldValue.increment(1),
      updatedAt:         new Date().toISOString(),
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('KKiaPay verify error:', err);
    return res.status(500).json({ error: err.message });
  }
}