import { getMethodsForCountry } from './providers/index';

// ─── Noms des méthodes ────────────────────────────────────────────────────────

const METHOD_NAMES = {
  // Mobile Money Afrique
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
  wallet:         'Wallet (Coris)',
  flouci_wallet:  'Flouci Wallet',
  // Carte & bancaire
  card:           'Carte Bancaire',
  bank_transfer:  'Virement Bancaire',
  ussd:           'USSD',
  eft:            'EFT',
  qr:             'QR Code',
  ach:            'ACH',
  upi:            'UPI',
  // Wallets internationaux
  paypal:         'PayPal',
  venmo:          'Venmo',
  apple_pay:      'Apple Pay',
  google_pay:     'Google Pay',
  cash_app:       'Cash App',
  // Local Europe
  ideal:          'iDEAL',
  giropay:        'Giropay',
  sofort:         'Sofort',
  bancontact:     'Bancontact',
  bacs:           'BACS',
  bizum:          'Bizum',
  // Divers
  mobile_money:   'Mobile Money',
};

// ─── Pays ─────────────────────────────────────────────────────────────────────

const COUNTRIES = {
  // ── Afrique de l'Ouest (UEMOA) ──────────────────────────────────────────
  bj: { name: 'Bénin',             flag: '🇧🇯', currency: 'XOF', phonePrefix: '229' },
  ci: { name: "Côte d'Ivoire",     flag: '🇨🇮', currency: 'XOF', phonePrefix: '225' },
  tg: { name: 'Togo',              flag: '🇹🇬', currency: 'XOF', phonePrefix: '228' },
  sn: { name: 'Sénégal',           flag: '🇸🇳', currency: 'XOF', phonePrefix: '221' },
  bf: { name: 'Burkina Faso',      flag: '🇧🇫', currency: 'XOF', phonePrefix: '226' },
  ml: { name: 'Mali',              flag: '🇲🇱', currency: 'XOF', phonePrefix: '223' },
  ne: { name: 'Niger',             flag: '🇳🇪', currency: 'XOF', phonePrefix: '227' },
  gn: { name: 'Guinée',            flag: '🇬🇳', currency: 'GNF', phonePrefix: '224' },
  gw: { name: 'Guinée-Bissau',     flag: '🇬🇼', currency: 'XOF', phonePrefix: '245' },
  gm: { name: 'Gambie',            flag: '🇬🇲', currency: 'GMD', phonePrefix: '220' },
  // ── Afrique Centrale (CEMAC) ─────────────────────────────────────────────
  cm: { name: 'Cameroun',          flag: '🇨🇲', currency: 'XAF', phonePrefix: '237' },
  ga: { name: 'Gabon',             flag: '🇬🇦', currency: 'XAF', phonePrefix: '241' },
  cd: { name: 'RDC',               flag: '🇨🇩', currency: 'CDF', phonePrefix: '243' },
  cg: { name: 'Congo Brazzaville', flag: '🇨🇬', currency: 'XAF', phonePrefix: '242' },
  cf: { name: 'Centrafrique',      flag: '🇨🇫', currency: 'XAF', phonePrefix: '236' },
  td: { name: 'Tchad',             flag: '🇹🇩', currency: 'XAF', phonePrefix: '235' },
  bi: { name: 'Burundi',           flag: '🇧🇮', currency: 'BIF', phonePrefix: '257' },
  // ── Afrique de l'Est ─────────────────────────────────────────────────────
  ng: { name: 'Nigeria',           flag: '🇳🇬', currency: 'NGN', phonePrefix: '234' },
  gh: { name: 'Ghana',             flag: '🇬🇭', currency: 'GHS', phonePrefix: '233' },
  ke: { name: 'Kenya',             flag: '🇰🇪', currency: 'KES', phonePrefix: '254' },
  ug: { name: 'Ouganda',           flag: '🇺🇬', currency: 'UGX', phonePrefix: '256' },
  tz: { name: 'Tanzanie',          flag: '🇹🇿', currency: 'TZS', phonePrefix: '255' },
  rw: { name: 'Rwanda',            flag: '🇷🇼', currency: 'RWF', phonePrefix: '250' },
  zm: { name: 'Zambie',            flag: '🇿🇲', currency: 'ZMW', phonePrefix: '260' },
  mw: { name: 'Malawi',            flag: '🇲🇼', currency: 'MWK', phonePrefix: '265' },
  mg: { name: 'Madagascar',        flag: '🇲🇬', currency: 'MGA', phonePrefix: '261' },
  mz: { name: 'Mozambique',        flag: '🇲🇿', currency: 'MZN', phonePrefix: '258' },
  sl: { name: 'Sierra Leone',      flag: '🇸🇱', currency: 'SLL', phonePrefix: '232' },
  // ── Afrique du Nord ───────────────────────────────────────────────────────
  tn: { name: 'Tunisie',           flag: '🇹🇳', currency: 'TND', phonePrefix: '216' },
  ma: { name: 'Maroc',             flag: '🇲🇦', currency: 'MAD', phonePrefix: '212' },
  dz: { name: 'Algérie',           flag: '🇩🇿', currency: 'DZD', phonePrefix: '213' },
  eg: { name: 'Égypte',            flag: '🇪🇬', currency: 'EGP', phonePrefix: '20'  },
  // ── Afrique du Sud ────────────────────────────────────────────────────────
  za: { name: 'Afrique du Sud',    flag: '🇿🇦', currency: 'ZAR', phonePrefix: '27'  },
  // ── Europe ───────────────────────────────────────────────────────────────
  fr: { name: 'France',            flag: '🇫🇷', currency: 'EUR', phonePrefix: '33'  },
  be: { name: 'Belgique',          flag: '🇧🇪', currency: 'EUR', phonePrefix: '32'  },
  ch: { name: 'Suisse',            flag: '🇨🇭', currency: 'CHF', phonePrefix: '41'  },
  lu: { name: 'Luxembourg',        flag: '🇱🇺', currency: 'EUR', phonePrefix: '352' },
  de: { name: 'Allemagne',         flag: '🇩🇪', currency: 'EUR', phonePrefix: '49'  },
  es: { name: 'Espagne',           flag: '🇪🇸', currency: 'EUR', phonePrefix: '34'  },
  it: { name: 'Italie',            flag: '🇮🇹', currency: 'EUR', phonePrefix: '39'  },
  nl: { name: 'Pays-Bas',          flag: '🇳🇱', currency: 'EUR', phonePrefix: '31'  },
  pt: { name: 'Portugal',          flag: '🇵🇹', currency: 'EUR', phonePrefix: '351' },
  gb: { name: 'Royaume-Uni',       flag: '🇬🇧', currency: 'GBP', phonePrefix: '44'  },
  ie: { name: 'Irlande',           flag: '🇮🇪', currency: 'EUR', phonePrefix: '353' },
  at: { name: 'Autriche',          flag: '🇦🇹', currency: 'EUR', phonePrefix: '43'  },
  pl: { name: 'Pologne',           flag: '🇵🇱', currency: 'PLN', phonePrefix: '48'  },
  se: { name: 'Suède',             flag: '🇸🇪', currency: 'SEK', phonePrefix: '46'  },
  dk: { name: 'Danemark',          flag: '🇩🇰', currency: 'DKK', phonePrefix: '45'  },
  no: { name: 'Norvège',           flag: '🇳🇴', currency: 'NOK', phonePrefix: '47'  },
  fi: { name: 'Finlande',          flag: '🇫🇮', currency: 'EUR', phonePrefix: '358' },
  // ── Amériques ────────────────────────────────────────────────────────────
  us: { name: 'États-Unis',        flag: '🇺🇸', currency: 'USD', phonePrefix: '1'   },
  ca: { name: 'Canada',            flag: '🇨🇦', currency: 'CAD', phonePrefix: '1'   },
  br: { name: 'Brésil',            flag: '🇧🇷', currency: 'BRL', phonePrefix: '55'  },
  mx: { name: 'Mexique',           flag: '🇲🇽', currency: 'MXN', phonePrefix: '52'  },
  // ── Asie-Pacifique ───────────────────────────────────────────────────────
  in: { name: 'Inde',              flag: '🇮🇳', currency: 'INR', phonePrefix: '91'  },
  au: { name: 'Australie',         flag: '🇦🇺', currency: 'AUD', phonePrefix: '61'  },
  jp: { name: 'Japon',             flag: '🇯🇵', currency: 'JPY', phonePrefix: '81'  },
  sg: { name: 'Singapour',         flag: '🇸🇬', currency: 'SGD', phonePrefix: '65'  },
  hk: { name: 'Hong Kong',         flag: '🇭🇰', currency: 'HKD', phonePrefix: '852' },
  // ── Moyen-Orient ─────────────────────────────────────────────────────────
  ae: { name: 'Émirats Arabes',    flag: '🇦🇪', currency: 'AED', phonePrefix: '971' },
  sa: { name: 'Arabie Saoudite',   flag: '🇸🇦', currency: 'SAR', phonePrefix: '966' },
};

