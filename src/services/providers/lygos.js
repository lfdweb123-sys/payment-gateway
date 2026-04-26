/**
 * Lygos — lygos.js
 * Doc : https://docs.lygosapp.com/api-reference/gateway/create-payment-gateway
 *
 * Init (créer une gateway) :
 *   POST https://api.lygosapp.com/v1/gateway
 *   Header : api-key (pas Authorization Bearer)
 *   Body   : { amount, shop_name, message, success_url, failure_url, order_id }
 *   Retour : { id, link, order_id, ... }
 *   → Rediriger le client vers `link`
 *
 * Vérification :
 *   GET https://api.lygosapp.com/v1/gateway/payin/{order_id}
 *   Header : api-key
 *   Retour : { status, order_id }
 *
 * ⚠️  Lygos ne collecte pas phone/email côté API — c'est la page de checkout qui le fait.
 * ⚠️  La currency est déterminée par le pays du compte Lygos, pas passée dans le body.
 * ⚠️  Un seul environnement : production (https://api.lygosapp.com/v1)
 */

export default class Lygos {
  constructor(config) {
    this.apiKey   = config.LYGOS_API_KEY;
    this.shopName = config.LYGOS_SHOP_NAME || 'Ma Boutique';
    this.appUrl   = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Lygos'; }

  async initPayment({ amount, description, country }) {
    const orderId = `GW-${Date.now()}`;

    try {
      const res = await fetch('https://api.lygosapp.com/v1/gateway', {
        method:  'POST',
        headers: {
          'api-key':      this.apiKey,   // ← header correct (pas Authorization Bearer)
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount:      Math.round(amount),
          shop_name:   this.shopName,
          message:     (description || 'Paiement').substring(0, 200),
          success_url: `${this.appUrl}/success`,
          failure_url: `${this.appUrl}/cancel`,
          order_id:    orderId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || data.detail || 'Erreur Lygos' };
      }

      return {
        success:   true,
        reference: data.order_id || orderId,  // utiliser order_id pour la vérification
        url:       data.link     || null,      // URL de checkout → rediriger le client
        status:    'pending',
        provider:  'lygos',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(orderId) {
    try {
      const res = await fetch(
        `https://api.lygosapp.com/v1/gateway/payin/${encodeURIComponent(orderId)}`,
        {
          method:  'GET',
          headers: { 'api-key': this.apiKey },
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || data.detail };

      // La doc ne précise pas les valeurs exactes de `status` pour Lygos.
      // On normalise de façon défensive.
      const raw = (data.status || '').toLowerCase();
      return {
        success: true,
        status:  raw === 'success'  || raw === 'successful' || raw === 'completed' ? 'SUCCESSFUL'
               : raw === 'failed'   || raw === 'failure'    || raw === 'error'      ? 'FAILED'
               :                                                                       'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}