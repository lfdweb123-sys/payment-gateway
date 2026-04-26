/**
 * Flutterwave — flutterwave.js
 * Doc : https://developer.flutterwave.com/v3.0/docs/flutterwave-standard-1
 *
 * Init    : POST https://api.flutterwave.com/v3/payments
 * Vérif   : GET  https://api.flutterwave.com/v3/transactions/verify_by_txref?tx_ref={ref}
 *
 * Le champ pour filtrer les méthodes est `payment_options` (pas `payment_type`).
 * Valeurs : "card", "mobilemoney", "ussd", "banktransfer", "mpesa", etc.
 * Si absent → toutes les méthodes disponibles pour le pays sont affichées.
 */

// Mapping méthode interne → valeur payment_options Flutterwave
const PAYMENT_OPTIONS_MAP = {
  card:          'card',
  bank_transfer: 'banktransfer',
  ussd:          'ussd',
  mpesa:         'mpesa',
  mobile_money:  'mobilemoney',
  // Mobile Money par pays
  mtn_money:     'mobilemoney',
  moov_money:    'mobilemoney',
  orange_money:  'mobilemoney',
  wave_money:    'mobilemoney',
};

export default class Flutterwave {
  constructor(config) {
    this.secretKey = config.FLW_SECRET_KEY;
    this.appUrl    = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Flutterwave'; }

  async initPayment({ amount, email, phone, country, currency, method, description }) {
    const txRef          = `GW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const paymentOptions = PAYMENT_OPTIONS_MAP[method] || 'card';

    try {
      const res = await fetch('https://api.flutterwave.com/v3/payments', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          tx_ref:          txRef,
          amount:          parseFloat(amount),
          currency:        currency || 'NGN',
          payment_options: paymentOptions,         // ← correct (pas payment_type)
          redirect_url:    `${this.appUrl}/success`,
          customer: {
            email:       email       || 'customer@gateway.com',
            phonenumber: phone       || '',
            name:        'Customer',              // requis selon doc
          },
          customizations: {
            title:       'Paiement',
            description: (description || '').substring(0, 50),
          },
          ...(country ? { country: country.toUpperCase() } : {}),
        }),
      });

      const data = await res.json();
      if (data.status !== 'success') {
        return { success: false, error: data.message || 'Erreur Flutterwave' };
      }

      return {
        success:   true,
        reference: txRef,
        url:       data.data?.link || null,
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(txRef) {
    try {
      const res = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_txref?tx_ref=${encodeURIComponent(txRef)}`,
        { headers: { 'Authorization': `Bearer ${this.secretKey}` } }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      // Statuts Flutterwave : "successful" | "pending" | "failed"
      const raw = data.data?.status || '';
      return {
        success: true,
        status:  raw === 'successful' ? 'SUCCESSFUL'
               : raw === 'failed'     ? 'FAILED'
               :                        'PENDING',
        data:    data.data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}