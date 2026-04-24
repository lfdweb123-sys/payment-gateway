export default class BizaoProvider {
  constructor(config) { this.apiKey = config.BIZAO_API_KEY; this.merchantId = config.BIZAO_MERCHANT_ID; }
  get name() { return 'Bizao'; }

  async initPayment({ amount, phone, description }) {
    try {
      const res = await fetch('https://api.bizao.com/v1/payments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: this.merchantId, amount: Math.round(amount), phone_number: phone, description: (description || 'Paiement').substring(0, 100), currency: 'XOF' })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || 'Erreur Bizao' };
      return { success: true, reference: data.reference, status: 'pending' };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(`https://api.bizao.com/v1/payments/${reference}`, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
      const data = await res.json();
      return { success: true, status: data.status === 'SUCCESS' ? 'SUCCESSFUL' : 'PENDING', data };
    } catch (e) { return { success: false, error: e.message }; }
  }
}