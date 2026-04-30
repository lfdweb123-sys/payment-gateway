/**
 * api/gateway/generate-link.js
 *
 * ── ARCHITECTURE SÉCURISÉE ────────────────────────────────────────────────
 *
 * PROBLÈME avec base64 :
 *   btoa(JSON.stringify({ apiKey: 'gw_xxx', amount: 5000 }))
 *   → n'importe qui peut décoder en 1 seconde avec atob()
 *   → la clé API est exposée en clair
 *
 * SOLUTION :
 *   1. Stocker les données du paiement dans Firestore → collection payment_links
 *   2. Retourner uniquement un ID opaque (UUID aléatoire) dans l'URL
 *   3. Le frontend charge les données depuis l'ID — jamais depuis l'URL
 *
 * URL générée : /pay?pid=a1b2c3d4-e5f6-...
 * Ce que contient le pid : RIEN de sensible — juste une référence Firestore
 * L'apiKey reste dans Firestore, côté serveur, jamais exposée.
 * ─────────────────────────────────────────────────────────────────────────
 */

import crypto from 'crypto';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 [generate-link] DÉBUT DU HANDLER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    console.log('📡 [generate-link] OPTIONS request - CORS preflight');
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    console.log(`❌ [generate-link] Méthode non autorisée: ${req.method}`);
    return res.status(405).json({ error: 'POST requis' });
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📥 [1] REÇU - Méthode: POST');
  console.log('📋 [2] Headers reçus:', {
    'x-api-key': req.headers['x-api-key'] ? 'PRÉSENT (masqué)' : 'ABSENT',
    'content-type': req.headers['content-type'],
  });
  console.log('📦 [3] Body reçu:', JSON.stringify(req.body, null, 2));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    console.log('❌ [4] Clé API manquante');
    return res.status(401).json({ error: 'Clé API requise' });
  }
  console.log('✅ [4] Clé API présente');

  const { amount, description, country, method, metadata } = req.body;
  console.log(`💰 [5] Données extraites:
    - amount: ${amount}
    - description: ${description}
    - country: ${country}
    - method: ${method}
    - metadata: ${metadata ? JSON.stringify(metadata) : 'NON FOURNI'}`);

  if (!amount || amount <= 0) {
    console.log('❌ [6] Montant invalide');
    return res.status(400).json({ error: 'Montant invalide' });
  }
  console.log('✅ [6] Montant valide');

  if (!description) {
    console.log('❌ [7] Description requise');
    return res.status(400).json({ error: 'Description requise' });
  }
  console.log('✅ [7] Description valide');

  try {
    // ── Vérifier que le marchand existe et est actif ───────────────────────
    console.log('🔍 [8] Recherche du marchand avec apiKey...');
    const merchantSnap = await db.collection('gateway_merchants')
      .where('apiKey', '==', apiKey)
      .limit(1)
      .get();

    if (merchantSnap.empty) {
      console.log('❌ [9] Marchand non trouvé');
      return res.status(404).json({ error: 'Marchand introuvable' });
    }

    const merchant = merchantSnap.docs[0].data();
    const merchantId = merchantSnap.docs[0].id;
    console.log(`✅ [9] Marchand trouvé: ID=${merchantId}, nom=${merchant.name || 'N/A'}`);
    console.log(`   - Actif: ${merchant.active}`);
    console.log(`   - Statut vérification: ${merchant.verificationStatus}`);

    if (!merchant.active || merchant.verificationStatus !== 'approved') {
      console.log('❌ [10] Compte non activé ou non approuvé');
      return res.status(403).json({ error: 'Compte non activé' });
    }
    console.log('✅ [10] Compte activé et approuvé');

    // ── Créer le payment link en Firestore ────────────────────────────────
    const pid = crypto.randomUUID();
    console.log(`🆔 [11] PID généré: ${pid}`);

    // Vérifier les métadonnées reçues
    const receivedMetadata = req.body.metadata || {};
    console.log('📦 [12] Métadonnées à stocker:', JSON.stringify(receivedMetadata, null, 2));
    
    if (Object.keys(receivedMetadata).length > 0) {
      console.log('✅ [13] Métadonnées reçues:');
      console.log(`   - paymentId: ${receivedMetadata.paymentId || 'NON FOURNI'}`);
      console.log(`   - reference: ${receivedMetadata.reference || 'NON FOURNI'}`);
      console.log(`   - uid: ${receivedMetadata.uid || 'NON FOURNI'}`);
      console.log(`   - plan: ${receivedMetadata.plan || 'NON FOURNI'}`);
      console.log(`   - audits: ${receivedMetadata.audits || 'NON FOURNI'}`);
    } else {
      console.log('⚠️ [13] AUCUNE métadonnée reçue dans le body !');
    }

    const paymentLinkData = {
      merchantId,
      apiKey,
      amount:        parseFloat(amount),
      description,
      country:       country || null,
      method:        method  || null,
      createdAt:     new Date().toISOString(),
      expiresAt:     new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      used:          false,
      metadata:      receivedMetadata,
    };

    console.log('💾 [14] Sauvegarde dans Firestore collection: payment_links');
    console.log('   Document ID:', pid);
    console.log('   Données:', JSON.stringify(paymentLinkData, null, 2));

    await db.collection('payment_links').doc(pid).set(paymentLinkData);
    console.log('✅ [15] Payment link sauvegardé avec succès');

    // ── Retourner l'URL avec uniquement le pid ────────────────────────────
    const baseUrl = process.env.VITE_APP_URL || '';
    const url = `${baseUrl}/pay?pid=${pid}`;
    console.log(`🔗 [16] URL générée: ${url}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ [17] SUCCÈS - Réponse envoyée');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return res.status(200).json({ 
      success: true, 
      url, 
      pid,
      metadata_received: !!receivedMetadata.paymentId, // indique si des métadonnées ont été reçues
    });

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [ERREUR] generate-link:', error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return res.status(500).json({ error: error.message });
  }
}
