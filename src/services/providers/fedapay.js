/**
 * FedaPay — fedapay.js
 * Doc : https://docs.fedapay.com/api-reference/transactions
 *
 * Flow en 2 étapes obligatoires :
 *   1. POST /v1/transactions         → crée la transaction, retourne {id}
 *   2. POST /v1/transactions/{id}/token → retourne {token, url} de paiement
 *
 * Vérification :
 *   GET /v1/transactions/{id}
 *   Statuts : "pending" | "approved" | "declined" | "canceled" | "refunded"
 *
 * Environnements :
 *   Sandbox : https://sandbox-api.fedapay.com/v1
 *   Live    : https://api.fedapay.com/v1
 */

// Mapping pays interne → code pays FedaPay (2 lettres minuscules)
const COUNTRY_MAP = {
  bj: 'bj', ci: 'ci', tg: 'tg', sn: 'sn',
  bf: 'bf', ml: 'ml', ne: 'ne', gn: 'gn',
  cm: 'cm', ga: 'ga',
};

export default class FedaPay {
  constructor(config) {
    this.secretKey = config.FEDAPAY_SECRET_KEY;
    this.env       = config.FEDAPAY_ENV || 'live'; // 'sandbox' ou 'live'
    this.appUrl    = config.APP_URL || process.env.VITE_APP_URL || '';
    this.baseUrl   = this.env === 'sandbox'
      ? 'https://sandbox-api.fedapay.com/v1'
      : 'https://api.fedapay.com/v1';
  }

  get name() { return 'FedaPay'; }

  get headers() {
    return {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type':  'application/json',
    };
  }

  async initPayment({ amount, phone, email, description, country }) {
    const countryCode = COUNTRY_MAP[country] || 'bj';

    try {
      // ── Étape 1 : Créer la transaction ────────────────────────────────────
      const res1 = await fetch(`${this.baseUrl}/transactions`, {
        method:  'POST',
        headers: this.headers,
        body: JSON.stringify({
          description:  (description || 'Paiement').substring(0, 200),
          amount:       Math.round(amount),
          currency:     { iso: 'XOF' },
          callback_url: `${this.appUrl}/success`,
          customer: {
            firstname:    'Client',
            lastname:     '',
            email:        email || 'client@email.com',
            // phone_number obligatoire avec le pays
            ...(phone ? {
              phone_number: {
                number:  phone,
                country: countryCode,
              },
            } : {}),
          },
        }),
      });

      const data1 = await res1.json();
      if (!res1.ok) {
        return { success: false, error: data1.message || 'Erreur FedaPay (création)' };
      }

      // L'id est dans data1['v1/transaction'] ou data1.id selon la version
      const txId = data1['v1/transaction']?.id || data1.id;
      if (!txId) {
        return { success: false, error: 'FedaPay : ID transaction manquant dans la réponse' };
      }

      // ── Étape 2 : Générer le token de paiement ────────────────────────────
      const res2 = await fetch(`${this.baseUrl}/transactions/${txId}/token`, {
        method:  'POST',
        headers: this.headers,
      });

      const data2 = await res2.json();
      if (!res2.ok) {
        return { success: false, error: data2.message || 'FedaPay : erreur génération token' };
      }

      return {
        success:   true,
        reference: String(txId),
        url:       data2.url   || null,
        token:     data2.token || null,
        status:    'pending',
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async verifyPayment(txId) {
    try {
      const res  = await fetch(`${this.baseUrl}/transactions/${txId}`, {
        headers: this.headers,
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.message };

      // FedaPay retourne l'objet dans data['v1/transaction'] ou data directement
      const tx     = data['v1/transaction'] || data;
      const status = tx.status;

      // Statuts FedaPay :
      // "pending"   → en attente
      // "approved"  → paiement réussi
      // "declined"  → refusé
      // "canceled"  → annulé
      // "refunded"  → remboursé
      let normalized;
      if (status === 'approved')       normalized = 'SUCCESSFUL';
      else if (status === 'declined' ||
               status === 'canceled')  normalized = 'FAILED';
      else                             normalized = 'PENDING';

      return {
        success: true,
        status:  normalized,
        data:    tx,
      };

    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}