/**
 * KKiaPay — kkiapay.js
 * Doc : https://docs.kkiapay.me/v1/en-1.0.0
 *
 * ⚠️  IMPORTANT : KKiaPay n'expose PAS d'API REST serveur pour initier un paiement.
 *     L'initiation se fait UNIQUEMENT via le widget JavaScript côté client :
 *       openKkiapayWidget({ amount, key, callback, ... })
 *     Après le paiement, le widget retourne un transactionId que tu envoies
 *     à ton backend pour vérification.
 *
 *     Doc widget : https://docs.kkiapay.me/v1/en-1.0.0/plugin-et-sdk/sdk-javascript
 *
 * Ce provider gère donc :
 *   - initPayment  → retourne une payment_url vers le widget KKiaPay hébergé
 *   - verifyPayment → vérifie le statut via l'Admin SDK REST
 *
 * Vérification :
 *   GET https://api.kkiapay.me/api/v1/transactions/{transactionId}
 *   Headers : X-Private-Key, X-Secret-Key
 *   Statuts : "SUCCESS" | "FAILED" | "PENDING"
 */

export default class KKiaPay {
  constructor(config) {
    this.publicKey  = config.KKIAPAY_PUBLIC_KEY;
    this.privateKey = config.KKIAPAY_PRIVATE_KEY;
    this.secretKey  = config.KKIAPAY_SECRET_KEY;
    this.sandbox    = config.KKIAPAY_SANDBOX === 'true' || config.KKIAPAY_SANDBOX === true;
    this.appUrl     = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'KKiaPay'; }

  async initPayment({ amount, phone, email, description, country }) {
    // KKiaPay ne fournit pas d'API REST pour créer un paiement côté serveur.
    // On génère une URL vers le widget KKiaPay hébergé (solution de contournement).
    // Le client est redirigé vers cette page, complète le paiement,
    // puis le webhook KKiaPay notifie ton serveur.

    if (!this.publicKey) {
      return { success: false, error: 'KKiaPay : clé publique manquante' };
    }

    const callbackUrl = `${this.appUrl}/success`;
    const params = new URLSearchParams({
      amount:   String(Math.round(amount)),
      key:      this.publicKey,
      callback: callbackUrl,
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(this.sandbox ? { sandbox: 'true' } : {}),
    });

    // URL du widget KKiaPay hébergé (page de paiement standalone)
    const paymentUrl = `https://widget.kkiapay.me/?${params.toString()}`;

    return {
      success:   true,
      reference: `kkia-${Date.now()}`, // référence provisoire, remplacée après vérification
      url:       paymentUrl,
      status:    'pending',
    };
  }

  async verifyPayment(transactionId) {
    // Vérification via l'Admin SDK REST — c'est l'usage officiel côté serveur
    const baseUrl = this.sandbox
      ? 'https://sandbox-api.kkiapay.me'
      : 'https://api.kkiapay.me';

    try {
      const res = await fetch(
        `${baseUrl}/api/v1/transactions/${transactionId}`,
        {
          method:  'GET',
          headers: {
            'X-Private-Key': this.privateKey,
            'X-Secret-Key':  this.secretKey,
            'Content-Type':  'application/json',
          },
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || 'Erreur KKiaPay vérification' };

      // Statuts KKiaPay : "SUCCESS" | "FAILED" | "PENDING"
      const raw = (data.status || '').toUpperCase();
      return {
        success: true,
        status:  raw === 'SUCCESS' ? 'SUCCESSFUL'
               : raw === 'FAILED'  ? 'FAILED'
               :                     'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}