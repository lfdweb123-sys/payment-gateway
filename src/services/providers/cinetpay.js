/**
 * CinetPay — cinetpay.js
 * Doc : https://docs.cinetpay.com/api/1.0-fr/checkout/initialisation
 *
 * Endpoints :
 *   Init    : POST https://api-checkout.cinetpay.com/v2/payment
 *   Vérif   : POST https://api-checkout.cinetpay.com/v2/payment/check
 *
 * Code succès init : "201"
 * Statuts vérif    : "ACCEPTED" | "REFUSED" | "WAITING_FOR_CUSTOMER" | "PENDING"
 *
 * ⚠️  Montant minimum : 100 XOF
 * ⚠️  Le champ `channels` est obligatoire : "ALL", "MOBILE_MONEY" ou "CREDIT_CARD"
 * ⚠️  Certains opérateurs push envoient d'abord WAITING_FOR_CUSTOMER avant ACCEPTED —
 *      ne pas traiter ce statut comme un échec.
 */

// Mapping méthode interne → channel CinetPay
function getChannel(method) {
  if (method === 'card') return 'CREDIT_CARD';
  if (['mtn_money','moov_money','orange_money','wave_money','free_money',
       'celtiis_money','togocom_money','airtel_money','mobile_money'].includes(method)) {
    return 'MOBILE_MONEY';
  }
  return 'ALL';
}

export default class CinetPay {
  constructor(config) {
    this.apiKey    = config.CINETPAY_API_KEY;
    this.siteId    = config.CINETPAY_SITE_ID;
    this.appUrl    = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'CinetPay'; }

  async initPayment({ amount, phone, email, description, method, country }) {
    const transactionId = `GW-${Date.now()}`;
    const channel       = getChannel(method);

    try {
      const res = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey:                 this.apiKey,
          site_id:                this.siteId,
          transaction_id:         transactionId,
          amount:                 Math.round(amount),   // pas de centimes
          currency:               'XOF',
          description:            (description || 'Paiement').replace(/[#/$_&]/g, '').substring(0, 200),
          channels:               channel,              // obligatoire
          notify_url:             `${this.appUrl}/api/webhook/cinetpay`,
          return_url:             `${this.appUrl}/success`,
          // Infos client
          customer_name:          'Client',
          customer_surname:       '',
          customer_email:         email || 'client@email.com',
          customer_phone_number:  phone || '',
          customer_id:            transactionId,
          lang:                   'FR',
          metadata:               transactionId,
        }),
      });

      const data = await res.json();

      if (data.code !== '201') {
        return { success: false, error: data.message || data.description || 'Erreur CinetPay' };
      }

      return {
        success:   true,
        reference: transactionId,
        url:       data.data?.payment_url  || null,
        token:     data.data?.payment_token || null,
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(transactionId) {
    try {
      const res = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey:         this.apiKey,
          site_id:        this.siteId,
          transaction_id: transactionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      const status = data.data?.status;

      // Statuts CinetPay :
      // "ACCEPTED"             → paiement réussi
      // "REFUSED"              → paiement refusé
      // "WAITING_FOR_CUSTOMER" → attente confirmation push (ne pas traiter comme échec)
      // "PENDING"              → en cours
      let normalized;
      if (status === 'ACCEPTED')             normalized = 'SUCCESSFUL';
      else if (status === 'REFUSED')         normalized = 'FAILED';
      else if (status === 'WAITING_FOR_CUSTOMER') normalized = 'PENDING';
      else                                   normalized = 'PENDING';

      return {
        success: true,
        status:  normalized,
        data:    data.data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}