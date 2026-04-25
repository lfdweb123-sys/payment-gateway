// utils/phoneValidator.js

/**
 * Préfixes vérifiés depuis Wikipedia, ARCEP, ITU et sources officielles opérateurs
 * Format : les 2 premiers chiffres du numéro LOCAL (sans indicatif pays)
 * 
 * ⚠️ Note portabilité : depuis 2024 au Togo et Bénin, un abonné peut
 * conserver son numéro en changeant d'opérateur. Le préfixe indique
 * l'opérateur d'ORIGINE, pas forcément l'opérateur actuel.
 */

const PHONE_PREFIXES = {

  /* ─── BÉNIN (229) — 10 chiffres depuis nov. 2024 ─── */
  bj: {
    // Format local : 01XXXXXXXX (le "01" est ajouté au passage à 10 chiffres)
    // On valide les 2 chiffres APRÈS le "01" obligatoire
    // Sources : ARCEP Bénin, Libon, Triomphe Mag (fév. 2026)
    mtn_money: {
      name: 'MTN Bénin',
      // Préfixes attribués à MTN par l'ARCEP
      prefixes: ['42','46','50','51','52','53','54','56','57','59','61','62','66','67','69','90','91','96','97'],
    },
    moov_money: {
      name: 'Moov Africa Bénin',
      // Préfixes attribués à Moov + anciens Glo (68, 98, 99) réattribués à Moov
      prefixes: ['45','55','58','60','63','64','65','68','94','95','98','99'],
    },
    celtiis_money: {
      name: 'Celtiis Bénin (SBIN)',
      // Préfixes SBIN selon ARCEP : 0120-0124, 0128-0129, 0140-0141, 0143-0144, 0147-0149, 0192-0193
      prefixes: ['20','21','22','23','24','28','29','40','41','43','44','47','48','49','92','93'],
    },
  },

  /* ─── CÔTE D'IVOIRE (225) — 10 chiffres depuis jan. 2021 ─── */
  ci: {
    // Sources : Wikipedia CI, MTN CI, Orange CI officiels
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
      // Wave CI utilise des numéros virtuels Orange/MTN — pas de préfixes exclusifs
      // Validation impossible par préfixe, on accepte tous les numéros CI valides
      prefixes: null,
    },
  },

  /* ─── TOGO (228) — 8 chiffres ─── */
  tg: {
    // Sources : Wikipedia EN Togo, Grokipedia, République du Togo officiel
    togocom_money: {
      name: 'Togocel / Togocom',
      prefixes: ['70','71','72','73','90','91','92','93'],
    },
    moov_tg: {
      name: 'Moov Africa Togo',
      prefixes: ['78','79','96','97','98','99'],
    },
  },

  /* ─── SÉNÉGAL (221) — 9 chiffres ─── */
  sn: {
    // Sources : ITU E.164 doc officiel Sénégal (oct. 2023), DialLink
    orange_sn: {
      name: 'Orange Sénégal (Sonatel)',
      prefixes: ['77','78'],
    },
    free_sn: {
      name: 'Free Sénégal',
      prefixes: ['76'],
    },
    wave_sn: {
      name: 'Wave Sénégal',
      // Wave SN opère via des numéros virtuels Orange/Free
      // Pas de préfixes exclusifs identifiables
      prefixes: null,
    },
    expresso_sn: {
      name: 'Expresso Sénégal',
      prefixes: ['70'],
    },
  },
};

/**
 * Longueur du numéro LOCAL attendu (sans indicatif pays)
 * Bénin : 10 chiffres depuis nov. 2024 (01 + 8 chiffres)
 */
const PHONE_LENGTH = {
  bj: 10,
  ci: 10,
  tg: 8,
  sn: 9,
};

/**
 * Valide un numéro de téléphone pour un pays + méthode donnés
 * @param {string} phone   - Numéro complet avec indicatif pays (ex: 22961123456)
 * @param {string} country - Code pays (bj, ci, tg, sn)
 * @param {string} method  - Méthode de paiement (mtn_money, moov_money, etc.)
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePhone(phone, country, method) {
  if (!phone) return { valid: false, error: 'Numéro de téléphone requis' };

  const COUNTRY_PREFIXES = { bj:'229', ci:'225', tg:'228', sn:'221' };
  const countryCode = COUNTRY_PREFIXES[country];
  if (!countryCode) return { valid: true }; // Pays non géré = on laisse passer

  // Extraire le numéro local (enlever l'indicatif pays)
  const cleaned = phone.replace(/\s/g, '');
  let local = cleaned;
  if (local.startsWith(countryCode)) local = local.slice(countryCode.length);
  if (local.startsWith('0'))         local = local.slice(1); // enlever le 0 initial si présent

  // Vérifier la longueur
  const expectedLength = PHONE_LENGTH[country];
  if (expectedLength && local.length !== expectedLength) {
    return {
      valid: false,
      error: `Le numéro doit contenir ${expectedLength} chiffres (actuellement ${local.length})`,
    };
  }

  // Récupérer les opérateurs du pays
  const countryData = PHONE_PREFIXES[country];
  if (!countryData) return { valid: true };

  const operatorData = countryData[method];
  if (!operatorData) return { valid: true }; // Méthode inconnue = on laisse passer

  // Si pas de préfixes définis (ex: Wave), on accepte
  if (!operatorData.prefixes) return { valid: true };

  // Pour le Bénin : les 2 chiffres à valider sont APRÈS le "01" obligatoire
  let prefix2;
  if (country === 'bj') {
    if (!local.startsWith('01')) {
      return { valid: false, error: 'Les numéros béninois doivent commencer par 01' };
    }
    prefix2 = local.slice(2, 4); // 2 chiffres après le "01"
  } else {
    prefix2 = local.slice(0, 2);
  }

  if (!operatorData.prefixes.includes(prefix2)) {
    return {
      valid: false,
      error: `Ce numéro ne correspond pas au réseau ${operatorData.name}. Vérifiez que vous avez sélectionné la bonne méthode de paiement.`,
    };
  }

  return { valid: true };
}

/**
 * Détecte automatiquement le réseau probable d'un numéro
 * (utile pour suggérer la bonne méthode à l'utilisateur)
 */
export function detectNetwork(phone, country) {
  const COUNTRY_PREFIXES = { bj:'229', ci:'225', tg:'228', sn:'221' };
  const countryCode = COUNTRY_PREFIXES[country];
  if (!countryCode) return null;

  const cleaned = phone.replace(/\s/g, '');
  let local = cleaned.startsWith(countryCode) ? cleaned.slice(countryCode.length) : cleaned;
  if (local.startsWith('0')) local = local.slice(1);

  const countryData = PHONE_PREFIXES[country];
  if (!countryData) return null;

  let prefix2;
  if (country === 'bj') {
    if (!local.startsWith('01')) return null;
    prefix2 = local.slice(2, 4);
  } else {
    prefix2 = local.slice(0, 2);
  }

  for (const [methodId, data] of Object.entries(countryData)) {
    if (data.prefixes && data.prefixes.includes(prefix2)) {
      return { method: methodId, name: data.name };
    }
  }
  return null;
}