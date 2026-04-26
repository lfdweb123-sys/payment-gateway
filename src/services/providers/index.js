import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Cache
let providersCache = null;

// Charger les configurations depuis Firestore
export async function loadProvidersConfig() {
  if (providersCache) return providersCache;
  try {
    const snap = await getDocs(collection(db, 'gateway_providers'));
    providersCache = {};
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.active) providersCache[d.id] = data;
    });
    return providersCache;
  } catch (e) {
    console.error('Erreur chargement providers:', e);
    return {};
  }
}

export function clearProvidersCache() {
  providersCache = null;
}

// ─── Capacités de chaque provider ────────────────────────────────────────────

const CAPABILITIES = {

  // ════════════════════════════════════════════════════════════════════════
  // AFRIQUE DE L'OUEST — agrégateurs
  // ════════════════════════════════════════════════════════════════════════

  feexpay: {
    name: 'FeexPay',
    priority: 1,
    countries: ['bj', 'ci', 'tg', 'sn', 'bf', 'cg'],
    methods: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money', 'wallet', 'coris'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money'],
      tg: ['togocom_money', 'moov_money'],
      sn: ['orange_money', 'free_money', 'wave_money'],
      bf: ['orange_money', 'moov_money'],
      cg: ['mtn_money'],
    },
    currency: 'XOF',
  },

  kkiapay: {
    name: 'KKiaPay',
    priority: 2,
    countries: ['bj', 'tg', 'ci', 'sn', 'bf', 'ml', 'ne', 'gn', 'cm', 'ga', 'cd'],
    methods: {
      bj: ['mtn_money', 'moov_money', 'card'],
      tg: ['togocom_money', 'moov_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money'],
      sn: ['orange_money', 'free_money', 'wave_money'],
      cm: ['mtn_money', 'orange_money'],
    },
    currency: 'XOF',
  },

  cinetpay: {
    name: 'CinetPay',
    priority: 2,
    countries: ['bj', 'ci', 'tg', 'sn', 'cm', 'bf', 'ml', 'gn', 'ne', 'cd', 'ga'],
    methods: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money', 'card'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money', 'card'],
      tg: ['togocom_money', 'moov_money', 'card'],
      sn: ['orange_money', 'free_money', 'wave_money', 'card'],
      cm: ['mtn_money', 'orange_money', 'card'],
    },
    currency: 'XOF',
  },

  hub2: {
    name: 'Hub2',
    priority: 2,
    countries: ['bj', 'ci', 'sn', 'cm', 'bf', 'ml', 'gn', 'ne', 'cd', 'cg'],
    methods: {
      bj: ['mtn_money', 'moov_money', 'card'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money', 'card'],
      sn: ['orange_money', 'free_money', 'wave_money', 'card'],
      cm: ['mtn_money', 'orange_money', 'card'],
    },
    currency: 'XOF',
  },

  fedapay: {
    name: 'FedaPay',
    priority: 3,
    countries: ['bj', 'tg', 'ci', 'sn', 'bf', 'ml', 'ne', 'gn', 'cm', 'ga'],
    methods: {
      bj: ['mtn_money', 'moov_money', 'card'],
      tg: ['togocom_money', 'moov_money', 'card'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'card'],
      sn: ['orange_money', 'free_money', 'card'],
    },
    currency: 'XOF',
  },

  qosic: {
    name: 'Qosic',
    priority: 3,
    countries: ['bj', 'tg', 'ci', 'sn', 'bf', 'ml', 'ne', 'gn', 'cm', 'ga', 'cd', 'cg'],
    methods: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money'],
      tg: ['togocom_money', 'moov_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money'],
      sn: ['orange_money', 'free_money'],
      cm: ['mtn_money', 'orange_money'],
    },
    currency: 'XOF',
  },

  lygos: {
    name: 'Lygos',
    priority: 3,
    countries: ['bj', 'ci', 'tg', 'sn', 'cm', 'bf', 'ml', 'gn', 'ne', 'cd', 'ga', 'cg'],
    methods: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money', 'card'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money', 'card'],
      tg: ['togocom_money', 'moov_money', 'card'],
      sn: ['orange_money', 'free_money', 'wave_money', 'card'],
      cm: ['mtn_money', 'orange_money', 'card'],
      cg: ['mtn_money', 'airtel_money'],
    },
    currency: 'XOF',
  },

  bizao: {
    name: 'Bizao',
    priority: 3,
    countries: ['bj', 'ci', 'sn', 'cm', 'bf', 'ml', 'gn', 'ne', 'cd', 'cg', 'ga'],
    methods: {
      bj: ['mtn_money', 'moov_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money'],
      sn: ['orange_money', 'free_money'],
      cm: ['mtn_money', 'orange_money'],
    },
    currency: 'XOF',
  },

  paydunya: {
    name: 'PayDunya',
    priority: 4,
    countries: ['sn', 'ci', 'bj', 'tg', 'bf', 'ml', 'ne', 'gn'],
    methods: {
      sn: ['orange_money', 'free_money', 'wave_money', 'card'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money', 'card'],
      bj: ['mtn_money', 'moov_money', 'card'],
      tg: ['togocom_money', 'moov_money'],
    },
    currency: 'XOF',
  },

  mbiyopay: {
    name: 'MbiyoPay',
    priority: 4,
    countries: ['bj', 'bf', 'ci', 'sn', 'tg', 'cg', 'cd', 'cm', 'gn', 'ml', 'gm'],
    methods: {
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
    currency: 'XOF',
  },

  // ════════════════════════════════════════════════════════════════════════
  // AFRIQUE — Mobile Money direct (opérateurs)
  // ════════════════════════════════════════════════════════════════════════

  wave: {
    name: 'Wave',
    priority: 2,
    countries: ['sn', 'ci', 'ml', 'ug', 'cm', 'gm'],
    methods: {
      sn: ['wave_money'],
      ci: ['wave_money'],
      ml: ['wave_money'],
      ug: ['wave_money'],
      cm: ['wave_money'],
      gm: ['wave_money'],
    },
    currency: 'XOF',
  },

  mtn: {
    name: 'MTN MoMo',
    priority: 3,
    countries: ['gh', 'cm', 'ci', 'bj', 'sn', 'gn', 'cd', 'rw', 'ug', 'zm', 'za', 'ng'],
    methods: {
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
    currency: 'XOF',
  },

  mpesa: {
    name: 'M-Pesa Daraja',
    priority: 2,
    countries: ['ke', 'tz', 'mz'],
    methods: {
      ke: ['mpesa'],
      tz: ['mpesa'],
      mz: ['mpesa'],
    },
    currency: 'KES',
  },

  orange: {
    name: 'Orange Money',
    priority: 3,
    countries: ['ci', 'sn', 'ml', 'cm', 'gn', 'cd', 'cf'],
    methods: {
      ci: ['orange_money'],
      sn: ['orange_money'],
      ml: ['orange_money'],
      cm: ['orange_money'],
      gn: ['orange_money'],
      cd: ['orange_money'],
      cf: ['orange_money'],
    },
    currency: 'XOF',
  },

  airtel: {
    name: 'Airtel Money',
    priority: 3,
    countries: ['ke', 'ug', 'tz', 'zm', 'mw', 'gh', 'cd', 'mg', 'cm', 'ci', 'rw', 'ne', 'td', 'bf', 'bi', 'gw', 'sl'],
    methods: {
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
    currency: 'USD',
  },

  // ════════════════════════════════════════════════════════════════════════
  // AFRIQUE — Anglophones
  // ════════════════════════════════════════════════════════════════════════

  paystack: {
    name: 'Paystack',
    priority: 5,
    countries: ['ng', 'gh', 'ke', 'za'],
    methods: {
      ng: ['card', 'bank_transfer', 'ussd', 'qr'],
      gh: ['card', 'mobile_money'],
      ke: ['card', 'mpesa'],
      za: ['card', 'eft'],
    },
    currency: 'NGN',
  },

  flutterwave: {
    name: 'Flutterwave',
    priority: 6,
    countries: ['ng', 'gh', 'ke', 'ug', 'tz', 'rw', 'zm', 'cm', 'ci', 'sn', 'bj'],
    methods: {
      ng: ['card', 'bank_transfer', 'ussd'],
      gh: ['card', 'mobile_money'],
      ke: ['card', 'mpesa'],
      ci: ['card', 'mobile_money'],
      sn: ['card', 'mobile_money'],
      bj: ['card', 'mobile_money'],
      ug: ['card', 'mobile_money'],
      tz: ['card', 'mobile_money'],
      rw: ['card', 'mobile_money'],
      zm: ['card', 'mobile_money'],
      cm: ['card', 'mobile_money'],
    },
    currency: 'USD',
  },

  // ════════════════════════════════════════════════════════════════════════
  // AFRIQUE — Tunisie
  // ════════════════════════════════════════════════════════════════════════

  flouci: {
    name: 'Flouci',
    priority: 2,
    countries: ['tn'],
    methods: {
      tn: ['card', 'flouci_wallet'],
    },
    currency: 'TND',
  },

  paymee: {
    name: 'Paymee',
    priority: 3,
    countries: ['tn'],
    methods: {
      tn: ['card', 'bank_transfer'],
    },
    currency: 'TND',
  },

  // ════════════════════════════════════════════════════════════════════════
  // AFRIQUE DU SUD
  // ════════════════════════════════════════════════════════════════════════

  yoco: {
    name: 'Yoco',
    priority: 2,
    countries: ['za'],
    methods: {
      za: ['card'],
    },
    currency: 'ZAR',
  },

  // ════════════════════════════════════════════════════════════════════════
  // INTERNATIONAL
  // ════════════════════════════════════════════════════════════════════════

  paypal: {
    name: 'PayPal',
    priority: 8,
    countries: ['fr', 'be', 'ch', 'lu', 'de', 'es', 'it', 'nl', 'pt', 'gb', 'ie', 'us', 'ca', 'au', 'jp', 'sg', 'hk', 'br', 'mx', 'ma', 'dz', 'tn', 'za', 'ng', 'ke', 'ci', 'sn'],
    methods: {
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
    currency: 'EUR',
  },

  stripe: {
    name: 'Stripe',
    priority: 10,
    countries: ['fr', 'be', 'ch', 'lu', 'de', 'es', 'it', 'nl', 'pt', 'gb', 'ie', 'us', 'ca'],
    methods: {
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
    },
    currency: 'EUR',
  },

  mollie: {
    name: 'Mollie',
    priority: 7,
    countries: ['nl', 'be', 'de', 'fr', 'es', 'it', 'pt', 'at', 'ch', 'gb', 'ie', 'pl', 'se', 'dk', 'no', 'fi'],
    methods: {
      nl: ['card', 'ideal', 'bancontact'],
      be: ['card', 'bancontact'],
      de: ['card', 'giropay', 'sofort'],
      fr: ['card', 'sofort'],
      gb: ['card'],
      es: ['card'],
      it: ['card'],
      at: ['card', 'sofort'],
      ch: ['card', 'sofort'],
    },
    currency: 'EUR',
  },

  adyen: {
    name: 'Adyen',
    priority: 9,
    countries: ['fr', 'gb', 'de', 'nl', 'be', 'es', 'it', 'us', 'ca', 'au', 'sg', 'hk', 'jp', 'br', 'mx', 'ng', 'ke', 'za', 'gh'],
    methods: {
      fr: ['card', 'apple_pay', 'google_pay'],
      gb: ['card', 'apple_pay', 'google_pay'],
      de: ['card', 'giropay', 'sofort'],
      nl: ['card', 'ideal'],
      us: ['card', 'apple_pay', 'google_pay'],
      ca: ['card'],
      au: ['card'],
      ng: ['card'],
      ke: ['card'],
      za: ['card'],
      gh: ['card'],
    },
    currency: 'EUR',
  },

  checkout: {
    name: 'Checkout.com',
    priority: 9,
    countries: ['fr', 'gb', 'de', 'nl', 'be', 'es', 'it', 'us', 'ca', 'au', 'sg', 'hk', 'ae', 'sa', 'ng', 'ke', 'za', 'gh', 'eg'],
    methods: {
      fr: ['card', 'apple_pay', 'google_pay'],
      gb: ['card', 'apple_pay', 'google_pay'],
      us: ['card', 'apple_pay', 'google_pay'],
      ae: ['card'],
      sa: ['card'],
      ng: ['card'],
      ke: ['card'],
      za: ['card'],
      gh: ['card'],
      eg: ['card'],
    },
    currency: 'USD',
  },

  braintree: {
    name: 'Braintree',
    priority: 9,
    countries: ['us', 'ca', 'gb', 'au', 'de', 'fr', 'es', 'it', 'nl', 'be', 'at', 'ch', 'se', 'dk', 'no', 'pl', 'ie'],
    methods: {
      us: ['card', 'paypal', 'venmo', 'apple_pay', 'google_pay'],
      gb: ['card', 'paypal'],
      ca: ['card', 'paypal'],
      au: ['card', 'paypal'],
      de: ['card', 'paypal'],
      fr: ['card', 'paypal'],
      es: ['card', 'paypal'],
      it: ['card', 'paypal'],
      nl: ['card', 'paypal'],
    },
    currency: 'USD',
  },

  // ════════════════════════════════════════════════════════════════════════
  // INDE
  // ════════════════════════════════════════════════════════════════════════

  razorpay: {
    name: 'Razorpay',
    priority: 2,
    countries: ['in'],
    methods: {
      in: ['card', 'upi', 'bank_transfer', 'mobile_money'],
    },
    currency: 'INR',
  },

  // ════════════════════════════════════════════════════════════════════════
  // USA / AMÉRIQUE DU NORD
  // ════════════════════════════════════════════════════════════════════════

  square: {
    name: 'Square',
    priority: 7,
    countries: ['us', 'ca', 'gb', 'au', 'jp', 'ie', 'fr', 'es'],
    methods: {
      us: ['card', 'apple_pay', 'google_pay', 'cash_app'],
      ca: ['card', 'apple_pay', 'google_pay'],
      gb: ['card', 'apple_pay', 'google_pay'],
      au: ['card', 'apple_pay', 'google_pay'],
      jp: ['card'],
      fr: ['card'],
      es: ['card'],
      ie: ['card'],
    },
    currency: 'USD',
  },

  authnet: {
    name: 'Authorize.net',
    priority: 8,
    countries: ['us', 'ca'],
    methods: {
      us: ['card', 'bank_transfer', 'apple_pay'],
      ca: ['card'],
    },
    currency: 'USD',
  },
};

// ─── Noms lisibles des méthodes ───────────────────────────────────────────────

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

// ─── Fonctions ────────────────────────────────────────────────────────────────

export function findProviders(country, method) {
  const config = providersCache || {};
  const available = [];
  for (const [id, caps] of Object.entries(CAPABILITIES)) {
    if (
      config[id] &&
      caps.countries?.includes(country) &&
      caps.methods?.[country]?.includes(method)
    ) {
      available.push({ id, priority: caps.priority, name: caps.name });
    }
  }
  return available.sort((a, b) => a.priority - b.priority);
}

/**
 * Retourne les méthodes disponibles pour un pays donné
 * (union de tous les providers dans CAPABILITIES)
 * Utilisé par countryMethods.js
 */
export function getMethodsForCountry(countryCode) {
  const seen = new Set();
  const methods = [];

  for (const caps of Object.values(CAPABILITIES)) {
    const countryMethods = caps.methods?.[countryCode];
    if (countryMethods) {
      countryMethods.forEach(m => {
        if (!seen.has(m)) {
          seen.add(m);
          methods.push({ id: m, name: METHOD_NAMES[m] || m });
        }
      });
    }
  }

  return methods;
}

/**
 * Retourne les méthodes disponibles pour un pays,
 * filtrées selon une liste de providers actifs
 */
export function getMethodsForCountryWithProviders(countryCode, activeProviders = []) {
  const seen = new Set();
  const methods = [];

  activeProviders.forEach(pid => {
    const caps = CAPABILITIES[pid];
    const countryMethods = caps?.methods?.[countryCode];
    if (countryMethods) {
      countryMethods.forEach(m => {
        if (!seen.has(m)) {
          seen.add(m);
          methods.push({ id: m, name: METHOD_NAMES[m] || m });
        }
      });
    }
  });

  return methods;
}

export async function initPayment({ amount, phone, email, country, method, description }) {
  await loadProvidersConfig();
  const availableProviders = findProviders(country, method);

  if (availableProviders.length === 0) {
    return { success: false, error: `Aucun provider pour ${method} en ${country}` };
  }

  for (const { id, name } of availableProviders) {
    try {
      // Note : authnet.js = Authorize.net (renommé pour compatibilité Windows)
      const providerModule = await import(`./${id}.js`);
      const config = providersCache[id];
      const instance = new providerModule.default(config);
      const result = await instance.initPayment({ amount, phone, email, country, method, description });
      if (result.success) return { ...result, provider: id, providerName: name };
      console.warn(`Provider ${name} échoué: ${result.error}, essai suivant...`);
    } catch (e) {
      console.warn(`Provider ${id} erreur:`, e.message);
    }
  }

  return { success: false, error: 'Tous les providers ont échoué' };
}

export async function verifyPayment(providerId, reference) {
  await loadProvidersConfig();
  const config = providersCache[providerId];
  if (!config) return { success: false, error: 'Provider non configuré' };
  try {
    const providerModule = await import(`./${providerId}.js`);
    const instance = new providerModule.default(config);
    return await instance.verifyPayment(reference);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function getAvailableMethods(country) {
  const allMethods = new Set();
  for (const [, caps] of Object.entries(CAPABILITIES)) {
    if (caps.countries?.includes(country) && caps.methods?.[country]) {
      caps.methods[country].forEach(m => allMethods.add(m));
    }
  }
  return Array.from(allMethods);
}

export function getSupportedCountries() {
  const allCountries = new Set();
  for (const [, caps] of Object.entries(CAPABILITIES)) {
    caps.countries?.forEach(c => allCountries.add(c));
  }
  return Array.from(allCountries);
}

export { CAPABILITIES, METHOD_NAMES };
export default {
  initPayment,
  verifyPayment,
  findProviders,
  getMethodsForCountry,
  getMethodsForCountryWithProviders,
  getAvailableMethods,
  getSupportedCountries,
  loadProvidersConfig,
  clearProvidersCache,
};