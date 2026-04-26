/**
 * Bizao — bizao.js
 * Doc Mobile Money : https://www.bizao.com/cashout-mobile-money/
 * Doc Visa/MC      : https://www.bizao.com/cashout-visa-mastercard/
 *
 * Endpoints prod :
 *   Mobile Money : POST https://api.www.bizao.com/mobilemoney/v1
 *   Visa/MC      : POST https://api.www.bizao.com/debitCard/v2
 *   Statut       : GET  https://api.www.bizao.com/getStatus/v1?order_id=xxx
 *
 * ⚠️ Le routing pays/opérateur se fait via HEADERS, pas dans le body.
 */

// Mapping méthode interne → opérateur Bizao
const OPERATOR_MAP = {
  mtn_money:    'orange', // Bizao supporte Orange/MTN selon le pays
  moov_money:   'moov',
  orange_money: 'orange',
  free_money:   'free',
  wave_money:   'wave',
  card:         null,     // → debitCard endpoint
};

// Mapping pays interne → country-code Bizao (ISO2 majuscule)
const COUNTRY_MAP = {
  bj: 'BJ', ci: 'CI', sn: 'SN', cm: 'CM',
  bf: 'BF', ml: 'ML', gn: 'GN', ne: 'NE',
  cd: 'CD', cg: 'CG', ga: 'GA',
};

export default class Bizao {
  constructor(config) {
    this.token      = config.BIZAO_TOKEN;       // Bearer access token
    this.alias      = config.BIZAO_ALIAS;       // bizao-alias header
    this.bizaoToken = config.BIZAO_TOKEN2 || config.BIZAO_TOKEN; // bizao-token header
    this.appUrl     = config.APP_URL || process.env.VITE_APP_URL || '';
  }

  get name() { return 'Bizao'; }

  async initPayment({ amount, phone, currency, country, description, method }) {
    const isCard     = method === 'card';
    const operator   = OPERATOR_MAP[method] || 'orange';
    const countryCode = COUNTRY_MAP[country] || (country || 'CI').toUpperCase();
    const orderId    = `GW-${Date.now()}`;

    try {
      if (isCard) {
        // ── Visa / Mastercard ──────────────────────────────────────────────
        const res = await fetch('https://api.www.bizao.com/debitCard/v2', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type':  'application/json',
            'country-code':  countryCode,
            'lang':          'fr',
          },
          body: JSON.stringify({
            order_id:     orderId,
            amount:       String(Math.round(amount)), // pas de centimes
            currency:     currency || 'XOF',
            reference:    orderId,
            state:        orderId,
            return_url:   `${this.appUrl}/success`,
            cancel_url:   `${this.appUrl}/cancel`,
            notif_url:    `${this.appUrl}/api/webhook/bizao`,
            description:  (description || 'Paiement').substring(0, 100),
          }),
        });

        const data = await res.json();
        if (!res.ok || data.status !== '201') {
          return { success: false, error: data.message || 'Erreur Bizao debitCard' };
        }
        return {
          success:   true,
          reference: orderId,
          url:       data.payment_url || null,
          status:    'pending',
        };

      } else {
        // ── Mobile Money ───────────────────────────────────────────────────
        const res = await fetch('https://api.www.bizao.com/mobilemoney/v1', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type':  'application/json',
            'country-code':  countryCode,
            'operator':      operator,
            'channel':       'web',
            'lang':          'fr',
            'bizao-alias':   this.alias      || '',
            'bizao-token':   this.bizaoToken || '',
          },
          body: JSON.stringify({
            order_id:     orderId,
            amount:       String(Math.round(amount)), // pas de centimes
            currency:     currency || 'XOF',
            reference:    orderId,
            state:        orderId,
            return_url:   `${this.appUrl}/success`,
            cancel_url:   `${this.appUrl}/cancel`,
            notif_url:    `${this.appUrl}/api/webhook/bizao`,
          }),
        });

        const data = await res.json();
        if (!res.ok || (data.status && data.status !== '201' && data.status !== '200')) {
          return { success: false, error: data.message || 'Erreur Bizao mobilemoney' };
        }

        // Canal web → retourne une payment_url (popup Bizao)
        // Canal USSD → pas de redirect, paiement direct
        return {
          success:   true,
          reference: orderId,
          url:       data.payment_url || null,
          status:    'pending',
        };
      }

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(orderId) {
    try {
      const res = await fetch(
        `https://api.www.bizao.com/getStatus/v1?order_id=${encodeURIComponent(orderId)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type':  'application/json',
          },
        }
      );
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      // Statuts Bizao : "Successful" | "INITIATED" | "Failed" | "Cancelled"
      const raw = data.status || '';
      const normalized = raw.toLowerCase();
      return {
        success: true,
        status:  normalized === 'successful' ? 'SUCCESSFUL' : normalized === 'failed' ? 'FAILED' : 'PENDING',
        data,
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}