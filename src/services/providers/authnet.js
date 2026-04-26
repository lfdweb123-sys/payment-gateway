/**
 * Authorize.net — authnet.js
 * Doc : https://developer.authorize.net/api/reference/
 *
 * Init  : POST https://api.authorize.net/xml/v1/request.api
 *   Action : createTransactionRequest (avec hosted payment page)
 *   ou     : getHostedPaymentPageRequest → token → redirect vers Authorize.net Accept Hosted
 *
 * Vérif : getTransactionDetailsRequest
 *
 * Auth  : { name: API_LOGIN_ID, transactionKey: TRANSACTION_KEY } dans le body JSON
 * Pays  : US, CA
 *
 * ⚠️  Authorize.net utilise un endpoint unique avec l'action dans le body
 * ⚠️  Pour une page hébergée, on génère un token via getHostedPaymentPageRequest
 */

export default class AuthorizeNet {
  constructor(config) {
    this.loginId        = config.AUTHORIZENET_API_LOGIN_ID;
    this.transactionKey = config.AUTHORIZENET_TRANSACTION_KEY;
    this.sandbox        = config.AUTHORIZENET_SANDBOX !== 'false';
    this.appUrl         = config.APP_URL || process.env.VITE_APP_URL || '';
    this.endpoint       = this.sandbox
      ? 'https://apitest.authorize.net/xml/v1/request.api'
      : 'https://api.authorize.net/xml/v1/request.api';
    this.hostedUrl      = this.sandbox
      ? 'https://test.authorize.net/payment/payment'
      : 'https://accept.authorize.net/payment/payment';
  }

  get name() { return 'Authorize.net'; }

  get auth() {
    return {
      name:           this.loginId,
      transactionKey: this.transactionKey,
    };
  }

  async initPayment({ amount, description, email }) {
    try {
      const res = await fetch(this.endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          getHostedPaymentPageRequest: {
            merchantAuthentication: this.auth,
            transactionRequest: {
              transactionType: 'authCaptureTransaction',
              amount:          parseFloat(amount).toFixed(2),
              order: {
                description: (description || 'Paiement').substring(0, 255),
              },
              customer: email ? { email } : undefined,
            },
            hostedPaymentSettings: {
              setting: [
                {
                  settingName:  'hostedPaymentReturnOptions',
                  settingValue: JSON.stringify({
                    url:           `${this.appUrl}/success`,
                    cancelUrl:     `${this.appUrl}/cancel`,
                    showReceipt:   false,
                  }),
                },
                {
                  settingName:  'hostedPaymentIFrameCommunicatorUrl',
                  settingValue: JSON.stringify({ url: `${this.appUrl}/authnet-relay` }),
                },
              ],
            },
          },
        }),
      });

      const data = await res.json();
      if (data.messages?.resultCode !== 'Ok') {
        return { success: false, error: data.messages?.message?.[0]?.text || 'Erreur Authorize.net' };
      }

      const token = data.token;
      return {
        success:   true,
        reference: token,
        url:       `${this.hostedUrl}?token=${token}`,
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(transactionId) {
    try {
      const res = await fetch(this.endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          getTransactionDetailsRequest: {
            merchantAuthentication: this.auth,
            transId: transactionId,
          },
        }),
      });

      const data = await res.json();
      if (data.messages?.resultCode !== 'Ok') {
        return { success: false, error: data.messages?.message?.[0]?.text };
      }

      const status = data.transaction?.transactionStatus;
      return {
        success: true,
        status:  status === 'settledSuccessfully' || status === 'capturedPendingSettlement'
               ? 'SUCCESSFUL'
               : status === 'voided' || status === 'declined' || status === 'communicationError'
               ? 'FAILED'
               : 'PENDING',
        data: data.transaction,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}