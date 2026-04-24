export default class StripeProvider {
  constructor(config) {
    this.secretKey = config.STRIPE_SECRET_KEY;
    this.publicKey = config.STRIPE_PUBLIC_KEY;
  }

  get name() { return 'Stripe'; }

  async initPayment({ amount, email, currency, description }) {
    try {
      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'payment_method_types[]': 'card',
          'line_items[0][price_data][currency]': (currency || 'eur').toLowerCase(),
          'line_items[0][price_data][product_data][name]': description || 'Paiement',
          'line_items[0][price_data][unit_amount]': Math.round(parseFloat(amount) * 100),
          'line_items[0][quantity]': '1',
          mode: 'payment',
          success_url: `${window.location.origin}/payment/success`,
          cancel_url: `${window.location.origin}/payment/cancel`
        })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.message };
      return { success: true, reference: data.id, url: data.url, status: 'pending' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(sessionId) {
    try {
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${this.secretKey}` }
      });
      const data = await res.json();
      return { success: true, status: data.payment_status === 'paid' ? 'SUCCESSFUL' : 'PENDING', data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}