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
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  try {
    const { reference, status } = req.body;

    if (reference && status === 'SUCCESSFUL') {
      const txSnap = await db.collection('gateway_transactions')
        .where('providerRef', '==', reference).limit(1).get();

      if (!txSnap.empty) {
        await db.collection('gateway_transactions').doc(txSnap.docs[0].id).update({
          status: 'completed',
          webhookData: req.body,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook reçu' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}