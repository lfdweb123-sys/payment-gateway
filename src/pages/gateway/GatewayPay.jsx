import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Shield, Lock, Smartphone, CreditCard, ChevronRight, CheckCircle2, Globe, ArrowLeft } from 'lucide-react';
import { getMethodsForCountryWithProviders, getCountriesForProviders } from '../../services/countryMethods';
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS = {
  paymentDesign: 'modern', primaryColor: '#f97316', logo: '', companyName: '', redirectUrl: '', defaultCurrency: 'XOF',
};

const COUNTRY_PREFIXES = {
  bj: '229', ci: '225', tg: '228', sn: '221', bf: '226', ml: '223', ne: '227', gn: '224',
  cm: '237', ga: '241', cd: '243', cg: '242', ng: '234', gh: '233', ke: '254', ug: '256',
  tz: '255', rw: '250', za: '27', fr: '33', be: '32', de: '49', nl: '31', gb: '44', us: '1'
};

function TopLoadingBar({ visible }) {
  if (!visible) return null;
  return (<div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent overflow-hidden"><div className="h-full bg-gray-900 rounded-full" style={{ animation: 'topbar 1.6s ease-in-out infinite' }} /><style>{`@keyframes topbar { 0%{width:0;margin-left:0} 50%{width:65%;margin-left:18%} 100%{width:0;margin-left:100%} }`}</style></div>);
}

function getMethodIcon(methodId, size = 20) {
  const cardTypes = ['card','paypal','apple_pay','google_pay','chipper_wallet','bank_transfer','ideal','bancontact','giropay','sofort'];
  return cardTypes.includes(methodId) ? <CreditCard size={size} /> : <Smartphone size={size} />;
}

function maskPhone(phone) {
  if (!phone || phone.length < 8) return phone;
  return phone.substring(0, 3) + '••••' + phone.substring(phone.length - 3);
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
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [amount] = useState(amountParam || '5000');
  const [loading, setLoading] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [countries, setCountries] = useState([]);
  const [status, setStatus] = useState(null);
  const [pollMsg, setPollMsg] = useState('Paiement en cours…');
  const [fetchingMerchant, setFetchingMerchant] = useState(true);
  const [gatewaySettings, setGatewaySettings] = useState(DEFAULT_SETTINGS);
  const [savedPhones, setSavedPhones] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!token) { setFetchingMerchant(false); return; }
    getDoc(doc(db, 'gateway_settings', 'config')).then(snap => { if (snap.exists()) setGatewaySettings(prev => ({ ...prev, ...snap.data() })); }).catch(() => {});
    fetch(`/api/gateway/merchant/${token}`).then(r => r.json()).then(data => {
      if (data.success) { setMerchant(data); setCountries(getCountriesForProviders(data.activeProviders || [])); }
    }).catch(() => toast.error('Impossible de charger le marchand')).finally(() => setFetchingMerchant(false));
    
    try { const saved = localStorage.getItem('gw_saved_phones'); if (saved) setSavedPhones(JSON.parse(saved)); } catch {}
  }, [token]);

  const handleSelectCountry = (code) => {
    setCountry(code);
    setCountryData(getMethodsForCountryWithProviders(code, merchant?.activeProviders || []));
    setPhoneSuffix('');
    setStep(2);
  };

  const getFullPhoneNumber = () => {
    const prefix = COUNTRY_PREFIXES[country] || '';
    return prefix ? `${prefix} ${phoneSuffix}`.trim() : phoneSuffix;
  };

  const savePhoneNumber = (phone) => {
    if (!phone) return;
    const exists = savedPhones.find(p => p.number === phone);
    if (!exists) {
      const updated = [{ number: phone, country }, ...savedPhones].slice(0, 5);
      setSavedPhones(updated);
      localStorage.setItem('gw_saved_phones', JSON.stringify(updated));
    }
  };

  const pollStatus = (id) => {
    setStatus('pending');
    const msgs = ['Paiement en cours…', 'En attente de confirmation…', 'Vérification en cours…', 'Presque terminé…'];
    let msgIdx = 0;
    const msgInterval = setInterval(() => { msgIdx = (msgIdx + 1) % msgs.length; setPollMsg(msgs[msgIdx]); }, 3500);
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 24) { clearInterval(interval); clearInterval(msgInterval); setStatus('failed'); return; }
      try {
        const r = await fetch(`/api/gateway/verify/${id}`, { headers: { 'x-api-key': token } });
        const d = await r.json();
        if (d.status === 'completed') { clearInterval(interval); clearInterval(msgInterval); setStatus('completed'); }
        else if (d.status === 'failed') { clearInterval(interval); clearInterval(msgInterval); setStatus('failed'); }
      } catch {}
    }, 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error('Montant invalide'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/gateway/pay', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': token },
        body: JSON.stringify({ amount: parseFloat(amount), country, method: selectedMethod?.id, phone: getFullPhoneNumber(), description }),
      });
      const data = await res.json();
      if (data.success) { setLoading(false); savePhoneNumber(getFullPhoneNumber()); pollStatus(data.transactionId); }
      else { toast.error(data.error || 'Une erreur est survenue'); setLoading(false); }
    } catch { toast.error('Erreur de connexion'); setLoading(false); }
  };

  useEffect(() => {
    if (status === 'completed' && gatewaySettings.redirectUrl) {
      const timer = setTimeout(() => { window.location.href = gatewaySettings.redirectUrl; }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, gatewaySettings.redirectUrl]);

  const theme = {
    header: gatewaySettings.paymentDesign === 'bold' ? 'bg-orange-500' : gatewaySettings.paymentDesign === 'classic' ? 'bg-blue-700' : 'bg-gray-900',
    btn: gatewaySettings.paymentDesign === 'bold' ? 'bg-orange-500 hover:bg-orange-600' : gatewaySettings.paymentDesign === 'classic' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800',
  };

  const filteredSuggestions = savedPhones.filter(p => p.country === country);

  if (status === 'pending') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm border max-w-md w-full p-10 text-center">
        <div className="relative w-20 h-20 mx-auto mb-6"><div className="w-20 h-20 rounded-full border-4 border-gray-100" /><div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-gray-900 border-r-transparent border-b-transparent border-l-transparent animate-spin" /></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{pollMsg}</h2>
        <p className="text-gray-400 text-sm mb-6">Veuillez confirmer le paiement sur votre téléphone.</p>
        <div className="bg-gray-50 rounded-2xl p-5"><p className="text-sm text-gray-400 mb-1">{description}</p><p className="text-3xl font-bold text-gray-900">{parseFloat(amount).toLocaleString()} <span className="text-lg text-gray-400 ml-2">{countryData?.currency || gatewaySettings.defaultCurrency}</span></p></div>
        <p className="text-xs text-gray-300 mt-4">Ne fermez pas cette page</p>
      </div>
    </div>
  );

  if (status === 'completed') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm border max-w-md w-full p-10 text-center">
        {gatewaySettings.logo && <img src={gatewaySettings.logo} alt="" className="h-10 mx-auto mb-4 object-contain" />}
        <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Paiement réussi !</h2>
        <p className="text-gray-400 text-sm mb-6">Votre transaction a été confirmée.</p>
        <div className="bg-emerald-50 rounded-2xl p-5"><p className="text-sm text-emerald-600 mb-1">{description}</p><p className="text-3xl font-bold text-gray-900">{parseFloat(amount).toLocaleString()} <span className="text-lg text-gray-400 ml-2">{countryData?.currency || gatewaySettings.defaultCurrency}</span></p></div>
        {gatewaySettings.redirectUrl && <p className="text-xs text-gray-400 mt-4">Redirection en cours…</p>}
      </div>
    </div>
  );

  if (status === 'failed') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm border max-w-md w-full p-10 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Paiement échoué</h2>
        <p className="text-gray-400 text-sm mb-6">La transaction n'a pas pu être finalisée.</p>
        <button onClick={() => { setStatus(null); setStep(3); }} className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl">Réessayer</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <TopLoadingBar visible={loading} />
      <div className="bg-white rounded-3xl shadow-sm border w-full max-w-xl overflow-hidden">
        <div className={`${theme.header} text-white px-8 py-7`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 opacity-60"><Shield size={14} /><span className="text-xs font-semibold tracking-widest uppercase">Paiement sécurisé</span></div>
            <div className="flex items-center gap-2">{gatewaySettings.logo && <img src={gatewaySettings.logo} alt="" className="h-5 object-contain brightness-200" />}{gatewaySettings.companyName || merchant?.name && <span className="text-xs text-gray-400">{gatewaySettings.companyName || merchant?.name}</span>}</div>
          </div>
          <div className="text-center mb-6"><p className="text-4xl font-bold tracking-tight">{parseFloat(amount || 0).toLocaleString()} <span className="text-xl font-normal text-gray-400 ml-2">{countryData?.currency || gatewaySettings.defaultCurrency}</span></p><p className="text-sm text-gray-400 mt-1.5">{description}</p></div>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div>
              <p className="text-base font-semibold text-gray-900 mb-4">Sélectionnez votre pays</p>
              {fetchingMerchant ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" /></div> :
              countries.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {countries.map(c => (
                    <button key={c.code} onClick={() => handleSelectCountry(c.code)} className="p-4 rounded-2xl border border-gray-200 text-left hover:border-gray-500 hover:shadow-sm transition-all group">
                      <span className="text-3xl leading-none">{c.flag}</span>
                      <div className="flex items-start justify-between mt-3"><div><p className="text-sm font-semibold text-gray-900 leading-tight">{c.name}</p><p className="text-xs text-gray-400 mt-0.5">{c.currency}</p></div><ChevronRight size={14} className="text-gray-300 group-hover:text-gray-700 mt-0.5 shrink-0" /></div>
                    </button>
                  ))}
                </div>
              ) : <div className="text-center py-16 bg-gray-50 rounded-2xl"><Globe size={40} className="mx-auto mb-3 text-gray-300" /><p className="text-sm font-semibold text-gray-500">Aucun moyen de paiement disponible</p></div>}
            </div>
          )}

          {step === 2 && countryData && (
            <div>
              <button onClick={() => { setStep(1); setCountryData(null); setCountry(null); }} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 mb-5"><ArrowLeft size={14} /> Changer de pays</button>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl mb-5"><span className="text-3xl leading-none">{countryData.flag}</span><div><p className="text-sm font-semibold text-gray-900">{countryData.name}</p><p className="text-xs text-gray-400">Devise : {countryData.currency}</p></div></div>
              <p className="text-base font-semibold text-gray-900 mb-4">Choisissez votre mode de paiement</p>
              {countryData.methods?.length > 0 ? (
                <div className="space-y-2.5">{countryData.methods.map(method => (
                  <button key={method.id} onClick={() => { setSelectedMethod(method); setStep(3); }} className="w-full p-4 rounded-2xl border border-gray-200 flex items-center gap-4 hover:border-gray-500 hover:shadow-sm transition-all text-left group">
                    <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-gray-200 transition-colors shrink-0">{getMethodIcon(method.id)}</div>
                    <span className="flex-1 text-sm font-semibold text-gray-900">{method.name}</span>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
                  </button>
                ))}</div>
              ) : <div className="text-center py-10 bg-gray-50 rounded-2xl text-sm text-gray-400">Aucune méthode disponible</div>}
            </div>
          )}

          {step === 3 && selectedMethod && (
            <div>
              <button onClick={() => { setStep(2); setSelectedMethod(null); setPhoneSuffix(''); }} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 mb-5"><ArrowLeft size={14} /> Changer de méthode</button>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-6"><div className="w-11 h-11 bg-gray-900 rounded-xl flex items-center justify-center text-white shrink-0">{getMethodIcon(selectedMethod.id)}</div><div><p className="text-sm font-semibold text-gray-900">{selectedMethod.name}</p><p className="text-xs text-gray-400">{countryData?.flag} {countryData?.name}</p></div></div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Numéro de téléphone</label>
                  <div className="relative">
                    <input 
                      type="tel" 
                      value={`${COUNTRY_PREFIXES[country] || ''} ${phoneSuffix}`}
                      onChange={e => {
                        const prefix = COUNTRY_PREFIXES[country] || '';
                        const val = e.target.value;
                        if (prefix && !val.startsWith(prefix)) return;
                        const suffix = prefix ? val.slice(prefix.length).trim() : val;
                        setPhoneSuffix(suffix);
                        setShowSuggestions(suffix.length === 0);
                      }} 
                      onFocus={() => setShowSuggestions(phoneSuffix.length === 0)}
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none transition-shadow font-mono"
                      required 
                    />
                  </div>
                  {showSuggestions && filteredSuggestions.length > 0 && phoneSuffix.length === 0 && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs text-gray-400">Numéros déjà utilisés :</p>
                      {filteredSuggestions.map((p, i) => (
                        <button key={i} type="button" onClick={() => { 
                          const prefix = COUNTRY_PREFIXES[country] || '';
                          const savedPhone = p.number;
                          const savedSuffix = prefix ? savedPhone.replace(prefix + ' ', '').replace(prefix, '') : savedPhone;
                          setPhoneSuffix(savedSuffix); 
                          setShowSuggestions(false); 
                        }}
                          className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors flex items-center gap-2">
                          <Smartphone size={14} className="text-gray-400" />
                          <span className="font-mono">{maskPhone(p.number)}</span>
                          <span className="text-xs text-gray-400 ml-auto">Utilisé</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit" disabled={loading} className={`w-full ${theme.btn} text-white font-bold py-4 rounded-xl disabled:opacity-50 text-base transition-all active:scale-[0.98]`}>
                  {loading ? (<span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Traitement en cours…</span>) : `Payer ${parseFloat(amount || 0).toLocaleString()} ${countryData?.currency || gatewaySettings.defaultCurrency}`}
                </button>
              </form>
            </div>
          )}

          <p className="text-xs text-gray-300 text-center flex items-center justify-center gap-1.5 pt-6"><Lock size={11} /> Paiement chiffré et sécurisé</p>
        </div>
      </div>
    </div>
  );
}