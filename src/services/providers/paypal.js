/**
 * PayPal — paypal.js
 * Doc : https://developer.paypal.com/docs/api/orders/v2/
 *
 * Flow :
 *   1. POST /v1/oauth2/token          → access_token
 *   2. POST /v2/checkout/orders       → order id + approve URL
 *   3. Redirect client vers approve URL
 *   4. GET  /v2/checkout/orders/{id}  → vérification
 *
 * ⚠️  btoa() n'existe pas dans Node.js < 18 → Buffer.from()
 * ⚠️  application_context déprécié → payment_source.paypal
 */

export default class PayPal {
  constructor(config) {
    this.clientId  = config.PAYPAL_CLIENT_ID;
    this.secretKey = config.PAYPAL_SECRET_KEY;
    this.sandbox   = config.PAYPAL_SANDBOX === 'true' || config.PAYPAL_SANDBOX === true;
    this.appUrl    = config.APP_URL || process.env.VITE_APP_URL || '';
    this.baseUrl   = this.sandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  get name() { return 'PayPal'; }

  async getAccessToken() {
    const credentials = Buffer.from(`${this.clientId}:${this.secretKey}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept':        'application/json',
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    return data.access_token;
  }

  async initPayment({ amount, email, currency, description }) {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: (currency || 'EUR').toUpperCase(),
              value:         parseFloat(amount).toFixed(2),
            },
            description: (description || '').substring(0, 127),
          }],
          payment_source: {
            paypal: {
              experience_context: {
                return_url: `${this.appUrl}/success`,
                cancel_url: `${this.appUrl}/cancel`,
              },
            },
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || data.details?.[0]?.description };

      const approveUrl = data.links?.find(l => l.rel === 'approve')?.href;
      return {
        success:   true,
        reference: data.id,
        url:       approveUrl || null,
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(orderId) {
    try {
      const token = await this.getAccessToken();
      const res   = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      // Statuts PayPal : CREATED | SAVED | APPROVED | VOIDED | COMPLETED | PAYER_ACTION_REQUIRED
      return {
        success: true,
        status:  data.status === 'COMPLETED' ? 'SUCCESSFUL'
               : data.status === 'VOIDED'    ? 'FAILED'
               :                               'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}