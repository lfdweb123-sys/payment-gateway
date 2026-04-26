/**
 * Airtel Money — airtel.js
 * Doc : https://developers.airtel.africa/
 *
 * Flow :
 *   1. POST https://openapi.airtel.africa/auth/oauth2/token → access_token
 *   2. POST https://openapi.airtel.africa/merchant/v2/payments/ → initier
 *   3. GET  https://openapi.airtel.africa/standard/v1/payments/{id} → statut
 *
 * Pays supportés : KE, UG, TZ, ZM, MW, GH, CD, MG, CM, CI, RW, NE, TD, BF, BI, GW, SL
 */

export default class Airtel {
  constructor(config) {
    this.clientId     = config.AIRTEL_CLIENT_ID;
    this.clientSecret = config.AIRTEL_CLIENT_SECRET;
    this.appUrl       = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Airtel Money'; }

  async getAccessToken() {
    const res = await fetch('https://openapi.airtel.africa/auth/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     this.clientId,
        client_secret: this.clientSecret,
        grant_type:    'client_credentials',
      }),
    });
    const data = await res.json();
    return data.access_token;
  }

  async initPayment({ amount, phone, currency, country, description }) {
    const referenceId = `GW-${Date.now()}`;
    const countryUpper = (country || 'KE').toUpperCase();

    try {
      const token = await this.getAccessToken();
      const res   = await fetch('https://openapi.airtel.africa/merchant/v2/payments/', {
        method:  'POST',
        headers: {
          'Authorization':  `Bearer ${token}`,
          'Content-Type':   'application/json',
          'Accept':         '*/*',
          'X-Country':      countryUpper,
          'X-Currency':     currency || 'KES',
        },
        body: JSON.stringify({
          reference: referenceId,
          subscriber: {
            country:  countryUpper,
            currency: currency || 'KES',
            msisdn:   phone, // format local (sans +), ex: 712345678
          },
          transaction: {
            amount:   Math.round(amount),
            country:  countryUpper,
            currency: currency || 'KES',
            id:       referenceId,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status?.response_code !== 'DP00800001006') {
        return {
          success: false,
          error: data.status?.message || data.message || 'Erreur Airtel Money',
        };
      }

      return {
        success:   true,
        reference: data.data?.transaction?.id || referenceId,
        url:       null, // USSD push
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(transactionId, country, currency) {
    const countryUpper = (country || 'KE').toUpperCase();
    try {
      const token = await this.getAccessToken();
      const res   = await fetch(
        `https://openapi.airtel.africa/standard/v1/payments/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept':        '*/*',
            'X-Country':     countryUpper,
            'X-Currency':    currency || 'KES',
          },
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.status?.message };

      const txStatus = data.data?.transaction?.status;
      return {
        success: true,
        status:  txStatus === 'TS'  ? 'SUCCESSFUL'  // TS = Transaction Successful
               : txStatus === 'TF'  ? 'FAILED'      // TF = Transaction Failed
               :                      'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}