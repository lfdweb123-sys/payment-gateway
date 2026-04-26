/**
 * M-Pesa Daraja — mpesa.js
 * Doc : https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
 *
 * Flow STK Push :
 *   1. GET  /oauth/v1/generate?grant_type=client_credentials → access_token
 *   2. POST /mpesa/stkpush/v1/processrequest                 → CheckoutRequestID
 *   3. POST /mpesa/stkpushquery/v1/query                     → vérification statut
 *
 * Password = base64(shortcode + passkey + timestamp)
 * Timestamp = yyyymmddHHiiss
 *
 * ⚠️  Phone : format 2547XXXXXXXX (pas de +)
 * ⚠️  Sandbox : sandbox.safaricom.co.ke
 * ⚠️  Prod    : api.safaricom.co.ke
 */

export default class MPesa {
  constructor(config) {
    this.consumerKey    = config.MPESA_CONSUMER_KEY;
    this.consumerSecret = config.MPESA_CONSUMER_SECRET;
    this.shortcode      = config.MPESA_SHORTCODE;       // ex: 174379 (sandbox)
    this.passkey        = config.MPESA_PASSKEY;
    this.sandbox        = config.MPESA_SANDBOX !== 'false';
    this.appUrl         = config.APP_URL || process.env.VITE_APP_URL || '';
    this.baseUrl        = this.sandbox
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';
  }

  get name() { return 'M-Pesa Daraja'; }

  // Format : yyyymmddHHmmss
  _timestamp() {
    return new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14);
  }

  // Password = base64(shortcode + passkey + timestamp)
  _password(timestamp) {
    return Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
  }

  // Format le numéro en 2547XXXXXXXX
  _formatPhone(phone) {
    let p = phone.replace(/\s+/g, '').replace(/^\+/, '');
    if (p.startsWith('0')) p = '254' + p.substring(1);
    if (p.startsWith('7') || p.startsWith('1')) p = '254' + p;
    return p;
  }

  async getAccessToken() {
    const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    const res = await fetch(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method:  'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept':        'application/json',
        },
      }
    );
    const data = await res.json();
    return data.access_token;
  }

  async initPayment({ amount, phone, description }) {
    const timestamp = this._timestamp();
    const password  = this._password(timestamp);
    const phone254  = this._formatPhone(phone);

    try {
      const token = await this.getAccessToken();
      const res   = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: this.shortcode,
          Password:          password,
          Timestamp:         timestamp,
          TransactionType:   'CustomerPayBillOnline',
          Amount:            Math.round(amount),
          PartyA:            phone254,
          PartyB:            this.shortcode,
          PhoneNumber:       phone254,
          CallBackURL:       `${this.appUrl}/api/webhook/mpesa`,
          AccountReference:  'GW-' + Date.now(),
          TransactionDesc:   (description || 'Paiement').substring(0, 20),
        }),
      });

      const data = await res.json();

      // Succès : ResponseCode === "0"
      if (data.ResponseCode !== '0') {
        return { success: false, error: data.ResponseDescription || data.errorMessage || 'Erreur M-Pesa' };
      }

      return {
        success:   true,
        reference: data.CheckoutRequestID,
        url:       null, // STK Push sur le téléphone
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(checkoutRequestId) {
    const timestamp = this._timestamp();
    const password  = this._password(timestamp);

    try {
      const token = await this.getAccessToken();
      const res   = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: this.shortcode,
          Password:          password,
          Timestamp:         timestamp,
          CheckoutRequestID: checkoutRequestId,
        }),
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.errorMessage || data.ResponseDescription };

      // ResultCode : "0" = succès, "1032" = annulé, autres = échec
      const code = String(data.ResultCode);
      return {
        success: true,
        status:  code === '0'    ? 'SUCCESSFUL'
               : code === '1'    ? 'PENDING'     // en attente PIN
               :                   'FAILED',
        data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}