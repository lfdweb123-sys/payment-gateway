// api/webhook/[provider].js
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
  const { provider } = req.query;

  if (req.method === 'GET') {
    // Vérification webhook (certains providers font un GET first)
    return res.status(200).send('OK');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST requis' });
  }

  try {
    let reference, status, amount;

    switch (provider) {
      case 'feexpay':
      case 'cinetpay':
      case 'lygos':
      case 'mbiyopay':
      case 'qosic':
      case 'bizao':
        ({ reference, status, amount } = req.body);
        break;

      case 'stripe':
        const event = req.body;
        if (event.type === 'checkout.session.completed') {
          reference = event.data.object.id;
          status = 'SUCCESSFUL';
          amount = event.data.object.amount_total / 100;
        }
        break;

      case 'paystack':
        ({ reference } = req.body.data || {});
        status = req.body.event === 'charge.success' ? 'SUCCESSFUL' : 'PENDING';
        break;

      case 'flutterwave':
        reference = req.body.tx_ref;
        status = req.body.status === 'successful' ? 'SUCCESSFUL' : 'PENDING';
        amount = req.body.amount;
        break;

      case 'paypal':
        reference = req.body.resource?.id;
        status = req.body.event_type === 'CHECKOUT.ORDER.APPROVED' ? 'SUCCESSFUL' : 'PENDING';
        break;

      case 'kkiapay':
        reference = req.body.transaction_id;
        status = req.body.status === 'SUCCESS' ? 'SUCCESSFUL' : 'PENDING';
        break;

      case 'fedapay':
        reference = req.body.id?.toString();
        status = req.body.status === 'approved' ? 'SUCCESSFUL' : 'PENDING';
        break;

      case 'paydunya':
        reference = req.body.invoice?.token;
        status = req.body.status === 'completed' ? 'SUCCESSFUL' : 'PENDING';
        break;

      case 'hub2':
        reference = req.body.id;
        status = req.body.status === 'succeeded' ? 'SUCCESSFUL' : 'PENDING';
        break;

      case 'chipper':
        reference = req.body.id;
        status = req.body.status === 'completed' ? 'SUCCESSFUL' : 'PENDING';
        break;

      default:
        return res.status(400).json({ error: 'Provider inconnu' });
    }

    if (reference && status === 'SUCCESSFUL') {
      // Mettre à jour la transaction
      const txSnap = await db.collection('gateway_transactions')
        .where('providerRef', '==', reference)
        .limit(1)
        .get();

      if (!txSnap.empty) {
        const txDoc = txSnap.docs[0];
        await db.collection('gateway_transactions').doc(txDoc.id).update({
          status: 'completed',
          webhookData: req.body,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        console.log(`✅ Transaction ${reference} marquée comme complétée`);
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook reçu' });
  } catch (error) {
    console.error('Erreur webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}