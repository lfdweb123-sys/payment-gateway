/**
 * api/gateway/create-payment-link.js
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
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'POST requis' });

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'Clé API requise' });

  const { amount, description, country, method } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });
  if (!description)           return res.status(400).json({ error: 'Description requise' });

  try {
    // ── Vérifier que le marchand existe et est actif ───────────────────────
    const merchantSnap = await db.collection('gateway_merchants')
      .where('apiKey', '==', apiKey)
      .limit(1)
      .get();

    if (merchantSnap.empty) {
      return res.status(404).json({ error: 'Marchand introuvable' });
    }

    const merchant = merchantSnap.docs[0].data();
    if (!merchant.active || merchant.verificationStatus !== 'approved') {
      return res.status(403).json({ error: 'Compte non activé' });
    }

    const merchantId = merchantSnap.docs[0].id;

    // ── Créer le payment link en Firestore ────────────────────────────────
    // L'apiKey est stockée ICI côté serveur — jamais dans l'URL
    const pid = crypto.randomUUID(); // ID opaque, aléatoire, impossible à deviner

    await db.collection('payment_links').doc(pid).set({
      merchantId,
      apiKey,        // ← stockée en Firestore, jamais dans l'URL
      amount:        parseFloat(amount),
      description,
      country:       country || null,
      method:        method  || null,
      createdAt:     new Date().toISOString(),
      expiresAt:     new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
      used:          false,
    });

    // ── Retourner l'URL avec uniquement le pid ────────────────────────────
    // /pay?pid=a1b2c3d4-e5f6-7890-abcd-ef1234567890
    // Ce pid ne contient AUCUNE donnée sensible — juste une référence
    const baseUrl = process.env.VITE_APP_URL || '';
    const url     = `${baseUrl}/pay?pid=${pid}`;

    return res.status(200).json({ success: true, url, pid });

  } catch (error) {
    console.error('Erreur create-payment-link:', error);
    return res.status(500).json({ error: error.message });
  }
}