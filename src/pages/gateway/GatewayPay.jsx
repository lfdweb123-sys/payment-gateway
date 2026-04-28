import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  Shield, Lock, Smartphone, CreditCard, ChevronRight, CheckCircle2,
  Globe, ArrowLeft, Zap, Mail, ChevronDown, X,
} from 'lucide-react';
import { getMethodsForCountryWithProviders, getCountriesForProviders } from '../../services/countryMethods';
import toast from 'react-hot-toast';
import { validatePhone } from '../../services/phoneValidator';

/* ─── Constantes ───────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  paymentDesign: 'modern', primaryColor: '#f97316', logo: '', companyName: '',
  redirectUrl: '', defaultCurrency: 'XOF', defaultCountry: '',
};

const COUNTRY_PREFIXES = {
  bj:'229',ci:'225',tg:'228',sn:'221',bf:'226',ml:'223',ne:'227',gn:'224',
  cm:'237',ga:'241',cd:'243',cg:'242',ng:'234',gh:'233',ke:'254',ug:'256',
  tz:'255',rw:'250',za:'27',fr:'33',be:'32',de:'49',nl:'31',gb:'44',us:'1'
};

const MOBILE_METHODS = [
  'mtn_money','moov_money','orange_money','free_money','wave_money',
  'celtiis_money','togocom_money','airtel_money','mpesa','afrimoney',
  'wallet','coris','qmoney',
];

const CARD_METHODS = [
  'card','paypal','apple_pay','google_pay','bank_transfer',
  'ideal','bancontact','giropay','sofort','chipper_wallet',
];

/* ─── Devise cible par pays ─────────────────────────────── */
const COUNTRY_TARGET_CURRENCY = {
  bj:'XOF', ci:'XOF', tg:'XOF', sn:'XOF', bf:'XOF', ml:'XOF', ne:'XOF', gn:'GNF',
  cm:'XAF', ga:'XAF', cd:'CDF', cg:'XAF',
  ng:'NGN', gh:'GHS', ke:'KES', ug:'UGX', tz:'TZS', rw:'RWF', za:'ZAR',
  fr:'EUR', be:'EUR', de:'EUR', nl:'EUR', gb:'GBP', us:'USD',
};

/* ─── Taux de conversion XOF → autres devises ──────────────
   Affichage côté client uniquement — la conversion réelle
   est faite côté serveur dans pay.js avec les mêmes taux.
──────────────────────────────────────────────────────────── */
const XOF_DISPLAY_RATES = {
  EUR: 1 / 655.957,
  USD: 1 / 600,
  GBP: 1 / 780,
  ZAR: 1 / 33,
  INR: 1 / 7.2,
  CAD: 1 / 445,
  AUD: 1 / 395,
  NGN: 1 / 0.4,
  GHS: 1 / 45,
  KES: 1 / 4.5,
  TND: 1 / 195,
  XAF: 1,       // parité fixe XOF/XAF
  GNF: 1 / 0.072,
  CDF: 1 / 0.3,
  UGX: 1 / 0.16,
  TZS: 1 / 0.23,
  RWF: 1 / 0.55,
};

/* Providers qui nécessitent une conversion (pas XOF natif) */
const PROVIDERS_EUR = new Set(['stripe','adyen','mollie','checkout','braintree','paypal','square','authnet','razorpay','yoco']);
const PROVIDER_DISPLAY_CURRENCY = {
  stripe:'EUR', adyen:'EUR', mollie:'EUR', checkout:'EUR',
  braintree:'USD', paypal:'EUR', square:'USD', authnet:'USD',
  razorpay:'INR', yoco:'ZAR', paystack:'NGN', flutterwave:'NGN',
};

/**
 * Retourne { amount, currency } à afficher.
 * Priorité : devise du pays > devise du provider.
 * Si merchantCurrency === XOF et targetCurrency est différent → convertit.
 */
function getDisplayAmount(amount, merchantCurrency, targetCurrency, providerId) {
  const mc = (merchantCurrency || 'XOF').toUpperCase();
  const tc = (targetCurrency || mc).toUpperCase();

  // Si même devise, pas de conversion
  if (mc === tc) return { amount, currency: mc };

  // Conversion XOF → devise cible
  if (mc === 'XOF' && XOF_DISPLAY_RATES[tc]) {
    const converted = amount * XOF_DISPLAY_RATES[tc];
    const noDecimal = new Set(['NGN','KES','GHS','INR','UGX','TZS','RWF','GNF','CDF','XAF']);
    const rounded = noDecimal.has(tc)
      ? Math.round(converted)
      : Math.round(converted * 100) / 100;
    return { amount: rounded, currency: tc };
  }

  // Fallback : logique provider si pas de taux pays
  if (providerId && PROVIDERS_EUR.has(providerId)) {
    const providerCurrency = PROVIDER_DISPLAY_CURRENCY[providerId] || 'EUR';
    if (mc === 'XOF' && XOF_DISPLAY_RATES[providerCurrency]) {
      const converted = amount * XOF_DISPLAY_RATES[providerCurrency];
      const noDecimal = new Set(['NGN','KES','GHS','INR']);
      const rounded = noDecimal.has(providerCurrency)
        ? Math.round(converted)
        : Math.round(converted * 100) / 100;
      return { amount: rounded, currency: providerCurrency };
    }
  }

  return { amount, currency: mc };
}

/* ─── Loading bar ──────────────────────────────────────── */
function TopLoadingBar({ visible, color = '#C8931A' }) {
  if (!visible) return null;
  return (
    <div style={{ position:'fixed',top:0,left:0,right:0,zIndex:9999,height:3 }}>
      <div style={{
        height:'100%',
        background:`linear-gradient(90deg,${color},${color}aa,${color})`,
        backgroundSize:'200% 100%',
        animation:'gw-shimmer 1.4s ease infinite',
      }}/>
    </div>
  );
}

function getMethodIcon(methodId, size=18) {
  return CARD_METHODS.includes(methodId) ? <CreditCard size={size}/> : <Smartphone size={size}/>;
}

function maskPhone(phone) {
  if (!phone || phone.length < 8) return phone;
  return phone.substring(0,3) + '••••' + phone.substring(phone.length-3);
}

