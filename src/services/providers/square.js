/**
 * Square — square.js
 * Doc : https://developer.squareup.com/reference/square/checkout-api/create-payment-link
 *
 * Init   : POST https://connect.squareup.com/v2/online-checkout/payment-links
 * Vérif  : GET  https://connect.squareup.com/v2/payments/{payment_id}
 *
 * Auth   : Authorization: Bearer {ACCESS_TOKEN}
 * Amount : en centimes (USD cents) → pour USD $10.00 = 1000
 *
 * Pays supportés : US, CA, GB, AU, JP, IE, FR, ES
 */

import crypto from 'crypto';

export default class Square {
  constructor(config) {
    this.accessToken = config.SQUARE_ACCESS_TOKEN;
    this.locationId  = config.SQUARE_LOCATION_ID;
    this.sandbox     = config.SQUARE_SANDBOX === 'true' || config.SQUARE_SANDBOX === true;
    this.appUrl      = config.APP_URL || process.env.VITE_APP_URL || '';
    this.baseUrl     = this.sandbox
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';
    this.version     = '2026-01-22';
  }

  get name() { return 'Square'; }

  get headers() {
    return {
      'Authorization':  `Bearer ${this.accessToken}`,
      'Content-Type':   'application/json',
      'Square-Version': this.version,
    };
  }

  async initPayment({ amount, currency, description, email }) {
    const idempotencyKey = crypto.randomUUID();
    // Square : montant en plus petite unité (cents pour USD)
    const amountCents = Math.round(parseFloat(amount) * 100);

    try {
      const res = await fetch(`${this.baseUrl}/v2/online-checkout/payment-links`, {
        method:  'POST',
        headers: this.headers,
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          quick_pay: {
            name:        (description || 'Paiement').substring(0, 255),
            price_money: {
              amount:   amountCents,
              currency: (currency || 'USD').toUpperCase(),
            },
            location_id: this.locationId,
          },
          checkout_options: {
            redirect_url: `${this.appUrl}/success`,
          },
          ...(email ? {
            pre_populated_data: { buyer_email: email },
          } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.errors?.length) {
        return { success: false, error: data.errors?.[0]?.detail || 'Erreur Square' };
      }

      return {
        success:   true,
        reference: data.payment_link?.id,
        orderId:   data.payment_link?.order_id,
        url:       data.payment_link?.url,
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(paymentId) {
    try {
      const res = await fetch(
        `${this.baseUrl}/v2/payments/${paymentId}`,
        { headers: this.headers }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.errors?.[0]?.detail };

      // Statuts Square : APPROVED | PENDING | COMPLETED | CANCELED | FAILED
      const status = data.payment?.status;
      return {
        success: true,
        status:  status === 'COMPLETED' ? 'SUCCESSFUL'
               : status === 'FAILED' || status === 'CANCELED' ? 'FAILED'
               :                                                  'PENDING',
        data: data.payment,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}