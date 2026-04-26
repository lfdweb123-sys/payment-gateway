/**
 * Orange Money — orange.js
 * Doc : https://developer.orange.com/apis/om-webpay
 *
 * Flow :
 *   1. POST https://api.orange.com/oauth/v3/token → access_token
 *   2. POST https://api.orange.com/orange-money-webpay/{country}/v1/webpayment → payment_url + pay_token
 *   3. Redirect vers payment_url
 *   4. GET  /orange-money-webpay/{country}/v1/transactionstatus/{order_id} → statut
 *
 * ⚠️  Accès sur demande auprès de l'opérateur Orange local (KYA requis)
 * ⚠️  Pays supportés : CI, SN, ML, CM, GN, GW, SL, MG, BW, CD, CF
 * ⚠️  Le marchand doit avoir un compte Orange Money marchand dans le pays concerné
 */

// Mapping pays interne → segment URL Orange
const COUNTRY_SEGMENT = {
  ci: 'civ', sn: 'sn', ml: 'ml', cm: 'cm',
  gn: 'gin', cd: 'cd', cf: 'cf',
};

export default class Orange {
  constructor(config) {
    this.clientId     = config.ORANGE_CLIENT_ID;
    this.clientSecret = config.ORANGE_CLIENT_SECRET;
    this.merchantKey  = config.ORANGE_MERCHANT_KEY; // clé marchande fournie par Orange
    this.appUrl       = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Orange Money'; }

  async getAccessToken() {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch('https://api.orange.com/oauth/v3/token', {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/x-www-form-urlencoded',
        'Accept':        'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    return data.access_token;
  }

  async initPayment({ amount, phone, currency, country, description }) {
    const segment = COUNTRY_SEGMENT[country] || 'sn';
    const orderId = `GW-${Date.now()}`;

    try {
      const token = await this.getAccessToken();
      const res   = await fetch(
        `https://api.orange.com/orange-money-webpay/${segment}/v1/webpayment`,
        {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
            'Accept':        'application/json',
          },
          body: JSON.stringify({
            merchant_key:    this.merchantKey,
            currency:        currency || 'XOF',
            order_id:        orderId,
            amount:          Math.round(amount),
            return_url:      `${this.appUrl}/success`,
            cancel_url:      `${this.appUrl}/cancel`,
            notif_url:       `${this.appUrl}/api/webhook/orange`,
            lang:            'fr',
            reference:       description || 'Paiement',
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.payment_url) {
        return { success: false, error: data.message || data.error || 'Erreur Orange Money' };
      }

      return {
        success:   true,
        reference: orderId,
        token:     data.pay_token,
        url:       data.payment_url,
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(orderId, country) {
    const segment = COUNTRY_SEGMENT[country] || 'sn';
    try {
      const token = await this.getAccessToken();
      const res   = await fetch(
        `https://api.orange.com/orange-money-webpay/${segment}/v1/transactionstatus/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept':        'application/json',
          },
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      // Statuts Orange : "SUCCESS" | "FAILED" | "PENDING" | "CANCELLED"
      const raw = (data.status || '').toUpperCase();
      return {
        success: true,
        status:  raw === 'SUCCESS'                         ? 'SUCCESSFUL'
               : raw === 'FAILED' || raw === 'CANCELLED'  ? 'FAILED'
               :                                            'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}