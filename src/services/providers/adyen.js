/**
 * Adyen — adyen.js
 * Doc : https://docs.adyen.com/api-explorer/Checkout/latest/post/sessions
 *
 * Init   : POST https://checkout-test.adyen.com/v71/sessions
 * Vérif  : GET  https://management-test.adyen.com/v1/payments/{paymentPspReference}
 *           ou via webhook AUTHORISATION
 *
 * Auth   : X-API-Key header
 * Amount : en sous-unités (cents pour EUR/USD, pas de décimales)
 *
 * ⚠️  Base URL UNIQUE par compte — récupérée depuis le Customer Area
 *     Sandbox : https://checkout-test.adyen.com/v71
 *     Live    : https://{prefix}-checkout-live.adyenpayments.com/v71
 * ⚠️  Adyen est principalement un Hosted Checkout / Drop-in JS côté client.
 *     Côté serveur, on crée une session et on retourne l'URL de redirection.
 */

export default class Adyen {
  constructor(config) {
    this.apiKey          = config.ADYEN_API_KEY;
    this.merchantAccount = config.ADYEN_MERCHANT_ACCOUNT;
    this.livePrefix      = config.ADYEN_LIVE_PREFIX || '';      // ex: 'abc123def456'
    this.sandbox         = config.ADYEN_SANDBOX !== 'false';
    this.appUrl          = config.APP_URL || process.env.VITE_APP_URL || '';

    const version = 'v71';
    this.checkoutUrl = this.sandbox
      ? `https://checkout-test.adyen.com/${version}`
      : `https://${this.livePrefix}-checkout-live.adyenpayments.com/${version}`;
  }

  get name() { return 'Adyen'; }

  get headers() {
    return {
      'X-API-Key':    this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async initPayment({ amount, currency, email, country, description }) {
    // Amount en sous-unités (ex: EUR 10.00 → 1000)
    const value = Math.round(parseFloat(amount) * 100);

    try {
      const res = await fetch(`${this.checkoutUrl}/sessions`, {
        method:  'POST',
        headers: this.headers,
        body: JSON.stringify({
          merchantAccount: this.merchantAccount,
          amount: {
            currency: (currency || 'EUR').toUpperCase(),
            value,
          },
          returnUrl:   `${this.appUrl}/success`,
          reference:   `GW-${Date.now()}`,
          countryCode: (country || 'FR').toUpperCase(),
          shopperEmail: email || undefined,
          shopperLocale: 'fr-FR',
          channel:     'Web',
          metadata: {
            description: (description || 'Paiement').substring(0, 80),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status) {
        return { success: false, error: data.message || 'Erreur Adyen' };
      }

      return {
        success:   true,
        reference: data.id,
        sessionData: data.sessionData, // passé au Dropin/Components JS côté client
        url:       `${this.appUrl}/checkout?session=${data.id}`, // page de checkout interne
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(paymentPspReference) {
    // Adyen recommande les webhooks pour les statuts.
    // Ici on fait une vérification via l'API Management si disponible.
    try {
      const baseUrl = this.sandbox
        ? 'https://management-test.adyen.com/v1'
        : 'https://management-live.adyen.com/v1';

      const res = await fetch(
        `${baseUrl}/companies/${this.merchantAccount}/paymentLinks/${paymentPspReference}`,
        { headers: this.headers }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      // Statuts Adyen : Authorised | Refused | Error | Cancelled | Received
      const status = data.status;
      return {
        success: true,
        status:  status === 'Authorised' || status === 'active' ? 'SUCCESSFUL'
               : status === 'Refused'    || status === 'expired' ? 'FAILED'
               :                                                    'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}