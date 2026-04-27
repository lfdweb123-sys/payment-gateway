/**
 * services/antiFraud.js
 *
 * Système anti-fraude réaliste — inspiré de Stripe.
 * Pas de blocage par pays, pas de restrictions abusives.
 * Focus sur : vélocité, doublons, patterns, blacklist.
 *
 * Score de risque : 0–100
 *   0–39   → APPROVED (paiement normal)
 *   40–69  → REVIEW   (surveillance renforcée, paiement autorisé mais loggué)
 *   70–100 → BLOCKED  (fraude probable)
 */

import { db } from './firebase';
import {
  collection, doc, getDoc, setDoc, addDoc,
  query, where, getDocs, orderBy, limit,
  increment,
} from 'firebase/firestore';

// ─── Seuils configurables ────────────────────────────────────────────────────
const RULES = {
  // Vélocité : même téléphone
  MAX_SAME_PHONE_PER_MINUTE:  3,    // max 3 fois le même numéro en 1 min
  MAX_SAME_PHONE_PER_10MIN:   5,    // max 5 fois en 10 min

  // Vélocité : même compte marchand
  MAX_TX_PER_MINUTE:          20,   // 20 transactions/min = robot
  MAX_TX_PER_HOUR:            200,  // 200/h = suspect

  // Montant
  MAX_SINGLE_AMOUNT:          5_000_000, // 5M XOF plafond absolu
  LARGE_AMOUNT_THRESHOLD:     500_000,   // audit au-dessus de 500K

  // Doublons exacts (même montant + même téléphone en moins de X secondes)
  DUPLICATE_WINDOW_SECONDS:   60,

  // Heure suspecte (pas bloquant seul, mais ajoute au score)
  SUSPICIOUS_HOURS:           [1, 2, 3, 4], // 1h-5h du matin

  // Score de confiance minimum pour passer sans audit
  TRUST_SCORE_THRESHOLD:      40,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function now()          { return new Date().toISOString(); }
function minutesAgo(n)  { return new Date(Date.now() - n * 60_000).toISOString(); }

// ─── Service principal ────────────────────────────────────────────────────────
class AntiFraudService {

  /**
   * Point d'entrée principal — appelé avant chaque paiement.
   *
   * @param {Object} tx
   * @param {string}  tx.merchantId
   * @param {number}  tx.amount
   * @param {string}  tx.method    — ex: 'mtn_money'
   * @param {string}  tx.country
   * @param {string}  tx.phone
   * @param {string}  [tx.email]
   * @param {string}  [tx.ip]
   *
   * @returns {{ approved, review, blocked, riskScore, reasons, message }}
   */
  async check(tx) {
    const signals  = [];    // chaque signal ajoute un score
    let   score    = 0;

    // ── 1. Montant ───────────────────────────────────────────────────────────
    if (tx.amount > RULES.MAX_SINGLE_AMOUNT) {
      signals.push({ code: 'AMOUNT_EXCEEDS_LIMIT', score: 80, detail: `${tx.amount} XOF > plafond ${RULES.MAX_SINGLE_AMOUNT}` });
      score += 80;
    } else if (tx.amount > RULES.LARGE_AMOUNT_THRESHOLD) {
      signals.push({ code: 'LARGE_AMOUNT', score: 10, detail: `Montant élevé : ${tx.amount} XOF` });
      score += 10;
    }

    // ── 2. Doublon exact ─────────────────────────────────────────────────────
    // Même téléphone + même montant + même méthode dans les 60 secondes
    if (tx.phone) {
      const duplicate = await this._checkDuplicate(tx);
      if (duplicate) {
        signals.push({ code: 'DUPLICATE_TRANSACTION', score: 60, detail: 'Transaction identique déjà soumise il y a moins de 60s' });
        score += 60;
      }
    }

    // ── 3. Vélocité téléphone ────────────────────────────────────────────────
    // Un même numéro utilisé trop souvent en peu de temps → test de compte volé
    if (tx.phone) {
      const phoneVelocity = await this._checkPhoneVelocity(tx.phone);
      if (phoneVelocity.per1min >= RULES.MAX_SAME_PHONE_PER_MINUTE) {
        signals.push({ code: 'PHONE_VELOCITY_1MIN', score: 70, detail: `${phoneVelocity.per1min} transactions avec ce numéro en 1 min` });
        score += 70;
      } else if (phoneVelocity.per10min >= RULES.MAX_SAME_PHONE_PER_10MIN) {
        signals.push({ code: 'PHONE_VELOCITY_10MIN', score: 30, detail: `${phoneVelocity.per10min} transactions avec ce numéro en 10 min` });
        score += 30;
      }
    }

    // ── 4. Vélocité compte marchand ──────────────────────────────────────────
    // Protège contre un robot qui spam le compte d'un marchand
    const merchantVelocity = await this._checkMerchantVelocity(tx.merchantId);
    if (merchantVelocity.per1min >= RULES.MAX_TX_PER_MINUTE) {
      signals.push({ code: 'MERCHANT_VELOCITY_1MIN', score: 50, detail: `${merchantVelocity.per1min} tx/min sur ce compte` });
      score += 50;
    } else if (merchantVelocity.per1h >= RULES.MAX_TX_PER_HOUR) {
      signals.push({ code: 'MERCHANT_VELOCITY_1H', score: 20, detail: `${merchantVelocity.per1h} tx/h sur ce compte` });
      score += 20;
    }

    // ── 5. Patterns suspects ─────────────────────────────────────────────────
    // Même montant exact répété 5+ fois aujourd'hui sur le même compte
    const repeatPattern = await this._checkRepeatPattern(tx);
    if (repeatPattern.count >= 5) {
      signals.push({ code: 'REPEAT_AMOUNT_PATTERN', score: 25, detail: `Montant ${tx.amount} répété ${repeatPattern.count}x aujourd'hui` });
      score += 25;
    }

    // ── 6. Heure suspecte ────────────────────────────────────────────────────
    // Seul, ce signal ne bloque pas — il pèse uniquement si combiné avec autre chose
    const hour = new Date().getHours();
    if (RULES.SUSPICIOUS_HOURS.includes(hour) && tx.amount > 100_000) {
      signals.push({ code: 'SUSPICIOUS_HOUR', score: 15, detail: `Gros montant à ${hour}h du matin` });
      score += 15;
    }

    // ── 7. Blacklist ─────────────────────────────────────────────────────────
    const blacklisted = await this._checkBlacklist(tx);
    if (blacklisted.found) {
      signals.push({ code: 'BLACKLISTED', score: 100, detail: `Blacklisté : ${blacklisted.matches.join(', ')}` });
      score += 100;
    }

    // ── 8. Score de confiance utilisateur ────────────────────────────────────
    const trustScore = await this.getTrustScore(tx.merchantId);
    if (trustScore < RULES.TRUST_SCORE_THRESHOLD && signals.length > 0) {
      // Amplifie les autres signaux si le compte est peu fiable
      const bonus = Math.round((RULES.TRUST_SCORE_THRESHOLD - trustScore) / 5);
      signals.push({ code: 'LOW_TRUST_SCORE', score: bonus, detail: `Score de confiance faible : ${trustScore}/100` });
      score += bonus;
    }

    // ── Décision finale ───────────────────────────────────────────────────────
    const riskScore  = Math.min(100, score);
    const blocked    = riskScore >= 70;
    const review     = !blocked && riskScore >= 40;
    const approved   = !blocked && !review;

    // Journaliser
    await this._log(tx, { riskScore, signals, decision: blocked ? 'BLOCKED' : review ? 'REVIEW' : 'APPROVED' });

    // Créer une alerte admin si score élevé
    if (riskScore >= 50) {
      await this._createAlert(tx, { riskScore, signals, decision: blocked ? 'BLOCKED' : 'REVIEW' });
    }

    return {
      approved,
      review,
      blocked,
      riskScore,
      signals,
      decision:  blocked ? 'BLOCKED' : review ? 'REVIEW' : 'APPROVED',
      message:   blocked  ? 'Transaction bloquée pour sécurité. Contactez le support si vous pensez à une erreur.'
                : review  ? 'Transaction approuvée — surveillance renforcée activée.'
                :            'Transaction approuvée.',
    };
  }

  // ─── Checks internes ───────────────────────────────────────────────────────

  async _checkDuplicate({ merchantId, amount, phone, method }) {
    const since = minutesAgo(1); // 60 secondes
    const snap  = await getDocs(query(
      collection(db, 'gateway_transactions'),
      where('merchantId', '==', merchantId),
      where('amount',     '==', amount),
      where('method',     '==', method),
      where('createdAt',  '>=', since),
      limit(1),
    ));
    // Si une transaction avec le même numéro existe
    return snap.docs.some(d => d.data().phone === phone || (d.data().providerResponse?.phone === phone));
  }

  async _checkPhoneVelocity(phone) {
    const [snap1, snap10] = await Promise.all([
      getDocs(query(collection(db, 'gateway_transactions'), where('phone', '==', phone), where('createdAt', '>=', minutesAgo(1)),  limit(20))),
      getDocs(query(collection(db, 'gateway_transactions'), where('phone', '==', phone), where('createdAt', '>=', minutesAgo(10)), limit(20))),
    ]);
    return { per1min: snap1.size, per10min: snap10.size };
  }

  async _checkMerchantVelocity(merchantId) {
    const [snap1, snap60] = await Promise.all([
      getDocs(query(collection(db, 'gateway_transactions'), where('merchantId', '==', merchantId), where('createdAt', '>=', minutesAgo(1)),  limit(30))),
      getDocs(query(collection(db, 'gateway_transactions'), where('merchantId', '==', merchantId), where('createdAt', '>=', minutesAgo(60)), limit(250))),
    ]);
    return { per1min: snap1.size, per1h: snap60.size };
  }

  async _checkRepeatPattern({ merchantId, amount }) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const snap  = await getDocs(query(
      collection(db, 'gateway_transactions'),
      where('merchantId', '==', merchantId),
      where('amount',     '==', amount),
      where('createdAt',  '>=', today.toISOString()),
      limit(20),
    ));
    return { count: snap.size };
  }

  async _checkBlacklist({ merchantId, phone, email, ip }) {
    const entries = [
      { type: 'user',  value: merchantId },
      { type: 'phone', value: phone },
      { type: 'email', value: email },
      { type: 'ip',    value: ip },
    ].filter(e => e.value);

    const matches = [];
    for (const entry of entries) {
      const snap = await getDocs(query(
        collection(db, 'blacklist'),
        where('type',  '==', entry.type),
        where('value', '==', entry.value),
        limit(1),
      ));
      if (!snap.empty) matches.push(entry.type);
    }
    return { found: matches.length > 0, matches };
  }

  async _log(tx, result) {
    try {
      await addDoc(collection(db, 'fraud_logs'), {
        merchantId: tx.merchantId,
        amount:     tx.amount,
        method:     tx.method,
        country:    tx.country,
        phone:      tx.phone ? tx.phone.substring(0, 6) + '****' : null, // masqué
        riskScore:  result.riskScore,
        signals:    result.signals,
        decision:   result.decision,
        timestamp:  now(),
      });
    } catch { /* ne jamais crasher à cause du log */ }
  }

  async _createAlert(tx, result) {
    try {
      await addDoc(collection(db, 'fraud_alerts'), {
        merchantId: tx.merchantId,
        amount:     tx.amount,
        method:     tx.method,
        country:    tx.country,
        riskScore:  result.riskScore,
        signals:    result.signals,
        decision:   result.decision,
        status:     'pending',
        reviewed:   false,
        timestamp:  now(),
      });
    } catch {}
  }

  // ─── Score de confiance ────────────────────────────────────────────────────

  /**
   * Retourne le score de confiance du marchand (0–100).
   * Un nouveau marchand commence à 60.
   */
  async getTrustScore(merchantId) {
    const docRef = doc(db, 'trust_scores', merchantId);
    const snap   = await getDoc(docRef);
    return snap.exists() ? (snap.data().score ?? 60) : 60;
  }

  /**
   * Met à jour le score de confiance après une transaction.
   * @param {string} merchantId
   * @param {'success'|'failed'|'fraud'} outcome
   */
  async updateTrustScore(merchantId, outcome) {
    const DELTA = { success: +2, failed: -3, fraud: -20 };
    const delta = DELTA[outcome] ?? 0;

    const docRef  = doc(db, 'trust_scores', merchantId);
    const snap    = await getDoc(docRef);
    const current = snap.exists() ? (snap.data().score ?? 60) : 60;
    const next    = Math.max(0, Math.min(100, current + delta));

    await setDoc(docRef, {
      score:      next,
      updatedAt:  now(),
      successCount: outcome === 'success' ? increment(1) : increment(0),
      failCount:    outcome === 'failed'  ? increment(1) : increment(0),
    }, { merge: true });

    return next;
  }

  // ─── Gestion blacklist ─────────────────────────────────────────────────────

  async addToBlacklist(type, value, reason, adminId) {
    await addDoc(collection(db, 'blacklist'), {
      type,    // 'user' | 'phone' | 'email' | 'ip'
      value,
      reason,
      addedBy:  adminId,
      addedAt:  now(),
    });
  }

  async removeFromBlacklist(docId) {
    const { deleteDoc, doc: docFn } = await import('firebase/firestore');
    await deleteDoc(docFn(db, 'blacklist', docId));
  }

  // ─── Stats pour le dashboard admin ────────────────────────────────────────

  async getStats(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString();

    const [alertsSnap, logsSnap] = await Promise.all([
      getDocs(query(collection(db, 'fraud_alerts'), where('timestamp', '>=', sinceStr))),
      getDocs(query(collection(db, 'fraud_logs'),   where('timestamp', '>=', sinceStr))),
    ]);

    const logs   = logsSnap.docs.map(d => d.data());
    const alerts = alertsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return {
      totalChecks:         logs.length,
      totalAlerts:         alerts.length,
      blocked:             logs.filter(l => l.decision === 'BLOCKED').length,
      reviewed:            logs.filter(l => l.decision === 'REVIEW').length,
      approved:            logs.filter(l => l.decision === 'APPROVED').length,
      avgRiskScore:        logs.length ? Math.round(logs.reduce((s, l) => s + (l.riskScore || 0), 0) / logs.length) : 0,
      pendingAlerts:       alerts.filter(a => !a.reviewed).length,
      signalDistribution:  this._countSignals(logs),
    };
  }

  _countSignals(logs) {
    const counts = {};
    logs.forEach(l => (l.signals || []).forEach(s => {
      counts[s.code] = (counts[s.code] || 0) + 1;
    }));
    return counts;
  }
}

export default new AntiFraudService();