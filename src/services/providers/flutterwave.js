export default class FlutterwaveProvider {
  constructor(config) {
    this.secretKey = config.FLW_SECRET_KEY;
    this.publicKey = config.FLW_PUBLIC_KEY;
  }

  get name() { return 'Flutterwave'; }

  async initPayment({ amount, email, phone, country, currency, method, description }) {
    try {
      const res = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_ref: `GW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          amount: parseFloat(amount),
          currency: currency || 'XOF',
          payment_type: method === 'card' ? 'card' : 'mobilemoney',
          redirect_url: `${window.location.origin}/payment/callback`,
          customer: { email: email || 'customer@gateway.com', phonenumber: phone },
          customizations: { title: 'Paiement', description: (description || '').substring(0, 50) },
          country
        })
      });
      const data = await res.json();
      if (data.status !== 'success') return { success: false, error: data.message };
      return { success: true, reference: data.data.tx_ref, url: data.data.link, status: 'pending' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(txRef) {
    try {
      const res = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_txref?tx_ref=${txRef}`, {
        headers: { 'Authorization': `Bearer ${this.secretKey}` }
      });
      const data = await res.json();
      return { success: true, status: data.data?.status === 'successful' ? 'SUCCESSFUL' : 'PENDING', data: data.data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}