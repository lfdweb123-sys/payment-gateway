import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Lock, Smartphone, CreditCard, ChevronRight, CheckCircle2, Globe, ArrowLeft } from 'lucide-react';
import { getMethodsForCountryWithProviders, getCountriesForProviders } from '../../services/countryMethods';
import toast from 'react-hot-toast';

function getMethodIcon(methodId, size = 20) {
  const cardTypes = ['card','paypal','apple_pay','google_pay','chipper_wallet','bank_transfer','ideal','bancontact','giropay','sofort'];
  return cardTypes.includes(methodId) ? <CreditCard size={size} /> : <Smartphone size={size} />;
}

export default function GatewayPay() {
  const [searchParams] = useSearchParams();
  const token       = searchParams.get('token');
  const amountParam = searchParams.get('amount');
  const description = searchParams.get('desc') || 'Paiement en ligne';

  const [step, setStep]                     = useState(1);
  const [country, setCountry]               = useState(null);
  const [countryData, setCountryData]       = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [phoneNumber, setPhoneNumber]       = useState('');
  const [amount]                            = useState(amountParam || '5000');
  const [loading, setLoading]               = useState(false);
  const [merchant, setMerchant]             = useState(null);
  const [countries, setCountries]           = useState([]);
  const [status, setStatus]                 = useState(null);
  const [fetchingMerchant, setFetchingMerchant] = useState(true);

  useEffect(() => {
    if (!token) { setFetchingMerchant(false); return; }
    fetch(`/api/gateway/merchant/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setMerchant(data);
          setCountries(getCountriesForProviders(data.activeProviders || []));
        }
      })
      .catch(() => toast.error('Impossible de charger le marchand'))
      .finally(() => setFetchingMerchant(false));
  }, [token]);

  const handleSelectCountry = (code) => {
    setCountry(code);
    setCountryData(getMethodsForCountryWithProviders(code, merchant?.activeProviders || []));
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error('Montant invalide'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/gateway/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': token },
        body: JSON.stringify({ amount: parseFloat(amount), country, method: selectedMethod?.id, phone: phoneNumber, description }),
      });
      const data = await res.json();
      if (data.success) setStatus('success');
      else toast.error(data.error || 'Une erreur est survenue');
    } catch { toast.error('Erreur de connexion'); }
    finally { setLoading(false); }
  };

  // ── Succès ────────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 max-w-md w-full p-10 text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Paiement initié !</h2>
          <p className="text-gray-400 text-sm mb-6">Suivez les instructions sur votre téléphone pour finaliser.</p>
          <div className="bg-gray-50 rounded-2xl p-5">
            <p className="text-sm text-gray-400 mb-1">{description}</p>
            <p className="text-3xl font-bold text-gray-900">
              {parseFloat(amount).toLocaleString()}
              <span className="text-lg text-gray-400 ml-2">{countryData?.currency || 'XOF'}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stepLabels = ['Pays', 'Méthode', 'Paiement'];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full max-w-xl overflow-hidden">

        {/* Header */}
        <div className="bg-gray-900 text-white px-8 py-7">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 opacity-60">
              <Shield size={14} />
              <span className="text-xs font-semibold tracking-widest uppercase">Paiement sécurisé</span>
            </div>
            {merchant?.name && <span className="text-xs text-gray-400">{merchant.name}</span>}
          </div>

          <div className="text-center mb-6">
            <p className="text-4xl font-bold tracking-tight">
              {parseFloat(amount || 0).toLocaleString()}
              <span className="text-xl font-normal text-gray-400 ml-2">{countryData?.currency || 'XOF'}</span>
            </p>
            <p className="text-sm text-gray-400 mt-1.5">{description}</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1">
            {stepLabels.map((label, i) => {
              const n = i + 1;
              const done = step > n, current = step === n;
              return (
                <div key={n} className="flex items-center gap-1">
                  <div className={`flex items-center gap-1.5 transition-opacity ${step >= n ? 'opacity-100' : 'opacity-25'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${done ? 'bg-emerald-400 text-white' : current ? 'bg-white text-gray-900' : 'bg-white/20 text-white'}`}>
                      {done ? '✓' : n}
                    </div>
                    <span className="text-xs hidden sm:inline">{label}</span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className={`w-6 h-px mx-1 ${done ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="p-8">

          {/* ── ÉTAPE 1 : Pays ── */}
          {step === 1 && (
            <div>
              <p className="text-base font-semibold text-gray-900 mb-4">Sélectionnez votre pays</p>
              {fetchingMerchant ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                </div>
              ) : countries.length > 0 ? (
                /* Pas de max-h : tous les pays sont visibles sans scroll */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {countries.map(c => (
                    <button
                      key={c.code}
                      onClick={() => handleSelectCountry(c.code)}
                      className="p-4 rounded-2xl border border-gray-200 text-left hover:border-gray-500 hover:shadow-sm transition-all group"
                    >
                      <span className="text-3xl leading-none">{c.flag}</span>
                      <div className="flex items-start justify-between mt-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{c.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{c.currency}</p>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-700 mt-0.5 shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-2xl">
                  <Globe size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-500">Aucun moyen de paiement disponible</p>
                  <p className="text-xs text-gray-400 mt-1">Le marchand n'a pas encore configuré ses providers.</p>
                </div>
              )}
            </div>
          )}

          {/* ── ÉTAPE 2 : Méthode ── */}
          {step === 2 && countryData && (
            <div>
              <button onClick={() => { setStep(1); setCountryData(null); setCountry(null); }}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 mb-5 transition-colors">
                <ArrowLeft size={14} /> Changer de pays
              </button>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl mb-5">
                <span className="text-3xl leading-none">{countryData.flag}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{countryData.name}</p>
                  <p className="text-xs text-gray-400">Devise : {countryData.currency}</p>
                </div>
              </div>

              <p className="text-base font-semibold text-gray-900 mb-4">Choisissez votre mode de paiement</p>

              {countryData.methods?.length > 0 ? (
                <div className="space-y-2.5">
                  {countryData.methods.map(method => (
                    <button key={method.id} onClick={() => { setSelectedMethod(method); setStep(3); }}
                      className="w-full p-4 rounded-2xl border border-gray-200 flex items-center gap-4 hover:border-gray-500 hover:shadow-sm transition-all text-left group">
                      <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-gray-200 transition-colors shrink-0">
                        {getMethodIcon(method.id)}
                      </div>
                      {/* method.name est une string pure → pas d'erreur React #31 */}
                      <span className="flex-1 text-sm font-semibold text-gray-900">{method.name}</span>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-2xl text-sm text-gray-400">
                  Aucune méthode disponible pour ce pays
                </div>
              )}
            </div>
          )}

          {/* ── ÉTAPE 3 : Paiement ── */}
          {step === 3 && selectedMethod && (
            <div>
              <button onClick={() => { setStep(2); setSelectedMethod(null); }}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 mb-5 transition-colors">
                <ArrowLeft size={14} /> Changer de méthode
              </button>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
                <div className="w-11 h-11 bg-gray-900 rounded-xl flex items-center justify-center text-white shrink-0">
                  {getMethodIcon(selectedMethod.id)}
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
                  <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none transition-shadow"
                    placeholder="Ex: 229 97 00 00 00" required />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl disabled:opacity-50 text-base transition-all active:scale-[0.98]">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Traitement en cours…
                    </span>
                  ) : `Payer ${parseFloat(amount || 0).toLocaleString()} ${countryData?.currency || 'XOF'}`}
                </button>
              </form>
            </div>
          )}

          <p className="text-xs text-gray-300 text-center flex items-center justify-center gap-1.5 pt-6">
            <Lock size={11} /> Paiement chiffré et sécurisé
          </p>
        </div>
      </div>
    </div>
  );
}