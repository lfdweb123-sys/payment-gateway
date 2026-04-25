// services/phoneValidator.js

const PHONE_PREFIXES = {

  /* ─── BÉNIN (229) ─── */
  bj: {
    mtn_money: {
      name: 'MTN Bénin',
      prefixes: ['42','46','50','51','52','53','54','56','57','59','61','62','66','67','69','90','91','96','97'],
    },
    moov_money: {
      name: 'Moov Africa Bénin',
      prefixes: ['45','55','58','60','63','64','65','68','94','95','98','99'],
    },
    celtiis_money: {
      name: 'Celtiis Bénin (SBIN)',
      prefixes: ['20','21','22','23','24','28','29','40','41','43','44','47','48','49','92','93'],
    },
  },

  /* ─── CÔTE D'IVOIRE (225) ─── */
  ci: {
    mtn_ci: {
      name: 'MTN Côte d\'Ivoire',
      prefixes: ['04','05','06','44','45','46','54','55','56','64','65','66','74','75','76','84','85','86','94','95','96'],
    },
    moov_ci: {
      name: 'Moov Africa Côte d\'Ivoire',
      prefixes: ['01','02','03','40','41','42','43','50','51','52','53','70','71','72','73'],
    },
    orange_ci: {
      name: 'Orange Côte d\'Ivoire',
      prefixes: ['07','08','09','47','48','49','57','58','59','67','68','69','77','78','79','87','88','89','97','98'],
    },
    wave_ci: {
      name: 'Wave Côte d\'Ivoire',
      prefixes: null,
    },
  },

  /* ─── TOGO (228) ─── */
  tg: {
    togocom_money: {
      name: 'Togocel / Togocom',
      prefixes: ['70','71','72','73','90','91','92','93'],
    },
    moov_tg: {
      name: 'Moov Africa Togo',
      prefixes: ['78','79','96','97','98','99'],
    },
  },

  /* ─── SÉNÉGAL (221) ─── */
  sn: {
    orange_sn: {
      name: 'Orange Sénégal',
      prefixes: ['77','78'],
    },
    free_sn: {
      name: 'Free Sénégal',
      prefixes: ['76'],
    },
    wave_sn: {
      name: 'Wave Sénégal',
      prefixes: null,
    },
    expresso_sn: {
      name: 'Expresso Sénégal',
      prefixes: ['70'],
    },
  },
};

const COUNTRY_CODES = {
  bj: '229', ci: '225', tg: '228', sn: '221',
};

export function validatePhone(phone, country, method) {
  if (!phone) return { valid: false, error: 'Numéro requis' };

  const countryCode = COUNTRY_CODES[country];
  if (!countryCode) return { valid: true };

  const countryData = PHONE_PREFIXES[country];
  if (!countryData) return { valid: true };

  const operatorData = countryData[method];
  if (!operatorData?.prefixes) return { valid: true };

  // Extraire le numéro local : enlever l'indicatif pays
  const cleaned = phone.replace(/\s/g, '');
  let local = cleaned.startsWith(countryCode) ? cleaned.slice(countryCode.length) : cleaned;

  // Prendre les 2 premiers chiffres du numéro local
  const prefix2 = local.slice(0, 2);

  if (!operatorData.prefixes.includes(prefix2)) {
    return {
      valid: false,
      error: `Ce numéro ne correspond pas au réseau ${operatorData.name}.`,
    };
  }

  return { valid: true };
}

export function detectNetwork(phone, country) {
  const countryCode = COUNTRY_CODES[country];
  if (!countryCode) return null;

  const countryData = PHONE_PREFIXES[country];
  if (!countryData) return null;

  const cleaned = phone.replace(/\s/g, '');
  const local = cleaned.startsWith(countryCode) ? cleaned.slice(countryCode.length) : cleaned;
  const prefix2 = local.slice(0, 2);

  for (const [methodId, data] of Object.entries(countryData)) {
    if (data.prefixes && data.prefixes.includes(prefix2)) {
      return { method: methodId, name: data.name };
    }
  }
  return null;
}