// ─── Méthodes par provider et pays ────────────────────────────────────────────

const PROVIDER_METHODS = {

  // ── Agrégateurs Afrique de l'Ouest ────────────────────────────────────────

  feexpay: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money', 'wallet', 'coris'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money'],
      tg: ['togocom_money', 'moov_money'],
      sn: ['orange_money', 'free_money', 'wave_money'],
      bf: ['orange_money', 'moov_money'],
      cg: ['mtn_money'],
    },
  },

  kkiapay: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'card'],
      tg: ['togocom_money', 'moov_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money'],
      sn: ['orange_money', 'free_money', 'wave_money'],
      bf: ['orange_money', 'moov_money'],
      ml: ['orange_money', 'moov_money'],
      ne: ['airtel_money', 'orange_money'],
      gn: ['orange_money', 'mtn_money'],
      cm: ['mtn_money', 'orange_money'],
      ga: ['airtel_money', 'moov_money'],
      cd: ['airtel_money', 'orange_money', 'mpesa'],
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

  hub2: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'card'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money', 'card'],
      sn: ['orange_money', 'free_money', 'wave_money', 'card'],
      cm: ['mtn_money', 'orange_money', 'card'],
      bf: ['orange_money', 'moov_money'],
      ml: ['orange_money', 'moov_money'],
      gn: ['orange_money', 'mtn_money'],
      ne: ['airtel_money', 'orange_money'],
      cd: ['airtel_money', 'orange_money', 'mpesa'],
      cg: ['mtn_money'],
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

  qosic: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money'],
      tg: ['togocom_money', 'moov_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money'],
      sn: ['orange_money', 'free_money'],
      bf: ['orange_money', 'moov_money'],
      ml: ['orange_money', 'moov_money'],
      ne: ['airtel_money', 'orange_money'],
      gn: ['orange_money', 'mtn_money'],
      cm: ['mtn_money', 'orange_money'],
      ga: ['airtel_money', 'moov_money'],
      cd: ['airtel_money', 'orange_money', 'mpesa'],
      cg: ['mtn_money'],
    },
  },

  lygos: {
    countries: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money', 'card'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money', 'card'],
      tg: ['togocom_money', 'moov_money', 'card'],
      sn: ['orange_money', 'free_money', 'wave_money', 'card'],
      cm: ['mtn_money', 'orange_money', 'card'],
      bf: ['orange_money', 'moov_money'],
      ml: ['orange_money', 'moov_money'],
      gn: ['orange_money', 'mtn_money'],
      ne: ['airtel_money', 'orange_money'],
      cd: ['airtel_money', 'orange_money', 'mpesa'],
      ga: ['airtel_money', 'moov_money'],
      cg: ['mtn_money', 'airtel_money'],
    },
  },

  bizao: {
    countries: {
      bj: ['mtn_money', 'moov_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money'],
      sn: ['orange_money', 'free_money'],
      cm: ['mtn_money', 'orange_money'],
      bf: ['orange_money', 'moov_money'],
      ml: ['orange_money', 'moov_money'],
      gn: ['orange_money', 'mtn_money'],
      ne: ['airtel_money', 'orange_money'],
      cd: ['airtel_money', 'orange_money'],
      cg: ['mtn_money'],
      ga: ['airtel_money'],
    },
  },

  paydunya: {
    countries: {
      sn: ['orange_money', 'free_money', 'wave_money', 'card'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money', 'card'],
      bj: ['mtn_money', 'moov_money', 'card'],
      tg: ['togocom_money', 'moov_money'],
      bf: ['orange_money', 'moov_money'],
      ml: ['orange_money', 'moov_money'],
      ne: ['airtel_money', 'orange_money'],
      gn: ['orange_money', 'mtn_money'],
    },
  },

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
  
  geniuspay: {
    countries: {
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
    },
  },

  // ── Mobile Money direct (opérateurs) ──────────────────────────────────────

  wave: {
    countries: {
      sn: ['wave_money'],
      ci: ['wave_money'],
      ml: ['wave_money'],
      ug: ['wave_money'],
      cm: ['wave_money'],
      gm: ['wave_money'],
    },
  },

  mtn: {
    countries: {
      gh: ['mtn_money'],
      cm: ['mtn_money'],
      ci: ['mtn_money'],
      bj: ['mtn_money'],
      sn: ['mtn_money'],
      gn: ['mtn_money'],
      cd: ['mtn_money'],
      rw: ['mtn_money'],
      ug: ['mtn_money'],
      zm: ['mtn_money'],
      za: ['mtn_money'],
      ng: ['mtn_money'],
    },
  },

  mpesa: {
    countries: {
      ke: ['mpesa'],
      tz: ['mpesa'],
      mz: ['mpesa'],
    },
  },

  orange: {
    countries: {
      ci: ['orange_money'],
      sn: ['orange_money'],
      ml: ['orange_money'],
      cm: ['orange_money'],
      gn: ['orange_money'],
      cd: ['orange_money'],
      cf: ['orange_money'],
    },
  },

  airtel: {
    countries: {
      ke: ['airtel_money'],
      ug: ['airtel_money'],
      tz: ['airtel_money'],
      zm: ['airtel_money'],
      mw: ['airtel_money'],
      gh: ['airtel_money'],
      cd: ['airtel_money'],
      mg: ['airtel_money'],
      cm: ['airtel_money'],
      ci: ['airtel_money'],
      rw: ['airtel_money'],
      ne: ['airtel_money'],
      td: ['airtel_money'],
      bf: ['airtel_money'],
    },
  },

  // ── Afrique anglophone ────────────────────────────────────────────────────

  paystack: {
    countries: {
      ng: ['card', 'bank_transfer', 'ussd', 'qr'],
      gh: ['card', 'mobile_money'],
      ke: ['card', 'mpesa'],
      za: ['card', 'eft'],
    },
  },

  flutterwave: {
    countries: {
      ng: ['card', 'bank_transfer', 'ussd'],
      gh: ['card', 'mobile_money'],
      ke: ['card', 'mpesa'],
      ug: ['card', 'mobile_money'],
      tz: ['card', 'mobile_money'],
      rw: ['card', 'mobile_money'],
      zm: ['card', 'mobile_money'],
      ci: ['card', 'mobile_money'],
      sn: ['card', 'mobile_money'],
      bj: ['card', 'mobile_money'],
      cm: ['card', 'mobile_money'],
    },
  },

  // ── Tunisie ───────────────────────────────────────────────────────────────

  flouci: {
    countries: {
      tn: ['card', 'flouci_wallet'],
    },
  },

  paymee: {
    countries: {
      tn: ['card', 'bank_transfer'],
    },
  },

  // ── Afrique du Sud ────────────────────────────────────────────────────────

  yoco: {
    countries: {
      za: ['card'],
    },
  },

  // ── International ─────────────────────────────────────────────────────────

  paypal: {
    countries: {
      fr: ['paypal', 'card'],
      gb: ['paypal', 'card'],
      us: ['paypal', 'card', 'venmo'],
      ca: ['paypal', 'card'],
      au: ['paypal', 'card'],
      de: ['paypal', 'card'],
      es: ['paypal', 'card'],
      it: ['paypal', 'card'],
      nl: ['paypal', 'card'],
      ng: ['paypal', 'card'],
      ke: ['paypal', 'card'],
      ci: ['paypal', 'card'],
      sn: ['paypal', 'card'],
      ma: ['paypal', 'card'],
    },
  },

  stripe: {
    countries: {
      fr: ['card', 'apple_pay', 'google_pay'],
      gb: ['card', 'apple_pay', 'google_pay', 'bacs'],
      nl: ['card', 'ideal'],
      de: ['card', 'giropay', 'sofort'],
      es: ['card', 'bizum'],
      us: ['card', 'apple_pay', 'google_pay'],
      ca: ['card'],
      be: ['card', 'bancontact'],
      it: ['card'],
      pt: ['card'],
      ie: ['card'],
    },
  },

  mollie: {
    countries: {
      nl: ['card', 'ideal', 'bancontact'],
      be: ['card', 'bancontact'],
      de: ['card', 'giropay', 'sofort'],
      fr: ['card', 'sofort'],
      gb: ['card'],
      es: ['card'],
      it: ['card'],
      at: ['card', 'sofort'],
      ch: ['card', 'sofort'],
      pl: ['card'],
      se: ['card'],
      dk: ['card'],
      no: ['card'],
      fi: ['card'],
      ie: ['card'],
    },
  },

  adyen: {
    countries: {
      fr: ['card', 'apple_pay', 'google_pay'],
      gb: ['card', 'apple_pay', 'google_pay'],
      de: ['card', 'giropay', 'sofort'],
      nl: ['card', 'ideal'],
      be: ['card', 'bancontact'],
      us: ['card', 'apple_pay', 'google_pay'],
      ca: ['card'],
      au: ['card'],
      ng: ['card'],
      ke: ['card'],
      za: ['card'],
      gh: ['card'],
      sg: ['card'],
      hk: ['card'],
    },
  },

  checkout: {
    countries: {
      fr: ['card', 'apple_pay', 'google_pay'],
      gb: ['card', 'apple_pay', 'google_pay'],
      us: ['card', 'apple_pay', 'google_pay'],
      de: ['card'],
      nl: ['card'],
      be: ['card'],
      es: ['card'],
      it: ['card'],
      ae: ['card'],
      sa: ['card'],
      ng: ['card'],
      ke: ['card'],
      za: ['card'],
      gh: ['card'],
      eg: ['card'],
      au: ['card'],
      ca: ['card'],
    },
  },

  braintree: {
    countries: {
      us: ['card', 'paypal', 'venmo', 'apple_pay', 'google_pay'],
      gb: ['card', 'paypal'],
      ca: ['card', 'paypal'],
      au: ['card', 'paypal'],
      de: ['card', 'paypal'],
      fr: ['card', 'paypal'],
      es: ['card', 'paypal'],
      it: ['card', 'paypal'],
      nl: ['card', 'paypal'],
      be: ['card', 'paypal'],
      ie: ['card', 'paypal'],
    },
  },

  // ── Inde ──────────────────────────────────────────────────────────────────

  razorpay: {
    countries: {
      in: ['card', 'upi', 'bank_transfer', 'mobile_money'],
    },
  },

  // ── USA / Canada ──────────────────────────────────────────────────────────

  square: {
    countries: {
      us: ['card', 'apple_pay', 'google_pay', 'cash_app'],
      ca: ['card', 'apple_pay', 'google_pay'],
      gb: ['card', 'apple_pay', 'google_pay'],
      au: ['card', 'apple_pay', 'google_pay'],
      jp: ['card'],
      fr: ['card'],
      es: ['card'],
      ie: ['card'],
    },
  },

  authnet: {
    countries: {
      us: ['card', 'bank_transfer', 'apple_pay'],
      ca: ['card'],
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