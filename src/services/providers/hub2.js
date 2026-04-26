/**
 * Hub2 — hub2.js
 * Doc : https://docs.hub2.io/api-reference/payments/create-a-paymentintent-object
 *
 * Flow en 2 étapes obligatoires :
 *   1. POST /payment-intents
 *      Headers : ApiKey, MerchantId, Environment
 *      Body    : { customerReference, purchaseReference, amount, currency }
 *      Retour  : { id, token, ... }
 *
 *   2. POST /payment-intents/{id}/payments
 *      Body : { token, paymentMethod, country, provider, mobileMoney: { msisdn } }
 *      Retour : { id, status, nextAction, ... }
 *      nextAction.type peut être "redirect" (url) ou "ussd" (message)
 *
 * Vérification :
 *   GET /payment-intents/{id}/status
 *   Statuts : "successful" | "pending" | "failed" | "cancelled"
 *
 * ⚠️  Auth : headers ApiKey + MerchantId + Environment (pas Bearer token)
 * ⚠️  Base URL : https://api.hub2.io (sans /v1)
 */

// Mapping méthode interne → provider Hub2
const PROVIDER_MAP = {
  mtn_money:    'mtn',
  moov_money:   'moov',
  orange_money: 'orange',
  wave_money:   'wave',
  free_money:   'free',
  card:         'card',
};

export default class Hub2 {
  constructor(config) {
    this.apiKey     = config.HUB2_API_KEY;
    this.merchantId = config.HUB2_MERCHANT_ID;
    this.env        = config.HUB2_ENV || 'live'; // 'sandbox' ou 'live'
    this.appUrl     = config.APP_URL || process.env.VITE_APP_URL || '';
    this.baseUrl    = 'https://api.hub2.io';
  }

  get name() { return 'Hub2'; }

  get headers() {
    return {
      'ApiKey':       this.apiKey,
      'MerchantId':   this.merchantId,
      'Environment':  this.env,
      'Content-Type': 'application/json',
    };
  }

  async initPayment({ amount, phone, email, country, method, description }) {
    const purchaseRef = `GW-${Date.now()}`;
    const provider    = PROVIDER_MAP[method] || 'mtn';

    try {
      // ── Étape 1 : Créer le PaymentIntent ─────────────────────────────────
      const res1 = await fetch(`${this.baseUrl}/payment-intents`, {
        method:  'POST',
        headers: this.headers,
        body: JSON.stringify({
          customerReference: email || purchaseRef,
          purchaseReference: purchaseRef,
          amount:            Math.round(amount),
          currency:          'XOF',
        }),
      });

      const pi = await res1.json();
      if (!res1.ok) {
        return { success: false, error: pi.message || 'Hub2 : erreur création PaymentIntent' };
      }

      const intentId = pi.id;
      const token    = pi.token;

      if (!intentId || !token) {
        return { success: false, error: 'Hub2 : id ou token manquant dans la réponse' };
      }

      // ── Étape 2 : Tenter le paiement ─────────────────────────────────────
      const res2 = await fetch(`${this.baseUrl}/payment-intents/${intentId}/payments`, {
        method:  'POST',
        headers: this.headers,
        body: JSON.stringify({
          token,
          paymentMethod: 'mobile_money',
          country:       (country || 'CI').toUpperCase(),
          provider,
          mobileMoney: {
            msisdn: phone,
          },
        }),
      });

      const pay = await res2.json();
      if (!res2.ok) {
        return { success: false, error: pay.message || 'Hub2 : erreur tentative de paiement' };
      }

      // nextAction.type = "redirect" → fournit une URL
      // nextAction.type = "ussd"     → affiche un message USSD (pas d'URL)
      const redirectUrl = pay.nextAction?.data?.url || null;

      return {
        success:   true,
        reference: intentId,
        url:       redirectUrl,
        status:    pay.status || 'pending',
        provider:  'hub2',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(intentId) {
    try {
      const res = await fetch(
        `${this.baseUrl}/payment-intents/${intentId}/status`,
        { headers: this.headers }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      // Statuts Hub2 : "successful" | "pending" | "failed" | "cancelled"
      const raw = (data.status || '').toLowerCase();
      return {
        success: true,
        status:  raw === 'successful'            ? 'SUCCESSFUL'
               : raw === 'failed' || raw === 'cancelled' ? 'FAILED'
               :                                   'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}