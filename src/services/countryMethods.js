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
  chipper_wallet: { name: 'Chipper Wallet', icon: '💳' },
  ideal: { name: 'iDEAL', icon: '🏦' },
  giropay: { name: 'Giropay', icon: '🏦' },
  sofort: { name: 'Sofort', icon: '🏦' },
  bancontact: { name: 'Bancontact', icon: '🏦' }
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
  cg: { name: 'Congo Brazzaville', flag: '🇨🇬', currency: 'XAF' },
  ng: { name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  gh: { name: 'Ghana', flag: '🇬🇭', currency: 'GHS' },
  ke: { name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  ug: { name: 'Ouganda', flag: '🇺🇬', currency: 'UGX' },
  tz: { name: 'Tanzanie', flag: '🇹🇿', currency: 'TZS' },
  rw: { name: 'Rwanda', flag: '🇷🇼', currency: 'RWF' },
  za: { name: 'Afrique du Sud', flag: '🇿🇦', currency: 'ZAR' },
  fr: { name: 'France', flag: '🇫🇷', currency: 'EUR' },
  be: { name: 'Belgique', flag: '🇧🇪', currency: 'EUR' },
  de: { name: 'Allemagne', flag: '🇩🇪', currency: 'EUR' },
  nl: { name: 'Pays-Bas', flag: '🇳🇱', currency: 'EUR' },
  gb: { name: 'Royaume-Uni', flag: '🇬🇧', currency: 'GBP' },
  us: { name: 'États-Unis', flag: '🇺🇸', currency: 'USD' }
};

const PROVIDER_METHODS = {
  feexpay: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money'],
      tg: ['togocom_money', 'moov_money'],
      sn: ['orange_money', 'free_money'],
      bf: ['orange_money', 'moov_money'],
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
      gh: ['card', 'mobile_money'],
      ke: ['card', 'mpesa'],
      za: ['card']
    }
  },
  flutterwave: {
    countries: {
      ng: ['card', 'bank_transfer'],
      gh: ['card', 'mobile_money'],
      ke: ['card', 'mpesa'],
      ug: ['card', 'mobile_money'],
      tz: ['card', 'mobile_money'],
      rw: ['card', 'mobile_money'],
      ci: ['card', 'mobile_money'],
      sn: ['card', 'mobile_money'],
      bj: ['card', 'mobile_money'],
      cm: ['card', 'mobile_money']
    }
  },
  kkiapay: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'card'],
      tg: ['togocom_money', 'moov_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money', 'card'],
      sn: ['orange_money', 'free_money', 'wave_money', 'card'],
      bf: ['orange_money', 'moov_money'],
      ml: ['orange_money', 'moov_money'],
      ne: ['airtel_money', 'orange_money'],
      gn: ['orange_money', 'mtn_money'],
      cm: ['mtn_money', 'orange_money'],
      ga: ['airtel_money', 'moov_money'],
      cd: ['airtel_money', 'orange_money', 'mpesa']
    }
  },
  fedapay: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'card'],
      tg: ['togocom_money', 'moov_money', 'card'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'card'],
      sn: ['orange_money', 'free_money', 'card'],
      bf: ['orange_money', 'moov_money'],
      ml: ['orange_money', 'moov_money'],
      ne: ['airtel_money', 'orange_money'],
      gn: ['orange_money', 'mtn_money'],
      cm: ['mtn_money', 'orange_money'],
      ga: ['airtel_money', 'moov_money']
    }
  },
  cinetpay: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money', 'card'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money', 'card'],
      tg: ['togocom_money', 'moov_money', 'card'],
      sn: ['orange_money', 'free_money', 'wave_money', 'card'],
      cm: ['mtn_money', 'orange_money', 'card'],
      bf: ['orange_money', 'moov_money'],
      ml: ['orange_money', 'moov_money'],
      gn: ['orange_money', 'mtn_money', 'card'],
      ne: ['airtel_money', 'orange_money'],
      cd: ['airtel_money', 'orange_money', 'mpesa'],
      ga: ['airtel_money', 'moov_money']
    }
  },
  paypal: {
    countries: {
      fr: ['paypal', 'card'],
      gb: ['paypal', 'card'],
      us: ['paypal', 'card'],
      de: ['paypal', 'card'],
      be: ['paypal', 'card'],
      nl: ['paypal', 'card'],
      ng: ['paypal', 'card'],
      ke: ['paypal', 'card'],
      ci: ['paypal', 'card'],
      sn: ['paypal', 'card'],
      ma: ['paypal', 'card']
    }
  },
  chipper: {
    countries: {
      gh: ['chipper_wallet', 'mobile_money', 'card'],
      ng: ['chipper_wallet', 'card', 'bank_transfer'],
      ke: ['chipper_wallet', 'mpesa', 'card'],
      ug: ['chipper_wallet', 'mobile_money', 'card'],
      tz: ['chipper_wallet', 'mobile_money', 'card'],
      rw: ['chipper_wallet', 'mobile_money'],
      za: ['chipper_wallet', 'card'],
      us: ['chipper_wallet', 'card'],
      gb: ['chipper_wallet', 'card']
    }
  }
};

export function getMethodsForCountry(countryCode) {
  const country = COUNTRIES[countryCode];
  if (!country) return null;

  const allMethods = new Set();
  
  Object.values(PROVIDER_METHODS).forEach(provider => {
    const countryMethods = provider.countries?.[countryCode];
    if (countryMethods) {
      countryMethods.forEach(m => allMethods.add(m));
    }
  });

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