/**
 * api/logger.js
 *
 * Système de logs centralisé — écrit dans Firestore collection 'gateway_logs'
 * Activé/désactivé via Firestore doc 'gateway_settings/logs' { enabled: true/false }
 *
 * Usage dans n'importe quel fichier api/ :
 *   import { log } from './logger.js';
 *   await log('pay', 'INFO', 'Paiement initié', { amount: 5000, provider: 'feexpay' });
 */

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

// Cache du statut pour éviter un read Firestore à chaque log
let _logsEnabled   = null;
let _lastCheck     = 0;
const CACHE_TTL_MS = 30_000; // re-vérifie toutes les 30s

async function isLogsEnabled() {
  const now = Date.now();
  if (_logsEnabled !== null && now - _lastCheck < CACHE_TTL_MS) return _logsEnabled;
  try {
    const snap = await db.collection('gateway_settings').doc('logs').get();
    _logsEnabled = snap.exists ? (snap.data().enabled !== false) : true;
    _lastCheck   = now;
  } catch {
    _logsEnabled = true; // si erreur, on loggue quand même
  }
  return _logsEnabled;
}

/**
 * log(source, level, message, data?)
 *
 * @param {string} source  — origine : 'pay' | 'webhook' | 'payout' | 'auth' | 'admin' | ...
 * @param {string} level   — 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
 * @param {string} message — message lisible
 * @param {object} data    — données supplémentaires (optionnel)
 */
export async function log(source, level, message, data = {}) {
  try {
    if (!(await isLogsEnabled())) return;

    // Sanitize — éviter les objets trop profonds
    const sanitized = JSON.parse(JSON.stringify(data, (key, value) => {
      if (typeof value === 'string' && value.length > 500) return value.substring(0, 500) + '…';
      return value;
    }));

    await db.collection('gateway_logs').add({
      source,
      level,   // INFO | WARN | ERROR | DEBUG
      message,
      data:      sanitized,
      timestamp: new Date().toISOString(),
      env:       process.env.NODE_ENV || 'production',
    });
  } catch (e) {
    // Ne jamais crasher à cause du logger
    console.error('[Logger] Erreur écriture log:', e.message);
  }
}

/**
 * logRequest(req, source) — loggue une requête HTTP entrante
 */
export async function logRequest(req, source) {
  await log(source, 'INFO', `${req.method} ${req.url}`, {
    method:  req.method,
    url:     req.url,
    query:   req.query,
    ip:      req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
    apiKey:  req.headers['x-api-key'] ? '***' + req.headers['x-api-key'].slice(-4) : null,
  });
}

/**
 * logError(source, error, context?) — loggue une erreur avec stack
 */
export async function logError(source, error, context = {}) {
  await log(source, 'ERROR', error.message || String(error), {
    ...context,
    stack: error.stack?.substring(0, 800) || null,
  });
}

export default { log, logRequest, logError };