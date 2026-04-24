export default class FeexPayProvider {
  constructor(config) {
    this.apiKey = config.FEEXPAY_TOKEN;
    this.shopId = config.FEEXPAY_SHOP_ID;
  }

  get name() { return 'FeexPay'; }

  async initPayment({ amount, phone, country, method, description }) {
    const url = 'https://api.feexpay.me/api/payouts/public/transfer/global';
    
    const networkMap = {
      mtn_money: 'MTN', moov_money: 'MOOV', celtiis_money: 'CELTIIS BJ',
      orange_money: 'ORANGE', wave_money: 'WAVE', togocom_money: 'TOGOCOM TG'
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: this.shopId, amount: Math.round(amount), phoneNumber: phone, network: networkMap[method] || 'MTN', motif: (description || 'Paiement').substring(0, 50) })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };
      return { success: true, reference: data.reference, status: data.status };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(`https://api.feexpay.me/api/payouts/status/public/${reference}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      const data = await res.json();
      return { success: true, status: data.status, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}