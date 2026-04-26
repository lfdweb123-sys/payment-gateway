/**
 * FeexPay — feexpay.js
 * Doc : https://docs.feexpay.me/api_rest.html
 *
 * Collect (requesttopay) :
 *   POST https://api.feexpay.me/api/transactions/public/requesttopay/{reseau}
 *   Body : { shop, amount, phoneNumber, description }
 *
 * Vérification statut :
 *   GET https://api.feexpay.me/api/transactions/public/single/status/{reference}
 *
 * Réseaux supportés selon doc officielle :
 *   mtn, moov, celtiis_bj, coris (Bénin)
 *   mtn_ci, moov_ci, orange_ci, wave_ci (Côte d'Ivoire)
 *   orange_sn, free_sn, wave_sn (Sénégal)
 *   orange_bf, moov_bf (Burkina Faso)
 *   togocom_tg, moov_tg (Togo)
 *   mtn_cg (Congo Brazzaville)
 */

// Mapping méthode interne → segment URL FeexPay
const ENDPOINT_MAP = {
  // Bénin
  mtn_money:     'mtn',
  moov_money:    'moov',
  celtiis_money: 'celtiis_bj',
  wallet:        'coris',      // Coris Money (Wallet Bénin)
  coris:         'coris',
  // Côte d'Ivoire
  mtn_ci:        'mtn_ci',
  moov_ci:       'moov_ci',
  orange_ci:     'orange_ci',
  wave_ci:       'wave_ci',
  // Sénégal
  orange_sn:     'orange_sn',
  free_sn:       'free_sn',
  wave_sn:       'wave_sn',
  // Burkina Faso
  moov_bf:       'moov_bf',
  // Togo
  togocom_money: 'togocom_tg',
  moov_tg:       'moov_tg',
  // Congo Brazzaville
  mtn_cg:        'mtn_cg',
};

// Résout le bon segment selon méthode + pays
function getEndpointSegment(method, country) {
  if (method === 'orange_money') {
    if (country === 'ci') return 'orange_ci';
    if (country === 'sn') return 'orange_sn';
    if (country === 'bf') return 'orange_bf';
    return 'orange_bf'; // fallback
  }
  if (method === 'wave_money') {
    if (country === 'ci') return 'wave_ci';
    if (country === 'sn') return 'wave_sn';
    return 'wave_ci'; // fallback
  }
  if (method === 'moov_money') {
    if (country === 'tg') return 'moov_tg';
    if (country === 'bf') return 'moov_bf';
    return 'moov'; // BJ par défaut
  }
  if (method === 'free_money') {
    return 'free_sn';
  }
  return ENDPOINT_MAP[method] || 'mtn';
}

export default class FeexPay {
  constructor(config) {
    this.apiKey = config.FEEXPAY_TOKEN;
    this.shopId = config.FEEXPAY_SHOP_ID;
    this.appUrl = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'FeexPay'; }

  async initPayment({ amount, phone, country, method, description }) {
    const segment = getEndpointSegment(method, country);
    const url = `https://api.feexpay.me/api/transactions/public/requesttopay/${segment}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          shop:        this.shopId,
          amount:      Math.round(amount),
          phoneNumber: phone,
          description: (description || 'Paiement').replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 50),
        }),
      });

      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message || 'Erreur FeexPay' };

      return {
        success:   true,
        reference: data.reference || null,
        url:       data.payment_url || null,
        status:    data.status || 'PENDING',
        provider:  'feexpay',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(reference) {
    try {
      const res = await fetch(
        `https://api.feexpay.me/api/transactions/public/single/status/${reference}`,
        {
          method:  'GET',
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

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