export default class QosicProvider {
  constructor(config) { this.apiKey = config.QOSIC_API_KEY; this.merchantId = config.QOSIC_MERCHANT_ID; }
  get name() { return 'Qosic'; }

  async initPayment({ amount, phone, description }) {
    try {
      const res = await fetch('https://api.qosic.com/v1/payment/init', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: this.merchantId, amount: Math.round(amount), currency: 'XOF', phone: phone, description: (description || 'Paiement').substring(0, 50), callback_url: `${window.location.origin}/api/webhook/qosic` })
      });
      const data = await res.json();
      if (!res.ok || data.status === 'error') return { success: false, error: data.message || 'Erreur Qosic' };
      return { success: true, reference: data.reference || data.transaction_id, status: 'pending' };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(`https://api.qosic.com/v1/payment/status/${reference}`, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
      const data = await res.json();
      return { success: true, status: data.status === 'success' ? 'SUCCESSFUL' : 'PENDING', data };
    } catch (e) { return { success: false, error: e.message }; }
  }
}