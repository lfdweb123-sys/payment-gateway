import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Shield, Lock, Smartphone, CreditCard, ChevronRight, CheckCircle2, Globe, ArrowLeft, Zap } from 'lucide-react';
import { getMethodsForCountryWithProviders, getCountriesForProviders } from '../../services/countryMethods';
import toast from 'react-hot-toast';

/* ─── Constantes (inchangées) ─────────────────────────── */
const DEFAULT_SETTINGS = {
  paymentDesign: 'modern', primaryColor: '#f97316', logo: '', companyName: '',
  redirectUrl: '', defaultCurrency: 'XOF',
};

const COUNTRY_PREFIXES = {
  bj:'229',ci:'225',tg:'228',sn:'221',bf:'226',ml:'223',ne:'227',gn:'224',
  cm:'237',ga:'241',cd:'243',cg:'242',ng:'234',gh:'233',ke:'254',ug:'256',
  tz:'255',rw:'250',za:'27',fr:'33',be:'32',de:'49',nl:'31',gb:'44',us:'1'
};

/* ─── Loading bar ─────────────────────────────────────── */
function TopLoadingBar({ visible }) {
  if (!visible) return null;
  return (
    <div style={{ position:'fixed',top:0,left:0,right:0,zIndex:9999,height:3 }}>
      <div style={{
        height:'100%',
        background:'linear-gradient(90deg,#C8931A 0%,#F5C518 50%,#C8931A 100%)',
        backgroundSize:'200% 100%',
        animation:'gw-shimmer 1.4s ease infinite',
        borderRadius:2,
      }}/>
    </div>
  );
}

function getMethodIcon(methodId, size=20) {
  const cards = ['card','paypal','apple_pay','google_pay','chipper_wallet','bank_transfer','ideal','bancontact','giropay','sofort'];
  return cards.includes(methodId) ? <CreditCard size={size}/> : <Smartphone size={size}/>;
}

function maskPhone(phone) {
  if (!phone || phone.length < 8) return phone;
  return phone.substring(0,3) + '••••' + phone.substring(phone.length-3);
}

