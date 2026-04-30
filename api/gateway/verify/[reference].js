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

  console.log('🔍 [VERIFY] Recherche transaction pour:', reference);

  try {
    let txDoc = null;
    let foundBy = null;

    // 1. Chercher par ID Firestore (document ID)
    txDoc = await db.collection('gateway_transactions').doc(reference).get();
    if (txDoc.exists) {
      foundBy = 'document ID';
      console.log(`✅ Trouvé par document ID: ${reference}`);
    }

    // 2. Chercher par providerRef (AG_20260430_...)
    if (!txDoc || !txDoc.exists) {
      const txSnap = await db.collection('gateway_transactions')
        .where('providerRef', '==', reference)
        .limit(1)
        .get();
      if (!txSnap.empty) {
        txDoc = txSnap.docs[0];
        foundBy = 'providerRef';
        console.log(`✅ Trouvé par providerRef: ${reference}`);
      }
    }

    // 3. Chercher par reference interne (DMC-...)
    if (!txDoc || !txDoc.exists) {
      const txSnap = await db.collection('gateway_transactions')
        .where('reference', '==', reference)
        .limit(1)
        .get();
      if (!txSnap.empty) {
        txDoc = txSnap.docs[0];
        foundBy = 'reference field';
        console.log(`✅ Trouvé par reference field: ${reference}`);
      }
    }

    // 4. Chercher par metadata.reference
    if (!txDoc || !txDoc.exists) {
      const txSnap = await db.collection('gateway_transactions')
        .where('metadata.reference', '==', reference)
        .limit(1)
        .get();
      if (!txSnap.empty) {
        txDoc = txSnap.docs[0];
        foundBy = 'metadata.reference';
        console.log(`✅ Trouvé par metadata.reference: ${reference}`);
      }
    }

    // 5. Chercher par metadata.paymentId
    if (!txDoc || !txDoc.exists) {
      const txSnap = await db.collection('gateway_transactions')
        .where('metadata.paymentId', '==', reference)
        .limit(1)
        .get();
      if (!txSnap.empty) {
        txDoc = txSnap.docs[0];
        foundBy = 'metadata.paymentId';
        console.log(`✅ Trouvé par metadata.paymentId: ${reference}`);
      }
    }

    // 6. Chercher par order_id (webhookData)
    if (!txDoc || !txDoc.exists) {
      const txSnap = await db.collection('gateway_transactions')
        .where('webhookData.order_id', '==', reference)
        .limit(1)
        .get();
      if (!txSnap.empty) {
        txDoc = txSnap.docs[0];
        foundBy = 'webhookData.order_id';
        console.log(`✅ Trouvé par webhookData.order_id: ${reference}`);
      }
    }

    // 7. Chercher par recipient_reference (providerResponse)
    if (!txDoc || !txDoc.exists) {
      const txSnap = await db.collection('gateway_transactions')
        .where('providerResponse.reference', '==', reference)
        .limit(1)
        .get();
      if (!txSnap.empty) {
        txDoc = txSnap.docs[0];
        foundBy = 'providerResponse.reference';
        console.log(`✅ Trouvé par providerResponse.reference: ${reference}`);
      }
    }

    // 8. Chercher par recipient_reference (providerResponse)
    if (!txDoc || !txDoc.exists) {
      const txSnap = await db.collection('gateway_transactions')
        .where('providerResponse.order_id', '==', reference)
        .limit(1)
        .get();
      if (!txSnap.empty) {
        txDoc = txSnap.docs[0];
        foundBy = 'providerResponse.order_id';
        console.log(`✅ Trouvé par providerResponse.order_id: ${reference}`);
      }
    }

    // 9. Chercher par transactionId dans metadata
    if (!txDoc || !txDoc.exists) {
      const txSnap = await db.collection('gateway_transactions')
        .where('metadata.transactionId', '==', reference)
        .limit(1)
        .get();
      if (!txSnap.empty) {
        txDoc = txSnap.docs[0];
        foundBy = 'metadata.transactionId';
        console.log(`✅ Trouvé par metadata.transactionId: ${reference}`);
      }
    }

    // 10. Chercher par uid dans metadata
    if (!txDoc || !txDoc.exists) {
      const txSnap = await db.collection('gateway_transactions')
        .where('metadata.uid', '==', reference)
        .limit(1)
        .get();
      if (!txSnap.empty) {
        txDoc = txSnap.docs[0];
        foundBy = 'metadata.uid';
        console.log(`✅ Trouvé par metadata.uid: ${reference}`);
      }
    }

    // 11. DERNIER RECOURS : chercher dans TOUS les champs (moins efficace mais plus sûr)
    if (!txDoc || !txDoc.exists) {
      console.log('⚠️ Recherche étendue - parcours des transactions récentes...');
      const allTx = await db.collection('gateway_transactions')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      
      for (const doc of allTx.docs) {
        const data = doc.data();
        const stringFields = JSON.stringify(data);
        if (stringFields.includes(reference)) {
          txDoc = doc;
          foundBy = 'full text search (fallback)';
          console.log(`✅ Trouvé par recherche textuelle: ${reference}`);
          break;
        }
      }
    }

    if (!txDoc || !txDoc.exists) {
      console.log(`❌ [VERIFY] Aucune transaction trouvée pour: ${reference}`);
      return res.status(404).json({ error: 'Transaction introuvable', status: 'pending' });
    }

    const tx = { id: txDoc.id, ...txDoc.data() };
    console.log(`✅ [VERIFY] Transaction trouvée (${foundBy}) - Statut: ${tx.status}`);
    
    return res.status(200).json({ 
      success: true, 
      status: tx.status, 
      reference: tx.providerRef, 
      transaction: tx,
      foundBy: foundBy
    });
    
  } catch (error) {
    console.error('❌ [VERIFY] Erreur:', error);
    return res.status(500).json({ error: error.message });
  }
}
