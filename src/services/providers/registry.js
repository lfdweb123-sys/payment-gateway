import feexpay from './feexpay';
import stripe from './stripe';
import paystack from './paystack';
import flutterwave from './flutterwave';
import kkiapay from './kkiapay';
import fedapay from './fedapay';
import paydunya from './paydunya';
import cinetpay from './cinetpay';
import lygos from './lygos';
import paypal from './paypal';
import mbiyopay from './mbiyopay';
import qosic from './qosic';
import bizao from './bizao';
import hub2 from './hub2';
import chipper from './chipper';

const PROVIDERS = {
  feexpay,
  stripe,
  paystack,
  flutterwave,
  kkiapay,
  fedapay,
  paydunya,
  cinetpay,
  lygos,
  paypal,
  mbiyopay,
  qosic,
  bizao,
  hub2,
  chipper
};

// Obtenir les providers disponibles pour un pays
export function getProvidersForCountry(country) {
  return Object.entries(PROVIDERS)
    .filter(([, provider]) => provider.countries?.includes(country))
    .map(([key]) => key);
}

// Obtenir les méthodes disponibles pour un pays (tous providers)
export function getAllMethodsForCountry(country) {
  const methods = new Map();
  
  Object.entries(PROVIDERS).forEach(([providerKey, provider]) => {
    if (provider.countries?.includes(country) && provider.methods?.[country]) {
      provider.methods[country].forEach(methodId => {
        if (!methods.has(methodId)) {
          methods.set(methodId, {
            id: methodId,
            providers: [providerKey]
          });
        } else {
          methods.get(methodId).providers.push(providerKey);
        }
      });
    }
  });
  
  return Array.from(methods.values());
}

export default PROVIDERS;