/* ─── Stepper ──────────────────────────────────────────── */
function Stepper({ current, primaryColor }) {
  const steps = ['Pays','Méthode','Paiement'];
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0 }}>
      {steps.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={s} style={{ display:'flex', alignItems:'center' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{
                width:26, height:26, borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:800,
                background: done ? primaryColor : active ? '#fff' : 'rgba(255,255,255,.15)',
                color: done ? '#fff' : active ? primaryColor : 'rgba(255,255,255,.4)',
                border: active ? `2.5px solid ${primaryColor}` : done ? `2.5px solid ${primaryColor}` : '2px solid rgba(255,255,255,.15)',
                transition:'all .3s',
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{
                fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', whiteSpace:'nowrap',
                color: active ? primaryColor : done ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.3)',
              }}>{s}</span>
            </div>
            {i < steps.length-1 && (
              <div style={{
                width:44, height:2, margin:'0 4px', marginBottom:18,
                background: done ? `linear-gradient(90deg,${primaryColor},${primaryColor}88)` : 'rgba(255,255,255,.1)',
                borderRadius:1, transition:'background .3s',
              }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── CountrySelector ──────────────────────────────────────
   ≤ 12 pays  → grille de boutons (comportement original)
   > 12 pays  → champ custom avec recherche + dropdown pro
──────────────────────────────────────────────────────────── */
function CountrySelector({ countries, onSelect, fetchingMerchant, countrySearch, setCountrySearch, themeVars, primaryColor, design }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const dropRef           = useRef(null);
  const inputRef          = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const filteredGrid = countries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredDrop = countries.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.code.toLowerCase().includes(query.toLowerCase())
  );

  if (fetchingMerchant) return (
    <div style={{display:'flex',justifyContent:'center',padding:'28px 0'}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:`3px solid ${design==='bold'?'#333':'#EDE9E3'}`,borderTopColor:primaryColor,animation:'gw-spin .8s linear infinite'}}/>
    </div>
  );

  if (countries.length === 0) return (
    <div style={{textAlign:'center',padding:'28px 0',color:themeVars.textMuted}}>
      <Globe size={32} style={{margin:'0 auto 10px',display:'block',opacity:.4}}/>
      <p style={{fontSize:13,fontWeight:600}}>Aucun moyen de paiement disponible</p>
    </div>
  );

  /* ══ ≤ 12 PAYS → grille originale ══ */
  if (countries.length <= 12) return (
    <>
      <div className="gw-search-wrap">
        <svg className="gw-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" className="gw-search-input" value={countrySearch}
          onChange={e => setCountrySearch(e.target.value)} placeholder="Rechercher un pays…" autoComplete="off"/>
        {countrySearch && (
          <button className="gw-search-clear" onClick={() => setCountrySearch('')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
      {filteredGrid.length > 0 ? (
        <div className="gw-country-grid">
          {filteredGrid.map(c => (
            <button key={c.code} onClick={() => onSelect(c.code)} className="gw-country-btn">
              <span className="gw-flag">{c.flag}</span>
              <div className="gw-cname">{c.name}</div>
              <div className="gw-ccurr">{c.currency}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="gw-no-result">Aucun pays trouvé pour « {countrySearch} »</div>
      )}
    </>
  );

  /* ══ > 12 PAYS → select pro avec dropdown ══ */
  return (
    <div ref={dropRef} style={{ position:'relative' }}>
      {/* Déclencheur */}
      <button type="button" onClick={() => setOpen(v => !v)} style={{
        width:'100%', display:'flex', alignItems:'center', gap:12,
        padding:'14px 16px',
        background: themeVars.inputBackground,
        border: open ? `2px solid ${primaryColor}` : themeVars.inputBorder,
        borderRadius:14, cursor:'pointer', transition:'all .2s',
        fontFamily: themeVars.fontFamily,
        boxShadow: open ? `0 0 0 3px ${primaryColor}18` : 'none',
        outline:'none',
      }}>
        <div style={{
          width:38, height:38, borderRadius:10, flexShrink:0,
          background:`${primaryColor}15`, border:`1px solid ${primaryColor}25`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Globe size={16} color={primaryColor}/>
        </div>
        <div style={{ flex:1, textAlign:'left' }}>
          <div style={{ fontSize:10, fontWeight:700, color:themeVars.textMuted, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:2 }}>
            Sélectionner un pays
          </div>
          <div style={{ fontSize:13, fontWeight:600, color:themeVars.textSecondary }}>
            {countries.length} pays disponibles
          </div>
        </div>
        <ChevronDown size={16} color={themeVars.textMuted}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform .2s', flexShrink:0 }}/>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', left:0, right:0, zIndex:1000,
          background: design === 'bold' ? '#1a1a1a' : '#fff',
          border: `1px solid ${design === 'bold' ? '#333' : '#e2e8f0'}`,
          borderRadius:16,
          boxShadow: design === 'bold'
            ? '0 8px 32px rgba(0,0,0,.6)'
            : '0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)',
          overflow:'hidden',
          animation:'gw-fadeUp .18s ease both',
        }}>
          {/* Barre de recherche dans le dropdown */}
          <div style={{
            padding:'12px 12px 8px',
            borderBottom:`1px solid ${design === 'bold' ? '#2a2a2a' : '#f0f0f0'}`,
            position:'sticky', top:0,
            background: design === 'bold' ? '#1a1a1a' : '#fff',
            zIndex:1,
          }}>
            <div style={{ position:'relative' }}>
              <svg style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:themeVars.textMuted,pointerEvents:'none' }}
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un pays…"
                style={{
                  width:'100%', padding:'9px 34px 9px 32px',
                  background: design === 'bold' ? '#242424' : '#f8fafc',
                  border:`1px solid ${design === 'bold' ? '#333' : '#e2e8f0'}`,
                  borderRadius:10, fontSize:13, fontFamily: themeVars.fontFamily,
                  color: themeVars.textPrimary, outline:'none', boxSizing:'border-box',
                  transition:'border-color .15s',
                }}
                onFocus={e => e.target.style.borderColor = primaryColor}
                onBlur={e => e.target.style.borderColor = design === 'bold' ? '#333' : '#e2e8f0'}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{
                  position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                  background:'none',border:'none',cursor:'pointer',
                  color:themeVars.textMuted,display:'flex',padding:2,
                }}>
                  <X size={11}/>
                </button>
              )}
            </div>
            <div style={{ fontSize:10, color:themeVars.textMuted, marginTop:6, paddingLeft:2 }}>
              {filteredDrop.length} résultat{filteredDrop.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Liste des pays */}
          <div style={{ maxHeight:280, overflowY:'auto', padding:'6px' }}>
            {filteredDrop.length === 0 ? (
              <div style={{ padding:'20px', textAlign:'center', fontSize:13, color:themeVars.textMuted }}>
                Aucun pays trouvé pour « {query} »
              </div>
            ) : filteredDrop.map(c => (
              <button key={c.code} type="button"
                onClick={() => { onSelect(c.code); setOpen(false); setQuery(''); }}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:12,
                  padding:'10px 12px', background:'transparent', border:'none',
                  borderRadius:10, cursor:'pointer', fontFamily:themeVars.fontFamily,
                  transition:'background .12s', textAlign:'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = design === 'bold' ? '#2a2a2a' : `${primaryColor}0d`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background: design === 'bold' ? '#2a2a2a' : '#f8fafc',
                  border:`1px solid ${design === 'bold' ? '#333' : '#e2e8f0'}`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                }}>
                  {c.flag}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:themeVars.textPrimary, lineHeight:1.3 }}>{c.name}</div>
                  <div style={{ fontSize:11, color:themeVars.textSecondary, marginTop:1 }}>{c.currency}</div>
                </div>
                <div style={{
                  fontSize:10, fontWeight:700, color:themeVars.textMuted,
                  background: design === 'bold' ? '#333' : '#f1f5f9',
                  padding:'2px 7px', borderRadius:6, letterSpacing:'.06em',
                }}>
                  {c.code.toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────── */
export default function GatewayPay() {
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token') || searchParams.get('t');
  console.log('rawToken:', rawToken);
  const token = (() => {
    if (!rawToken) return null;
    if (rawToken.startsWith('gw_')) return rawToken;
    try { return atob(rawToken); } catch { return rawToken; }
  })();

  const [amount, setAmount] = useState('5000');
  const [description, setDescription] = useState('Paiement en ligne');

  const [step, setStep]                           = useState(1);
  const [country, setCountry]                     = useState(null);
  const [countryData, setCountryData]             = useState(null);
  const [selectedMethod, setSelectedMethod]       = useState(null);
  const [phoneSuffix, setPhoneSuffix]             = useState('');
  const [loading, setLoading]                     = useState(false);
  const [merchant, setMerchant]                   = useState(null);
  const [countries, setCountries]                 = useState([]);
  const [status, setStatus]                       = useState(null);
  const [pollMsg, setPollMsg]                     = useState('Paiement en cours…');
  const [fetchingMerchant, setFetchingMerchant]   = useState(true);
  const [gatewaySettings, setGatewaySettings]     = useState(DEFAULT_SETTINGS);
  const [savedPhones, setSavedPhones]             = useState([]);
  const [showSuggestions, setShowSuggestions]     = useState(false);
  const [kkiapayPublicKey, setKkiapayPublicKey]   = useState(null);
  const [countrySearch, setCountrySearch]         = useState('');

  /* Champs carte */
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName]   = useState('');
  const [customerEmail, setCustomerEmail]         = useState('');

  /* Script KKiaPay */
  useEffect(() => {
    if (!document.querySelector('script[src="https://cdn.kkiapay.me/k.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.kkiapay.me/k.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  /* Init */
  useEffect(() => {
    if (!token) { setFetchingMerchant(false); return; }

    getDoc(doc(db,'gateway_settings','config'))
      .then(snap => { if (snap.exists()) setGatewaySettings(p => ({ ...p, ...snap.data() })); })
      .catch(()=>{});

  // ✅ Dans le useEffect, AJOUTER juste ces 2 lignes
  fetch(`/api/gateway/merchant/${token}`)
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        setMerchant(data);
        setCountries(getCountriesForProviders(data.activeProviders || []));
        if (data.kkiapayPublicKey) setKkiapayPublicKey(data.kkiapayPublicKey);
        if (data.amount) setAmount(String(data.amount));           // ✅ AJOUTER
        if (data.description) setDescription(data.description);   // ✅ AJOUTER
      }
    })
      .catch(() => toast.error('Impossible de charger le marchand'))
      .finally(() => setFetchingMerchant(false));

    try {
      const s = localStorage.getItem('gw_saved_phones');
      if (s) {
        const parsed = JSON.parse(s);
        const seen = new Set();
        const deduped = parsed.filter(p => { if (seen.has(p.number)) return false; seen.add(p.number); return true; });
        setSavedPhones(deduped);
        localStorage.setItem('gw_saved_phones', JSON.stringify(deduped));
      }
    } catch {}
  }, [token]);

  /* defaultCountry */
  useEffect(() => {
    if (!fetchingMerchant && step === 1 && !country && gatewaySettings.defaultCountry && countries.length > 0) {
      const exists = countries.find(c => c.code === gatewaySettings.defaultCountry);
      if (exists) handleSelectCountry(gatewaySettings.defaultCountry);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchingMerchant, countries, gatewaySettings.defaultCountry]);

  const handleSelectCountry = (code) => {
    setCountry(code);
    setCountryData(getMethodsForCountryWithProviders(code, merchant?.activeProviders || []));
    setPhoneSuffix('');
    setCountrySearch('');
    setStep(2);
  };

  const getFullPhoneNumber = () => {
    const prefix = COUNTRY_PREFIXES[country] || '';
    return prefix ? `${prefix}${phoneSuffix.replace(/\s/g,'')}` : phoneSuffix.replace(/\s/g,'');
  };

  const savePhoneNumber = (phone) => {
    if (!phone) return;
    const filtered = savedPhones.filter(p => p.number !== phone);
    const updated = [{number:phone,country},...filtered].slice(0,5);
    setSavedPhones(updated);
    localStorage.setItem('gw_saved_phones', JSON.stringify(updated));
  };

  const pollStatus = (id) => {
    setStatus('pending');
    const msgs = ['Paiement en cours…','En attente de confirmation…','Vérification en cours…','Presque terminé…'];
    let mi = 0;
    const mi_ = setInterval(() => { mi=(mi+1)%msgs.length; setPollMsg(msgs[mi]); }, 3500);
    let attempts = 0;
    const iv = setInterval(async () => {
      attempts++;
      if (attempts > 24) { clearInterval(iv); clearInterval(mi_); setStatus('failed'); return; }
      try {
        const r = await fetch(`/api/gateway/verify/${id}`, { headers:{'x-api-key':token} });
        const d = await r.json();
        if (d.status === 'completed') { clearInterval(iv); clearInterval(mi_); setStatus('completed'); }
        else if (d.status === 'failed') { clearInterval(iv); clearInterval(mi_); setStatus('failed'); }
      } catch {}
    }, 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error('Montant invalide'); return; }

    const isMobile = MOBILE_METHODS.includes(selectedMethod?.id);
    const isCard   = CARD_METHODS.includes(selectedMethod?.id);

    if (isCard && !isKkiapayMethod) {
      if (!customerEmail.trim())     { toast.error("L'email est requis");   return; }
      if (!customerFirstName.trim()) { toast.error('Le prénom est requis'); return; }
      if (!customerLastName.trim())  { toast.error('Le nom est requis');    return; }
    }

    setLoading(true);
    try {
      const fullPhone = isMobile ? getFullPhoneNumber() : null;
      if (isMobile) {
        const phoneCheck = validatePhone(fullPhone, country, selectedMethod?.id);
        if (!phoneCheck.valid) { toast.error(phoneCheck.error); setLoading(false); return; }
      }

      const res = await fetch('/api/gateway/pay', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key':token },
        body: JSON.stringify({
          amount:          parseFloat(amount),
          country,
          method:          selectedMethod?.id,
          phone:           isMobile ? fullPhone : null,
          email:           customerEmail || 'client@gateway.local',
          customerName:    customerFirstName || 'Client',
          customerSurname: customerLastName  || 'Paiement',
          description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLoading(false);
        if (isMobile && fullPhone) savePhoneNumber(fullPhone);
        if (data.url) window.location.href = data.url;
        else pollStatus(data.transactionId);
      } else {
        toast.error(data.error || 'Une erreur est survenue');
        setLoading(false);
      }
    } catch {
      toast.error('Erreur de connexion');
      setLoading(false);
    }
  };

  const handleKkiapayPayment = () => {
    if (!window.openKkiapayWidget) { toast.error('Widget KKiaPay non chargé'); return; }
    if (window.removeKkiapayListener) { window.removeKkiapayListener('success',()=>{}); window.removeKkiapayListener('failed',()=>{}); }

    window.addSuccessListener(async (response) => {
      setStatus('pending'); setPollMsg('Vérification du paiement…');
      try {
        const res = await fetch('/api/gateway/kkiapay-verify', {
          method:'POST', headers:{'Content-Type':'application/json','x-api-key':token},
          body: JSON.stringify({ transactionId: response.transactionId }),
        });
        const data = await res.json();
        setStatus(data.success ? 'completed' : 'failed');
      } catch { setStatus('failed'); }
    });

    window.addFailedListener(() => setStatus('failed'));
    window.openKkiapayWidget({
      amount:parseFloat(amount), key:kkiapayPublicKey, sandbox:false,
      email:'', phone:'', callback:`${window.location.origin}/payment/success`,
    });
  };

  useEffect(() => {
    if (status === 'completed' && gatewaySettings.redirectUrl) {
      const t = setTimeout(() => { window.location.href = gatewaySettings.redirectUrl; }, 3000);
      return () => clearTimeout(t);
    }
  }, [status, gatewaySettings.redirectUrl]);

  /* ─── Computed ── */
  const merchantCurrency = (gatewaySettings.defaultCurrency || 'XOF').toUpperCase();
  const primaryColor     = gatewaySettings.primaryColor || '#C8931A';
  const design           = gatewaySettings.paymentDesign || 'modern';

  /*
   * ── CONVERSION AU NIVEAU DU PAYS ──────────────────────────
   * Dès qu'un pays est sélectionné, on calcule la devise cible
   * du pays (ex: France → EUR, Nigeria → NGN).
   * Cette conversion s'affiche partout dès le step 2.
   * ──────────────────────────────────────────────────────────
   */
  const countryTargetCurrency = country ? (COUNTRY_TARGET_CURRENCY[country] || merchantCurrency) : merchantCurrency;
  const { amount: displayAmount, currency: displayCurrency } = getDisplayAmount(
    parseFloat(amount || 0),
    merchantCurrency,
    countryTargetCurrency,
    selectedMethod?.provider || null
  );

  /* Pour le panneau résumé — devise marchand d'origine */
  const summaryAmount   = parseFloat(amount || 0);
  const summaryCurrency = merchantCurrency;

  const themeVars = (() => {
    switch (design) {
      case 'classic': return {
        pageBackground:'#F4F6FA', cardBackground:'#FFFFFF', cardBorder:'1px solid #DDE3EE',
        cardRadius:'16px', rightBackground:'#F0F3FA', inputBackground:'#F8FAFC',
        inputBorder:'1.5px solid #DDE3EE', countryBtnBackground:'#F8FAFC', countryBtnBorder:'1.5px solid #DDE3EE',
        methodBtnBackground:'#F8FAFC', methodBtnBorder:'1.5px solid #DDE3EE', summaryBackground:'#EEF2FA',
        totalBackground:'#E8EDF8', textPrimary:'#1A2340', textSecondary:'#6B7A9F', textMuted:'#A0AACC',
        fontFamily:"'DM Sans', sans-serif", shadow:'0 2px 4px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.08)',
      };
      case 'bold': return {
        pageBackground:'#0F0F0F', cardBackground:'#1A1A1A', cardBorder:'1px solid #2A2A2A',
        cardRadius:'20px', rightBackground:'#141414', inputBackground:'#242424',
        inputBorder:'1.5px solid #333', countryBtnBackground:'#222', countryBtnBorder:'1.5px solid #2A2A2A',
        methodBtnBackground:'#222', methodBtnBorder:'1.5px solid #2A2A2A', summaryBackground:'#222',
        totalBackground:'#2A2A2A', textPrimary:'#FFFFFF', textSecondary:'#999', textMuted:'#555',
        fontFamily:"'DM Sans', sans-serif", shadow:'0 4px 6px rgba(0,0,0,.3), 0 20px 60px rgba(0,0,0,.5)',
      };
      case 'modern':
      default: return {
        pageBackground:'#F0EBE3', cardBackground:'#FFFFFF', cardBorder:'none',
        cardRadius:'24px', rightBackground:'#FAFAF8', inputBackground:'#FAFAF8',
        inputBorder:'1.5px solid #EDE9E3', countryBtnBackground:'#FAFAF8', countryBtnBorder:'1.5px solid #EDE9E3',
        methodBtnBackground:'#FAFAF8', methodBtnBorder:'1.5px solid #EDE9E3', summaryBackground:'#FAFAF8',
        totalBackground:'#F7F5F2', textPrimary:'#111111', textSecondary:'#AAA', textMuted:'#CCC',
        fontFamily:"'DM Sans', sans-serif", shadow:'0 4px 6px rgba(0,0,0,.04), 0 12px 40px rgba(0,0,0,.10), 0 40px 80px rgba(0,0,0,.08)',
      };
    }
  })();

  const hexL = (hex) => {
    if (!hex.startsWith('#') || hex.length < 7) return 0.5;
    const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
    return 0.2126*r + 0.7152*g + 0.0722*b;
  };
  const btnTextColor        = hexL(primaryColor) > 0.45 ? '#1a0f00' : '#fff';
  const filteredSuggestions = savedPhones.filter(p => p.country === country);
  const isKkiapayMethod     = selectedMethod?.provider === 'kkiapay' && kkiapayPublicKey;
  const isMobileMethod      = MOBILE_METHODS.includes(selectedMethod?.id);
  const isCardMethod        = CARD_METHODS.includes(selectedMethod?.id);

  /* ─── CSS dynamique ── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
    @keyframes gw-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @keyframes gw-spin{to{transform:rotate(360deg)}}
    @keyframes gw-fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes gw-scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
    *{box-sizing:border-box;}
    .gw-page{min-height:100vh;background:${themeVars.pageBackground};display:flex;align-items:center;justify-content:center;padding:24px 16px;font-family:${themeVars.fontFamily};}
    .gw-wrapper{display:grid;grid-template-columns:1fr 340px;gap:0;width:100%;max-width:860px;background:${themeVars.cardBackground};border-radius:${themeVars.cardRadius};overflow:hidden;border:${themeVars.cardBorder};box-shadow:${themeVars.shadow};animation:gw-scaleIn .4s cubic-bezier(.34,1.3,.64,1) both;}
    .gw-left{padding:36px 40px;border-right:1px solid ${design==='bold'?'#2A2A2A':design==='classic'?'#DDE3EE':'#F3F0EC'};min-height:500px;display:flex;flex-direction:column;}
    .gw-right{background:${themeVars.rightBackground};padding:36px 28px;display:flex;flex-direction:column;border-left:${design==='classic'?'1px solid #DDE3EE':'none'};}
    .gw-right-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;}
    .gw-logo-row{display:flex;align-items:center;gap:8px;}
    .gw-logo-icon{width:32px;height:32px;border-radius:9px;background:${design==='bold'?`linear-gradient(135deg,${primaryColor},${primaryColor}cc)`:'linear-gradient(135deg,#1C0F00,#2E1A00)'};display:flex;align-items:center;justify-content:center;}
    .gw-company{font-size:13px;font-weight:700;color:${themeVars.textPrimary};}
    .gw-amount-card{background:${themeVars.cardBackground};border:1px solid ${design==='bold'?'#2A2A2A':design==='classic'?'#DDE3EE':'#EDE9E3'};border-radius:16px;padding:20px;text-align:center;margin-bottom:20px;}
    .gw-amount-label{font-size:10px;font-weight:700;color:${themeVars.textMuted};text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px;}
    .gw-amount-val{font-size:38px;font-weight:900;color:${themeVars.textPrimary};letter-spacing:-.03em;line-height:1;}
    .gw-amount-curr{font-size:14px;font-weight:500;color:${themeVars.textSecondary};margin-left:6px;}
    .gw-amount-desc{font-size:12px;color:${themeVars.textSecondary};margin-top:8px;}
    .gw-divider{height:1px;background:${design==='bold'?'#2A2A2A':design==='classic'?'#DDE3EE':'#F0EDE8'};margin:16px 0;}
    .gw-summary-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
    .gw-summary-key{font-size:12px;color:${themeVars.textSecondary};font-weight:500;}
    .gw-summary-val{font-size:12px;font-weight:700;color:${design==='bold'?'#CCC':'#555'};}
    .gw-total-row{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:${themeVars.totalBackground};border-radius:12px;margin-top:8px;}
    .gw-total-key{font-size:12px;font-weight:700;color:${design==='bold'?'#999':'#555'};}
    .gw-total-val{font-size:18px;font-weight:900;color:${themeVars.textPrimary};letter-spacing:-.02em;}
    .gw-secure-row{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:auto;padding-top:20px;font-size:10px;color:${themeVars.textMuted};font-weight:600;}
    .gw-section-lbl{font-size:10px;font-weight:800;color:${themeVars.textMuted};text-transform:uppercase;letter-spacing:.12em;margin-bottom:14px;display:block;}
    .gw-search-wrap{position:relative;margin-bottom:14px;}
    .gw-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:${themeVars.textMuted};}
    .gw-search-input{width:100%;padding:11px 14px 11px 36px;background:${themeVars.inputBackground};border:${themeVars.inputBorder};border-radius:12px;font-size:13px;font-family:${themeVars.fontFamily};color:${themeVars.textPrimary};outline:none;transition:all .2s;}
    .gw-search-input::placeholder{color:${themeVars.textMuted};}
    .gw-search-input:focus{border-color:${primaryColor};background:${design==='bold'?'#2A2A2A':'#fff'};box-shadow:0 0 0 3px ${primaryColor}18;}
    .gw-search-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:${themeVars.textMuted};padding:2px;display:flex;align-items:center;border-radius:4px;transition:color .15s;}
    .gw-search-clear:hover{color:${themeVars.textPrimary};}
    .gw-country-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
    .gw-country-btn{padding:14px 8px;border-radius:14px;background:${themeVars.countryBtnBackground};border:${themeVars.countryBtnBorder};cursor:pointer;text-align:center;transition:all .2s;font-family:inherit;}
    .gw-country-btn:hover{background:${design==='bold'?'#2A2A2A':'#FFF8EE'};border-color:${primaryColor};transform:translateY(-2px);box-shadow:0 6px 20px ${primaryColor}22;}
    .gw-flag{font-size:24px;display:block;margin-bottom:6px;line-height:1;}
    .gw-cname{font-size:11px;font-weight:700;color:${themeVars.textPrimary};}
    .gw-ccurr{font-size:10px;color:${themeVars.textSecondary};margin-top:1px;}
    .gw-no-result{text-align:center;padding:20px 0;font-size:13px;color:${themeVars.textMuted};}
    .gw-method-btn{width:100%;padding:14px 16px;border-radius:14px;background:${themeVars.methodBtnBackground};border:${themeVars.methodBtnBorder};cursor:pointer;display:flex;align-items:center;gap:12px;transition:all .2s;font-family:inherit;text-align:left;margin-bottom:8px;}
    .gw-method-btn:hover{background:${design==='bold'?'#2A2A2A':'#FFF8EE'};border-color:${primaryColor};transform:translateX(2px);}
    .gw-method-icon{width:40px;height:40px;border-radius:12px;flex-shrink:0;background:${primaryColor}18;border:1px solid ${primaryColor}30;display:flex;align-items:center;justify-content:center;color:${primaryColor};}
    .gw-method-name{flex:1;font-size:13px;font-weight:700;color:${themeVars.textPrimary};}
    .gw-pill{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:${primaryColor}0d;border:1.5px solid ${primaryColor}22;margin-bottom:22px;}
    .gw-pill-icon{width:38px;height:38px;border-radius:11px;flex-shrink:0;background:${primaryColor};display:flex;align-items:center;justify-content:center;color:#fff;}
    .gw-pill-name{font-size:13px;font-weight:700;color:${themeVars.textPrimary};}
    .gw-pill-sub{font-size:11px;color:${themeVars.textSecondary};margin-top:1px;}
    .gw-input-label{font-size:10px;font-weight:700;color:${themeVars.textSecondary};text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;display:block;}
    .gw-input{width:100%;padding:14px 16px;background:${themeVars.inputBackground};border:${themeVars.inputBorder};border-radius:14px;font-size:15px;font-family:'DM Mono',monospace;color:${themeVars.textPrimary};outline:none;transition:all .2s;}
    .gw-input:focus{border-color:${primaryColor};background:${design==='bold'?'#2A2A2A':'#fff'};box-shadow:0 0 0 3px ${primaryColor}18;}
    .gw-input-text{width:100%;padding:13px 16px;background:${themeVars.inputBackground};border:${themeVars.inputBorder};border-radius:14px;font-size:14px;font-family:${themeVars.fontFamily};color:${themeVars.textPrimary};outline:none;transition:all .2s;}
    .gw-input-text::placeholder{color:${themeVars.textMuted};}
    .gw-input-text:focus{border-color:${primaryColor};background:${design==='bold'?'#2A2A2A':'#fff'};box-shadow:0 0 0 3px ${primaryColor}18;}
    .gw-input-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    .gw-input-wrap{position:relative;margin-bottom:14px;}
    .gw-input-icon{position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:${themeVars.textMuted};opacity:.5;}
    .gw-card-notice{display:flex;align-items:center;gap:8px;padding:10px 14px;background:${primaryColor}08;border:1px solid ${primaryColor}20;border-radius:12px;margin-bottom:16px;font-size:11px;color:${themeVars.textSecondary};font-weight:500;}
    .gw-suggestion{width:100%;text-align:left;padding:9px 12px;background:${themeVars.inputBackground};border:1px solid ${design==='bold'?'#333':'#EDE9E3'};border-radius:10px;margin-bottom:4px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .15s;font-family:inherit;}
    .gw-suggestion:hover{background:${primaryColor}0d;}
    .gw-submit{width:100%;padding:16px;border-radius:14px;border:none;cursor:pointer;background:${primaryColor};color:${btnTextColor};font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;font-family:'DM Sans',sans-serif;box-shadow:0 4px 20px ${primaryColor}44;transition:all .25s;margin-top:20px;}
    .gw-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 36px ${primaryColor}66;}
    .gw-submit:disabled{opacity:.5;cursor:not-allowed;}
    .gw-back{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:${themeVars.textSecondary};background:none;border:none;cursor:pointer;padding:0;margin-bottom:22px;transition:color .2s;font-family:inherit;}
    .gw-back:hover{color:${primaryColor};}
    .gw-fade{animation:gw-fadeUp .3s ease both;}
    .gw-spin{animation:gw-spin .8s linear infinite;}
    .gw-kkiapay-info{background:${design==='bold'?'#1E1E2E':'#F8F5FF'};border:1.5px solid ${design==='bold'?'#312B55':'#E9E0FF'};border-radius:14px;padding:16px 18px;margin-bottom:20px;font-size:13px;color:${themeVars.textSecondary};line-height:1.6;}
    .gw-kkiapay-logo{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-weight:700;font-size:13px;color:${themeVars.textPrimary};}
    .gw-kkiapay-dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#e03131,#c92a2a);flex-shrink:0;}
    .gw-status-page{min-height:100vh;background:${themeVars.pageBackground};display:flex;align-items:center;justify-content:center;padding:24px;font-family:${themeVars.fontFamily};}
    .gw-status-card{width:100%;max-width:420px;background:${themeVars.cardBackground};border:${themeVars.cardBorder};border-radius:${themeVars.cardRadius};padding:48px 36px;text-align:center;box-shadow:${themeVars.shadow};animation:gw-scaleIn .4s cubic-bezier(.34,1.3,.64,1) both;}
    .gw-status-card h2{color:${themeVars.textPrimary};}
    .gw-status-icon{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;}
    .gw-status-amount{background:${themeVars.totalBackground};border-radius:14px;padding:18px;margin-top:20px;}
    .gw-conversion-note{display:flex;align-items:center;gap:6px;padding:8px 12px;background:${primaryColor}08;border:1px solid ${primaryColor}20;border-radius:10px;margin-bottom:12px;font-size:11px;color:${themeVars.textSecondary};}
    @media(max-width:680px){
      .gw-page{padding:0;align-items:flex-end;}
      .gw-wrapper{grid-template-columns:1fr;border-radius:24px 24px 0 0;max-width:100%;max-height:92vh;overflow-y:auto;}
      .gw-right{display:none;}
      .gw-left{padding:28px 22px 32px;min-height:auto;}
      .gw-input-row{grid-template-columns:1fr;}
    }
    @media(min-width:681px) and (max-width:900px){
      .gw-wrapper{max-width:720px;grid-template-columns:1fr 280px;}
      .gw-left{padding:28px 28px;}
    }
  `;

  /* ── Summary panel ── */
  const SummaryPanel = () => {
    const showConversion = country && displayCurrency !== summaryCurrency;
    return (
      <div className="gw-right">
        <div className="gw-right-header">
          <div className="gw-logo-row">
            {gatewaySettings.logo
              ? <img src={gatewaySettings.logo} alt="" style={{height:28,objectFit:'contain'}}/>
              : <div className="gw-logo-icon"><Shield size={14} style={{color:'#fff'}}/></div>
            }
            {(gatewaySettings.companyName || merchant?.name) && (
              <span className="gw-company">{gatewaySettings.companyName || merchant?.name}</span>
            )}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:10,fontWeight:700,color:primaryColor,background:`${primaryColor}18`,padding:'4px 10px',borderRadius:50}}>
            <Shield size={9}/> Sécurisé
          </div>
        </div>

        <div className="gw-amount-card">
          <p className="gw-amount-label">Total à payer</p>
          {showConversion ? (
            /* Après sélection d'un pays avec devise différente : afficher la devise convertie */
            <div>
              <span className="gw-amount-val">{displayAmount.toLocaleString('fr-FR', { minimumFractionDigits: ['XOF','XAF','NGN','GHS','KES','UGX','TZS','RWF','GNF','CDF'].includes(displayCurrency) ? 0 : 2, maximumFractionDigits: 2 })}</span>
              <span className="gw-amount-curr">{displayCurrency}</span>
              <p style={{fontSize:11,color:themeVars.textMuted,marginTop:6}}>
                ≈ {summaryAmount.toLocaleString('fr-FR')} {summaryCurrency}
              </p>
            </div>
          ) : (
            <div>
              <span className="gw-amount-val">{summaryAmount.toLocaleString('fr-FR')}</span>
              <span className="gw-amount-curr">{summaryCurrency}</span>
            </div>
          )}
          {description && <p className="gw-amount-desc">{description}</p>}
        </div>

        <div>
          {country && countryData && (
            <div className="gw-summary-row">
              <span className="gw-summary-key">Pays</span>
              <span className="gw-summary-val">{countryData.flag} {countryData.name}</span>
            </div>
          )}
          {selectedMethod && (
            <div className="gw-summary-row">
              <span className="gw-summary-key">Méthode</span>
              <span className="gw-summary-val">{selectedMethod.name}</span>
            </div>
          )}
          <div className="gw-summary-row">
            <span className="gw-summary-key">Devise</span>
            <span className="gw-summary-val">{showConversion ? displayCurrency : summaryCurrency}</span>
          </div>
        </div>

        <div className="gw-divider"/>

        <div className="gw-total-row">
          <span className="gw-total-key">Total</span>
          <span className="gw-total-val" style={{color:primaryColor}}>
            {showConversion
              ? `${displayAmount.toLocaleString('fr-FR', { minimumFractionDigits: ['XOF','XAF','NGN','GHS','KES','UGX','TZS','RWF','GNF','CDF'].includes(displayCurrency) ? 0 : 2, maximumFractionDigits: 2 })} ${displayCurrency}`
              : `${summaryAmount.toLocaleString('fr-FR')} ${summaryCurrency}`
            }
          </span>
        </div>

        <div className="gw-secure-row"><Lock size={9}/> Chiffrement SSL · PCI DSS</div>
      </div>
    );
  };

  /* ── STATUS: PENDING ── */
  if (status === 'pending') return (
    <div className="gw-status-page"><style>{css}</style>
      <div className="gw-status-card">
        <div className="gw-status-icon" style={{background:`${primaryColor}18`,border:`2px solid ${primaryColor}33`}}>
          <div style={{width:32,height:32,borderRadius:'50%',border:`3px solid ${primaryColor}33`,borderTopColor:primaryColor}} className="gw-spin"/>
        </div>
        <h2 style={{fontSize:20,fontWeight:800,marginBottom:8,letterSpacing:'-.02em'}}>{pollMsg}</h2>
        <p style={{fontSize:13,color:themeVars.textSecondary,lineHeight:1.6}}>
          {isKkiapayMethod ? 'Vérification de votre paiement KKiaPay en cours…' : 'Confirmez le paiement sur votre téléphone.'}
        </p>
        <div className="gw-status-amount">
          <p style={{fontSize:11,color:themeVars.textMuted,marginBottom:4}}>{description}</p>
          <p style={{fontSize:28,fontWeight:900,color:themeVars.textPrimary,letterSpacing:'-.02em'}}>
            {displayAmount.toLocaleString('fr-FR', { minimumFractionDigits: ['XOF','XAF','NGN','GHS','KES','UGX','TZS','RWF','GNF','CDF'].includes(displayCurrency) ? 0 : 2, maximumFractionDigits: 2 })} <span style={{fontSize:13,color:themeVars.textSecondary,fontWeight:500}}>{displayCurrency}</span>
          </p>
        </div>
        <p style={{fontSize:11,color:themeVars.textMuted,marginTop:16}}>Ne fermez pas cette page</p>
      </div>
    </div>
  );

  /* ── STATUS: COMPLETED ── */
  if (status === 'completed') return (
    <div className="gw-status-page"><style>{css}</style>
      <div className="gw-status-card">
        <div className="gw-status-icon" style={{background:'#ECFDF5',border:'2px solid rgba(16,185,129,.25)'}}>
          <CheckCircle2 size={32} style={{color:'#10B981'}}/>
        </div>
        {gatewaySettings.logo && <img src={gatewaySettings.logo} alt="" style={{height:26,margin:'0 auto 14px',display:'block',objectFit:'contain'}}/>}
        <h2 style={{fontSize:22,fontWeight:900,marginBottom:8,letterSpacing:'-.02em'}}>Paiement réussi !</h2>
        <p style={{fontSize:13,color:themeVars.textSecondary}}>Votre transaction a été confirmée.</p>
        <div className="gw-status-amount" style={{background:'#ECFDF5',border:'1px solid rgba(16,185,129,.15)'}}>
          <p style={{fontSize:11,color:'#6EE7B7',marginBottom:4}}>{description}</p>
          <p style={{fontSize:28,fontWeight:900,color:themeVars.textPrimary,letterSpacing:'-.02em'}}>
            {displayAmount.toLocaleString('fr-FR', { minimumFractionDigits: ['XOF','XAF','NGN','GHS','KES','UGX','TZS','RWF','GNF','CDF'].includes(displayCurrency) ? 0 : 2, maximumFractionDigits: 2 })} <span style={{fontSize:13,color:themeVars.textSecondary,fontWeight:500}}>{displayCurrency}</span>
          </p>
        </div>
        {gatewaySettings.redirectUrl && <p style={{fontSize:11,color:themeVars.textMuted,marginTop:14}}>Redirection en cours…</p>}
      </div>
    </div>
  );

  /* ── STATUS: FAILED ── */
  if (status === 'failed') return (
    <div className="gw-status-page"><style>{css}</style>
      <div className="gw-status-card">
        <div className="gw-status-icon" style={{background:'#FEF2F2',border:'2px solid rgba(239,68,68,.2)'}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h2 style={{fontSize:22,fontWeight:900,marginBottom:8,letterSpacing:'-.02em'}}>Paiement échoué</h2>
        <p style={{fontSize:13,color:themeVars.textSecondary,marginBottom:28}}>La transaction n'a pas pu être finalisée.</p>
        <button onClick={() => { setStatus(null); setStep(3); }} className="gw-submit" style={{marginTop:0}}>Réessayer</button>
      </div>
    </div>
  );

  /* ── MAIN FLOW ── */
  return (
    <div className="gw-page">
      <TopLoadingBar visible={loading} color={primaryColor}/>
      <style>{css}</style>

      <div className="gw-wrapper">
        <div className="gw-left">

          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {gatewaySettings.logo
                ? <img src={gatewaySettings.logo} alt="" style={{height:24,objectFit:'contain'}}/>
                : <div style={{width:28,height:28,borderRadius:8,background:design==='bold'?primaryColor:'#1C0F00',display:'flex',alignItems:'center',justifyContent:'center'}}><Shield size={13} style={{color:'#fff'}}/></div>
              }
              {(gatewaySettings.companyName || merchant?.name) && (
                <span style={{fontSize:13,fontWeight:700,color:themeVars.textPrimary}}>{gatewaySettings.companyName || merchant?.name}</span>
              )}
            </div>
            <div style={{textAlign:'right'}}>
              {/* Dès qu'un pays est sélectionné, afficher le montant converti dans le header */}
              {country && displayCurrency !== summaryCurrency ? (
                <>
                  <div style={{fontSize:18,fontWeight:900,color:themeVars.textPrimary,letterSpacing:'-.02em'}}>
                    {displayAmount.toLocaleString('fr-FR', { minimumFractionDigits: ['XOF','XAF','NGN','GHS','KES','UGX','TZS','RWF','GNF','CDF'].includes(displayCurrency) ? 0 : 2, maximumFractionDigits: 2 })} <span style={{fontSize:11,color:themeVars.textSecondary,fontWeight:500}}>{displayCurrency}</span>
                  </div>
                  <div style={{fontSize:10,color:themeVars.textMuted}}>≈ {summaryAmount.toLocaleString('fr-FR')} {summaryCurrency}</div>
                </>
              ) : (
                <>
                  <div style={{fontSize:18,fontWeight:900,color:themeVars.textPrimary,letterSpacing:'-.02em'}}>
                    {summaryAmount.toLocaleString('fr-FR')} <span style={{fontSize:11,color:themeVars.textSecondary,fontWeight:500}}>{summaryCurrency}</span>
                  </div>
                  {description && <div style={{fontSize:10,color:themeVars.textMuted}}>{description}</div>}
                </>
              )}
            </div>
          </div>

          {/* Stepper */}
          <div style={{marginBottom:28}}>
            <Stepper current={step} primaryColor={primaryColor}/>
          </div>

          {/* ── STEP 1 — Pays ── */}
          {step === 1 && (
            <div className="gw-fade" style={{flex:1}}>
              <span className="gw-section-lbl">Sélectionnez votre pays</span>
              <CountrySelector
                countries={countries}
                onSelect={handleSelectCountry}
                fetchingMerchant={fetchingMerchant}
                countrySearch={countrySearch}
                setCountrySearch={setCountrySearch}
                themeVars={themeVars}
                primaryColor={primaryColor}
                design={design}
              />
            </div>
          )}

          {/* ── STEP 2 — Méthode ── */}
          {step === 2 && countryData && (
            <div className="gw-fade" style={{flex:1}}>
              <button className="gw-back" onClick={() => { setStep(1); setCountryData(null); setCountry(null); }}>
                <ArrowLeft size={13}/> Changer de pays
              </button>
              <div className="gw-pill">
                <div className="gw-pill-icon"><span style={{fontSize:20}}>{countryData.flag}</span></div>
                <div>
                  <div className="gw-pill-name">{countryData.name}</div>
                  {/* Afficher la devise convertie dès le step 2 */}
                  <div className="gw-pill-sub">
                    {displayCurrency !== summaryCurrency
                      ? `${displayAmount.toLocaleString('fr-FR', { minimumFractionDigits: ['XOF','XAF','NGN','GHS','KES','UGX','TZS','RWF','GNF','CDF'].includes(displayCurrency) ? 0 : 2, maximumFractionDigits: 2 })} ${displayCurrency}`
                      : countryData.currency
                    }
                  </div>
                </div>
              </div>

              {/* Note de conversion au niveau du pays dès le step 2 */}
              {displayCurrency !== summaryCurrency && (
                <div className="gw-conversion-note" style={{marginBottom:16}}>
                  <span style={{fontSize:14}}>💱</span>
                  <span>
                    {summaryAmount.toLocaleString('fr-FR')} {summaryCurrency} → <strong style={{color:themeVars.textPrimary}}>
                      {displayAmount.toLocaleString('fr-FR', { minimumFractionDigits: ['XOF','XAF','NGN','GHS','KES','UGX','TZS','RWF','GNF','CDF'].includes(displayCurrency) ? 0 : 2, maximumFractionDigits: 2 })} {displayCurrency}
                    </strong> (taux appliqué automatiquement)
                  </span>
                </div>
              )}

              <span className="gw-section-lbl">Mode de paiement</span>
              {countryData.methods?.length > 0 ? countryData.methods.map(method => (
                <button key={method.id} onClick={() => {
                  setSelectedMethod(method);
                  setCustomerFirstName(''); setCustomerLastName(''); setCustomerEmail('');
                  setStep(3);
                }} className="gw-method-btn">
                  <div className="gw-method-icon">{getMethodIcon(method.id)}</div>
                  <div style={{flex:1}}>
                    <span className="gw-method-name">{method.name}</span>
                    {/* Montant converti déjà calculé au niveau pays, pas besoin de recalculer par provider */}
                    {displayCurrency !== summaryCurrency && (
                      <div style={{fontSize:10,color:themeVars.textMuted,marginTop:2}}>
                        {displayAmount.toLocaleString('fr-FR', { minimumFractionDigits: ['XOF','XAF','NGN','GHS','KES','UGX','TZS','RWF','GNF','CDF'].includes(displayCurrency) ? 0 : 2, maximumFractionDigits: 2 })} {displayCurrency}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={14} style={{color:themeVars.textMuted}}/>
                </button>
              )) : (
                <p style={{fontSize:13,color:themeVars.textMuted,textAlign:'center',padding:'20px 0'}}>Aucune méthode disponible</p>
              )}
            </div>
          )}

          {/* ── STEP 3 — Paiement ── */}
          {step === 3 && selectedMethod && (
            <div className="gw-fade" style={{flex:1}}>
              <button className="gw-back" onClick={() => { setStep(2); setSelectedMethod(null); setPhoneSuffix(''); }}>
                <ArrowLeft size={13}/> Changer de méthode
              </button>
              <div className="gw-pill">
                <div className="gw-pill-icon">{getMethodIcon(selectedMethod.id, 18)}</div>
                <div>
                  <div className="gw-pill-name">{selectedMethod.name}</div>
                  <div className="gw-pill-sub">{countryData?.flag} {countryData?.name}</div>
                </div>
              </div>

              {/* Note de conversion */}
              {displayCurrency !== summaryCurrency && (
                <div className="gw-conversion-note">
                  <span style={{fontSize:14}}>💱</span>
                  <span>
                    {summaryAmount.toLocaleString('fr-FR')} {summaryCurrency} → <strong style={{color:themeVars.textPrimary}}>
                      {displayAmount.toLocaleString('fr-FR', { minimumFractionDigits: ['XOF','XAF','NGN','GHS','KES','UGX','TZS','RWF','GNF','CDF'].includes(displayCurrency) ? 0 : 2, maximumFractionDigits: 2 })} {displayCurrency}
                    </strong> (taux appliqué automatiquement)
                  </span>
                </div>
              )}

              {isKkiapayMethod ? (
                <div>
                  <div className="gw-kkiapay-info">
                    <div className="gw-kkiapay-logo">
                      <div className="gw-kkiapay-dot"/>
                      Paiement via KKiaPay
                    </div>
                    <p style={{margin:0,fontSize:12,color:themeVars.textSecondary}}>
                      Une fenêtre sécurisée KKiaPay s'ouvrira pour finaliser votre paiement.
                    </p>
                  </div>
                  <button className="gw-submit" style={{marginTop:0}} onClick={handleKkiapayPayment}>
                    <Zap size={16}/>
                    Payer {displayAmount.toLocaleString('fr-FR', { minimumFractionDigits: ['XOF','XAF','NGN','GHS','KES','UGX','TZS','RWF','GNF','CDF'].includes(displayCurrency) ? 0 : 2, maximumFractionDigits: 2 })} {displayCurrency}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>

                  {/* Champs MOBILE */}
                  {isMobileMethod && (
                    <>
                      <div style={{marginBottom:6}}>
                        <label className="gw-input-label">Numéro de téléphone</label>
                        <input type="tel" className="gw-input"
                          value={phoneSuffix ? `${COUNTRY_PREFIXES[country]||''} ${phoneSuffix}` : COUNTRY_PREFIXES[country]||''}
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
                      </div>
                      {showSuggestions && filteredSuggestions.length > 0 && phoneSuffix.length === 0 && (
                        <div style={{marginTop:8,marginBottom:4}}>
                          <p style={{fontSize:9,color:themeVars.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Numéros récents</p>
                          {filteredSuggestions.map((p, i) => {
                            const prefix = COUNTRY_PREFIXES[country] || '';
                            const suf = prefix ? p.number.replace(prefix,'') : p.number;
                            return (
                              <button key={i} type="button" className="gw-suggestion"
                                onClick={() => { setPhoneSuffix(suf); setShowSuggestions(false); }}>
                                <Smartphone size={12} style={{color:themeVars.textMuted}}/>
                                <span style={{fontSize:12,color:themeVars.textPrimary,fontFamily:"'DM Mono',monospace"}}>{maskPhone(p.number)}</span>
                                <span style={{fontSize:10,color:themeVars.textMuted,marginLeft:'auto'}}>Utiliser</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* Champs CARTE */}
                  {isCardMethod && !isKkiapayMethod && (
                    <>
                      <div className="gw-card-notice">
                        <CreditCard size={13} style={{color:primaryColor,flexShrink:0}}/>
                        <span>Informations requises pour le paiement par carte sécurisé</span>
                      </div>
                      <div className="gw-input-row">
                        <div>
                          <label className="gw-input-label">Prénom</label>
                          <div className="gw-input-wrap" style={{marginBottom:0}}>
                            <input type="text" className="gw-input-text" value={customerFirstName}
                              onChange={e => setCustomerFirstName(e.target.value)} placeholder="Jean" autoComplete="given-name" required/>
                          </div>
                        </div>
                        <div>
                          <label className="gw-input-label">Nom</label>
                          <div className="gw-input-wrap" style={{marginBottom:0}}>
                            <input type="text" className="gw-input-text" value={customerLastName}
                              onChange={e => setCustomerLastName(e.target.value)} placeholder="Dupont" autoComplete="family-name" required/>
                          </div>
                        </div>
                      </div>
                      <div style={{marginTop:12,marginBottom:4}}>
                        <label className="gw-input-label">Adresse email</label>
                        <div style={{position:'relative'}}>
                          <input type="email" className="gw-input-text" value={customerEmail}
                            onChange={e => setCustomerEmail(e.target.value)} placeholder="jean.dupont@email.com"
                            autoComplete="email" required style={{paddingRight:42}}/>
                          <Mail size={14} className="gw-input-icon"/>
                        </div>
                      </div>
                    </>
                  )}

                  <button type="submit" disabled={loading} className="gw-submit">
                    {loading ? (
                      <>
                        <div style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${btnTextColor}44`,borderTopColor:btnTextColor}} className="gw-spin"/>
                        Traitement en cours…
                      </>
                    ) : (
                      <><Zap size={16}/> Payer {displayAmount.toLocaleString('fr-FR', { minimumFractionDigits: ['XOF','XAF','NGN','GHS','KES','UGX','TZS','RWF','GNF','CDF'].includes(displayCurrency) ? 0 : 2, maximumFractionDigits: 2 })} {displayCurrency}</>
                    )}
                  </button>
                </form>
              )}

              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,marginTop:16,fontSize:10,color:themeVars.textMuted,fontWeight:600}}>
                <Lock size={9}/> SSL · PCI DSS · Paiement sécurisé
              </div>
            </div>
          )}
        </div>

        <SummaryPanel/>
      </div>
    </div>
  );
}