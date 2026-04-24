export default class MbiyoPayProvider {
  constructor(config) { this.apiKey = config.MBIYOPAY_API_KEY; }
  get name() { return 'MbiyoPay'; }

  async initPayment({ amount, phone, description }) {
    try {
      const res = await fetch('https://api.mbiyopay.com/v1/payments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amount), phone: phone, description: (description || 'Paiement').substring(0, 100), callback: `${window.location.origin}/api/webhook/mbiyopay` })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || 'Erreur MbiyoPay' };
      return { success: true, reference: data.reference, status: 'pending' };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(`https://api.mbiyopay.com/v1/payments/${reference}`, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
      const data = await res.json();
      return { success: true, status: data.status === 'completed' ? 'SUCCESSFUL' : 'PENDING', data };
    } catch (e) { return { success: false, error: e.message }; }
  }
}