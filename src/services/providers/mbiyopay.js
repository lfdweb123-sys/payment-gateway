/**
 * MbiyoPay — mbiyopay.js
 * Doc     : https://dashboard.mbiyo.africa/docs/reference/merchant/payin
 * Endpoint: POST https://dashboard.mbiyo.africa/api/v1/merchant/payin
 *
 * 11 pays supportés : BJ, BF, CI, SN, TG, CG, CD, CM, GN, ML, GM
 * Statut webhook    : "successful" (minuscule), pas "SUCCESSFUL"
 */

const NETWORK_MAP = {
  mtn_money:     'mtn',
  moov_money:    'moov',
  orange_money:  'orange',
  celtiis_money: 'celtiis',
  wave_money:    'wave',
  free_money:    'free',
  togocom_money: 'togocom',
  airtel_money:  'airtel',
  mpesa:         'mpesa',
  afrimoney:     'afrimoney',
  coris:         'coris',
  qmoney:        'qmoney',
};

export default class MbiyoPay {
  constructor(config) {
    this.apiKey = config.MBIYOPAY_API_KEY;
    this.appUrl = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'MbiyoPay'; }

  async initPayment({ amount, phone, currency, country, description, method }) {
    const network = NETWORK_MAP[method] || 'mtn';

    try {
      const res = await fetch('https://dashboard.mbiyo.africa/api/v1/merchant/payin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          amount:         parseFloat(amount),
          currency:       currency || 'XOF',
          payment_method: 'mobile_money',
          order_id:       `GW-${Date.now()}`,
          callback_url:   `${this.appUrl}/api/webhook/mbiyopay`,
          metadata: {
            network,
            phone_number: phone,
            country_code: (country || 'BJ').toUpperCase(),
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status === 'error') {
        const msg = typeof data.message === 'string'
          ? data.message
          : JSON.stringify(data.message || 'Erreur MbiyoPay');
        return { success: false, error: msg };
      }

      const tx = data.data;
      return {
        success:   true,
        reference: tx?.transaction_id || null,
        url:       tx?.redirect_url   || null,
        status:    tx?.status         || 'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(transactionId) {
    try {
      const res = await fetch(
        `https://dashboard.mbiyo.africa/api/v1/merchant/status/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type':  'application/json',
          },
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      const raw = data.data?.status || 'pending';
      return {
        success: true,
        status:  raw === 'successful' ? 'SUCCESSFUL' : raw.toUpperCase(),
        data:    data.data,
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}