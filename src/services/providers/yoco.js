/**
 * Yoco — yoco.js
 * Doc : https://developer.yoco.com/online/api-reference/checkout/payments/accept-payments/
 *
 * Init   : POST https://payments.yoco.com/api/checkouts
 * Vérif  : GET  https://payments.yoco.com/api/checkouts/{id}
 *
 * Auth   : Authorization: Bearer {SECRET_KEY}
 * Amount : en cents (ZAR) — R10.00 → 1000
 * Devise : ZAR uniquement
 * Pays   : Afrique du Sud (ZA)
 *
 * ⚠️  Yoco n'accepte que ZAR (Rand sud-africain)
 * ⚠️  Utiliser le webhook payment.succeeded pour confirmer le paiement
 */

export default class Yoco {
  constructor(config) {
    this.secretKey = config.YOCO_SECRET_KEY;
    this.appUrl    = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Yoco'; }

  async initPayment({ amount, description, email }) {
    // Yoco : montant en cents (pas de décimales)
    const amountCents = Math.round(parseFloat(amount) * 100);

    try {
      const res = await fetch('https://payments.yoco.com/api/checkouts', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          amount:      amountCents,
          currency:    'ZAR',
          successUrl:  `${this.appUrl}/success`,
          cancelUrl:   `${this.appUrl}/cancel`,
          failureUrl:  `${this.appUrl}/cancel`,
          metadata: {
            description: (description || 'Paiement').substring(0, 255),
            ...(email ? { email } : {}),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.errorCode) {
        return { success: false, error: data.displayMessage || data.message || 'Erreur Yoco' };
      }

      return {
        success:   true,
        reference: data.id,
        url:       data.redirectUrl,  // URL de la page de paiement Yoco
        status:    data.status || 'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(checkoutId) {
    try {
      const res = await fetch(
        `https://payments.yoco.com/api/checkouts/${checkoutId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type':  'application/json',
          },
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.displayMessage || data.message };

      // Statuts Yoco : pending | complete | expired | cancelled
      // payment.succeeded via webhook = statut final
      const status = data.status;
      return {
        success: true,
        status:  status === 'complete'   ? 'SUCCESSFUL'
               : status === 'expired' || status === 'cancelled' ? 'FAILED'
               :                                                   'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}