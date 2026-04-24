export default class PayDunyaProvider {
  constructor(config) {
    this.masterKey = config.PAYDUNYA_MASTER_KEY;
    this.privateKey = config.PAYDUNYA_PRIVATE_KEY;
  }
  get name() { return 'PayDunya'; }

  async initPayment({ amount, phone, email, description }) {
    try {
      const res = await fetch('https://paydunya.com/api/v1/checkout-invoice/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice: { items: [{ name: (description || 'Paiement').substring(0, 50), quantity: 1, unit_price: Math.round(amount), total_price: Math.round(amount) }], total_amount: Math.round(amount), description: (description || '').substring(0, 200) }, store: { name: 'Passerelle' }, actions: { cancel_url: `${window.location.origin}/cancel`, return_url: `${window.location.origin}/success` } })
      });
      const data = await res.json();
      if (data.response_code !== '00') return { success: false, error: data.response_text || 'Erreur PayDunya' };
      return { success: true, reference: data.invoice.token, url: data.response_text, status: 'pending' };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(`https://paydunya.com/api/v1/checkout-invoice/confirm/${reference}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      return { success: true, status: data.status === 'completed' ? 'SUCCESSFUL' : 'PENDING', data };
    } catch (e) { return { success: false, error: e.message }; }
  }
}