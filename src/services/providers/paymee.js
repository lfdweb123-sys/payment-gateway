/**
 * Paymee — paymee.js
 * Doc : https://paymee.tn/developer-tools/
 *
 * Init   : POST https://app.paymee.tn/api/v2/payments/create
 * Vérif  : GET  https://app.paymee.tn/api/v2/payments/{token}/check
 *
 * Auth   : Authorization: Token {PAYMEE_API_KEY}
 * Pays   : Tunisie (TN)
 * Devise : TND
 */

export default class Paymee {
  constructor(config) {
    this.apiKey = config.PAYMEE_API_KEY;
    this.appUrl = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Paymee'; }

  async initPayment({ amount, email, phone, description }) {
    try {
      const res = await fetch('https://app.paymee.tn/api/v2/payments/create', {
        method:  'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          amount:       parseFloat(amount),
          note:         (description || 'Paiement').substring(0, 255),
          first_name:   '',
          last_name:    '',
          email:        email || '',
          phone:        phone || '',
          return_url:   `${this.appUrl}/success`,
          cancel_url:   `${this.appUrl}/cancel`,
          webhook_url:  `${this.appUrl}/api/webhook/paymee`,
          order_id:     `GW-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (!data.status) {
        return { success: false, error: data.message || 'Erreur Paymee' };
      }

      return {
        success:   true,
        reference: data.data?.token,
        url:       `https://app.paymee.tn/gateway/${data.data?.token}`,
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(token) {
    try {
      const res = await fetch(
        `https://app.paymee.tn/api/v2/payments/${token}/check`,
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type':  'application/json',
          },
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      // payment_status : true = payé
      return {
        success: true,
        status:  data.data?.payment_status === true ? 'SUCCESSFUL' : 'PENDING',
        data:    data.data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}