import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Shield, Lock, Smartphone, CreditCard, ChevronRight, CheckCircle2, Globe, ArrowLeft, Sparkles, Zap } from 'lucide-react';
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
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: 2, background: 'transparent', overflow: 'hidden' }}>
      <div style={{ height: '100%', background: 'linear-gradient(90deg,#C8931A,#F5C842,#C8931A)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite' }} />
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

function getMethodIcon(methodId, size = 18) {
  const cardTypes = ['card','paypal','apple_pay','google_pay','chipper_wallet','bank_transfer','ideal','bancontact','giropay','sofort'];
  return cardTypes.includes(methodId)
    ? <CreditCard size={size} style={{ color: 'currentColor' }} />
    : <Smartphone size={size} style={{ color: 'currentColor' }} />;
}

function maskPhone(phone) {
  if (!phone || phone.length < 8) return phone;
  return phone.substring(0, 3) + '••••' + phone.substring(phone.length - 3);
}

/* ── Step indicator ── */
function StepDots({ current, total = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i + 1 === current ? 20 : 6,
          height: 6, borderRadius: 3,
          background: i + 1 <= current ? 'linear-gradient(90deg,#C8931A,#F5C842)' : 'rgba(0,0,0,.12)',
          transition: 'all .3s ease',
        }} />
      ))}
    </div>
  );
}

