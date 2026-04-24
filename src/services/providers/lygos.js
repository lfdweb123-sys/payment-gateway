export default class LygosProvider {
  constructor(config) {
    this.apiKey = config.LYGOS_API_KEY;
    this.secretKey = config.LYGOS_SECRET_KEY;
  }
  get name() { return 'Lygos'; }

  async initPayment({ amount, phone, email, description }) {
    try {
      const res = await fetch('https://api.lygosapp.com/v1/payments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amount), currency: 'XOF', phone: phone, email: email || '', description: (description || 'Paiement').substring(0, 100), callback_url: `${window.location.origin}/api/webhook/lygos` })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || 'Erreur Lygos' };
      return { success: true, reference: data.reference || data.id, status: 'pending' };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(`https://api.lygosapp.com/v1/payments/${reference}`, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
      const data = await res.json();
      return { success: true, status: data.status === 'completed' ? 'SUCCESSFUL' : 'PENDING', data };
    } catch (e) { return { success: false, error: e.message }; }
  }
}