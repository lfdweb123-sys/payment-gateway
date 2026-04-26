/**
 * Mollie — mollie.js
 * Doc : https://docs.mollie.com/reference/create-payment
 *
 * Init   : POST https://api.mollie.com/v2/payments
 * Vérif  : GET  https://api.mollie.com/v2/payments/{id}
 *
 * Auth   : Authorization: Bearer {MOLLIE_API_KEY}
 * Body   : application/x-www-form-urlencoded
 *
 * Amount : objet { value: "10.00" (string 2 décimales), currency: "EUR" }
 *
 * Pays supportés : Europe (AT, BE, DE, DK, ES, FI, FR, GB, IE, IT, NL, NO, PL, PT, SE, ...)
 * Méthodes : ideal, creditcard, paypal, sofort, giropay, bancontact, belfius, eps, etc.
 */

// Mapping méthode interne → méthode Mollie
const METHOD_MAP = {
  card:        'creditcard',
  ideal:       'ideal',
  giropay:     'giropay',
  sofort:      'sofort',
  bancontact:  'bancontact',
  paypal:      'paypal',
  apple_pay:   'applepay',
  google_pay:  null,  // pas supporté directement, passe par creditcard
};

export default class Mollie {
  constructor(config) {
    this.apiKey = config.MOLLIE_API_KEY; // test_... ou live_...
    this.appUrl = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Mollie'; }

  async initPayment({ amount, email, currency, method, description }) {
    const mollieMethod = METHOD_MAP[method] || 'creditcard';

    // Amount : string avec exactement 2 décimales
    const value = parseFloat(amount).toFixed(2);

    try {
      const params = new URLSearchParams({
        'amount[value]':    value,
        'amount[currency]': (currency || 'EUR').toUpperCase(),
        description:        (description || 'Paiement').substring(0, 255),
        redirectUrl:        `${this.appUrl}/success`,
        webhookUrl:         `${this.appUrl}/api/webhook/mollie`,
        method:             mollieMethod,
        ...(email ? { 'billingEmail': email } : {}),
      });

      const res = await fetch('https://api.mollie.com/v2/payments', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type':  'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || data.title || 'Erreur Mollie' };
      }

      return {
        success:   true,
        reference: data.id,
        url:       data._links?.checkout?.href || null,
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(paymentId) {
    try {
      const res = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.detail || data.title };

      // Statuts Mollie : open | pending | authorized | expired | canceled | failed | paid
      const status = data.status;
      return {
        success: true,
        status:  status === 'paid'                                    ? 'SUCCESSFUL'
               : status === 'failed' || status === 'canceled'
                 || status === 'expired'                              ? 'FAILED'
               :                                                        'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}