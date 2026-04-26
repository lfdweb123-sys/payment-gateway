/**
 * MTN MoMo — mtn.js
 * Doc : https://momodeveloper.mtn.com/api-documentation
 *
 * Flow (Collection) :
 *   1. POST /collection/token/           → access_token (Basic auth : userId:apiKey)
 *   2. POST /collection/v1_0/requesttopay → initier le paiement (UUID dans header)
 *   3. GET  /collection/v1_0/requesttopay/{referenceId} → vérifier le statut
 *
 * Headers obligatoires :
 *   Authorization         : Basic base64(userId:apiKey)  (pour le token)
 *   Ocp-Apim-Subscription-Key : subscriptionKey
 *   X-Reference-Id        : UUID unique par transaction
 *   X-Target-Environment  : 'sandbox' ou 'production'
 *
 * ⚠️  Pas de Base URL fixe — fournie lors de l'onboarding MTN
 * ⚠️  Sandbox : https://sandbox.momodeveloper.mtn.com
 */

import crypto from 'crypto';

export default class MTN {
  constructor(config) {
    this.userId         = config.MTN_API_USER;           // UUID généré au provisioning
    this.apiKey         = config.MTN_API_KEY;            // clé API générée
    this.subscriptionKey = config.MTN_SUBSCRIPTION_KEY; // Ocp-Apim-Subscription-Key
    this.sandbox        = config.MTN_SANDBOX !== 'false';
    this.appUrl         = config.APP_URL || process.env.VITE_APP_URL || '';
    this.baseUrl        = this.sandbox
      ? 'https://sandbox.momodeveloper.mtn.com'
      : 'https://proxy.momoapi.mtn.com';
    this.env            = this.sandbox ? 'sandbox' : 'production';
  }

  get name() { return 'MTN MoMo'; }

  get subHeaders() {
    return { 'Ocp-Apim-Subscription-Key': this.subscriptionKey };
  }

  async getAccessToken() {
    const credentials = Buffer.from(`${this.userId}:${this.apiKey}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/collection/token/`, {
      method:  'POST',
      headers: {
        'Authorization':           `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
      },
    });
    const data = await res.json();
    return data.access_token;
  }

  async initPayment({ amount, phone, currency, country, description }) {
    const referenceId = crypto.randomUUID();

    try {
      const token = await this.getAccessToken();

      const res = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
        method:  'POST',
        headers: {
          'Authorization':           `Bearer ${token}`,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'X-Reference-Id':          referenceId,
          'X-Target-Environment':    this.env,
          'X-Callback-Url':          `${this.appUrl}/api/webhook/mtn`,
          'Content-Type':            'application/json',
        },
        body: JSON.stringify({
          amount:          String(Math.round(amount)),
          currency:        currency || 'EUR', // sandbox = EUR, prod = devise locale
          externalId:      referenceId,
          payer: {
            partyIdType: 'MSISDN',
            partyId:     phone, // format E.164 sans le +, ex: 22961000000
          },
          payerMessage: (description || 'Paiement').substring(0, 160),
          payeeNote:    (description || 'Paiement').substring(0, 160),
        }),
      });

      // Succès : HTTP 202 Accepted (pas de body)
      if (res.status !== 202) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.message || `MTN MoMo HTTP ${res.status}` };
      }

      return {
        success:   true,
        reference: referenceId,
        url:       null, // USSD push — pas d'URL de redirection
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(referenceId) {
    try {
      const token = await this.getAccessToken();
      const res   = await fetch(
        `${this.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
        {
          headers: {
            'Authorization':           `Bearer ${token}`,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'X-Target-Environment':    this.env,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      // Statuts MTN : SUCCESSFUL | FAILED | PENDING
      const raw = (data.status || '').toUpperCase();
      return {
        success: true,
        status:  raw === 'SUCCESSFUL' ? 'SUCCESSFUL'
               : raw === 'FAILED'     ? 'FAILED'
               :                        'PENDING',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}