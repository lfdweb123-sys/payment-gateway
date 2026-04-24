export default class KKiaPayProvider {
  constructor(config) {
    this.publicKey = config.KKIAPAY_PUBLIC_KEY;
    this.privateKey = config.KKIAPAY_PRIVATE_KEY;
    this.secretKey = config.KKIAPAY_SECRET_KEY;
  }
  get name() { return 'KKiaPay'; }

  async initPayment({ amount, phone, email, description }) {
    try {
      const res = await fetch('https://api.kkiapay.me/api/v1/transactions', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-Api-Key': this.publicKey, 'X-Private-Key': this.privateKey, 'X-Secret-Key': this.secretKey },
        body: JSON.stringify({ amount: Math.round(amount), phone: phone || '', email: email || '', description: (description || 'Paiement').substring(0, 100) })
      });
      const data = await res.json();
      if (!res.ok || data.status === 'failed') return { success: false, error: data.message || 'Erreur KKiaPay' };
      return { success: true, reference: data.transaction_id, url: data.payment_url, status: 'pending' };
    } catch (e) { return { success: false, error: e.message }; }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(`https://api.kkiapay.me/api/v1/transactions/${reference}`, { headers: { 'X-Api-Key': this.publicKey } });
      const data = await res.json();
      return { success: true, status: data.status === 'completed' || data.status === 'SUCCESS' ? 'SUCCESSFUL' : 'PENDING', data };
    } catch (e) { return { success: false, error: e.message }; }
  }
}