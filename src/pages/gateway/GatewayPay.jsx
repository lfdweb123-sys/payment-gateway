import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Shield, Lock, Smartphone, CreditCard, ChevronRight, CheckCircle2, Globe, ArrowLeft } from 'lucide-react';
import { getMethodsForCountry, getAllCountries } from '../../services/countryMethods';
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS = {
  paymentDesign: 'modern',
  primaryColor: '#f97316',
  logo: '',
  companyName: '',
  redirectUrl: '',
  defaultCurrency: 'XOF',
};

// Charge les paramètres depuis Firestore (même doc que GatewaySettings)
async function loadGatewaySettings() {
  try {
    const snap = await getDoc(doc(db, 'gateway_merchants', 'settings'));
    if (snap.exists()) return { ...DEFAULT_SETTINGS, ...snap.data() };
  } catch (e) {
    console.error('Erreur chargement paramètres gateway:', e);
  }
  return DEFAULT_SETTINGS;
}

function getMethodIcon(methodId, size = 22) {
  if (methodId?.includes('card') || methodId === 'paypal') return <CreditCard size={size} />;
  return <Smartphone size={size} />;
}

// Thèmes selon paymentDesign
function getTheme(design, primaryColor) {
  switch (design) {
    case 'classic': return { header: 'bg-blue-700', btn: 'bg-blue-600 hover:bg-blue-700', ring: 'focus:ring-blue-400', accent: primaryColor || '#2563eb' };
    case 'bold':    return { header: 'bg-orange-500', btn: 'bg-orange-500 hover:bg-orange-600', ring: 'focus:ring-orange-400', accent: primaryColor || '#f97316' };
    default:        return { header: 'bg-gray-900', btn: 'bg-gray-900 hover:bg-gray-800', ring: 'focus:ring-gray-400', accent: primaryColor || '#111827' };
  }
}

