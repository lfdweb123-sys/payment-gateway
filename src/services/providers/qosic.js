/**
 * Qosic — qosic.js
 * Doc : https://docs.qosic.com/api-documentation/paiement
 *
 * ⚠️  Auth : Basic Authentication (clientId:password en base64) — pas de Bearer token
 * ⚠️  Endpoints différents selon opérateur et pays :
 *
 * Bénin :
 *   MTN   : POST {baseUrl}/QosicBridge/user/requestpayment
 *   Moov  : POST {baseUrl}/QosicBridge/user/requestpaymentmv
 *   Celtiis: POST {baseUrl}/QosicBridge/sb/v1/requestpayment
 *
 * Togo :
 *   Togocel: POST {baseUrl}/QosicBridge/user/requestpayment
 *   Moov TG: POST {baseUrl}/QosicBridge/tg/v1/requestpayment
 *
 * Body : { msisdn, amount (string), firstname, lastname, transref, clientid }
 * Succès : responsecode === "01"
 *
 * baseUrl : fourni par Qosic à l'onboarding (IP ou domaine privé)
 */

// Mapping méthode + pays → endpoint Qosic
function getEndpoint(method, country) {
  if (country === 'tg') {
    if (method === 'moov_money') return '/QosicBridge/tg/v1/requestpayment';
    return '/QosicBridge/user/requestpayment'; // Togocel/MTN Togo
  }
  // Bénin par défaut
  if (method === 'moov_money')   return '/QosicBridge/user/requestpaymentmv';
  if (method === 'celtiis_money') return '/QosicBridge/sb/v1/requestpayment';
  return '/QosicBridge/user/requestpayment'; // MTN BJ
}

export default class Qosic {
  constructor(config) {
    this.clientId = config.QOSIC_CLIENT_ID;
    this.password = config.QOSIC_PASSWORD;
    this.baseUrl  = config.QOSIC_BASE_URL; // ex: https://www.qosic.net ou IP fournie par Qosic
    this.appUrl   = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Qosic'; }

  get authHeader() {
    const credentials = Buffer.from(`${this.clientId}:${this.password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async initPayment({ amount, phone, country, method, description }) {
    const endpoint = getEndpoint(method, country);
    const transref = `GW-${Date.now()}`;

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method:  'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          msisdn:    phone,
          amount:    String(Math.round(amount)), // amount doit être une string
          firstname: '',
          lastname:  '',
          transref,
          clientid:  this.clientId,
        }),
      });

      const data = await res.json();

      // Succès : responsecode === "01"
      if (data.responsecode !== '01') {
        return { success: false, error: data.responsemsg || data.detail || 'Erreur Qosic' };
      }

      return {
        success:   true,
        reference: transref,
        serviceRef: data.serviceref || null,
        status:    'pending', // Qosic est push USSD — toujours pending jusqu'au webhook
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(transref) {
    // Qosic n'a pas d'endpoint de vérification REST documenté publiquement.
    // Le statut final est reçu via webhook (callback IPN configuré dans le dashboard).
    // On retourne PENDING par défaut et on attend la notification webhook.
    return {
      success: true,
      status:  'PENDING',
      note:    'Qosic : statut final reçu via webhook IPN uniquement',
    };
  }
}