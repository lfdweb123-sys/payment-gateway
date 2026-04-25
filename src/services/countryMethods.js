import { getMethodsForCountry } from './providers/index';

// ─── Noms des méthodes ────────────────────────────────────────────────────────

const METHOD_NAMES = {
  mtn_money:      'MTN Mobile Money',
  moov_money:     'Moov Money',
  orange_money:   'Orange Money',
  free_money:     'Free Money',
  wave_money:     'Wave',
  celtiis_money:  'CELTIIS Money',
  togocom_money:  'TOGOCOM Money',
  airtel_money:   'Airtel Money',
  mpesa:          'M-Pesa',
  afrimoney:      'Afrimoney',
  coris:          'Coris Money',
  qmoney:         'QMoney',
  card:           'Carte Bancaire',
  bank_transfer:  'Virement Bancaire',
  ussd:           'USSD',
  paypal:         'PayPal',
  apple_pay:      'Apple Pay',
  google_pay:     'Google Pay',
  chipper_wallet: 'Chipper Wallet',
  mobile_money:   'Mobile Money',
  wallet:         'Wallet (Coris)',
  ideal:          'iDEAL',
  giropay:        'Giropay',
  sofort:         'Sofort',
  bancontact:     'Bancontact',
};

// ─── Pays ─────────────────────────────────────────────────────────────────────

const COUNTRIES = {
  bj: { name: 'Bénin',             flag: '🇧🇯', currency: 'XOF', phonePrefix: '229' },
  ci: { name: "Côte d'Ivoire",     flag: '🇨🇮', currency: 'XOF', phonePrefix: '225' },
  tg: { name: 'Togo',              flag: '🇹🇬', currency: 'XOF', phonePrefix: '228' },
  sn: { name: 'Sénégal',           flag: '🇸🇳', currency: 'XOF', phonePrefix: '221' },
  bf: { name: 'Burkina Faso',      flag: '🇧🇫', currency: 'XOF', phonePrefix: '226' },
  ml: { name: 'Mali',              flag: '🇲🇱', currency: 'XOF', phonePrefix: '223' },
  ne: { name: 'Niger',             flag: '🇳🇪', currency: 'XOF', phonePrefix: '227' },
  gn: { name: 'Guinée',            flag: '🇬🇳', currency: 'GNF', phonePrefix: '224' },
  cm: { name: 'Cameroun',          flag: '🇨🇲', currency: 'XAF', phonePrefix: '237' },
  ga: { name: 'Gabon',             flag: '🇬🇦', currency: 'XAF', phonePrefix: '241' },
  cd: { name: 'RDC',               flag: '🇨🇩', currency: 'CDF', phonePrefix: '243' },
  cg: { name: 'Congo Brazzaville', flag: '🇨🇬', currency: 'XAF', phonePrefix: '242' },
  gm: { name: 'Gambie',            flag: '🇬🇲', currency: 'GMD', phonePrefix: '220' },
  ng: { name: 'Nigeria',           flag: '🇳🇬', currency: 'NGN', phonePrefix: '234' },
  gh: { name: 'Ghana',             flag: '🇬🇭', currency: 'GHS', phonePrefix: '233' },
  ke: { name: 'Kenya',             flag: '🇰🇪', currency: 'KES', phonePrefix: '254' },
  ug: { name: 'Ouganda',           flag: '🇺🇬', currency: 'UGX', phonePrefix: '256' },
  tz: { name: 'Tanzanie',          flag: '🇹🇿', currency: 'TZS', phonePrefix: '255' },
  rw: { name: 'Rwanda',            flag: '🇷🇼', currency: 'RWF', phonePrefix: '250' },
  za: { name: 'Afrique du Sud',    flag: '🇿🇦', currency: 'ZAR', phonePrefix: '27'  },
  fr: { name: 'France',            flag: '🇫🇷', currency: 'EUR', phonePrefix: '33'  },
  be: { name: 'Belgique',          flag: '🇧🇪', currency: 'EUR', phonePrefix: '32'  },
  de: { name: 'Allemagne',         flag: '🇩🇪', currency: 'EUR', phonePrefix: '49'  },
  nl: { name: 'Pays-Bas',          flag: '🇳🇱', currency: 'EUR', phonePrefix: '31'  },
  gb: { name: 'Royaume-Uni',       flag: '🇬🇧', currency: 'GBP', phonePrefix: '44'  },
  us: { name: 'États-Unis',        flag: '🇺🇸', currency: 'USD', phonePrefix: '1'   },
};

