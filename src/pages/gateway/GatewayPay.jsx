import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Lock, Smartphone, CreditCard, ChevronRight, CheckCircle2, Globe, ArrowLeft } from 'lucide-react';
import { getMethodsForCountry, getAllCountries } from '../../services/countryMethods';
import toast from 'react-hot-toast';

const ACTIVE_PROVIDERS_METHODS = {
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
      nl: ['paypal', 'card']
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

const METHOD_NAMES = {
  mtn_money: 'MTN Mobile Money', moov_money: 'Moov Money', orange_money: 'Orange Money',
  free_money: 'Free Money', wave_money: 'Wave', celtiis_money: 'CELTIIS Money',
  togocom_money: 'TOGOCOM Money', airtel_money: 'Airtel Money', mpesa: 'M-Pesa',
  card: 'Carte Bancaire', bank_transfer: 'Virement Bancaire', ussd: 'USSD',
  paypal: 'PayPal', apple_pay: 'Apple Pay', google_pay: 'Google Pay',
  chipper_wallet: 'Chipper Wallet', mobile_money: 'Mobile Money',
  ideal: 'iDEAL', giropay: 'Giropay', sofort: 'Sofort', bancontact: 'Bancontact'
};

const COUNTRIES = {
  bj: '🇧🇯 Bénin', ci: '🇨🇮 Côte d\'Ivoire', tg: '🇹🇬 Togo', sn: '🇸🇳 Sénégal',
  bf: '🇧🇫 Burkina Faso', ml: '🇲🇱 Mali', ne: '🇳🇪 Niger', gn: '🇬🇳 Guinée',
  cm: '🇨🇲 Cameroun', ga: '🇬🇦 Gabon', cd: '🇨🇩 RDC', cg: '🇨🇬 Congo',
  ng: '🇳🇬 Nigeria', gh: '🇬🇭 Ghana', ke: '🇰🇪 Kenya', ug: '🇺🇬 Ouganda',
  tz: '🇹🇿 Tanzanie', rw: '🇷🇼 Rwanda', za: '🇿🇦 Afrique du Sud',
  fr: '🇫🇷 France', be: '🇧🇪 Belgique', de: '🇩🇪 Allemagne', nl: '🇳🇱 Pays-Bas',
  gb: '🇬🇧 Royaume-Uni', us: '🇺🇸 États-Unis'
};

const CURRENCIES = {
  XOF: 'XOF', XAF: 'XAF', GNF: 'GNF', CDF: 'CDF', NGN: 'NGN', GHS: 'GHS',
  KES: 'KES', UGX: 'UGX', TZS: 'TZS', RWF: 'RWF', ZAR: 'ZAR',
  EUR: 'EUR', GBP: 'GBP', USD: 'USD'
};

function getCurrencyForCountry(code) {
  const map = { bj:'XOF',ci:'XOF',tg:'XOF',sn:'XOF',bf:'XOF',ml:'XOF',ne:'XOF',gn:'GNF',cm:'XAF',ga:'XAF',cd:'CDF',cg:'XAF',ng:'NGN',gh:'GHS',ke:'KES',ug:'UGX',tz:'TZS',rw:'RWF',za:'ZAR',fr:'EUR',be:'EUR',de:'EUR',nl:'EUR',gb:'GBP',us:'USD' };
  return map[code] || 'XOF';
}

export default function GatewayPay() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const amountParam = searchParams.get('amount');
  const description = searchParams.get('desc') || 'Paiement en ligne';

  const [step, setStep] = useState(1);
  const [country, setCountry] = useState(null);
  const [countryMethods, setCountryMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState(amountParam || '5000');
  const [loading, setLoading] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [countries, setCountries] = useState([]);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/gateway/merchant/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setMerchant(data);
          // Filtrer les pays selon les providers actifs
          const activeProviders = data.activeProviders || [];
          const countrySet = new Set();
          activeProviders.forEach(pid => {
            const provider = ACTIVE_PROVIDERS_METHODS[pid];
            if (provider?.countries) {
              Object.keys(provider.countries).forEach(c => countrySet.add(c));
            }
          });
          const available = Array.from(countrySet).map(code => ({
            code,
            name: COUNTRIES[code]?.split(' ').slice(1).join(' ') || code,
            flag: COUNTRIES[code]?.split(' ')[0] || '',
            currency: getCurrencyForCountry(code)
          }));
          setCountries(available);
        }
      })
      .catch(() => {});
  }, [token]);

  const handleSelectCountry = (code) => {
    setCountry(code);
    // Récupérer les méthodes pour ce pays selon les providers actifs
    const activeProviders = merchant?.activeProviders || [];
    const methods = new Set();
    activeProviders.forEach(pid => {
      const provider = ACTIVE_PROVIDERS_METHODS[pid];
      const countryM = provider?.countries?.[code];
      if (countryM) countryM.forEach(m => methods.add(m));
    });
    setCountryMethods(Array.from(methods).map(id => ({ id, name: METHOD_NAMES[id] || id })));
    setStep(2);
  };

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error('Montant invalide'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/gateway/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': token },
        body: JSON.stringify({ amount: parseFloat(amount), country, method: selectedMethod?.id, phone: phoneNumber, description })
      });
      const data = await res.json();
      if (data.success) setStatus('success');
      else toast.error(data.error || 'Erreur');
    } catch { toast.error('Erreur de connexion'); }
    finally { setLoading(false); }
  };

  const getIcon = (id) => id?.includes('card') || id === 'paypal' ? <CreditCard size={20} /> : <Smartphone size={20} />;

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm max-w-md w-full p-8 text-center">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Paiement initié !</h2>
          <p className="text-gray-500 text-sm">{parseFloat(amount).toLocaleString()} {getCurrencyForCountry(country)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm max-w-lg w-full overflow-hidden">
        <div className="bg-gray-900 text-white p-6">
          <div className="flex items-center gap-2 mb-4"><Shield size={16}/><span className="text-xs font-bold">Paiement sécurisé</span></div>
          <p className="text-3xl font-bold text-center">{parseFloat(amount||0).toLocaleString()} <span className="text-lg text-gray-400">{country ? getCurrencyForCountry(country) : 'XOF'}</span></p>
          <p className="text-sm text-gray-400 text-center mt-1">{description}</p>
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <div>
              <p className="text-sm font-semibold mb-3">Sélectionnez votre pays</p>
              {countries.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {countries.map(c => (
                    <button key={c.code} onClick={() => handleSelectCountry(c.code)}
                      className="p-3 rounded-xl border text-left hover:border-gray-400 transition-all">
                      <span className="text-xl">{c.flag}</span>
                      <p className="text-sm font-medium mt-1">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.currency}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <Globe size={40} className="text-gray-300 mx-auto mb-3"/>
                  <p className="text-sm text-gray-500">Aucun moyen de paiement</p>
                  <p className="text-xs text-gray-400">Le marchand n'a pas configuré ses providers.</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 mb-3 flex items-center gap-1">← Retour</button>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 mb-3">
                <span>{COUNTRIES[country]?.split(' ')[0]}</span>
                <span className="text-sm font-semibold">{COUNTRIES[country]?.split(' ').slice(1).join(' ')}</span>
              </div>
              <p className="text-sm font-semibold mb-3">Choisissez votre mode de paiement</p>
              <div className="space-y-2">
                {countryMethods.map(m => (
                  <button key={m.id} onClick={() => handleSelectMethod(m)}
                    className="w-full p-4 rounded-xl border flex items-center gap-3 hover:border-gray-400 transition-all">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">{getIcon(m.id)}</div>
                    <span className="flex-1 text-sm font-semibold text-left">{m.name}</span>
                    <ChevronRight size={16} className="text-gray-300"/>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && selectedMethod && (
            <div>
              <button onClick={() => setStep(2)} className="text-sm text-gray-500 mb-3 flex items-center gap-1">← Retour</button>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 mb-4">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">{getIcon(selectedMethod.id)}</div>
                <div>
                  <p className="text-sm font-semibold">{selectedMethod.name}</p>
                  <p className="text-xs text-gray-500">{COUNTRIES[country]}</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-1.5 block">Numéro de téléphone</label>
                  <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none" required/>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-gray-900 text-white font-semibold py-4 rounded-xl hover:bg-gray-800 disabled:opacity-50 text-lg">
                  {loading ? 'Traitement...' : `Payer ${parseFloat(amount||0).toLocaleString()} ${country ? getCurrencyForCountry(country) : 'XOF'}`}
                </button>
              </form>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1 pt-2">
            <Lock size={11}/> Paiement sécurisé
          </p>
        </div>
      </div>
    </div>
  );
}