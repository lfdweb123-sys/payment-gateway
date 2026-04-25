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

export default async function handler(req, res) {
  const { provider } = req.query;

  // Certains providers font un GET pour vérifier l'URL
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  try {
    let reference, status, amount;

    // Parser selon le provider
    switch (provider) {
      case 'feexpay':
        reference = req.body.reference;
        status = req.body.status;
        break;

      case 'stripe':
        if (req.body.type === 'checkout.session.completed') {
          reference = req.body.data?.object?.id;
          status = 'SUCCESSFUL';
        }
        break;

      case 'paystack':
        if (req.body.event === 'charge.success') {
          reference = req.body.data?.reference;
          status = 'SUCCESSFUL';
        }
        break;

      case 'flutterwave':
        if (req.body.status === 'successful') {
          reference = req.body.tx_ref;
          status = 'SUCCESSFUL';
          amount = req.body.amount;
        }
        break;

      case 'paypal':
        if (req.body.event_type === 'CHECKOUT.ORDER.APPROVED') {
          reference = req.body.resource?.id;
          status = 'SUCCESSFUL';
        }
        break;

      case 'kkiapay':
        reference = req.body.transaction_id;
        status = req.body.status === 'SUCCESS' ? 'SUCCESSFUL' : req.body.status;
        break;

      case 'fedapay':
        reference = req.body.id?.toString();
        status = req.body.status === 'approved' ? 'SUCCESSFUL' : req.body.status;
        break;

      case 'paydunya':
        reference = req.body.invoice?.token;
        status = req.body.status === 'completed' ? 'SUCCESSFUL' : req.body.status;
        break;

      case 'cinetpay':
        reference = req.body.transaction_id;
        status = req.body.status === 'ACCEPTED' ? 'SUCCESSFUL' : req.body.status;
        break;

      case 'lygos':
      case 'mbiyopay':
      case 'qosic':
      case 'bizao':
      case 'hub2':
        reference = req.body.reference || req.body.id;
        status = (req.body.status === 'completed' || req.body.status === 'success') ? 'SUCCESSFUL' : req.body.status;
        break;

      case 'chipper':
        reference = req.body.id;
        status = req.body.status === 'completed' ? 'SUCCESSFUL' : req.body.status;
        break;

      default:
        // Format générique
        reference = req.body.reference || req.body.transaction_id || req.body.id;
        status = req.body.status === 'SUCCESSFUL' || req.body.status === 'success' || req.body.status === 'completed' ? 'SUCCESSFUL' : req.body.status;
    }

    if (reference && status === 'SUCCESSFUL') {
      // Trouver la transaction par providerRef
      const txSnap = await db.collection('gateway_transactions')
        .where('providerRef', '==', reference)
        .limit(1)
        .get();

      if (!txSnap.empty) {
        const txDoc = txSnap.docs[0];
        const tx = txDoc.data();

        // Ne mettre à jour que si pas déjà completed
        if (tx.status !== 'completed') {
          // Mettre à jour le statut de la transaction
          await db.collection('gateway_transactions').doc(txDoc.id).update({
            status: 'completed',
            webhookData: req.body,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          // Créditer le marchand
          if (tx.merchantId) {
            const netAmount = tx.netAmount || tx.amount || 0;
            await db.collection('gateway_merchants').doc(tx.merchantId).update({
              balance: admin.firestore.FieldValue.increment(netAmount),
              totalTransactions: admin.firestore.FieldValue.increment(1),
              updatedAt: new Date().toISOString()
            });
          }

          console.log(`✅ Paiement confirmé : ${reference} - ${netAmount} XOF crédité au marchand ${tx.merchantId}`);
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook reçu' });
  } catch (error) {
    console.error('Erreur webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}