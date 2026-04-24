import { getAllMethodsForCountry } from './providers/registry';

const METHOD_NAMES = {
  mtn_money: { name: 'MTN Mobile Money', icon: '📱' },
  moov_money: { name: 'Moov Money', icon: '📱' },
  orange_money: { name: 'Orange Money', icon: '📱' },
  free_money: { name: 'Free Money', icon: '📱' },
  wave_money: { name: 'Wave', icon: '🌊' },
  celtiis_money: { name: 'CELTIIS Money', icon: '📱' },
  togocom_money: { name: 'TOGOCOM Money', icon: '📱' },
  airtel_money: { name: 'Airtel Money', icon: '📱' },
  mpesa: { name: 'M-Pesa', icon: '📱' },
  africell_money: { name: 'Africell Money', icon: '📱' },
  card: { name: 'Carte Bancaire', icon: '💳' },
  bank_transfer: { name: 'Virement Bancaire', icon: '🏦' },
  ussd: { name: 'USSD', icon: '📲' },
  qr: { name: 'QR Code', icon: '📷' },
  paypal: { name: 'PayPal', icon: '🅿️' },
  apple_pay: { name: 'Apple Pay', icon: '🍎' },
  google_pay: { name: 'Google Pay', icon: '📱' },
  venmo: { name: 'Venmo', icon: '💸' },
  chipper_wallet: { name: 'Chipper Wallet', icon: '💳' },
  ach: { name: 'Virement ACH', icon: '🏦' },
  bacs: { name: 'Bacs Direct Debit', icon: '🏦' },
  giropay: { name: 'Giropay', icon: '🏦' },
  sofort: { name: 'Sofort', icon: '🏦' },
  ideal: { name: 'iDEAL', icon: '🏦' },
  bancontact: { name: 'Bancontact', icon: '🏦' },
  bizum: { name: 'Bizum', icon: '🏦' },
  eft: { name: 'EFT', icon: '🏦' }
};

const COUNTRIES = {
  bj: { name: 'Bénin', flag: '🇧🇯', currency: 'XOF' },
  ci: { name: 'Côte d\'Ivoire', flag: '🇨🇮', currency: 'XOF' },
  tg: { name: 'Togo', flag: '🇹🇬', currency: 'XOF' },
  sn: { name: 'Sénégal', flag: '🇸🇳', currency: 'XOF' },
  bf: { name: 'Burkina Faso', flag: '🇧🇫', currency: 'XOF' },
  ml: { name: 'Mali', flag: '🇲🇱', currency: 'XOF' },
  ne: { name: 'Niger', flag: '🇳🇪', currency: 'XOF' },
  gn: { name: 'Guinée', flag: '🇬🇳', currency: 'GNF' },
  cm: { name: 'Cameroun', flag: '🇨🇲', currency: 'XAF' },
  ga: { name: 'Gabon', flag: '🇬🇦', currency: 'XAF' },
  cd: { name: 'RDC', flag: '🇨🇩', currency: 'CDF' },
  cg: { name: 'Congo', flag: '🇨🇬', currency: 'XAF' },
  ng: { name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  gh: { name: 'Ghana', flag: '🇬🇭', currency: 'GHS' },
  ke: { name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  ug: { name: 'Ouganda', flag: '🇺🇬', currency: 'UGX' },
  tz: { name: 'Tanzanie', flag: '🇹🇿', currency: 'TZS' },
  rw: { name: 'Rwanda', flag: '🇷🇼', currency: 'RWF' },
  za: { name: 'Afrique du Sud', flag: '🇿🇦', currency: 'ZAR' },
  fr: { name: 'France', flag: '🇫🇷', currency: 'EUR' },
  be: { name: 'Belgique', flag: '🇧🇪', currency: 'EUR' },
  ch: { name: 'Suisse', flag: '🇨🇭', currency: 'CHF' },
  lu: { name: 'Luxembourg', flag: '🇱🇺', currency: 'EUR' },
  de: { name: 'Allemagne', flag: '🇩🇪', currency: 'EUR' },
  es: { name: 'Espagne', flag: '🇪🇸', currency: 'EUR' },
  it: { name: 'Italie', flag: '🇮🇹', currency: 'EUR' },
  nl: { name: 'Pays-Bas', flag: '🇳🇱', currency: 'EUR' },
  pt: { name: 'Portugal', flag: '🇵🇹', currency: 'EUR' },
  gb: { name: 'Royaume-Uni', flag: '🇬🇧', currency: 'GBP' },
  ie: { name: 'Irlande', flag: '🇮🇪', currency: 'EUR' },
  us: { name: 'États-Unis', flag: '🇺🇸', currency: 'USD' },
  ca: { name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
  au: { name: 'Australie', flag: '🇦🇺', currency: 'AUD' },
  jp: { name: 'Japon', flag: '🇯🇵', currency: 'JPY' },
  sg: { name: 'Singapour', flag: '🇸🇬', currency: 'SGD' },
  hk: { name: 'Hong Kong', flag: '🇭🇰', currency: 'HKD' },
  br: { name: 'Brésil', flag: '🇧🇷', currency: 'BRL' },
  mx: { name: 'Mexique', flag: '🇲🇽', currency: 'MXN' },
  ma: { name: 'Maroc', flag: '🇲🇦', currency: 'MAD' },
  dz: { name: 'Algérie', flag: '🇩🇿', currency: 'DZD' },
  tn: { name: 'Tunisie', flag: '🇹🇳', currency: 'TND' }
};

export function getMethodsForCountry(countryCode) {
  const country = COUNTRIES[countryCode];
  if (!country) return null;
  
  const methods = getAllMethodsForCountry(countryCode);
  
  return {
    ...country,
    code: countryCode,
    methods: methods.map(m => ({
      ...m,
      name: METHOD_NAMES[m.id]?.name || m.id,
      icon: METHOD_NAMES[m.id]?.icon || '💳'
    }))
  };
}

export function getAllCountries() {
  return Object.entries(COUNTRIES).map(([code, data]) => ({
    code,
    ...data
  }));
}

export function detectCountry(phoneNumber) {
  const phone = String(phoneNumber || '').replace(/[^0-9]/g, '');
  const prefixes = {
    '229': 'bj', '225': 'ci', '228': 'tg', '221': 'sn',
    '226': 'bf', '223': 'ml', '227': 'ne', '224': 'gn',
    '237': 'cm', '241': 'ga', '243': 'cd', '242': 'cg',
    '234': 'ng', '233': 'gh', '254': 'ke', '256': 'ug',
    '255': 'tz', '250': 'rw', '27': 'za',
    '33': 'fr', '32': 'be', '41': 'ch', '352': 'lu',
    '49': 'de', '34': 'es', '39': 'it', '31': 'nl',
    '351': 'pt', '44': 'gb', '353': 'ie',
    '1': 'us', '61': 'au', '81': 'jp', '65': 'sg',
    '852': 'hk', '55': 'br', '52': 'mx',
    '212': 'ma', '213': 'dz', '216': 'tn'
  };
  
  for (const [prefix, country] of Object.entries(prefixes)) {
    if (phone.startsWith(prefix)) return country;
  }
  return 'bj';
}

export default COUNTRIES;