/**
 * PayDunya — paydunya.js
 * Doc : https://developers.paydunya.com/doc/FR/http_json
 *
 * Init :
 *   POST https://app.paydunya.com/api/v1/checkout-invoice/create
 *   Headers : PAYDUNYA-MASTER-KEY, PAYDUNYA-PRIVATE-KEY, PAYDUNYA-TOKEN (obligatoires)
 *   Body    : { invoice: { total_amount, description, customer }, store: { name }, actions: { ... } }
 *   Retour  : { response_code: "00", response_text: "https://...", token: "xxx" }
 *   → response_text est l'URL de checkout, token est la référence
 *
 * Vérification :
 *   GET https://app.paydunya.com/api/v1/checkout-invoice/confirm/{token}
 *   Headers : mêmes 3 headers
 *   Statuts : "completed" | "pending" | "cancelled"
 *
 * ⚠️  Base URL : https://app.paydunya.com (pas https://paydunya.com)
 * ⚠️  3 headers obligatoires : MASTER-KEY + PRIVATE-KEY + TOKEN
 * ⚠️  Sandbox : https://app.paydunya.com/sandbox-api/v1/...
 */

export default class PayDunya {
  constructor(config) {
    this.masterKey  = config.PAYDUNYA_MASTER_KEY;
    this.privateKey = config.PAYDUNYA_PRIVATE_KEY;
    this.token      = config.PAYDUNYA_TOKEN;       // token d'intégration (pas le token de transaction)
    this.storeName  = config.PAYDUNYA_STORE_NAME || 'Ma Boutique';
    this.sandbox    = config.PAYDUNYA_SANDBOX === 'true' || config.PAYDUNYA_SANDBOX === true;
    this.appUrl     = config.APP_URL || process.env.VITE_APP_URL || '';
    this.baseUrl    = this.sandbox
      ? 'https://app.paydunya.com/sandbox-api/v1'
      : 'https://app.paydunya.com/api/v1';
  }

  get name() { return 'PayDunya'; }

  get authHeaders() {
    return {
      'Content-Type':          'application/json',
      'PAYDUNYA-MASTER-KEY':   this.masterKey,
      'PAYDUNYA-PRIVATE-KEY':  this.privateKey,
      'PAYDUNYA-TOKEN':        this.token,
    };
  }

  async initPayment({ amount, phone, email, description }) {
    try {
      const res = await fetch(`${this.baseUrl}/checkout-invoice/create`, {
        method:  'POST',
        headers: this.authHeaders,
        body: JSON.stringify({
          invoice: {
            total_amount: Math.round(amount),
            description:  (description || 'Paiement').substring(0, 200),
            // Pré-remplir les infos client sur la page de paiement
            customer: {
              name:  '',
              email: email || '',
              phone: phone || '',
            },
          },
          store: {
            name: this.storeName,
          },
          actions: {
            cancel_url:   `${this.appUrl}/cancel`,
            return_url:   `${this.appUrl}/success`,
            callback_url: `${this.appUrl}/api/webhook/paydunya`,
          },
        }),
      });

      const data = await res.json();

      // Succès : response_code === "00"
      if (data.response_code !== '00') {
        return { success: false, error: data.response_text || 'Erreur PayDunya' };
      }

      return {
        success:   true,
        reference: data.token,         // token de la facture → utilisé pour confirm
        url:       data.response_text, // URL de checkout → rediriger le client
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(invoiceToken) {
    try {
      const res = await fetch(
        `${this.baseUrl}/checkout-invoice/confirm/${invoiceToken}`,
        {
          method:  'GET',
          headers: this.authHeaders,
        }
      );
      const data = await res.json();

      if (data.response_code !== '00') {
        return { success: false, error: data.response_text || 'Erreur vérification PayDunya' };
      }

      // Statuts PayDunya : "completed" | "pending" | "cancelled"
      const status = data.status || data.invoice?.status || 'pending';
      return {
        success: true,
        status:  status === 'completed'  ? 'SUCCESSFUL'
               : status === 'cancelled'  ? 'FAILED'
               :                           'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}