/* ── Amount display ── */
function AmountDisplay({ amount, currency, description }) {
  const parts = parseFloat(amount || 0).toLocaleString('fr-FR').split(',');
  return (
    <div style={{ textAlign: 'center', padding: '28px 0 20px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>
        Montant à payer
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
        <span style={{ fontSize: 52, fontWeight: 900, color: '#1A1007', letterSpacing: '-.03em', lineHeight: 1, fontFamily: "'DM Sans',sans-serif" }}>
          {parts[0]}
        </span>
        <span style={{ fontSize: 18, fontWeight: 600, color: 'rgba(0,0,0,.3)', marginBottom: 2 }}>{currency}</span>
      </div>
      {description && (
        <p style={{ fontSize: 13, color: 'rgba(0,0,0,.4)', marginTop: 8, fontWeight: 500 }}>{description}</p>
      )}
    </div>
  );
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
    const suffix = phoneSuffix.replace(/\s/g, '');
    return prefix ? `${prefix}${suffix}` : suffix;
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
      const fullPhone = getFullPhoneNumber();
      const res = await fetch('/api/gateway/pay', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': token },
        body: JSON.stringify({ amount: parseFloat(amount), country, method: selectedMethod?.id, phone: fullPhone, description }),
      });
      const data = await res.json();
      if (data.success) { setLoading(false); savePhoneNumber(fullPhone); pollStatus(data.transactionId); }
      else { toast.error(data.error || 'Une erreur est survenue'); setLoading(false); }
    } catch { toast.error('Erreur de connexion'); setLoading(false); }
  };

  useEffect(() => {
    if (status === 'completed' && gatewaySettings.redirectUrl) {
      const timer = setTimeout(() => { window.location.href = gatewaySettings.redirectUrl; }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, gatewaySettings.redirectUrl]);

  const filteredSuggestions = savedPhones.filter(p => p.country === country);
  const currency = countryData?.currency || gatewaySettings.defaultCurrency;

  /* ── Shared styles ── */
  const S = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(145deg,#F7F4EF 0%,#FAF8F4 60%,#F2EEE8 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: "'DM Sans','Plus Jakarta Sans',sans-serif",
    },
    card: {
      width: '100%', maxWidth: 460,
      background: '#FFFFFF',
      border: '1px solid rgba(0,0,0,.08)',
      borderRadius: 28,
      backdropFilter: 'blur(24px)',
      overflow: 'hidden',
      boxShadow: '0 24px 64px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.06)',
    },
    header: {
      background: 'linear-gradient(160deg,#FBF7F0 0%,#F5EFE4 100%)',
      borderBottom: '1px solid rgba(0,0,0,.07)',
      padding: '24px 28px 0',
    },
    body: { padding: '28px' },
    label: { display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(0,0,0,.35)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 },
    input: {
      width: '100%', padding: '14px 16px',
      background: '#F7F5F2',
      border: '1px solid rgba(0,0,0,.1)',
      borderRadius: 14, color: '#111',
      fontSize: 15, fontFamily: "'DM Mono','Courier New',monospace",
      outline: 'none', transition: 'border-color .2s, background .2s',
    },
    backBtn: {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,.35)',
      background: 'none', border: 'none', cursor: 'pointer',
      padding: '0 0 20px', transition: 'color .2s', fontFamily: 'inherit',
    },
    submitBtn: {
      width: '100%', padding: '16px',
      background: 'linear-gradient(135deg,#C8931A,#F5C842)',
      border: 'none', borderRadius: 14, cursor: 'pointer',
      fontSize: 15, fontWeight: 800, color: '#0A0A0C',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'all .2s', fontFamily: 'inherit',
      boxShadow: '0 8px 32px rgba(200,147,26,.4)',
    },
    securityRow: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      marginTop: 20, color: 'rgba(0,0,0,.25)', fontSize: 11, fontWeight: 600,
    },
  };

  /* ── STATUS: PENDING ── */
  if (status === 'pending') return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.95)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{ ...S.card, textAlign: 'center', padding: '52px 32px' }}>
        <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 28px' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(200,147,26,.2)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#C8931A', animation: 'spin .9s linear infinite' }} />
          <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'rgba(200,147,26,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone size={22} style={{ color: '#C8931A' }} />
          </div>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111', marginBottom: 8, letterSpacing: '-.02em' }}>{pollMsg}</h2>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,.4)', marginBottom: 28, lineHeight: 1.6 }}>Confirmez le paiement sur votre téléphone</p>
        <div style={{ background: '#F7F5F2', border: '1px solid rgba(0,0,0,.08)', borderRadius: 16, padding: '20px 24px' }}>
          <p style={{ fontSize: 12, color: 'rgba(0,0,0,.4)', marginBottom: 6 }}>{description}</p>
          <p style={{ fontSize: 32, fontWeight: 900, color: '#111', letterSpacing: '-.02em' }}>
            {parseFloat(amount).toLocaleString('fr-FR')} <span style={{ fontSize: 16, color: 'rgba(0,0,0,.3)', fontWeight: 500 }}>{currency}</span>
          </p>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(0,0,0,.25)', marginTop: 20 }}>Ne fermez pas cette page</p>
      </div>
    </div>
  );

  /* ── STATUS: COMPLETED ── */
  if (status === 'completed') return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ ...S.card, textAlign: 'center', padding: '52px 32px', animation: 'fadeUp .5s ease both' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(16,185,129,.2),rgba(16,185,129,.05))', border: '1px solid rgba(16,185,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <CheckCircle2 size={32} style={{ color: '#10B981' }} />
        </div>
        {gatewaySettings.logo && <img src={gatewaySettings.logo} alt="" style={{ height: 28, margin: '0 auto 16px', display: 'block', objectFit: 'contain' }} />}
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#111', marginBottom: 8, letterSpacing: '-.02em' }}>Paiement réussi !</h2>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,.4)', marginBottom: 28 }}>Votre transaction a été confirmée avec succès.</p>
        <div style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 16, padding: '20px 24px' }}>
          <p style={{ fontSize: 12, color: 'rgba(16,185,129,.7)', marginBottom: 6 }}>{description}</p>
          <p style={{ fontSize: 32, fontWeight: 900, color: '#111', letterSpacing: '-.02em' }}>
            {parseFloat(amount).toLocaleString('fr-FR')} <span style={{ fontSize: 16, color: 'rgba(0,0,0,.3)', fontWeight: 500 }}>{currency}</span>
          </p>
        </div>
        {gatewaySettings.redirectUrl && <p style={{ fontSize: 12, color: 'rgba(0,0,0,.3)', marginTop: 20 }}>Redirection en cours…</p>}
      </div>
    </div>
  );

  /* ── STATUS: FAILED ── */
  if (status === 'failed') return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>
      <div style={{ ...S.card, textAlign: 'center', padding: '52px 32px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#111', marginBottom: 8, letterSpacing: '-.02em' }}>Paiement échoué</h2>
        <p style={{ fontSize: 14, color: 'rgba(0,0,0,.4)', marginBottom: 32 }}>La transaction n'a pas pu être finalisée.</p>
        <button onClick={() => { setStatus(null); setStep(3); }} style={{ ...S.submitBtn, marginBottom: 0 }}>
          Réessayer
        </button>
      </div>
    </div>
  );

  /* ── MAIN FLOW ── */
  return (
    <div style={S.page}>
      <TopLoadingBar visible={loading} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .pay-country:hover { background: #FFF8F0 !important; border-color: rgba(200,147,26,.5) !important; transform: translateY(-1px); }
        .pay-method:hover  { background: #FFF8F0 !important; border-color: rgba(200,147,26,.5) !important; }
        .pay-input:focus   { border-color: rgba(200,147,26,.6) !important; background: #fff !important; }
        .pay-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(200,147,26,.55) !important; }
        .pay-submit:disabled { opacity: .55; cursor: not-allowed; }
        .pay-back:hover    { color: rgba(0,0,0,.7) !important; }
        .pay-suggestion:hover { background: #FFF3E4 !important; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={S.card}>

        {/* ── HEADER ── */}
        <div style={S.header}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={12} style={{ color: '#B07D10' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#B07D10', textTransform: 'uppercase', letterSpacing: '.1em' }}>Paiement sécurisé</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {gatewaySettings.logo && <img src={gatewaySettings.logo} alt="" style={{ height: 18, objectFit: 'contain', opacity: .7 }} />}
              {(gatewaySettings.companyName || merchant?.name) && (
                <span style={{ fontSize: 11, color: 'rgba(0,0,0,.4)', fontWeight: 600 }}>
                  {gatewaySettings.companyName || merchant?.name}
                </span>
              )}
            </div>
          </div>

          {/* Amount */}
          <AmountDisplay amount={amount} currency={currency} description={description} />

          {/* Step dots */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 22, borderTop: '1px solid rgba(0,0,0,.07)', paddingTop: 16 }}>
            <StepDots current={step} total={3} />
            <span style={{ fontSize: 11, color: 'rgba(0,0,0,.3)', fontWeight: 600 }}>
              Étape {step} / 3
            </span>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={S.body}>

          {/* ── STEP 1 : Country ── */}
          {step === 1 && (
            <div style={{ animation: 'fadeUp .35s ease both' }}>
              <p style={S.label}>Votre pays</p>
              {fetchingMerchant ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#C8931A', animation: 'spin .8s linear infinite' }} />
                </div>
              ) : countries.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {countries.map(c => (
                    <button key={c.code} onClick={() => handleSelectCountry(c.code)}
                      className="pay-country"
                      style={{
                        padding: '14px 14px', borderRadius: 14,
                        background: '#FAFAF8',
                        border: '1px solid rgba(0,0,0,.08)',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all .2s', fontFamily: 'inherit',
                      }}>
                      <span style={{ fontSize: 26, lineHeight: 1, display: 'block', marginBottom: 8 }}>{c.flag}</span>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>{c.name}</p>
                      <p style={{ fontSize: 11, color: 'rgba(0,0,0,.35)', marginTop: 2 }}>{c.currency}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(0,0,0,.25)' }}>
                  <Globe size={36} style={{ margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,.4)' }}>Aucun moyen de paiement disponible</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2 : Method ── */}
          {step === 2 && countryData && (
            <div style={{ animation: 'fadeUp .35s ease both' }}>
              <button className="pay-back" onClick={() => { setStep(1); setCountryData(null); setCountry(null); }} style={S.backBtn}>
                <ArrowLeft size={14} /> Changer de pays
              </button>

              {/* Country pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#F7F5F2', border: '1px solid rgba(0,0,0,.08)', borderRadius: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 22 }}>{countryData.flag}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{countryData.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(0,0,0,.35)' }}>{countryData.currency}</p>
                </div>
              </div>

              <p style={S.label}>Mode de paiement</p>
              {countryData.methods?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {countryData.methods.map(method => (
                    <button key={method.id} onClick={() => { setSelectedMethod(method); setStep(3); }}
                      className="pay-method"
                      style={{
                        padding: '14px 16px', borderRadius: 14,
                        background: '#FAFAF8',
                        border: '1px solid rgba(0,0,0,.08)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                        transition: 'all .2s', fontFamily: 'inherit', textAlign: 'left',
                      }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(200,147,26,.15)', border: '1px solid rgba(200,147,26,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C8931A', flexShrink: 0 }}>
                        {getMethodIcon(method.id)}
                      </div>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#111' }}>{method.name}</span>
                      <ChevronRight size={15} style={{ color: 'rgba(0,0,0,.25)' }} />
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(0,0,0,.3)' }}>
                  <p style={{ fontSize: 13 }}>Aucune méthode disponible</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3 : Phone + Submit ── */}
          {step === 3 && selectedMethod && (
            <div style={{ animation: 'fadeUp .35s ease both' }}>
              <button className="pay-back" onClick={() => { setStep(2); setSelectedMethod(null); setPhoneSuffix(''); }} style={S.backBtn}>
                <ArrowLeft size={14} /> Changer de méthode
              </button>

              {/* Method pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#F7F5F2', border: '1px solid rgba(0,0,0,.08)', borderRadius: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(200,147,26,.15)', border: '1px solid rgba(200,147,26,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C8931A', flexShrink: 0 }}>
                  {getMethodIcon(selectedMethod.id)}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{selectedMethod.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(0,0,0,.35)' }}>{countryData?.flag} {countryData?.name}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Numéro de téléphone</label>
                  <input
                    type="tel"
                    className="pay-input"
                    style={S.input}
                    value={phoneSuffix ? `${COUNTRY_PREFIXES[country] || ''} ${phoneSuffix}` : COUNTRY_PREFIXES[country] || ''}
                    onChange={e => {
                      const prefix = COUNTRY_PREFIXES[country] || '';
                      const val = e.target.value;
                      if (prefix && !val.startsWith(prefix)) return;
                      const suffix = prefix ? val.slice(prefix.length).trim() : val;
                      setPhoneSuffix(suffix);
                      setShowSuggestions(suffix.length === 0);
                    }}
                    onFocus={() => setShowSuggestions(phoneSuffix.length === 0)}
                    placeholder={COUNTRY_PREFIXES[country] ? `${COUNTRY_PREFIXES[country]} 97000000` : '97000000'}
                    required
                  />

                  {showSuggestions && filteredSuggestions.length > 0 && phoneSuffix.length === 0 && (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ fontSize: 10, color: 'rgba(0,0,0,.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Numéros récents</p>
                      {filteredSuggestions.map((p, i) => {
                        const prefix = COUNTRY_PREFIXES[country] || '';
                        const savedSuffix = prefix ? p.number.replace(prefix, '') : p.number;
                        return (
                          <button key={i} type="button"
                            className="pay-suggestion"
                            onClick={() => { setPhoneSuffix(savedSuffix); setShowSuggestions(false); }}
                            style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: '#F7F5F2', border: '1px solid rgba(0,0,0,.07)', borderRadius: 10, marginBottom: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background .15s', fontFamily: 'inherit' }}>
                            <Smartphone size={13} style={{ color: 'rgba(0,0,0,.35)' }} />
                            <span style={{ fontSize: 13, color: 'rgba(0,0,0,.55)', fontFamily: "'DM Mono',monospace" }}>{maskPhone(p.number)}</span>
                            <span style={{ fontSize: 10, color: 'rgba(0,0,0,.3)', marginLeft: 'auto' }}>Utiliser</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading} className="pay-submit" style={S.submitBtn}>
                  {loading ? (
                    <>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(0,0,0,.25)', borderTopColor: '#000', animation: 'spin .7s linear infinite' }} />
                      Traitement en cours…
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Payer {parseFloat(amount || 0).toLocaleString('fr-FR')} {currency}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Security footer */}
          <div style={S.securityRow}>
            <Lock size={10} />
            <span>Paiement chiffré · SSL 256-bit · PCI DSS</span>
          </div>
        </div>
      </div>
    </div>
  );
}