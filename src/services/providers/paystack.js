/**
 * Paystack — paystack.js
 * Doc : https://paystack.com/docs/api/transaction/
 *
 * Init   : POST https://api.paystack.co/transaction/initialize
 * Vérif  : GET  https://api.paystack.co/transaction/verify/{reference}
 *
 * ⚠️  Montant en SOUS-UNITÉS pour NGN (kobo), GHS (pesewas), KES (cents)
 *     Mais XOF / XAF n'ont PAS de sous-unité → envoyer le montant tel quel
 *
 * Statut succès vérif : data.data.status === 'success'
 */

// Devises sans sous-unité (pas de *100)
const ZERO_DECIMAL = new Set(['XOF', 'XAF', 'GNF', 'KMF', 'MGA', 'PYG', 'RWF', 'UGX', 'VND']);

function toSmallestUnit(amount, currency) {
  return ZERO_DECIMAL.has((currency || '').toUpperCase())
    ? Math.round(parseFloat(amount))
    : Math.round(parseFloat(amount) * 100);
}

// Mapping méthode interne → canal Paystack
function getChannels(method) {
  const map = {
    card:          ['card'],
    bank_transfer: ['bank_transfer'],
    ussd:          ['ussd'],
    mobile_money:  ['mobile_money'],
    mpesa:         ['mobile_money'],
    qr:            ['qr'],
    eft:           ['eft'],
  };
  return map[method] || ['card'];
}

export default class Paystack {
  constructor(config) {
    this.secretKey = config.PAYSTACK_SECRET_KEY;
    this.appUrl    = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Paystack'; }

  async initPayment({ amount, email, phone, currency, method, description }) {
    const cur = (currency || 'NGN').toUpperCase();

    try {
      const res = await fetch('https://api.paystack.co/transaction/initialize', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          amount:   toSmallestUnit(amount, cur),
          email:    email || 'customer@gateway.com',
          currency: cur,
          channels: getChannels(method),
          callback_url: `${this.appUrl}/success`,
          metadata: {
            phone,
            description: description || '',
            custom_fields: [
              { display_name: 'Description', variable_name: 'description', value: description || '' },
              ...(phone ? [{ display_name: 'Phone', variable_name: 'phone', value: phone }] : []),
            ],
          },
        }),
      });

      const data = await res.json();
      if (!data.status) {
        return { success: false, error: data.message || 'Erreur Paystack' };
      }

      return {
        success:   true,
        reference: data.data.reference,
        url:       data.data.authorization_url,
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { 'Authorization': `Bearer ${this.secretKey}` } }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      // Statuts Paystack : "success" | "failed" | "abandoned" | "pending"
      const status = data.data?.status;
      return {
        success: true,
        status:  status === 'success'                    ? 'SUCCESSFUL'
               : status === 'failed' || status === 'abandoned' ? 'FAILED'
               :                                           'PENDING',
        data: data.data,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}