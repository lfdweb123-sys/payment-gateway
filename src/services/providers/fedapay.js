export default class FedaPayProvider {
  constructor(config) {
    this.secretKey = config.FEDAPAY_SECRET_KEY;
    this.publicKey = config.FEDAPAY_PUBLIC_KEY;
  }
  get name() { return 'FedaPay'; }

  async initPayment({ amount, phone, email, description }) {
    try {
      const res = await fetch('https://api.fedapay.com/v1/transactions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amount), currency: { iso: 'XOF' }, description: (description || 'Paiement').substring(0, 200), customer: { email: email || 'client@email.com', phone_number: phone ? { number: phone } : null } })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || 'Erreur FedaPay' };
      return { success: true, reference: data.id?.toString(), url: data.payment_url, status: 'pending' };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(`https://api.fedapay.com/v1/transactions/${reference}`, { headers: { 'Authorization': `Bearer ${this.secretKey}` } });
      const data = await res.json();
      return { success: true, status: data.status === 'approved' ? 'SUCCESSFUL' : 'PENDING', data };
    } catch (e) { return { success: false, error: e.message }; }
  }
}