// api/gateway/verify/[reference].js
const admin = require('firebase-admin');
const PROVIDERS = {
  feexpay: require('../../../src/services/providers/feexpay').default,
  stripe: require('../../../src/services/providers/stripe').default,
  paystack: require('../../../src/services/providers/paystack').default,
  flutterwave: require('../../../src/services/providers/flutterwave').default,
  kkiapay: require('../../../src/services/providers/kkiapay').default,
  fedapay: require('../../../src/services/providers/fedapay').default,
  paydunya: require('../../../src/services/providers/paydunya').default,
  cinetpay: require('../../../src/services/providers/cinetpay').default,
  lygos: require('../../../src/services/providers/lygos').default,
  paypal: require('../../../src/services/providers/paypal').default,
  mbiyopay: require('../../../src/services/providers/mbiyopay').default,
  qosic: require('../../../src/services/providers/qosic').default,
  bizao: require('../../../src/services/providers/bizao').default,
  hub2: require('../../../src/services/providers/hub2').default,
  chipper: require('../../../src/services/providers/chipper').default
};

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET requis' });

  const { reference } = req.query;
  
  if (!reference) {
    return res.status(400).json({ error: 'Référence requise' });
  }

  try {
    // Chercher la transaction dans Firestore
    const txSnap = await db.collection('gateway_transactions')
      .where('providerRef', '==', reference)
      .limit(1)
      .get();

    if (txSnap.empty) {
      // Chercher par ID de transaction
      const txDoc = await db.collection('gateway_transactions').doc(reference).get();
      if (!txDoc.exists) {
        return res.status(404).json({ error: 'Transaction introuvable' });
      }
      
      const tx = { id: txDoc.id, ...txDoc.data() };
      const provider = PROVIDERS[tx.provider];
      
      if (!provider) {
        return res.status(200).json({ success: true, status: tx.status, transaction: tx });
      }

      const result = await provider.verifyPayment(tx.providerRef);
      
      // Mettre à jour le statut si différent
      if (result.success && result.status !== tx.status) {
        await db.collection('gateway_transactions').doc(reference).update({
          status: result.status === 'SUCCESSFUL' ? 'completed' : 'failed',
          updatedAt: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        status: result.status || tx.status,
        reference: tx.providerRef,
        transaction: tx
      });
    }

    const tx = { id: txSnap.docs[0].id, ...txSnap.docs[0].data() };
    const provider = PROVIDERS[tx.provider];
    
    if (!provider) {
      return res.status(200).json({ success: true, status: tx.status, transaction: tx });
    }

    const result = await provider.verifyPayment(reference);
    
    if (result.success && result.status !== tx.status) {
      await db.collection('gateway_transactions').doc(tx.id).update({
        status: result.status === 'SUCCESSFUL' ? 'completed' : 'failed',
        updatedAt: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      status: result.status || tx.status,
      reference,
      transaction: tx
    });
  } catch (error) {
    console.error('Erreur vérification:', error);
    return res.status(500).json({ error: error.message });
  }
}