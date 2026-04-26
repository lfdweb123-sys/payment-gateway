/**
 * Razorpay — razorpay.js
 * Doc : https://razorpay.com/docs/api/orders/create/
 *
 * Flow :
 *   1. POST https://api.razorpay.com/v1/orders → créer un order
 *   2. Redirect vers https://api.razorpay.com/v1/checkout/embedded avec order_id
 *      (ou utiliser le Checkout JS côté client)
 *   3. GET https://api.razorpay.com/v1/orders/{id}/payments → vérifier
 *
 * Auth   : Basic Auth (key_id:key_secret)
 * Amount : en PAISE (×100 pour INR), ×100 pour la plupart des devises
 * Pays   : Inde (IN)
 *
 * ⚠️  Razorpay est principalement un Checkout JS — le paiement se finalise
 *     côté client. Côté serveur on crée l'order et on vérifie ensuite.
 */

export default class Razorpay {
  constructor(config) {
    this.keyId     = config.RAZORPAY_KEY_ID;
    this.keySecret = config.RAZORPAY_KEY_SECRET;
    this.appUrl    = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Razorpay'; }

  get authHeader() {
    return 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
  }

  async initPayment({ amount, currency, description, email, phone }) {
    // Razorpay : montant en sous-unités (paise pour INR)
    const amountInPaise = Math.round(parseFloat(amount) * 100);

    try {
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method:  'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          amount:          amountInPaise,
          currency:        (currency || 'INR').toUpperCase(),
          receipt:         `GW-${Date.now()}`,
          notes: {
            description: (description || 'Paiement').substring(0, 256),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        return { success: false, error: data.error?.description || 'Erreur Razorpay' };
      }

      // L'order est créé — le paiement se complète via le Checkout JS côté client.
      // On retourne l'order_id + un lien de paiement hébergé (Payment Pages).
      return {
        success:   true,
        reference: data.id,
        // URL de paiement standard Razorpay (nécessite le Checkout JS côté client)
        // Pour une intégration purement serveur, utiliser Razorpay Payment Links
        url:       `https://rzp.io/i/${data.id}`,
        status:    data.status, // 'created'
        keyId:     this.keyId,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(orderId) {
    try {
      const res = await fetch(
        `https://api.razorpay.com/v1/orders/${orderId}/payments`,
        { headers: { 'Authorization': this.authHeader } }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error?.description };

      const payments = data.items || [];
      const captured  = payments.find(p => p.status === 'captured');
      const authorized = payments.find(p => p.status === 'authorized');

      return {
        success: true,
        status:  captured   ? 'SUCCESSFUL'
               : authorized ? 'PENDING'
               :               'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}