export default class CinetPayProvider {
  constructor(config) {
    this.apiKey = config.CINETPAY_API_KEY;
    this.siteId = config.CINETPAY_SITE_ID;
    this.secretKey = config.CINETPAY_SECRET_KEY;
  }
  get name() { return 'CinetPay'; }

  async initPayment({ amount, phone, email, description }) {
    try {
      const res = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apikey: this.apiKey, site_id: this.siteId, transaction_id: `GW-${Date.now()}`, amount: Math.round(amount), currency: 'XOF', description: (description || 'Paiement').substring(0, 200), customer_name: email || 'Client', customer_email: email || 'client@email.com', customer_phone_number: phone || '', notify_url: `${window.location.origin}/api/webhook/cinetpay`, return_url: `${window.location.origin}/success` })
      });
      const data = await res.json();
      if (data.code !== '201') return { success: false, error: data.message || 'Erreur CinetPay' };
      return { success: true, reference: data.data.transaction_id, url: data.data.payment_url, status: 'pending' };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apikey: this.apiKey, site_id: this.siteId, transaction_id: reference })
      });
      const data = await res.json();
      return { success: true, status: data.data?.status === 'ACCEPTED' ? 'SUCCESSFUL' : 'PENDING', data: data.data };
    } catch (e) { return { success: false, error: e.message }; }
  }
}