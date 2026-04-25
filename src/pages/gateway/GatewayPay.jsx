import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Lock, Smartphone, CreditCard, ChevronRight, CheckCircle, Globe, ArrowRight } from 'lucide-react';
import { getMethodsForCountry, getAllCountries } from '../../services/countryMethods';
import toast from 'react-hot-toast';

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
  const [amount, setAmount] = useState(amountParam || '');
  const [loading, setLoading] = useState(false);
  const [merchantName, setMerchantName] = useState('');
  const [countries, setCountries] = useState([]);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setCountries(getAllCountries());
    if (token) {
      fetch(`/api/gateway/merchant/${token}`)
        .then(r => r.json())
        .then(data => { if (data.success) setMerchantName(data.name); })
        .catch(() => {});
    }
  }, [token]);

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
        body: JSON.stringify({ amount: parseFloat(amount), country, method: selectedMethod?.id, phone: phoneNumber, description })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (e) { toast.error('Erreur de connexion'); }
    finally { setLoading(false); }
  };

  const getMethodIcon = (methodId) => {
    if (methodId?.includes('card') || methodId === 'paypal') return <CreditCard size={22} />;
    return <Smartphone size={22} />;
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Paiement initié !</h2>
          <p className="text-gray-500 text-sm mb-4">Suivez les instructions sur votre téléphone pour finaliser le paiement.</p>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-2xl font-bold text-gray-900">{parseFloat(amount).toLocaleString()} {countryData?.currency || 'XOF'}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield size={18} />
              <span className="text-sm font-bold">Paiement sécurisé</span>
            </div>
            {merchantName && <span className="text-xs text-gray-400">{merchantName}</span>}
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{parseFloat(amount || 0).toLocaleString()} <span className="text-lg text-gray-400">{countryData?.currency || 'XOF'}</span></p>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          </div>
          {/* Étapes */}
          <div className="flex items-center justify-center gap-2 mt-5">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-8 h-1 rounded-full ${step >= s ? 'bg-white' : 'bg-gray-600'}`} />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Étape 1 : Pays */}
          {step === 1 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Sélectionnez votre pays</p>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {countries.filter(c => getMethodsForCountry(c.code)?.methods?.length > 0).map(c => (
                  <button key={c.code} onClick={() => handleSelectCountry(c.code)}
                    className="p-4 rounded-xl border border-gray-200 text-left hover:border-gray-400 hover:shadow-sm transition-all group">
                    <span className="text-2xl">{c.flag}</span>
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.currency}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900" />
                    </div>
                  </button>
                ))}
                {countries.filter(c => getMethodsForCountry(c.code)?.methods?.length > 0).length === 0 && (
                  <div className="col-span-2 text-center py-8 text-sm text-gray-400">
                    <Globe size={32} className="mx-auto mb-2 text-gray-300" />
                    Aucun moyen de paiement disponible pour le moment
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Étape 2 : Méthode */}
          {step === 2 && countryData && (
            <div>
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-900 mb-3 flex items-center gap-1">
                ← Retour
              </button>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-3">
                <span className="text-2xl">{countryData.flag}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{countryData.name}</p>
                  <p className="text-xs text-gray-500">Devise : {countryData.currency}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Choisissez votre mode de paiement</p>
              {countryData.methods?.length > 0 ? (
                <div className="space-y-2">
                  {countryData.methods.map(method => (
                    <button key={method.id} onClick={() => handleSelectMethod(method)}
                      className="w-full p-4 rounded-xl border border-gray-200 flex items-center gap-4 hover:border-gray-400 hover:shadow-sm transition-all text-left group">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 group-hover:bg-gray-200">
                        {getMethodIcon(method.id)}
                      </div>
                      <span className="flex-1 text-sm font-semibold text-gray-900">{method.name}</span>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-400">
                  <Smartphone size={32} className="mx-auto mb-2 text-gray-300" />
                  Aucune méthode disponible pour ce pays
                </div>
              )}
            </div>
          )}

          {/* Étape 3 : Paiement */}
          {step === 3 && selectedMethod && (
            <div>
              <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-900 mb-3 flex items-center gap-1">
                ← Retour
              </button>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-4">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                  {getMethodIcon(selectedMethod.id)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedMethod.name}</p>
                  <p className="text-xs text-gray-500">{countryData?.flag} {countryData?.name}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Montant ({countryData?.currency || 'XOF'})</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg font-bold text-center focus:ring-2 focus:ring-gray-900 outline-none" />
                </div>
                {selectedMethod.id !== 'paypal' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Numéro de téléphone</label>
                    <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none"
                      placeholder="Ex: 229 97 00 00 00" required />
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full bg-gray-900 text-white font-semibold py-4 rounded-xl hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2 text-lg">
                  {loading ? 'Traitement...' : <>Payer {parseFloat(amount || 0).toLocaleString()} {countryData?.currency || 'XOF'} <ArrowRight size={20} /></>}
                </button>
              </form>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1 pt-2">
            <Lock size={11} /> Paiement sécurisé • 1% commission
          </p>
        </div>
      </div>
    </div>
  );
}