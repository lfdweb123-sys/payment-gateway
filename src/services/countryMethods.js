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
  card: { name: 'Carte Bancaire', icon: '💳' },
  bank_transfer: { name: 'Virement Bancaire', icon: '🏦' },
  ussd: { name: 'USSD', icon: '📲' },
  paypal: { name: 'PayPal', icon: '🅿️' },
  apple_pay: { name: 'Apple Pay', icon: '🍎' },
  google_pay: { name: 'Google Pay', icon: '📱' },
  chipper_wallet: { name: 'Chipper Wallet', icon: '💳' }
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
  fr: { name: 'France', flag: '🇫🇷', currency: 'EUR' },
  gb: { name: 'Royaume-Uni', flag: '🇬🇧', currency: 'GBP' },
  us: { name: 'États-Unis', flag: '🇺🇸', currency: 'USD' }
};

// Méthodes disponibles par provider (statique, pas besoin de Firestore)
const PROVIDER_METHODS = {
  feexpay: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money'],
      tg: ['togocom_money', 'moov_money'],
      sn: ['orange_money', 'free_money'],
      cg: ['mtn_money']
    }
  },
  stripe: {
    countries: {
      fr: ['card', 'apple_pay', 'google_pay'],
      gb: ['card', 'apple_pay', 'google_pay'],
      us: ['card', 'apple_pay', 'google_pay'],
      de: ['card', 'giropay', 'sofort'],
      nl: ['card', 'ideal'],
      be: ['card', 'bancontact']
    }
  },
  paystack: {
    countries: {
      ng: ['card', 'bank_transfer', 'ussd'],
      gh: ['card', 'mtn_money'],
      ke: ['card', 'mpesa']
    }
  },
  flutterwave: {
    countries: {
      ng: ['card', 'bank_transfer'],
      gh: ['card', 'mobile_money'],
      ke: ['card', 'mpesa'],
      ci: ['card', 'mobile_money'],
      sn: ['card', 'mobile_money'],
      bj: ['card', 'mobile_money']
    }
  },
  kkiapay: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'card'],
      tg: ['togocom_money', 'moov_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money', 'card'],
      sn: ['orange_money', 'free_money', 'wave_money', 'card']
    }
  },
  fedapay: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'card'],
      tg: ['togocom_money', 'moov_money', 'card'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'card'],
      sn: ['orange_money', 'free_money', 'card']
    }
  },
  paypal: {
    countries: {
      fr: ['paypal', 'card'],
      gb: ['paypal', 'card'],
      us: ['paypal', 'card'],
      ng: ['paypal', 'card'],
      ci: ['paypal', 'card'],
      sn: ['paypal', 'card']
    }
  }
};

export function getMethodsForCountry(countryCode) {
  const country = COUNTRIES[countryCode];
  if (!country) return null;

  // Collecter toutes les méthodes uniques de tous les providers
  const allMethods = new Set();
  
  Object.values(PROVIDER_METHODS).forEach(provider => {
    const countryMethods = provider.countries?.[countryCode];
    if (countryMethods) {
      countryMethods.forEach(m => allMethods.add(m));
    }
  });

  if (allMethods.size === 0) return { ...country, code: countryCode, methods: [] };

  return {
    ...country,
    code: countryCode,
    methods: Array.from(allMethods).map(m => ({
      id: m,
      name: METHOD_NAMES[m]?.name || m,
      icon: METHOD_NAMES[m]?.icon || '💳'
    }))
  };
}

export function getAllCountries() {
  return Object.entries(COUNTRIES).map(([code, data]) => ({ code, ...data }));
}

export default COUNTRIES;