// api/gateway/pay.js
const PROVIDERS = {
  feexpay: require('../../src/services/providers/feexpay').default,
  stripe: require('../../src/services/providers/stripe').default,
  paystack: require('../../src/services/providers/paystack').default,
  flutterwave: require('../../src/services/providers/flutterwave').default
};

const admin = require('firebase-admin');
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  try {
    const { token, amount, country, method, phone, description, provider } = req.body;

    // Vérifier le token marchand
    const merchantSnap = await db.collection('gateway_merchants')
      .where('apiKey', '==', token || req.headers['x-api-key'])
      .limit(1).get();

    if (merchantSnap.empty) {
      return res.status(401).json({ error: 'Token marchand invalide' });
    }

    const merchant = { id: merchantSnap.docs[0].id, ...merchantSnap.docs[0].data() };

    // Calculer la commission (1%)
    const amountNum = parseFloat(amount);
    const commission = Math.round(amountNum * 0.01);
    const netAmount = amountNum - commission;

    // Initier le paiement via le provider
    const providerService = PROVIDERS[provider];
    if (!providerService) {
      return res.status(400).json({ error: 'Provider non supporté' });
    }

    const paymentResult = await providerService.initPayment({
      amount: netAmount,
      phone,
      country,
      method,
      description,
      merchantRef: merchant.id
    });

    if (!paymentResult.success) {
      return res.status(400).json({ error: paymentResult.error });
    }

    // Enregistrer la transaction
    const transactionRef = await db.collection('gateway_transactions').add({
      merchantId: merchant.id,
      amount: amountNum,
      commission,
      netAmount,
      country,
      method,
      provider,
      providerRef: paymentResult.reference,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    // Mettre à jour le solde du marchand
    await db.collection('gateway_merchants').doc(merchant.id).update({
      balance: admin.firestore.FieldValue.increment(netAmount),
      totalTransactions: admin.firestore.FieldValue.increment(1),
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      transactionId: transactionRef.id,
      reference: paymentResult.reference,
      message: paymentResult.message || 'Paiement initié'
    });
  } catch (error) {
    console.error('Erreur gateway:', error);
    return res.status(500).json({ error: error.message });
  }
}