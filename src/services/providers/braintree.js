/**
 * Braintree (PayPal) — braintree.js
 * Doc : https://developer.paypal.com/braintree/docs/
 *
 * ⚠️  Braintree fonctionne principalement avec le SDK Node.js officiel.
 *     L'API REST directe est complexe (GraphQL ou XML).
 *     On utilise ici le SDK npm `braintree`.
 *
 * Flow :
 *   1. gateway.clientToken.generate() → client_token (pour le front)
 *   2. Front envoie payment_method_nonce au serveur
 *   3. gateway.transaction.sale({ amount, payment_method_nonce }) → transaction
 *
 * ⚠️  Ce provider nécessite : npm install braintree
 * Pays supportés : US, CA, AU, GB, DE, FR, ES, IT, NL, BE, + 44 autres
 */

export default class Braintree {
  constructor(config) {
    this.merchantId  = config.BRAINTREE_MERCHANT_ID;
    this.publicKey   = config.BRAINTREE_PUBLIC_KEY;
    this.privateKey  = config.BRAINTREE_PRIVATE_KEY;
    this.sandbox     = config.BRAINTREE_SANDBOX !== 'false';
    this.appUrl      = config.APP_URL || process.env.VITE_APP_URL || '';
    this._gateway    = null;
  }

  get name() { return 'Braintree'; }

  async _getGateway() {
    if (this._gateway) return this._gateway;
    try {
      const braintree = await import('braintree');
      const Braintree = braintree.default || braintree;
      this._gateway = new Braintree.BraintreeGateway({
        environment: this.sandbox
          ? Braintree.Environment.Sandbox
          : Braintree.Environment.Production,
        merchantId: this.merchantId,
        publicKey:  this.publicKey,
        privateKey: this.privateKey,
      });
      return this._gateway;
    } catch {
      throw new Error('Braintree SDK manquant — exécuter : npm install braintree');
    }
  }

  async initPayment({ amount, description, email }) {
    try {
      const gateway = await this._getGateway();

      // Génère un client token (à envoyer au front pour le Dropin UI ou Hosted Fields)
      const tokenResult = await gateway.clientToken.generate({});
      if (!tokenResult.success) {
        return { success: false, error: 'Braintree : erreur génération client token' };
      }

      // Pour une intégration purement server-side avec un nonce fake (tests seulement)
      // En production, le nonce vient du client SDK
      return {
        success:     true,
        reference:   `BT-${Date.now()}`,
        clientToken: tokenResult.clientToken, // à passer au front
        url:         null, // pas d'URL de redirection — flow client-side
        status:      'pending',
        note:        'Passer clientToken au front pour compléter le paiement via le Dropin UI',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Appelé depuis le webhook ou après réception du nonce côté serveur
  async chargeNonce({ nonce, amount }) {
    try {
      const gateway = await this._getGateway();
      const result  = await gateway.transaction.sale({
        amount:               parseFloat(amount).toFixed(2),
        payment_method_nonce: nonce,
        options:              { submit_for_settlement: true },
      });

      if (!result.success) {
        return { success: false, error: result.message || 'Transaction refusée' };
      }

      return {
        success:   true,
        reference: result.transaction.id,
        status:    result.transaction.status === 'settled' || result.transaction.status === 'submitted_for_settlement'
          ? 'SUCCESSFUL' : 'PENDING',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(transactionId) {
    try {
      const gateway = await this._getGateway();
      const tx      = await gateway.transaction.find(transactionId);
      const status  = tx.status;

      return {
        success: true,
        status:  status === 'settled' || status === 'submitted_for_settlement' ? 'SUCCESSFUL'
               : status === 'voided'  || status === 'gateway_rejected'          ? 'FAILED'
               :                                                                   'PENDING',
        data: tx,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}