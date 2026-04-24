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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { reference } = req.query;
  if (!reference) return res.status(400).json({ error: 'Référence requise' });

  try {
    const txSnap = await db.collection('gateway_transactions')
      .where('providerRef', '==', reference).limit(1).get();

    if (!txSnap.empty) {
      const tx = { id: txSnap.docs[0].id, ...txSnap.docs[0].data() };
      return res.status(200).json({ success: true, status: tx.status, reference: tx.providerRef, transaction: tx });
    }

    const txDoc = await db.collection('gateway_transactions').doc(reference).get();
    if (txDoc.exists) {
      const tx = { id: txDoc.id, ...txDoc.data() };
      return res.status(200).json({ success: true, status: tx.status, reference, transaction: tx });
    }

    return res.status(404).json({ error: 'Transaction introuvable' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}