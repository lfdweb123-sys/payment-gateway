export default class PayPalProvider {
  constructor(config) {
    this.clientId = config.PAYPAL_CLIENT_ID;
    this.secretKey = config.PAYPAL_SECRET_KEY;
    this.baseUrl = 'https://api-m.paypal.com';
  }
  get name() { return 'PayPal'; }

  async getAccessToken() {
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${btoa(`${this.clientId}:${this.secretKey}`)}` },
      body: 'grant_type=client_credentials'
    });
    const data = await res.json();
    return data.access_token;
  }

  async initPayment({ amount, email, currency, description }) {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: currency || 'EUR', value: parseFloat(amount).toFixed(2) }, description: (description || '').substring(0, 127) }], application_context: { return_url: `${window.location.origin}/success`, cancel_url: `${window.location.origin}/cancel` } })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };
      return { success: true, reference: data.id, url: data.links?.find(l => l.rel === 'approve')?.href, status: 'pending' };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async verifyPayment(orderId) {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      return { success: true, status: data.status === 'COMPLETED' ? 'SUCCESSFUL' : 'PENDING', data };
    } catch (e) { return { success: false, error: e.message }; }
  }
}