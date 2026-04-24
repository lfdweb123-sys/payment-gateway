export default class ChipperProvider {
  constructor(config) { this.apiKey = config.CHIPPER_API_KEY; }
  get name() { return 'Chipper Cash'; }

  async initPayment({ amount, phone, email, description }) {
    try {
      const res = await fetch('https://api.chipperpayments.com/v1/charges', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), currency: 'USD', customer: { email: email || 'customer@email.com', phone_number: phone }, description: (description || 'Paiement').substring(0, 100), redirect_url: `${window.location.origin}/callback` })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || 'Erreur Chipper' };
      return { success: true, reference: data.id, url: data.payment_url, status: 'pending' };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(`https://api.chipperpayments.com/v1/charges/${reference}`, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
      const data = await res.json();
      return { success: true, status: data.status === 'completed' ? 'SUCCESSFUL' : 'PENDING', data };
    } catch (e) { return { success: false, error: e.message }; }
  }
}