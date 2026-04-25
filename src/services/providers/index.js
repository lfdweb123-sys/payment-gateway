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
  feexpay: {
    name: 'FeexPay',
    priority: 1,
    countries: ['bj', 'ci', 'tg', 'sn', 'bf', 'cg'],
    methods: {
      bj: ['mtn_money', 'moov_money', 'celtiis_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money', 'wave_money'],
      tg: ['togocom_money', 'moov_money'],
      sn: ['orange_money', 'free_money'],
      bf: ['orange_money', 'moov_money'],
      cg: ['mtn_money'],
    },
    currency: 'XOF',
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
    },
    currency: 'EUR',
  },

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
    },
    currency: 'USD',
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

  paypal: {
    name: 'PayPal',
    priority: 100,
    countries: ['fr', 'be', 'ch', 'lu', 'de', 'es', 'it', 'nl', 'pt', 'gb', 'ie', 'us', 'ca', 'au', 'jp', 'sg', 'hk', 'br', 'mx', 'ma', 'dz', 'tn', 'za', 'ng', 'ke', 'ci', 'sn'],
    methods: {
      fr: ['paypal', 'card'],
      gb: ['paypal', 'card'],
      us: ['paypal', 'card', 'venmo'],
      ng: ['paypal', 'card'],
      ke: ['paypal', 'card'],
      ci: ['paypal', 'card'],
      sn: ['paypal', 'card'],
      ma: ['paypal', 'card'],
    },
    currency: 'EUR',
  },

  // ── MbiyoPay — corrigé selon doc officielle ──────────────────────────────
  // Doc : https://dashboard.mbiyo.africa/docs/reference/merchant/payin
  // Endpoint réel : https://dashboard.mbiyo.africa/api/v1/merchant/payin
  // 11 pays supportés (mobile money uniquement)
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

  qosic: {
    name: 'Qosic',
    priority: 3,
    countries: ['bj', 'tg', 'ci', 'sn', 'bf', 'ml', 'ne', 'gn', 'cm', 'ga', 'cd', 'cg'],
    methods: {
      bj: ['mtn_money', 'moov_money'],
      tg: ['togocom_money', 'moov_money'],
      ci: ['mtn_money', 'orange_money', 'moov_money'],
      sn: ['orange_money', 'free_money'],
      cm: ['mtn_money', 'orange_money'],
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

  chipper: {
    name: 'Chipper Cash',
    priority: 10,
    countries: ['gh', 'ng', 'ke', 'ug', 'tz', 'rw', 'za', 'us', 'gb'],
    methods: {
      gh: ['chipper_wallet', 'mobile_money', 'card'],
      ng: ['chipper_wallet', 'card', 'bank_transfer'],
      ke: ['chipper_wallet', 'mpesa', 'card'],
      us: ['chipper_wallet', 'card', 'ach'],
      gb: ['chipper_wallet', 'card'],
    },
    currency: 'USD',
  },
};

// ─── Noms lisibles des méthodes ───────────────────────────────────────────────

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
  bacs:           'BACS',
  bizum:          'Bizum',
  eft:            'EFT',
  qr:             'QR Code',
  ach:            'ACH',
  venmo:          'Venmo',
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