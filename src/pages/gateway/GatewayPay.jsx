import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Shield, Lock, Smartphone, CreditCard, ChevronRight, CheckCircle2, Globe, ArrowLeft, Zap } from 'lucide-react';
import { getMethodsForCountryWithProviders, getCountriesForProviders } from '../../services/countryMethods';
import toast from 'react-hot-toast';
import { validatePhone } from '../../services/phoneValidator';

/* ─── Constantes ───────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  paymentDesign: 'modern', primaryColor: '#f97316', logo: '', companyName: '',
  redirectUrl: '', defaultCurrency: 'XOF',
};

const COUNTRY_PREFIXES = {
  bj:'229',ci:'225',tg:'228',sn:'221',bf:'226',ml:'223',ne:'227',gn:'224',
  cm:'237',ga:'241',cd:'243',cg:'242',ng:'234',gh:'233',ke:'254',ug:'256',
  tz:'255',rw:'250',za:'27',fr:'33',be:'32',de:'49',nl:'31',gb:'44',us:'1'
};

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
  const cards = ['card','paypal','apple_pay','google_pay','chipper_wallet','bank_transfer','ideal','bancontact','giropay','sofort'];
  return cards.includes(methodId) ? <CreditCard size={size}/> : <Smartphone size={size}/>;
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

/* ─── Main ─────────────────────────────────────────────── */
export default function GatewayPay() {
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token') || searchParams.get('t');
  const token = (() => {
    if (!rawToken) return null;
    if (rawToken.startsWith('gw_')) return rawToken;
    try { return atob(rawToken); } catch { return rawToken; }
  })();
  const amountParam  = searchParams.get('amount');
  const description  = searchParams.get('desc') || 'Paiement en ligne';

  const [step, setStep]               = useState(1);
  const [country, setCountry]         = useState(null);
  const [countryData, setCountryData] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [amount]                      = useState(amountParam || '5000');
  const [loading, setLoading]         = useState(false);
  const [merchant, setMerchant]       = useState(null);
  const [countries, setCountries]     = useState([]);
  const [status, setStatus]           = useState(null);
  const [pollMsg, setPollMsg]         = useState('Paiement en cours…');
  const [fetchingMerchant, setFetchingMerchant] = useState(true);
  const [gatewaySettings, setGatewaySettings]   = useState(DEFAULT_SETTINGS);
  const [savedPhones, setSavedPhones]           = useState([]);
  const [showSuggestions, setShowSuggestions]   = useState(false);
  const [kkiapayPublicKey, setKkiapayPublicKey] = useState(null);

  /* ─── Charger le script KKiaPay une seule fois ───── */
  useEffect(() => {
    if (!document.querySelector('script[src="https://cdn.kkiapay.me/k.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.kkiapay.me/k.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  /* ─── Init ───────────────────────────────────────── */
  useEffect(() => {
    if (!token) { setFetchingMerchant(false); return; }

    getDoc(doc(db,'gateway_settings','config'))
      .then(snap => { if (snap.exists()) setGatewaySettings(p => ({...p,...snap.data()})); })
      .catch(()=>{});

    fetch(`/api/gateway/merchant/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setMerchant(data);
          setCountries(getCountriesForProviders(data.activeProviders || []));
          // Récupérer la public key KKiaPay si configurée
          if (data.kkiapayPublicKey) {
            setKkiapayPublicKey(data.kkiapayPublicKey);
          }
        }
      })
      .catch(() => toast.error('Impossible de charger le marchand'))
      .finally(() => setFetchingMerchant(false));

    try {
      const s = localStorage.getItem('gw_saved_phones');
      if (s) {
        const parsed = JSON.parse(s);
        const seen = new Set();
        const deduped = parsed.filter(p => {
          if (seen.has(p.number)) return false;
          seen.add(p.number);
          return true;
        });
        setSavedPhones(deduped);
        localStorage.setItem('gw_saved_phones', JSON.stringify(deduped));
      }
    } catch {}
  }, [token]);

  const handleSelectCountry = (code) => {
    setCountry(code);
    setCountryData(getMethodsForCountryWithProviders(code, merchant?.activeProviders || []));
    setPhoneSuffix('');
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

  /* ─── Submit standard (non-KKiaPay) ─────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error('Montant invalide'); return; }
    setLoading(true);
    try {
      const fullPhone = getFullPhoneNumber();
      const phoneCheck = validatePhone(fullPhone, country, selectedMethod?.id);
      if (!phoneCheck.valid) {
        toast.error(phoneCheck.error);
        setLoading(false);
        return;
      }
      const res = await fetch('/api/gateway/pay', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key':token },
        body: JSON.stringify({
          amount: parseFloat(amount),
          country,
          method: selectedMethod?.id,
          phone: fullPhone,
          description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLoading(false);
        savePhoneNumber(fullPhone);
        // Si le provider retourne une URL de redirection (Stripe, PayPal, etc.)
        if (data.url) {
          window.location.href = data.url;
        } else {
          pollStatus(data.transactionId);
        }
      } else {
        toast.error(data.error || 'Une erreur est survenue');
        setLoading(false);
      }
    } catch {
      toast.error('Erreur de connexion');
      setLoading(false);
    }
  };

  /* ─── Ouvrir le widget KKiaPay ───────────────────── */
  const handleKkiapayPayment = () => {
    if (!window.openKkiapayWidget) {
      toast.error('Widget KKiaPay non chargé, réessayez dans quelques secondes');
      return;
    }

    // Nettoyer les anciens listeners pour éviter les doublons
    if (window.removeKkiapayListener) {
      window.removeKkiapayListener('success', () => {});
      window.removeKkiapayListener('failed', () => {});
    }

    // Listener succès
    window.addSuccessListener(async (response) => {
      setStatus('pending');
      setPollMsg('Vérification du paiement…');
      try {
        const res = await fetch('/api/gateway/kkiapay-verify', {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'x-api-key':token },
          body: JSON.stringify({ transactionId: response.transactionId }),
        });
        const data = await res.json();
        if (data.success) setStatus('completed');
        else setStatus('failed');
      } catch {
        setStatus('failed');
      }
    });

    // Listener échec
    window.addFailedListener(() => {
      setStatus('failed');
    });

    // Ouvrir le widget avec la PUBLIC KEY du marchand
    window.openKkiapayWidget({
      amount:   parseFloat(amount),
      key:      kkiapayPublicKey,
      sandbox:  false,
      email:    '',
      phone:    '',
      callback: `${window.location.origin}/payment/success`,
    });
  };

  useEffect(() => {
    if (status === 'completed' && gatewaySettings.redirectUrl) {
      const t = setTimeout(() => { window.location.href = gatewaySettings.redirectUrl; }, 3000);
      return () => clearTimeout(t);
    }
  }, [status, gatewaySettings.redirectUrl]);

  /* ─── Computed ───────────────────────────────────── */
  const currency     = countryData?.currency || gatewaySettings.defaultCurrency;
  const primaryColor = gatewaySettings.primaryColor || '#C8931A';
  const hexL = (hex) => {
    if (!hex.startsWith('#') || hex.length < 7) return 0.5;
    const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
    return 0.2126*r + 0.7152*g + 0.0722*b;
  };
  const btnTextColor = hexL(primaryColor) > 0.45 ? '#1a0f00' : '#fff';
  const filteredSuggestions = savedPhones.filter(p => p.country === country);

  // Détecter si la méthode sélectionnée vient de KKiaPay
  const isKkiapayMethod = selectedMethod?.provider === 'kkiapay' && kkiapayPublicKey;

  /* ─── CSS ────────────────────────────────────────── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
    @keyframes gw-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @keyframes gw-spin{to{transform:rotate(360deg)}}
    @keyframes gw-fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes gw-scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
    *{box-sizing:border-box;}

    .gw-page{
      min-height:100vh;
      background:#F0EBE3;
      display:flex;align-items:center;justify-content:center;
      padding:24px 16px;
      font-family:'DM Sans',sans-serif;
    }
    .gw-wrapper{
      display:grid;
      grid-template-columns:1fr 340px;
      gap:0;
      width:100%;
      max-width:860px;
      background:#fff;
      border-radius:24px;
      overflow:hidden;
      box-shadow:0 4px 6px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.10),0 40px 80px rgba(0,0,0,.08);
      animation:gw-scaleIn .4s cubic-bezier(.34,1.3,.64,1) both;
    }
    .gw-left{
      padding:36px 40px;
      border-right:1px solid #F3F0EC;
      min-height:500px;
      display:flex;flex-direction:column;
    }
    .gw-right{
      background:#FAFAF8;
      padding:36px 28px;
      display:flex;flex-direction:column;
    }
    .gw-right-header{
      display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;
    }
    .gw-logo-row{display:flex;align-items:center;gap:8px;}
    .gw-logo-icon{
      width:32px;height:32px;border-radius:9px;
      background:linear-gradient(135deg,#1C0F00,#2E1A00);
      display:flex;align-items:center;justify-content:center;
    }
    .gw-company{font-size:13px;font-weight:700;color:#333;}
    .gw-amount-card{
      background:#fff;border:1px solid #EDE9E3;border-radius:16px;
      padding:20px;text-align:center;margin-bottom:20px;
    }
    .gw-amount-label{font-size:10px;font-weight:700;color:#CCC;text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px;}
    .gw-amount-val{font-size:38px;font-weight:900;color:#111;letter-spacing:-.03em;line-height:1;}
    .gw-amount-curr{font-size:14px;font-weight:500;color:#AAA;margin-left:6px;}
    .gw-amount-desc{font-size:12px;color:#AAA;margin-top:8px;}
    .gw-divider{height:1px;background:#F0EDE8;margin:16px 0;}
    .gw-summary-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
    .gw-summary-key{font-size:12px;color:#AAA;font-weight:500;}
    .gw-summary-val{font-size:12px;font-weight:700;color:#555;}
    .gw-total-row{
      display:flex;justify-content:space-between;align-items:center;
      padding:14px 16px;background:#F7F5F2;border-radius:12px;margin-top:8px;
    }
    .gw-total-key{font-size:12px;font-weight:700;color:#555;}
    .gw-total-val{font-size:18px;font-weight:900;color:#111;letter-spacing:-.02em;}
    .gw-secure-row{
      display:flex;align-items:center;justify-content:center;gap:6px;
      margin-top:auto;padding-top:20px;
      font-size:10px;color:#CCC;font-weight:600;
    }
    .gw-section-lbl{
      font-size:10px;font-weight:800;color:#BBB;
      text-transform:uppercase;letter-spacing:.12em;
      margin-bottom:14px;display:block;
    }
    .gw-country-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
    .gw-country-btn{
      padding:14px 8px;border-radius:14px;
      background:#FAFAF8;border:1.5px solid #EDE9E3;
      cursor:pointer;text-align:center;
      transition:all .2s;font-family:inherit;
    }
    .gw-country-btn:hover{
      background:#FFF8EE;
      border-color:${primaryColor};
      transform:translateY(-2px);
      box-shadow:0 6px 20px ${primaryColor}22;
    }
    .gw-flag{font-size:24px;display:block;margin-bottom:6px;line-height:1;}
    .gw-cname{font-size:11px;font-weight:700;color:#222;}
    .gw-ccurr{font-size:10px;color:#AAA;margin-top:1px;}
    .gw-method-btn{
      width:100%;padding:14px 16px;border-radius:14px;
      background:#FAFAF8;border:1.5px solid #EDE9E3;
      cursor:pointer;display:flex;align-items:center;gap:12px;
      transition:all .2s;font-family:inherit;text-align:left;
      margin-bottom:8px;
    }
    .gw-method-btn:hover{
      background:#FFF8EE;border-color:${primaryColor};transform:translateX(2px);
    }
    .gw-method-icon{
      width:40px;height:40px;border-radius:12px;flex-shrink:0;
      background:${primaryColor}18;
      border:1px solid ${primaryColor}30;
      display:flex;align-items:center;justify-content:center;
      color:${primaryColor};
    }
    .gw-method-name{flex:1;font-size:13px;font-weight:700;color:#111;}
    .gw-pill{
      display:flex;align-items:center;gap:10px;
      padding:12px 14px;border-radius:14px;
      background:${primaryColor}0d;border:1.5px solid ${primaryColor}22;
      margin-bottom:22px;
    }
    .gw-pill-icon{
      width:38px;height:38px;border-radius:11px;flex-shrink:0;
      background:${primaryColor};
      display:flex;align-items:center;justify-content:center;color:#fff;
    }
    .gw-pill-name{font-size:13px;font-weight:700;color:#111;}
    .gw-pill-sub{font-size:11px;color:#AAA;margin-top:1px;}
    .gw-input-label{font-size:10px;font-weight:700;color:#AAA;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;display:block;}
    .gw-input{
      width:100%;padding:14px 16px;
      background:#FAFAF8;border:1.5px solid #EDE9E3;border-radius:14px;
      font-size:15px;font-family:'DM Mono',monospace;color:#111;
      outline:none;transition:all .2s;
    }
    .gw-input:focus{border-color:${primaryColor};background:#fff;box-shadow:0 0 0 3px ${primaryColor}18;}
    .gw-suggestion{
      width:100%;text-align:left;padding:9px 12px;
      background:#FAFAF8;border:1px solid #EDE9E3;border-radius:10px;
      margin-bottom:4px;cursor:pointer;display:flex;align-items:center;gap:8px;
      transition:background .15s;font-family:inherit;
    }
    .gw-suggestion:hover{background:${primaryColor}0d;}
    .gw-submit{
      width:100%;padding:16px;border-radius:14px;border:none;cursor:pointer;
      background:${primaryColor};
      color:${btnTextColor};font-size:15px;font-weight:800;
      display:flex;align-items:center;justify-content:center;gap:8px;
      font-family:'DM Sans',sans-serif;
      box-shadow:0 4px 20px ${primaryColor}44;
      transition:all .25s;margin-top:20px;
    }
    .gw-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 36px ${primaryColor}66;}
    .gw-submit:disabled{opacity:.5;cursor:not-allowed;}
    .gw-back{
      display:inline-flex;align-items:center;gap:5px;
      font-size:12px;font-weight:600;color:#AAA;
      background:none;border:none;cursor:pointer;padding:0;
      margin-bottom:22px;transition:color .2s;font-family:inherit;
    }
    .gw-back:hover{color:${primaryColor};}
    .gw-fade{animation:gw-fadeUp .3s ease both;}
    .gw-spin{animation:gw-spin .8s linear infinite;}

    /* ── KKiaPay info box ── */
    .gw-kkiapay-info{
      background:#F8F5FF;border:1.5px solid #E9E0FF;border-radius:14px;
      padding:16px 18px;margin-bottom:20px;
      font-size:13px;color:#555;line-height:1.6;
    }
    .gw-kkiapay-logo{
      display:flex;align-items:center;gap:8px;
      margin-bottom:10px;font-weight:700;font-size:13px;color:#333;
    }
    .gw-kkiapay-dot{
      width:10px;height:10px;border-radius:50%;
      background:linear-gradient(135deg,#e03131,#c92a2a);
      flex-shrink:0;
    }

    /* ── STATUS PAGES ── */
    .gw-status-page{
      min-height:100vh;background:#F0EBE3;
      display:flex;align-items:center;justify-content:center;padding:24px;
      font-family:'DM Sans',sans-serif;
    }
    .gw-status-card{
      width:100%;max-width:420px;background:#fff;border-radius:24px;
      padding:48px 36px;text-align:center;
      box-shadow:0 4px 6px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.10);
      animation:gw-scaleIn .4s cubic-bezier(.34,1.3,.64,1) both;
    }
    .gw-status-icon{
      width:72px;height:72px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      margin:0 auto 20px;
    }
    .gw-status-amount{
      background:#F7F5F2;border-radius:14px;padding:18px;margin-top:20px;
    }

    /* ── MOBILE ── */
    @media(max-width:680px){
      .gw-page{padding:0;align-items:flex-end;}
      .gw-wrapper{
        grid-template-columns:1fr;
        border-radius:24px 24px 0 0;
        max-width:100%;
        max-height:92vh;
        overflow-y:auto;
      }
      .gw-right{display:none;}
      .gw-left{padding:28px 22px 32px;min-height:auto;}
    }
    @media(min-width:681px) and (max-width:900px){
      .gw-wrapper{max-width:720px;grid-template-columns:1fr 280px;}
      .gw-left{padding:28px 28px;}
    }
  `;

  /* ── Summary panel ── */
  const SummaryPanel = () => (
    <div className="gw-right">
      <div className="gw-right-header">
        <div className="gw-logo-row">
          {gatewaySettings.logo
            ? <img src={gatewaySettings.logo} alt="" style={{height:28,objectFit:'contain'}}/>
            : (
              <div className="gw-logo-icon">
                <Shield size={14} style={{color:'#fff'}}/>
              </div>
            )
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
        <div>
          <span className="gw-amount-val">{parseFloat(amount||0).toLocaleString('fr-FR')}</span>
          <span className="gw-amount-curr">{currency}</span>
        </div>
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
          <span className="gw-summary-val">{currency}</span>
        </div>
      </div>

      <div className="gw-divider"/>

      <div className="gw-total-row">
        <span className="gw-total-key">Total</span>
        <span className="gw-total-val" style={{color:primaryColor}}>
          {parseFloat(amount||0).toLocaleString('fr-FR')} {currency}
        </span>
      </div>

      <div className="gw-secure-row">
        <Lock size={9}/> Chiffrement SSL · PCI DSS
      </div>
    </div>
  );

  /* ── STATUS: PENDING ── */
  if (status === 'pending') return (
    <div className="gw-status-page">
      <style>{css}</style>
      <div className="gw-status-card">
        <div className="gw-status-icon" style={{background:`${primaryColor}18`,border:`2px solid ${primaryColor}33`}}>
          <div style={{width:32,height:32,borderRadius:'50%',border:`3px solid ${primaryColor}33`,borderTopColor:primaryColor}} className="gw-spin"/>
        </div>
        <h2 style={{fontSize:20,fontWeight:800,color:'#111',marginBottom:8,letterSpacing:'-.02em'}}>{pollMsg}</h2>
        <p style={{fontSize:13,color:'#AAA',lineHeight:1.6}}>
          {isKkiapayMethod ? 'Vérification de votre paiement KKiaPay en cours…' : 'Confirmez le paiement sur votre téléphone.'}
        </p>
        <div className="gw-status-amount">
          <p style={{fontSize:11,color:'#CCC',marginBottom:4}}>{description}</p>
          <p style={{fontSize:28,fontWeight:900,color:'#111',letterSpacing:'-.02em'}}>
            {parseFloat(amount).toLocaleString('fr-FR')} <span style={{fontSize:13,color:'#AAA',fontWeight:500}}>{currency}</span>
          </p>
        </div>
        <p style={{fontSize:11,color:'#DDD',marginTop:16}}>Ne fermez pas cette page</p>
      </div>
    </div>
  );

  /* ── STATUS: COMPLETED ── */
  if (status === 'completed') return (
    <div className="gw-status-page">
      <style>{css}</style>
      <div className="gw-status-card">
        <div className="gw-status-icon" style={{background:'#ECFDF5',border:'2px solid rgba(16,185,129,.25)'}}>
          <CheckCircle2 size={32} style={{color:'#10B981'}}/>
        </div>
        {gatewaySettings.logo && <img src={gatewaySettings.logo} alt="" style={{height:26,margin:'0 auto 14px',display:'block',objectFit:'contain'}}/>}
        <h2 style={{fontSize:22,fontWeight:900,color:'#111',marginBottom:8,letterSpacing:'-.02em'}}>Paiement réussi !</h2>
        <p style={{fontSize:13,color:'#AAA'}}>Votre transaction a été confirmée.</p>
        <div className="gw-status-amount" style={{background:'#ECFDF5',border:'1px solid rgba(16,185,129,.15)'}}>
          <p style={{fontSize:11,color:'#6EE7B7',marginBottom:4}}>{description}</p>
          <p style={{fontSize:28,fontWeight:900,color:'#111',letterSpacing:'-.02em'}}>
            {parseFloat(amount).toLocaleString('fr-FR')} <span style={{fontSize:13,color:'#AAA',fontWeight:500}}>{currency}</span>
          </p>
        </div>
        {gatewaySettings.redirectUrl && <p style={{fontSize:11,color:'#CCC',marginTop:14}}>Redirection en cours…</p>}
      </div>
    </div>
  );

  /* ── STATUS: FAILED ── */
  if (status === 'failed') return (
    <div className="gw-status-page">
      <style>{css}</style>
      <div className="gw-status-card">
        <div className="gw-status-icon" style={{background:'#FEF2F2',border:'2px solid rgba(239,68,68,.2)'}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h2 style={{fontSize:22,fontWeight:900,color:'#111',marginBottom:8,letterSpacing:'-.02em'}}>Paiement échoué</h2>
        <p style={{fontSize:13,color:'#AAA',marginBottom:28}}>La transaction n'a pas pu être finalisée.</p>
        <button onClick={() => { setStatus(null); setStep(3); }} className="gw-submit" style={{marginTop:0}}>
          Réessayer
        </button>
      </div>
    </div>
  );

  /* ── MAIN FLOW ── */
  return (
    <div className="gw-page">
      <TopLoadingBar visible={loading} color={primaryColor}/>
      <style>{css}</style>

      <div className="gw-wrapper">

        {/* ── LEFT — Form ── */}
        <div className="gw-left">

          {/* Header mobile */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {gatewaySettings.logo
                ? <img src={gatewaySettings.logo} alt="" style={{height:24,objectFit:'contain'}}/>
                : <div style={{width:28,height:28,borderRadius:8,background:'#1C0F00',display:'flex',alignItems:'center',justifyContent:'center'}}><Shield size={13} style={{color:'#fff'}}/></div>
              }
              {(gatewaySettings.companyName || merchant?.name) && (
                <span style={{fontSize:13,fontWeight:700,color:'#333'}}>{gatewaySettings.companyName || merchant?.name}</span>
              )}
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:18,fontWeight:900,color:'#111',letterSpacing:'-.02em'}}>
                {parseFloat(amount||0).toLocaleString('fr-FR')} <span style={{fontSize:11,color:'#AAA',fontWeight:500}}>{currency}</span>
              </div>
              {description && <div style={{fontSize:10,color:'#CCC'}}>{description}</div>}
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
              {fetchingMerchant ? (
                <div style={{display:'flex',justifyContent:'center',padding:'28px 0'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',border:'3px solid #EDE9E3',borderTopColor:primaryColor}} className="gw-spin"/>
                </div>
              ) : countries.length > 0 ? (
                <div className="gw-country-grid">
                  {countries.map(c => (
                    <button key={c.code} onClick={() => handleSelectCountry(c.code)} className="gw-country-btn">
                      <span className="gw-flag">{c.flag}</span>
                      <div className="gw-cname">{c.name}</div>
                      <div className="gw-ccurr">{c.currency}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{textAlign:'center',padding:'28px 0',color:'#CCC'}}>
                  <Globe size={32} style={{margin:'0 auto 10px',display:'block',opacity:.4}}/>
                  <p style={{fontSize:13,fontWeight:600}}>Aucun moyen de paiement disponible</p>
                </div>
              )}
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
                  <div className="gw-pill-sub">{countryData.currency}</div>
                </div>
              </div>
              <span className="gw-section-lbl">Mode de paiement</span>
              {countryData.methods?.length > 0 ? countryData.methods.map(method => (
                <button key={method.id} onClick={() => { setSelectedMethod(method); setStep(3); }} className="gw-method-btn">
                  <div className="gw-method-icon">{getMethodIcon(method.id)}</div>
                  <span className="gw-method-name">{method.name}</span>
                  <ChevronRight size={14} style={{color:'#CCC'}}/>
                </button>
              )) : (
                <p style={{fontSize:13,color:'#CCC',textAlign:'center',padding:'20px 0'}}>Aucune méthode disponible</p>
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

              {/* ── KKiaPay : widget direct ── */}
              {isKkiapayMethod ? (
                <div>
                  <div className="gw-kkiapay-info">
                    <div className="gw-kkiapay-logo">
                      <div className="gw-kkiapay-dot"/>
                      Paiement via KKiaPay
                    </div>
                    <p style={{margin:0,fontSize:12,color:'#777'}}>
                      Une fenêtre sécurisée KKiaPay s'ouvrira pour finaliser votre paiement.
                      Vous pourrez choisir votre méthode de paiement (Mobile Money, carte bancaire, etc.).
                    </p>
                  </div>

                  <button
                    className="gw-submit"
                    style={{marginTop:0}}
                    onClick={handleKkiapayPayment}
                  >
                    <Zap size={16}/>
                    Payer {parseFloat(amount||0).toLocaleString('fr-FR')} {currency}
                  </button>
                </div>

              ) : (
                /* ── Autres providers : formulaire téléphone ── */
                <form onSubmit={handleSubmit}>
                  <div style={{marginBottom:6}}>
                    <label className="gw-input-label">Numéro de téléphone</label>
                    <input
                      type="tel"
                      className="gw-input"
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
                      <p style={{fontSize:9,color:'#CCC',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Numéros récents</p>
                      {filteredSuggestions.map((p, i) => {
                        const prefix = COUNTRY_PREFIXES[country] || '';
                        const suf = prefix ? p.number.replace(prefix,'') : p.number;
                        return (
                          <button key={i} type="button" className="gw-suggestion"
                            onClick={() => { setPhoneSuffix(suf); setShowSuggestions(false); }}>
                            <Smartphone size={12} style={{color:'#CCC'}}/>
                            <span style={{fontSize:12,color:'#555',fontFamily:"'DM Mono',monospace"}}>{maskPhone(p.number)}</span>
                            <span style={{fontSize:10,color:'#CCC',marginLeft:'auto'}}>Utiliser</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="gw-submit">
                    {loading ? (
                      <>
                        <div style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${btnTextColor}44`,borderTopColor:btnTextColor}} className="gw-spin"/>
                        Traitement en cours…
                      </>
                    ) : (
                      <>
                        <Zap size={16}/>
                        Payer {parseFloat(amount||0).toLocaleString('fr-FR')} {currency}
                      </>
                    )}
                  </button>
                </form>
              )}

              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,marginTop:16,fontSize:10,color:'#DDD',fontWeight:600}}>
                <Lock size={9}/> SSL · PCI DSS · Paiement sécurisé
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT — Summary ── */}
        <SummaryPanel/>
      </div>
    </div>
  );
}