/* ─── Stepper ─────────────────────────────────────────── */
function Stepper({ current }) {
  const steps = ['Pays','Méthode','Paiement'];
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, justifyContent:'center' }}>
      {steps.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={s} style={{ display:'flex', alignItems:'center' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{
                width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:800,
                background: done ? '#C8931A' : active ? '#fff' : 'rgba(255,255,255,.15)',
                color: done ? '#fff' : active ? '#C8931A' : 'rgba(255,255,255,.4)',
                border: active ? '2px solid #C8931A' : done ? '2px solid #C8931A' : '2px solid rgba(255,255,255,.15)',
                transition:'all .3s',
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize:9, fontWeight:700, color: active ? '#F5C518' : done ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.07em', whiteSpace:'nowrap' }}>{s}</span>
            </div>
            {i < steps.length-1 && (
              <div style={{ width:48, height:2, margin:'0 4px', marginBottom:18, background: done ? 'linear-gradient(90deg,#C8931A,#F5C518)' : 'rgba(255,255,255,.1)', borderRadius:1, transition:'background .3s' }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────── */
export default function GatewayPay() {
  const [searchParams] = useSearchParams();
  const token        = searchParams.get('token');
  const amountParam  = searchParams.get('amount');
  const description  = searchParams.get('desc') || 'Paiement en ligne';

  const [step, setStep]             = useState(1);
  const [country, setCountry]       = useState(null);
  const [countryData, setCountryData] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [phoneSuffix, setPhoneSuffix] = useState('');
  const [amount]                    = useState(amountParam || '5000');
  const [loading, setLoading]       = useState(false);
  const [merchant, setMerchant]     = useState(null);
  const [countries, setCountries]   = useState([]);
  const [status, setStatus]         = useState(null);
  const [pollMsg, setPollMsg]       = useState('Paiement en cours…');
  const [fetchingMerchant, setFetchingMerchant] = useState(true);
  const [gatewaySettings, setGatewaySettings]   = useState(DEFAULT_SETTINGS);
  const [savedPhones, setSavedPhones]           = useState([]);
  const [showSuggestions, setShowSuggestions]   = useState(false);

  /* ─── Init (inchangé) ─────────────────────────────── */
  useEffect(() => {
    if (!token) { setFetchingMerchant(false); return; }
    getDoc(doc(db,'gateway_settings','config'))
      .then(snap => { if (snap.exists()) setGatewaySettings(p => ({...p,...snap.data()})); })
      .catch(()=>{});
    fetch(`/api/gateway/merchant/${token}`)
      .then(r=>r.json())
      .then(data => {
        if (data.success) { setMerchant(data); setCountries(getCountriesForProviders(data.activeProviders||[])); }
      })
      .catch(()=>toast.error('Impossible de charger le marchand'))
      .finally(()=>setFetchingMerchant(false));
    try { const s=localStorage.getItem('gw_saved_phones'); if(s) setSavedPhones(JSON.parse(s)); } catch{}
  }, [token]);

  const handleSelectCountry = (code) => {
    setCountry(code);
    setCountryData(getMethodsForCountryWithProviders(code, merchant?.activeProviders||[]));
    setPhoneSuffix('');
    setStep(2);
  };

  const getFullPhoneNumber = () => {
    const prefix = COUNTRY_PREFIXES[country]||'';
    return prefix ? `${prefix}${phoneSuffix.replace(/\s/g,'')}` : phoneSuffix.replace(/\s/g,'');
  };

  const savePhoneNumber = (phone) => {
    if (!phone) return;
    if (!savedPhones.find(p=>p.number===phone)) {
      const updated = [{number:phone,country},...savedPhones].slice(0,5);
      setSavedPhones(updated);
      localStorage.setItem('gw_saved_phones',JSON.stringify(updated));
    }
  };

  const pollStatus = (id) => {
    setStatus('pending');
    const msgs = ['Paiement en cours…','En attente de confirmation…','Vérification en cours…','Presque terminé…'];
    let mi=0;
    const mi_ = setInterval(()=>{ mi=(mi+1)%msgs.length; setPollMsg(msgs[mi]); },3500);
    let attempts=0;
    const iv = setInterval(async()=>{
      attempts++;
      if(attempts>24){ clearInterval(iv); clearInterval(mi_); setStatus('failed'); return; }
      try{
        const r=await fetch(`/api/gateway/verify/${id}`,{headers:{'x-api-key':token}});
        const d=await r.json();
        if(d.status==='completed'){clearInterval(iv);clearInterval(mi_);setStatus('completed');}
        else if(d.status==='failed'){clearInterval(iv);clearInterval(mi_);setStatus('failed');}
      }catch{}
    },5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount||parseFloat(amount)<=0){toast.error('Montant invalide');return;}
    setLoading(true);
    try{
      const fullPhone=getFullPhoneNumber();
      const res=await fetch('/api/gateway/pay',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':token},
        body:JSON.stringify({amount:parseFloat(amount),country,method:selectedMethod?.id,phone:fullPhone,description}),
      });
      const data=await res.json();
      if(data.success){setLoading(false);savePhoneNumber(fullPhone);pollStatus(data.transactionId);}
      else{toast.error(data.error||'Une erreur est survenue');setLoading(false);}
    }catch{toast.error('Erreur de connexion');setLoading(false);}
  };

  useEffect(()=>{
    if(status==='completed'&&gatewaySettings.redirectUrl){
      const t=setTimeout(()=>{window.location.href=gatewaySettings.redirectUrl;},3000);
      return()=>clearTimeout(t);
    }
  },[status,gatewaySettings.redirectUrl]);

  const currency = countryData?.currency || gatewaySettings.defaultCurrency;
  const filteredSuggestions = savedPhones.filter(p=>p.country===country);

  /* ── Inline CSS ── */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
    @keyframes gw-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @keyframes gw-spin{to{transform:rotate(360deg)}}
    @keyframes gw-fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes gw-pulse{0%,100%{opacity:1}50%{opacity:.5}}
    @keyframes gw-scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
    .gw-wrap{
      min-height:100vh;
      background: radial-gradient(ellipse at 20% 50%, #FFF8EE 0%, #FDF5EC 40%, #FAF0E6 100%);
      display:flex;align-items:center;justify-content:center;
      padding:20px;
      font-family:'DM Sans',sans-serif;
    }
    .gw-card{
      width:100%;max-width:480px;
      background:#fff;
      border-radius:32px;
      box-shadow: 0 2px 4px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06), 0 32px 64px rgba(0,0,0,.08);
      overflow:hidden;
      animation:gw-scaleIn .4s cubic-bezier(.34,1.56,.64,1) both;
    }
    .gw-header{
      background: linear-gradient(135deg,#1C0F00 0%,#2E1A00 50%,#1C0F00 100%);
      padding:32px 32px 28px;
      position:relative;overflow:hidden;
    }
    .gw-header::before{
      content:'';position:absolute;inset:0;
      background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C8931A' fill-opacity='0.06'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    .gw-header-top{
      display:flex;align-items:center;justify-content:space-between;
      margin-bottom:28px;position:relative;
    }
    .gw-secure-badge{
      display:inline-flex;align-items:center;gap:6px;
      background:rgba(200,147,26,.15);
      border:1px solid rgba(200,147,26,.3);
      padding:5px 12px;border-radius:50px;
    }
    .gw-amount-block{text-align:center;margin-bottom:28px;position:relative;}
    .gw-amount-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.14em;margin-bottom:12px;}
    .gw-amount-val{
      font-size:56px;font-weight:900;color:#fff;letter-spacing:-.04em;line-height:1;
      text-shadow:0 2px 20px rgba(200,147,26,.3);
    }
    .gw-amount-curr{font-size:18px;font-weight:500;color:rgba(255,255,255,.4);margin-left:8px;}
    .gw-amount-desc{font-size:13px;color:rgba(255,255,255,.4);margin-top:10px;font-weight:500;}
    .gw-stepper-wrap{position:relative;padding-top:20px;border-top:1px solid rgba(255,255,255,.08);}
    .gw-body{padding:28px 32px 32px;}
    .gw-section-label{font-size:10px;font-weight:800;color:#B07A10;text-transform:uppercase;letter-spacing:.14em;margin-bottom:16px;display:flex;align-items:center;gap:6px;}
    /* Country grid */
    .gw-country-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
    .gw-country-btn{
      padding:16px 10px;border-radius:18px;
      background:#FAFAF8;border:1.5px solid #F0EDE8;
      cursor:pointer;text-align:center;
      transition:all .2s;font-family:inherit;
    }
    .gw-country-btn:hover{background:#FFF8EE;border-color:#C8931A;transform:translateY(-2px);box-shadow:0 8px 24px rgba(200,147,26,.15);}
    .gw-country-flag{font-size:28px;display:block;margin-bottom:8px;line-height:1;}
    .gw-country-name{font-size:11px;font-weight:700;color:#222;line-height:1.2;}
    .gw-country-curr{font-size:10px;color:#AAA;margin-top:2px;}
    /* Method list */
    .gw-method-btn{
      width:100%;padding:16px 18px;border-radius:16px;
      background:#FAFAF8;border:1.5px solid #F0EDE8;
      cursor:pointer;display:flex;align-items:center;gap:14px;
      transition:all .2s;font-family:inherit;text-align:left;
      margin-bottom:8px;
    }
    .gw-method-btn:hover{background:#FFF8EE;border-color:#C8931A;transform:translateX(3px);}
    .gw-method-icon{
      width:44px;height:44px;border-radius:14px;flex-shrink:0;
      background:linear-gradient(135deg,#FFF3D6,#FFE4A0);
      border:1px solid rgba(200,147,26,.25);
      display:flex;align-items:center;justify-content:center;
      color:#B07A10;
    }
    .gw-method-name{flex:1;font-size:14px;font-weight:700;color:#111;}
    /* Pill recap */
    .gw-pill{
      display:flex;align-items:center;gap:12px;
      padding:14px 16px;border-radius:16px;
      background:linear-gradient(135deg,#FFFBF5,#FFF5E6);
      border:1.5px solid rgba(200,147,26,.2);
      margin-bottom:24px;
    }
    .gw-pill-icon{
      width:40px;height:40px;border-radius:12px;flex-shrink:0;
      background:linear-gradient(135deg,#C8931A,#F5C518);
      display:flex;align-items:center;justify-content:center;color:#fff;
    }
    .gw-pill-name{font-size:14px;font-weight:700;color:#111;}
    .gw-pill-sub{font-size:11px;color:#AAA;margin-top:1px;}
    /* Input */
    .gw-input-wrap{margin-bottom:24px;}
    .gw-input-label{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;display:block;}
    .gw-input{
      width:100%;padding:16px 18px;
      background:#F7F5F2;border:2px solid #EDE9E3;border-radius:16px;
      font-size:16px;font-family:'DM Mono',monospace;
      color:#111;outline:none;transition:all .2s;
    }
    .gw-input:focus{border-color:#C8931A;background:#fff;box-shadow:0 0 0 4px rgba(200,147,26,.1);}
    /* Suggestions */
    .gw-suggestion{
      width:100%;text-align:left;padding:10px 14px;
      background:#FAFAF8;border:1px solid #F0EDE8;border-radius:12px;
      margin-bottom:5px;cursor:pointer;display:flex;align-items:center;gap:10px;
      transition:background .15s;font-family:inherit;
    }
    .gw-suggestion:hover{background:#FFF8EE;}
    /* Submit */
    .gw-submit{
      width:100%;padding:18px;border-radius:18px;border:none;cursor:pointer;
      background:linear-gradient(135deg,#C8931A 0%,#F5C518 100%);
      color:#1C0F00;font-size:16px;font-weight:900;
      display:flex;align-items:center;justify-content:center;gap:10px;
      font-family:'DM Sans',sans-serif;
      box-shadow:0 4px 16px rgba(200,147,26,.35),0 1px 3px rgba(200,147,26,.2);
      transition:all .25s;letter-spacing:-.01em;
    }
    .gw-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 40px rgba(200,147,26,.5);}
    .gw-submit:active:not(:disabled){transform:translateY(0);}
    .gw-submit:disabled{opacity:.5;cursor:not-allowed;}
    /* Back btn */
    .gw-back{
      display:inline-flex;align-items:center;gap:6px;
      font-size:13px;font-weight:600;color:#AAA;
      background:none;border:none;cursor:pointer;padding:0;
      margin-bottom:24px;transition:color .2s;font-family:inherit;
    }
    .gw-back:hover{color:#C8931A;}
    /* Footer */
    .gw-footer{
      display:flex;align-items:center;justify-content:center;gap:8px;
      margin-top:22px;padding-top:18px;
      border-top:1px solid #F0EDE8;
      font-size:11px;color:#CCC;font-weight:600;
    }
    .gw-fade{animation:gw-fadeUp .3s ease both;}
    /* Spinner */
    .gw-spin{animation:gw-spin .8s linear infinite;}
    /* Status cards */
    .gw-status{
      width:100%;max-width:440px;
      background:#fff;border-radius:32px;
      padding:48px 36px;text-align:center;
      box-shadow:0 2px 4px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.06),0 32px 64px rgba(0,0,0,.08);
      animation:gw-scaleIn .4s cubic-bezier(.34,1.56,.64,1) both;
    }
    .gw-status-icon{
      width:80px;height:80px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      margin:0 auto 24px;
    }
    .gw-status-amount{
      background:#F7F5F2;border-radius:16px;padding:20px 24px;margin-top:24px;
    }
    @media(max-width:480px){
      .gw-country-grid{grid-template-columns:1fr 1fr;}
      .gw-body{padding:20px 20px 24px;}
      .gw-header{padding:24px 20px 20px;}
      .gw-amount-val{font-size:42px;}
    }
  `;

  /* ── Pending ── */
  if (status==='pending') return (
    <div className="gw-wrap">
      <style>{css}</style>
      <div className="gw-status">
        <div className="gw-status-icon" style={{background:'linear-gradient(135deg,#FFF3D6,#FFE4A0)',border:'2px solid rgba(200,147,26,.3)'}}>
          <div style={{width:36,height:36,borderRadius:'50%',border:'3px solid rgba(200,147,26,.2)',borderTopColor:'#C8931A'}} className="gw-spin"/>
        </div>
        <h2 style={{fontSize:22,fontWeight:800,color:'#111',marginBottom:8,letterSpacing:'-.02em'}}>{pollMsg}</h2>
        <p style={{fontSize:14,color:'#AAA',lineHeight:1.6}}>Confirmez le paiement sur votre téléphone.</p>
        <div className="gw-status-amount">
          <p style={{fontSize:11,color:'#CCC',marginBottom:6,fontWeight:600}}>{description}</p>
          <p style={{fontSize:30,fontWeight:900,color:'#111',letterSpacing:'-.02em'}}>{parseFloat(amount).toLocaleString('fr-FR')} <span style={{fontSize:14,color:'#AAA',fontWeight:500}}>{currency}</span></p>
        </div>
        <p style={{fontSize:11,color:'#DDD',marginTop:20}}>Ne fermez pas cette page</p>
      </div>
    </div>
  );

  /* ── Completed ── */
  if (status==='completed') return (
    <div className="gw-wrap">
      <style>{css}</style>
      <div className="gw-status">
        <div className="gw-status-icon" style={{background:'linear-gradient(135deg,#ECFDF5,#D1FAE5)',border:'2px solid rgba(16,185,129,.3)'}}>
          <CheckCircle2 size={36} style={{color:'#10B981'}}/>
        </div>
        {gatewaySettings.logo && <img src={gatewaySettings.logo} alt="" style={{height:28,margin:'0 auto 16px',display:'block',objectFit:'contain'}}/>}
        <h2 style={{fontSize:24,fontWeight:900,color:'#111',marginBottom:8,letterSpacing:'-.02em'}}>Paiement réussi !</h2>
        <p style={{fontSize:14,color:'#AAA'}}>Votre transaction a été confirmée.</p>
        <div className="gw-status-amount" style={{background:'#ECFDF5',border:'1px solid rgba(16,185,129,.2)'}}>
          <p style={{fontSize:11,color:'#6EE7B7',marginBottom:6,fontWeight:600}}>{description}</p>
          <p style={{fontSize:30,fontWeight:900,color:'#111',letterSpacing:'-.02em'}}>{parseFloat(amount).toLocaleString('fr-FR')} <span style={{fontSize:14,color:'#AAA',fontWeight:500}}>{currency}</span></p>
        </div>
        {gatewaySettings.redirectUrl && <p style={{fontSize:11,color:'#CCC',marginTop:16}}>Redirection en cours…</p>}
      </div>
    </div>
  );

  /* ── Failed ── */
  if (status==='failed') return (
    <div className="gw-wrap">
      <style>{css}</style>
      <div className="gw-status">
        <div className="gw-status-icon" style={{background:'linear-gradient(135deg,#FEF2F2,#FEE2E2)',border:'2px solid rgba(239,68,68,.25)'}}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <h2 style={{fontSize:24,fontWeight:900,color:'#111',marginBottom:8,letterSpacing:'-.02em'}}>Paiement échoué</h2>
        <p style={{fontSize:14,color:'#AAA',marginBottom:32}}>La transaction n'a pas pu être finalisée.</p>
        <button onClick={()=>{setStatus(null);setStep(3);}} className="gw-submit">
          Réessayer
        </button>
      </div>
    </div>
  );

  /* ── Main flow ── */
  return (
    <div className="gw-wrap">
      <TopLoadingBar visible={loading}/>
      <style>{css}</style>

      <div className="gw-card">

        {/* ── HEADER ── */}
        <div className="gw-header">
          <div className="gw-header-top">
            <div className="gw-secure-badge">
              <Shield size={11} style={{color:'#C8931A'}}/>
              <span style={{fontSize:10,fontWeight:700,color:'#C8931A',textTransform:'uppercase',letterSpacing:'.1em'}}>Sécurisé</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {gatewaySettings.logo && <img src={gatewaySettings.logo} alt="" style={{height:20,objectFit:'contain',opacity:.7}}/>}
              {(gatewaySettings.companyName||merchant?.name) && (
                <span style={{fontSize:12,color:'rgba(255,255,255,.35)',fontWeight:600}}>
                  {gatewaySettings.companyName||merchant?.name}
                </span>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="gw-amount-block">
            <p className="gw-amount-label">Montant à payer</p>
            <div>
              <span className="gw-amount-val">{parseFloat(amount||0).toLocaleString('fr-FR')}</span>
              <span className="gw-amount-curr">{currency}</span>
            </div>
            {description && <p className="gw-amount-desc">{description}</p>}
          </div>

          {/* Stepper */}
          <div className="gw-stepper-wrap">
            <Stepper current={step}/>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="gw-body">

          {/* STEP 1 — Pays */}
          {step===1 && (
            <div className="gw-fade">
              <p className="gw-section-label"><Globe size={12}/> Votre pays</p>
              {fetchingMerchant ? (
                <div style={{display:'flex',justifyContent:'center',padding:'32px 0'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid #F0EDE8',borderTopColor:'#C8931A'}} className="gw-spin"/>
                </div>
              ) : countries.length>0 ? (
                <div className="gw-country-grid">
                  {countries.map(c=>(
                    <button key={c.code} onClick={()=>handleSelectCountry(c.code)} className="gw-country-btn">
                      <span className="gw-country-flag">{c.flag}</span>
                      <div className="gw-country-name">{c.name}</div>
                      <div className="gw-country-curr">{c.currency}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{textAlign:'center',padding:'32px 0',color:'#CCC'}}>
                  <Globe size={36} style={{margin:'0 auto 12px',display:'block',opacity:.4}}/>
                  <p style={{fontSize:13,fontWeight:600}}>Aucun moyen de paiement disponible</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Méthode */}
          {step===2 && countryData && (
            <div className="gw-fade">
              <button className="gw-back" onClick={()=>{setStep(1);setCountryData(null);setCountry(null);}}>
                <ArrowLeft size={14}/> Changer de pays
              </button>
              <div className="gw-pill">
                <div className="gw-pill-icon"><span style={{fontSize:22}}>{countryData.flag}</span></div>
                <div>
                  <div className="gw-pill-name">{countryData.name}</div>
                  <div className="gw-pill-sub">Devise : {countryData.currency}</div>
                </div>
              </div>
              <p className="gw-section-label"><CreditCard size={12}/> Mode de paiement</p>
              {countryData.methods?.length>0 ? countryData.methods.map(method=>(
                <button key={method.id} onClick={()=>{setSelectedMethod(method);setStep(3);}} className="gw-method-btn">
                  <div className="gw-method-icon">{getMethodIcon(method.id)}</div>
                  <span className="gw-method-name">{method.name}</span>
                  <ChevronRight size={16} style={{color:'#CCC'}}/>
                </button>
              )) : (
                <p style={{textAlign:'center',padding:'24px 0',fontSize:13,color:'#CCC'}}>Aucune méthode disponible</p>
              )}
            </div>
          )}

          {/* STEP 3 — Paiement */}
          {step===3 && selectedMethod && (
            <div className="gw-fade">
              <button className="gw-back" onClick={()=>{setStep(2);setSelectedMethod(null);setPhoneSuffix('');}}>
                <ArrowLeft size={14}/> Changer de méthode
              </button>
              <div className="gw-pill">
                <div className="gw-pill-icon">{getMethodIcon(selectedMethod.id,20)}</div>
                <div>
                  <div className="gw-pill-name">{selectedMethod.name}</div>
                  <div className="gw-pill-sub">{countryData?.flag} {countryData?.name}</div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="gw-input-wrap">
                  <label className="gw-input-label">Numéro de téléphone</label>
                  <input
                    type="tel"
                    className="gw-input"
                    value={phoneSuffix ? `${COUNTRY_PREFIXES[country]||''} ${phoneSuffix}` : COUNTRY_PREFIXES[country]||''}
                    onChange={e=>{
                      const prefix=COUNTRY_PREFIXES[country]||'';
                      const val=e.target.value;
                      if(prefix&&!val.startsWith(prefix)) return;
                      const suffix=prefix?val.slice(prefix.length).trim():val;
                      setPhoneSuffix(suffix);
                      setShowSuggestions(suffix.length===0);
                    }}
                    onFocus={()=>setShowSuggestions(phoneSuffix.length===0)}
                    placeholder={COUNTRY_PREFIXES[country]?`${COUNTRY_PREFIXES[country]} 97000000`:'97000000'}
                    required
                  />
                  {showSuggestions && filteredSuggestions.length>0 && phoneSuffix.length===0 && (
                    <div style={{marginTop:10}}>
                      <p style={{fontSize:10,color:'#CCC',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8}}>Numéros récents</p>
                      {filteredSuggestions.map((p,i)=>{
                        const prefix=COUNTRY_PREFIXES[country]||'';
                        const suf=prefix?p.number.replace(prefix,''):p.number;
                        return (
                          <button key={i} type="button" className="gw-suggestion"
                            onClick={()=>{setPhoneSuffix(suf);setShowSuggestions(false);}}>
                            <Smartphone size={13} style={{color:'#CCC'}}/>
                            <span style={{fontSize:13,color:'#555',fontFamily:"'DM Mono',monospace"}}>{maskPhone(p.number)}</span>
                            <span style={{fontSize:10,color:'#CCC',marginLeft:'auto'}}>Utiliser</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading} className="gw-submit">
                  {loading ? (
                    <>
                      <div style={{width:18,height:18,borderRadius:'50%',border:'2.5px solid rgba(0,0,0,.2)',borderTopColor:'#1C0F00'}} className="gw-spin"/>
                      Traitement en cours…
                    </>
                  ) : (
                    <>
                      <Zap size={18}/>
                      Payer {parseFloat(amount||0).toLocaleString('fr-FR')} {currency}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Footer sécurité */}
          <div className="gw-footer">
            <Lock size={11}/>
            <span>Chiffrement SSL · PCI DSS · Paiement sécurisé</span>
          </div>
        </div>
      </div>
    </div>
  );
}