// ─── Méthodes par provider et pays ────────────────────────────────────────────

const PROVIDER_METHODS = {
  feexpay: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money'],
      tg: ['togocom_money', 'moov_money'],
      sn: ['orange_money', 'free_money'],
      bf: ['orange_money', 'moov_money'],
      cg: ['mtn_money'],
    },
  },

  stripe: {
    countries: {
      fr: ['card', 'apple_pay', 'google_pay'],
      gb: ['card', 'apple_pay', 'google_pay'],
      us: ['card', 'apple_pay', 'google_pay'],
      de: ['card', 'giropay', 'sofort'],
      nl: ['card', 'ideal'],
      be: ['card', 'bancontact'],
    },
  },

  paystack: {
    countries: {
      ng: ['card', 'bank_transfer', 'ussd'],
      gh: ['card', 'mobile_money'],
      ke: ['card', 'mpesa'],
      za: ['card'],
    },
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
      cm: ['card', 'mobile_money'],
    },
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
      cd: ['airtel_money', 'orange_money', 'mpesa'],
    },
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
      ga: ['airtel_money', 'moov_money'],
    },
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
      ga: ['airtel_money', 'moov_money'],
    },
  },

  // ── MbiyoPay — 11 pays selon doc officielle ──────────────────────────────
  // https://dashboard.mbiyo.africa/docs/reference/merchant/payin
  mbiyopay: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money'],
      bf: ['orange_money', 'moov_money', 'coris'],
      ci: ['orange_money', 'mtn_money', 'wave_money', 'moov_money'],
      sn: ['orange_money', 'free_money'],
      tg: ['moov_money', 'togocom_money'],
      cg: ['mtn_money'],
      cd: ['mpesa', 'airtel_money', 'orange_money', 'afrimoney'],
      cm: ['orange_money', 'moov_money'],
      gn: ['orange_money', 'mtn_money'],
      ml: ['orange_money', 'moov_money'],
      gm: ['afrimoney', 'qmoney', 'wave_money'],
    },
  },

  paypal: {
    countries: {
      fr: ['paypal', 'card'],
      gb: ['paypal', 'card'],
      us: ['paypal', 'card'],
      de: ['paypal', 'card'],
      be: ['paypal', 'card'],
      nl: ['paypal', 'card'],
    },
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
      gb: ['chipper_wallet', 'card'],
    },
  },
};

// ─── Fonctions ────────────────────────────────────────────────────────────────

export function getMethodsForCountryWithProviders(countryCode, activeProviders = []) {
  const country = COUNTRIES[countryCode];
  if (!country) return null;

  const seen = new Set();
  const methods = [];

  activeProviders.forEach(pid => {
    const provider = PROVIDER_METHODS[pid];
    const countryMethods = provider?.countries?.[countryCode];
    if (countryMethods) {
      countryMethods.forEach(m => {
        if (!seen.has(m)) {
          seen.add(m);
          methods.push({ id: m, name: METHOD_NAMES[m] || m });
        }
      });
    }
  });

  return { ...country, code: countryCode, methods };
}

export function getAllCountries() {
  return Object.entries(COUNTRIES).map(([code, data]) => ({ code, ...data }));
}

export function getCountriesForProviders(activeProviders = []) {
  const countrySet = new Set();
  activeProviders.forEach(pid => {
    const provider = PROVIDER_METHODS[pid];
    if (provider?.countries) {
      Object.keys(provider.countries).forEach(c => countrySet.add(c));
    }
  });
  return Array.from(countrySet)
    .filter(code => COUNTRIES[code])
    .map(code => ({ code, ...COUNTRIES[code] }));
}

export { getMethodsForCountry, METHOD_NAMES, COUNTRIES, PROVIDER_METHODS };
export default COUNTRIES;