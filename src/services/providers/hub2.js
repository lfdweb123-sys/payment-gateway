export default class Hub2Provider {
  constructor(config) { this.apiKey = config.HUB2_API_KEY; }
  get name() { return 'Hub2'; }

  async initPayment({ amount, phone, email, description }) {
    try {
      const res = await fetch('https://api.hub2.io/v1/payments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amount), currency: 'XOF', customer: { phone: phone, email: email || '' }, description: (description || 'Paiement').substring(0, 200), callback_url: `${window.location.origin}/api/webhook/hub2` })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || 'Erreur Hub2' };
      return { success: true, reference: data.id, status: 'pending' };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(`https://api.hub2.io/v1/payments/${reference}`, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
      const data = await res.json();
      return { success: true, status: data.status === 'succeeded' ? 'SUCCESSFUL' : 'PENDING', data };
    } catch (e) { return { success: false, error: e.message }; }
  }
}