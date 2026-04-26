/**
 * Flouci — flouci.js
 * Doc : https://docs.flouci.com/api
 *
 * Init   : POST https://developers.flouci.com/api/generate_payment
 * Vérif  : GET  https://developers.flouci.com/api/verify_payment/{id}
 *
 * Pays   : Tunisie (TN)
 * Devise : TND
 */

export default class Flouci {
  constructor(config) {
    this.appToken  = config.FLOUCI_APP_TOKEN;
    this.appSecret = config.FLOUCI_APP_SECRET;
    this.appUrl    = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Flouci'; }

  async initPayment({ amount, description }) {
    try {
      const res = await fetch('https://developers.flouci.com/api/generate_payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_token:          this.appToken,
          app_secret:         this.appSecret,
          amount:             String(Math.round(amount)), // en millimes
          accept_card:        'true',
          session_timeout_secs: 1200,
          success_link:       `${this.appUrl}/success`,
          fail_link:          `${this.appUrl}/cancel`,
          developer_tracking_id: `GW-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!data.result?.success) {
        return { success: false, error: data.message || 'Erreur Flouci' };
      }

      return {
        success:   true,
        reference: data.result.payment_id,
        url:       data.result.link,
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(paymentId) {
    try {
      const res = await fetch(
        `https://developers.flouci.com/api/verify_payment/${paymentId}`,
        {
          headers: {
            'apppublic': this.appToken,
            'appsecret': this.appSecret,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      return {
        success: true,
        status:  data.result?.status === 'SUCCESS' ? 'SUCCESSFUL'
               : data.result?.status === 'FAIL'    ? 'FAILED'
               :                                     'PENDING',
        data: data.result,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}