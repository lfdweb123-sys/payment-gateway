/**
 * Checkout.com — checkout.js
 * Doc : https://docs.checkout.com/integrate/hosted-payments-page
 *
 * Init   : POST https://{prefix}.api.checkout.com/hosted-payments
 * Vérif  : GET  https://{prefix}.api.checkout.com/payments/{id}
 *
 * Auth   : Authorization: Bearer {SECRET_KEY}
 * Amount : en sous-unités (cents) — EUR 10.00 → 1000
 *
 * ⚠️  Le prefix dans l'URL est UNIQUE par compte (récupéré dans le Hub)
 *     Sandbox : https://api.sandbox.checkout.com
 *     Live    : https://{prefix}.api.checkout.com
 *
 * Pays : Mondial (200+ pays)
 */

export default class CheckoutCom {
  constructor(config) {
    this.secretKey  = config.CHECKOUT_SECRET_KEY;
    this.livePrefix = config.CHECKOUT_PREFIX || '';       // ex: 'abc123'
    this.sandbox    = config.CHECKOUT_SANDBOX !== 'false';
    this.appUrl     = config.APP_URL || process.env.VITE_APP_URL || '';
    this.baseUrl    = this.sandbox
      ? 'https://api.sandbox.checkout.com'
      : `https://${this.livePrefix}.api.checkout.com`;
  }

  get name() { return 'Checkout.com'; }

  get headers() {
    return {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type':  'application/json',
    };
  }

  async initPayment({ amount, currency, email, description, country }) {
    // Amount en sous-unités
    const value = Math.round(parseFloat(amount) * 100);

    try {
      const res = await fetch(`${this.baseUrl}/hosted-payments`, {
        method:  'POST',
        headers: this.headers,
        body: JSON.stringify({
          amount:      value,
          currency:    (currency || 'EUR').toUpperCase(),
          reference:   `GW-${Date.now()}`,
          description: (description || 'Paiement').substring(0, 100),
          success_url: `${this.appUrl}/success`,
          cancel_url:  `${this.appUrl}/cancel`,
          failure_url: `${this.appUrl}/cancel`,
          ...(email ? { customer: { email } } : {}),
          ...(country ? {
            billing: {
              address: { country: country.toUpperCase() },
            },
          } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error_type || data.message || 'Erreur Checkout.com' };
      }

      return {
        success:   true,
        reference: data.id,
        url:       data._links?.redirect?.href || null,
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(paymentId) {
    try {
      const res = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        headers: this.headers,
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error_type || data.message };

      // Statuts : Authorized | Captured | Voided | Refunded | Declined | Expired | Pending
      const status = data.status;
      return {
        success: true,
        status:  status === 'Captured' || status === 'Authorized' ? 'SUCCESSFUL'
               : status === 'Declined' || status === 'Voided'
                 || status === 'Expired'                          ? 'FAILED'
               :                                                    'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}