/**
 * src/services/geniuspay.js
 *
 * Service GeniusPay — utilisé côté client pour afficher les méthodes
 * disponibles et construire les données pour l'appel à /api/gateway/pay.
 *
 * Doc API : https://pay.genius.ci/docs/api
 *
 * Pays couverts (12) :
 *   CI, SN, BJ, CM, CD, CG, GN, NE, BF, ML, TG, KE
 *
 * Méthodes supportées par GeniusPay :
 *   wave_money, orange_money, mtn_money, moov_money,
 *   airtel_money, card, mobile_money
 *   + pawapay (auto-routing 12 pays)
 */

/* ─── Pays couverts par GeniusPay ──────────────────────────────────────── */
export const GENIUSPAY_COUNTRIES = new Set([
  'ci', // Côte d'Ivoire
  'sn', // Sénégal
  'bj', // Bénin
  'cm', // Cameroun
  'cd', // RDC
  'cg', // Congo Brazzaville
  'gn', // Guinée
  'ne', // Niger
  'bf', // Burkina Faso
  'ml', // Mali
  'tg', // Togo
  'ke', // Kenya
]);

/* ─── Méthodes GeniusPay par pays ──────────────────────────────────────── */
const GENIUSPAY_METHODS_BY_COUNTRY = {
  ci: ['wave_money', 'orange_money', 'mtn_money', 'moov_money', 'card'],
  sn: ['wave_money', 'orange_money', 'free_money', 'card'],
  bj: ['mtn_money', 'moov_money', 'card'],
  cm: ['orange_money', 'mtn_money', 'card'],
  cd: ['airtel_money', 'orange_money', 'card'],
  cg: ['mtn_money', 'airtel_money', 'card'],
  gn: ['orange_money', 'mtn_money', 'card'],
  ne: ['orange_money', 'moov_money', 'card'],
  bf: ['orange_money', 'moov_money', 'card'],
  ml: ['orange_money', 'moov_money', 'card'],
  tg: ['moov_money', 'card'],
  ke: ['airtel_money', 'mpesa', 'card'],
};

/* ─── Mapping interne → label affiché ─────────────────────────────────── */
const METHOD_LABELS = {
  wave_money:   'Wave Money',
  orange_money: 'Orange Money',
  mtn_money:    'MTN Mobile Money',
  moov_money:   'Moov Money',
  free_money:   'Free Money',
  airtel_money: 'Airtel Money',
  mpesa:        'M-Pesa',
  card:         'Carte Bancaire',
};

/**
 * Retourne les méthodes GeniusPay disponibles pour un pays donné.
 * Chaque méthode a le format attendu par GatewayPay.jsx :
 * { id, name, provider }
 */
export function getGeniusPayMethods(countryCode) {
  const code    = (countryCode || '').toLowerCase();
  const methods = GENIUSPAY_METHODS_BY_COUNTRY[code] || [];
  return methods.map(id => ({
    id,
    name:     METHOD_LABELS[id] || id,
    provider: 'geniuspay',
  }));
}

/**
 * Vérifie si GeniusPay couvre un pays donné.
 */
export function isGeniusPayCountry(countryCode) {
  return GENIUSPAY_COUNTRIES.has((countryCode || '').toLowerCase());
}

/**
 * Retourne true si GeniusPay est actif dans les providers du marchand.
 */
export function isGeniusPayActive(activeProviders = []) {
  return Array.isArray(activeProviders) && activeProviders.includes('geniuspay');
}