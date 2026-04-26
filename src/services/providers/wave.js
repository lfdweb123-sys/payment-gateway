/**
 * Wave — wave.js
 * Doc : https://docs.wave.com/checkout
 *
 * Init   : POST https://api.wave.com/v1/checkout/sessions
 * Vérif  : GET  https://api.wave.com/v1/checkout/sessions/{id}
 *
 * ⚠️  Signature HMAC-SHA256 obligatoire : header Wave-Signature: t={ts},v1={sig}
 * ⚠️  Amount est une STRING (pas un nombre), pas de décimales pour XOF
 * ⚠️  Pays supportés : SN (Sénégal), CI (Côte d'Ivoire), ML (Mali), UG (Ouganda), CM (Cameroun)
 */

import crypto from 'crypto';

export default class Wave {
  constructor(config) {
    this.apiKey        = config.WAVE_API_KEY;
    this.signingSecret = config.WAVE_SIGNING_SECRET; // commence par wave_sn_AKS_...
    this.appUrl        = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Wave'; }

  // Génère le header Wave-Signature requis pour chaque requête POST
  _buildSignature(body) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload   = `${timestamp}${body}`;
    const signature = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');
    return { timestamp, waveSignature: `t=${timestamp},v1=${signature}` };
  }

  async initPayment({ amount, description, country }) {
    const body = JSON.stringify({
      amount:      String(Math.round(amount)), // string, sans décimales
      currency:    'XOF',
      error_url:   `${this.appUrl}/cancel`,
      success_url: `${this.appUrl}/success`,
      ...(description ? { client_reference: description.substring(0, 255) } : {}),
    });

    const { timestamp, waveSignature } = this._buildSignature(body);

    try {
      const res = await fetch('https://api.wave.com/v1/checkout/sessions', {
        method:  'POST',
        headers: {
          'Authorization':  `Bearer ${this.apiKey}`,
          'Wave-Signature': waveSignature,
          'Content-Type':   'application/json',
        },
        body,
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || JSON.stringify(data) };

      return {
        success:   true,
        reference: data.id,                  // ex: cos-18qq25rgr100a
        url:       data.wave_launch_url,     // URL de paiement Wave
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(sessionId) {
    try {
      const res = await fetch(
        `https://api.wave.com/v1/checkout/sessions/${sessionId}`,
        { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      // checkout_status : "open" | "complete" | "expired" | "failed"
      // payment_status  : "pending" | "succeeded" | "failed"
      const cs = data.checkout_status;
      const ps = data.payment_status;
      return {
        success: true,
        status:  (cs === 'complete' && ps === 'succeeded') ? 'SUCCESSFUL'
               : (cs === 'failed'   || ps === 'failed')    ? 'FAILED'
               :                                             'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}