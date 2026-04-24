export default class PaystackProvider {
  constructor(config) {
    this.secretKey = config.PAYSTACK_SECRET_KEY;
    this.publicKey = config.PAYSTACK_PUBLIC_KEY;
  }

  get name() { return 'Paystack'; }

  async initPayment({ amount, email, phone, currency, method, description }) {
    try {
      const res = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(parseFloat(amount) * 100),
          email: email || 'customer@gateway.com',
          currency: currency || 'NGN',
          channels: method === 'card' ? ['card'] : [method],
          metadata: { phone, description }
        })
      });
      const data = await res.json();
      if (!data.status) return { success: false, error: data.message };
      return { success: true, reference: data.data.reference, url: data.data.authorization_url, status: 'pending' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { 'Authorization': `Bearer ${this.secretKey}` }
      });
      const data = await res.json();
      return { success: true, status: data.data?.status === 'success' ? 'SUCCESSFUL' : 'PENDING', data: data.data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}