export default function GatewayPay() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const amountParam = searchParams.get('amount');
  const description = searchParams.get('desc') || 'Paiement en ligne';

  const [step, setStep] = useState(1);
  const [country, setCountry] = useState(null);
  const [countryData, setCountryData] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState(amountParam || '5000');
  const [loading, setLoading] = useState(false);
  const [merchantName, setMerchantName] = useState('');
  const [countries, setCountries] = useState([]);
  const [status, setStatus] = useState(null);
  const [gatewaySettings, setGatewaySettings] = useState(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    // Charger les settings Firestore
    loadGatewaySettings().then(s => {
      setGatewaySettings(s);
      setSettingsLoaded(true);
    });

    // Charger les pays disponibles
    const allCountries = getAllCountries();
    const available = allCountries.filter(c => {
      const methods = getMethodsForCountry(c.code);
      return methods?.methods?.length > 0;
    });
    setCountries(available);

    // Nom du marchand via token
    if (token) {
      fetch(`/api/gateway/merchant/${token}`)
        .then(r => r.json())
        .then(data => { if (data.success) setMerchantName(data.name); })
        .catch(() => {});
    }
  }, [token]);

  const theme = getTheme(gatewaySettings.paymentDesign, gatewaySettings.primaryColor);
  const displayName = merchantName || gatewaySettings.companyName || '';

  const handleSelectCountry = (code) => {
    setCountry(code);
    const methods = getMethodsForCountry(code);
    setCountryData(methods);
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
        body: JSON.stringify({
          amount: parseFloat(amount),
          country,
          method: selectedMethod?.id,
          phone: phoneNumber,
          description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        // Redirection si configurée
        if (gatewaySettings.redirectUrl) {
          setTimeout(() => window.location.href = gatewaySettings.redirectUrl, 2500);
        }
      } else {
        toast.error(data.error || 'Une erreur est survenue');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Étape indicatrice
  const steps = [
    { n: 1, label: 'Pays' },
    { n: 2, label: 'Méthode' },
    { n: 3, label: 'Paiement' },
  ];

  if (!settingsLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 max-w-lg w-full p-10 text-center">
          {gatewaySettings.logo && (
            <img src={gatewaySettings.logo} alt="Logo" className="h-10 mx-auto mb-6 object-contain" />
          )}
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Paiement initié !</h2>
          <p className="text-gray-500 mb-6">Suivez les instructions sur votre téléphone pour finaliser.</p>
          <div className="bg-gray-50 rounded-2xl p-5 inline-block w-full">
            <p className="text-sm text-gray-400 mb-1">{description}</p>
            <p className="text-3xl font-bold text-gray-900">
              {parseFloat(amount).toLocaleString()}
              <span className="text-lg text-gray-400 ml-2">{countryData?.currency || gatewaySettings.defaultCurrency}</span>
            </p>
          </div>
          {gatewaySettings.redirectUrl && (
            <p className="text-xs text-gray-400 mt-5">Redirection en cours…</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-md border border-gray-100 max-w-xl w-full overflow-hidden">

        {/* Header */}
        <div className={`${theme.header} text-white px-8 py-7`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 opacity-80">
              <Shield size={15} />
              <span className="text-xs font-semibold tracking-wide uppercase">Paiement sécurisé</span>
            </div>
            {displayName && (
              <div className="flex items-center gap-2">
                {gatewaySettings.logo
                  ? <img src={gatewaySettings.logo} alt="Logo" className="h-6 object-contain brightness-200" />
                  : <span className="text-sm font-semibold opacity-80">{displayName}</span>
                }
              </div>
            )}
          </div>

          <div className="text-center py-2">
            <p className="text-4xl font-bold tracking-tight">
              {parseFloat(amount || 0).toLocaleString()}
              <span className="text-xl font-medium opacity-50 ml-2">
                {countryData?.currency || gatewaySettings.defaultCurrency}
              </span>
            </p>
            <p className="text-sm opacity-60 mt-2">{description}</p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 transition-all ${step >= s.n ? 'opacity-100' : 'opacity-30'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${step > s.n ? 'bg-emerald-400' : step === s.n ? 'bg-white text-gray-900' : 'bg-white/20 text-white'}`}>
                    {step > s.n ? <CheckCircle2 size={14} /> : s.n}
                  </div>
                  <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-px mx-1 ${step > s.n ? 'bg-emerald-400' : 'bg-white/20'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-5">

          {/* ÉTAPE 1 : Pays */}
          {step === 1 && (
            <div>
              <p className="text-base font-semibold text-gray-900 mb-4">Sélectionnez votre pays</p>
              {countries.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1 custom-scroll">
                  {countries.map(c => (
                    <button
                      key={c.code}
                      onClick={() => handleSelectCountry(c.code)}
                      className="p-4 rounded-2xl border border-gray-200 text-left hover:border-gray-400 hover:shadow-sm transition-all group"
                    >
                      <span className="text-3xl">{c.flag}</span>
                      <div className="flex items-start justify-between mt-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{c.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{c.currency}</p>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-700 mt-0.5 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-2xl">
                  <Globe size={44} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-500">Aucun moyen de paiement disponible</p>
                  <p className="text-xs text-gray-400 mt-1">Configurez vos providers dans les paramètres.</p>
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 2 : Méthode */}
          {step === 2 && countryData && (
            <div>
              <button
                onClick={() => { setStep(1); setCountryData(null); setCountry(null); }}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 mb-5 transition-colors"
              >
                <ArrowLeft size={15} /> Changer de pays
              </button>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl mb-5">
                <span className="text-3xl">{countryData.flag}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{countryData.name}</p>
                  <p className="text-xs text-gray-400">Devise : {countryData.currency}</p>
                </div>
              </div>

              <p className="text-base font-semibold text-gray-900 mb-4">Choisissez votre mode de paiement</p>

              {countryData.methods?.length > 0 ? (
                <div className="space-y-2.5">
                  {countryData.methods
                    .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
                    .filter(m => m.id !== 'mobile_money')
                    .map(method => (
                      <button
                        key={method.id}
                        onClick={() => handleSelectMethod(method)}
                        className="w-full p-4 rounded-2xl border border-gray-200 flex items-center gap-4 hover:border-gray-400 hover:shadow-sm transition-all text-left group"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-gray-200 transition-colors flex-shrink-0">
                          {getMethodIcon(method.id, 20)}
                        </div>
                        <span className="flex-1 text-sm font-semibold text-gray-900">{method.name}</span>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
                      </button>
                    ))
                  }
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-2xl text-sm text-gray-400">
                  Aucune méthode disponible pour ce pays
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 3 : Paiement */}
          {step === 3 && selectedMethod && (
            <div>
              <button
                onClick={() => { setStep(2); setSelectedMethod(null); }}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 mb-5 transition-colors"
              >
                <ArrowLeft size={15} /> Changer de méthode
              </button>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: theme.accent }}>
                  {getMethodIcon(selectedMethod.id, 20)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedMethod.name}</p>
                  <p className="text-xs text-gray-400">{countryData?.flag} {countryData?.name}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className={`w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:ring-2 ${theme.ring} outline-none transition-shadow`}
                    placeholder="Ex: 229 97 00 00 00"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${theme.btn} text-white font-bold py-4 rounded-xl disabled:opacity-50 text-base transition-all active:scale-[0.98] shadow-sm`}
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Traitement en cours…
                      </span>
                    : `Payer ${parseFloat(amount || 0).toLocaleString()} ${countryData?.currency || gatewaySettings.defaultCurrency}`
                  }
                </button>
              </form>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-gray-300">
            <Lock size={11} />
            <span>Paiement chiffré et sécurisé</span>
          </div>
        </div>
      </div>
    </div>
  );
}