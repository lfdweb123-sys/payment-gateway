import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { sendEmail } from '../../services/brevo';
import {
  CheckCircle, Eye, EyeOff, Save,
  ExternalLink, X, Globe, Plus, AlertCircle, Send, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const SUPPORT_EMAIL = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'support@payment-gateway.com';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  .mp-root { font-family: 'DM Sans', sans-serif; }

  .mp-toggle { position:relative; display:inline-block; width:42px; height:24px; cursor:pointer; flex-shrink:0; }
  .mp-toggle input { opacity:0; width:0; height:0; }
  .mp-slider {
    position:absolute; inset:0;
    background:#e2e8f0; border-radius:999px;
    transition:background .2s;
  }
  .mp-slider::before {
    content:''; position:absolute;
    width:18px; height:18px; left:3px; bottom:3px;
    background:white; border-radius:50%;
    transition:transform .2s;
    box-shadow:0 1px 4px rgba(0,0,0,.2);
  }
  input:checked + .mp-slider { background:#0f172a; }
  input:checked + .mp-slider::before { transform:translateX(18px); }

  .mp-card {
    background:#fff;
    border:1px solid #e8ecf0;
    border-radius:16px;
    overflow:hidden;
    transition:box-shadow .15s, border-color .15s;
  }
  .mp-card:hover { box-shadow:0 4px 24px rgba(0,0,0,.07); border-color:#d1d9e0; }
  .mp-card.active { border-color:#cbd5e1; }

  .mp-card-header {
    padding:20px;
    border-bottom:1px solid #f1f5f9;
    display:flex; align-items:center; gap:14px;
  }

  .mp-provider-logo {
    width:42px; height:42px; border-radius:12px;
    background:#f1f5f9; border:1px solid #e2e8f0;
    display:flex; align-items:center; justify-content:center;
    font-weight:700; font-size:15px; color:#0f172a;
    flex-shrink:0; font-family:'DM Sans',sans-serif;
  }

  .mp-badge {
    display:inline-flex; align-items:center; gap:4px;
    font-size:11px; font-weight:500;
    padding:3px 8px; border-radius:6px;
  }
  .mp-badge-green { background:#f0fdf4; color:#16a34a; }
  .mp-badge-amber { background:#fffbeb; color:#d97706; }

  .mp-card-body { padding:16px 20px 20px; }

  .mp-action-row { display:flex; gap:8px; margin-bottom:16px; }

  .mp-btn-ghost {
    flex:1; padding:8px 10px;
    background:#f8fafc; color:#475569;
    border:1px solid #e8ecf0; border-radius:9px;
    font-size:11px; font-weight:500; font-family:'DM Sans',sans-serif;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;
    transition:background .15s, border-color .15s;
    text-decoration:none;
  }
  .mp-btn-ghost:hover { background:#f1f5f9; border-color:#d1d9e0; color:#0f172a; }

  .mp-field { margin-bottom:10px; }
  .mp-field:last-of-type { margin-bottom:0; }
  .mp-label {
    font-size:11px; font-weight:500; color:#64748b;
    display:block; margin-bottom:5px;
  }
  .mp-label-req { color:#f87171; margin-left:2px; }

  .mp-input-wrap { position:relative; }
  .mp-input {
    width:100%; padding:9px 36px 9px 11px;
    border:1px solid #e2e8f0; border-radius:9px;
    font-size:12px; font-family:'DM Mono',monospace;
    color:#0f172a; background:#fafbfc;
    outline:none; transition:border-color .15s, box-shadow .15s;
    box-sizing:border-box;
  }
  .mp-input:focus { border-color:#94a3b8; box-shadow:0 0 0 3px rgba(148,163,184,.15); background:#fff; }
  .mp-input.error { border-color:#fca5a5; box-shadow:0 0 0 3px rgba(252,165,165,.15); }
  .mp-input-eye {
    position:absolute; right:9px; top:50%; transform:translateY(-50%);
    background:none; border:none; cursor:pointer; color:#94a3b8;
    display:flex; padding:0; transition:color .15s;
  }
  .mp-input-eye:hover { color:#475569; }
  .mp-error-msg {
    font-size:11px; color:#f87171; margin-top:4px;
    display:flex; align-items:center; gap:4px;
  }

  .mp-divider { border:none; border-top:1px solid #f1f5f9; margin:16px 0; }

  .mp-btn-save {
    width:100%; padding:10px;
    background:#0f172a; color:#fff;
    border:none; border-radius:9px;
    font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px;
    transition:background .15s; margin-top:16px;
  }
  .mp-btn-save:hover:not(:disabled) { background:#1e293b; }
  .mp-btn-save:disabled { opacity:.5; cursor:not-allowed; }

  .mp-inactive-hint {
    padding:14px 20px;
    font-size:12px; color:#c0cad4; text-align:center;
    border-top:1px solid #f8fafc;
  }

  .mp-overlay {
    position:fixed; inset:0; background:rgba(15,23,42,.5);
    z-index:50; display:flex; align-items:center; justify-content:center; padding:16px;
    backdrop-filter:blur(3px);
  }
  .mp-modal {
    background:#fff; border-radius:18px;
    width:100%; max-width:420px;
    box-shadow:0 24px 64px rgba(0,0,0,.2);
    overflow:hidden;
  }
  .mp-modal-header {
    padding:20px 20px 18px;
    border-bottom:1px solid #f1f5f9;
    display:flex; align-items:center; justify-content:space-between;
  }
  .mp-modal-close {
    background:#f1f5f9; border:none; cursor:pointer;
    border-radius:8px; padding:7px; display:flex; color:#64748b;
    transition:background .15s;
  }
  .mp-modal-close:hover { background:#e2e8f0; }
  .mp-method-chip {
    display:flex; align-items:center; gap:7px;
    background:#f8fafc; border:1px solid #e8ecf0;
    border-radius:9px; padding:9px 11px;
    font-size:12px; color:#374151;
  }

  .mp-suggest-banner {
    background:#fff; border:1px solid #e8ecf0;
    border-radius:16px; padding:22px 26px;
    display:flex; align-items:center; justify-content:space-between; gap:16px;
    margin-top:32px;
  }
  .mp-btn-suggest {
    background:#0f172a; color:#fff;
    border:none; border-radius:10px; cursor:pointer;
    padding:11px 20px; font-size:13px; font-weight:600;
    font-family:'DM Sans',sans-serif;
    display:flex; align-items:center; gap:7px; white-space:nowrap;
    transition:background .15s;
  }
  .mp-btn-suggest:hover { background:#1e293b; }

  .mp-spinner {
    width:14px; height:14px;
    border:2px solid rgba(255,255,255,.3);
    border-top-color:#fff; border-radius:50%;
    animation:mpspin .6s linear infinite; flex-shrink:0;
  }
  @keyframes mpspin { to { transform:rotate(360deg); } }

  .mp-info-strip {
    background:#f8fafc; border:1px solid #e8ecf0;
    border-radius:12px; padding:14px 16px;
    display:flex; gap:10px; align-items:flex-start;
    margin-bottom:24px;
  }
`;

const PROVIDER_LIST = [
  { id:'feexpay',     name:'FeexPay',      keys:['FEEXPAY_TOKEN','FEEXPAY_SHOP_ID'],                                website:'https://feexpay.me',        countries:5,   methods:['MTN Mobile Money','Moov Money','CELTIIS Money'],                             desc:"Bénin · Togo · Côte d'Ivoire · Sénégal · Congo" },
  { id:'stripe',      name:'Stripe',       keys:['STRIPE_SECRET_KEY','STRIPE_PUBLIC_KEY'],                          website:'https://stripe.com',        countries:35,  methods:['Carte Bancaire','Apple Pay','Google Pay','iDEAL','Giropay'],                desc:'Europe · USA · Canada' },
  { id:'paystack',    name:'Paystack',     keys:['PAYSTACK_SECRET_KEY','PAYSTACK_PUBLIC_KEY'],                      website:'https://paystack.com',      countries:4,   methods:['Carte Bancaire','Virement Bancaire','USSD','QR Code'],                      desc:'Nigeria · Ghana · Kenya · Afrique du Sud' },
  { id:'flutterwave', name:'Flutterwave',  keys:['FLW_SECRET_KEY','FLW_PUBLIC_KEY'],                                website:'https://flutterwave.com',   countries:15,  methods:['Carte Bancaire','Mobile Money','USSD','Bank Transfer'],                     desc:'15 pays africains' },
  { id:'kkiapay',     name:'KKiaPay',      keys:['KKIAPAY_PUBLIC_KEY','KKIAPAY_PRIVATE_KEY','KKIAPAY_SECRET_KEY'],  website:'https://kkiapay.me',        countries:9,   methods:['MTN Mobile Money','Moov Money','Orange Money','Wave','Carte Bancaire'],    desc:'UEMOA · CEMAC' },
  { id:'fedapay',     name:'FedaPay',      keys:['FEDAPAY_SECRET_KEY','FEDAPAY_PUBLIC_KEY'],                        website:'https://fedapay.com',       countries:10,  methods:['Mobile Money','Carte Bancaire'],                                            desc:'10 pays Afrique' },
  { id:'paydunya',    name:'PayDunya',     keys:['PAYDUNYA_MASTER_KEY','PAYDUNYA_PRIVATE_KEY'],                     website:'https://paydunya.com',      countries:8,   methods:['Orange Money','Free Money','Wave','MTN Mobile Money','Carte Bancaire'],    desc:"Sénégal · Côte d'Ivoire · Bénin · Togo" },
  { id:'cinetpay',    name:'CinetPay',     keys:['CINETPAY_API_KEY','CINETPAY_SITE_ID','CINETPAY_SECRET_KEY'],      website:'https://cinetpay.com',      countries:11,  methods:['MTN Mobile Money','Moov Money','Orange Money','Wave','Carte Bancaire'],    desc:'11 pays Afrique' },
  { id:'lygos',       name:'Lygos',        keys:['LYGOS_API_KEY','LYGOS_SECRET_KEY'],                               website:'https://lygosapp.com',      countries:13,  methods:['Mobile Money','Carte Bancaire'],                                            desc:'13 pays Afrique' },
  { id:'paypal',      name:'PayPal',       keys:['PAYPAL_CLIENT_ID','PAYPAL_SECRET_KEY'],                           website:'https://paypal.com',        countries:200, methods:['PayPal','Carte Bancaire','Venmo'],                                          desc:'200+ pays dans le monde' },
  { id:'mbiyopay',    name:'MbiyoPay',     keys:['MBIYOPAY_API_KEY'],                                               website:'https://mbiyopay.com',      countries:11,  methods:['Mobile Money'],                                                            desc:'11 pays Afrique' },
  { id:'qosic',       name:'Qosic',        keys:['QOSIC_API_KEY','QOSIC_MERCHANT_ID'],                              website:'https://qosic.com',         countries:13,  methods:['Mobile Money'],                                                            desc:'13 pays Afrique' },
  { id:'bizao',       name:'Bizao',        keys:['BIZAO_API_KEY','BIZAO_MERCHANT_ID'],                              website:'https://bizao.com',         countries:11,  methods:['Mobile Money'],                                                            desc:'11 pays Afrique' },
  { id:'hub2',        name:'Hub2',         keys:['HUB2_API_KEY'],                                                   website:'https://hub2.io',           countries:10,  methods:['Mobile Money','Carte Bancaire','Wave'],                                     desc:'10 pays Afrique' },
  { id:'chipper',     name:'Chipper Cash', keys:['CHIPPER_API_KEY'],                                                website:'https://chippercash.com',   countries:9,   methods:['Chipper Wallet','Mobile Money','Carte Bancaire'],                           desc:'Afrique anglophone · USA · UK' },
];

/* ── Suggest modal ── */
function SuggestModal({ onClose }) {
  const [form, setForm] = useState({ name:'', website:'', countries:'', methods:'', reason:'' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Le nom du provider est requis'); return; }
    setLoading(true);
    try {
      const result = await sendEmail({
        to: SUPPORT_EMAIL,
        toName: 'Support Payment Gateway',
        subject: `[Suggestion Provider] ${form.name}`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">
            <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:28px;">
              <h2 style="color:#111827;margin:0 0 20px;font-size:18px;">💡 Nouvelle suggestion de provider</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:130px;vertical-align:top;"><strong>Provider</strong></td><td style="padding:8px 0;color:#111827;font-size:13px;">${form.name}</td></tr>
                ${form.website ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;"><strong>Site web</strong></td><td style="padding:8px 0;font-size:13px;"><a href="${form.website}" style="color:#f97316;">${form.website}</a></td></tr>` : ''}
                ${form.countries ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;"><strong>Pays couverts</strong></td><td style="padding:8px 0;color:#111827;font-size:13px;">${form.countries}</td></tr>` : ''}
                ${form.methods ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;"><strong>Méthodes</strong></td><td style="padding:8px 0;color:#111827;font-size:13px;">${form.methods}</td></tr>` : ''}
                ${form.reason ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;"><strong>Raison</strong></td><td style="padding:8px 0;color:#111827;font-size:13px;">${form.reason}</td></tr>` : ''}
              </table>
              <p style="color:#9ca3af;font-size:11px;margin-top:20px;border-top:1px solid #f3f4f6;padding-top:12px;">Reçu le ${new Date().toLocaleString('fr-FR')} • Payment Gateway</p>
            </div>
          </div>
        `,
      });
      if (!result.success) throw new Error(result.error);
      setSent(true);
      setTimeout(onClose, 2400);
    } catch(err) {
      console.error(err);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key:'name',     label:"Nom du provider / agrégateur", placeholder:'Ex : WavePay', required:true },
    { key:'website',  label:'Site web',                     placeholder:'https://...' },
    { key:'countries',label:'Pays couverts',                placeholder:'Ex : Bénin, Togo, Cameroun' },
    { key:'methods',  label:'Méthodes de paiement',         placeholder:'Ex : Mobile Money, Carte Bancaire' },
    { key:'reason',   label:"Pourquoi l'ajouter ?",         placeholder:'Optionnel' },
  ];

  return (
    <div className="mp-overlay" onClick={onClose}>
      <div className="mp-modal" onClick={e=>e.stopPropagation()}>
        <div className="mp-modal-header">
          <div>
            <div style={{fontWeight:700,fontSize:15,color:'#0f172a'}}>Suggérer un provider</div>
            <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>Votre suggestion sera examinée par l'équipe</div>
          </div>
          <button className="mp-modal-close" onClick={onClose}><X size={15}/></button>
        </div>
        {sent ? (
          <div style={{padding:'40px 20px',textAlign:'center'}}>
            <CheckCircle size={40} style={{color:'#16a34a',margin:'0 auto 14px'}}/>
            <p style={{fontWeight:700,color:'#0f172a',fontSize:15,margin:0}}>Suggestion envoyée !</p>
            <p style={{fontSize:13,color:'#94a3b8',marginTop:6}}>Merci pour votre contribution.</p>
          </div>
        ) : (
          <div style={{padding:20,display:'flex',flexDirection:'column',gap:12}}>
            {fields.map(({key,label,placeholder,required})=>(
              <div key={key}>
                <label className="mp-label">{label}{required&&<span className="mp-label-req">*</span>}</label>
                <input className="mp-input" style={{paddingRight:11}} value={form[key]}
                  onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={placeholder}/>
              </div>
            ))}
            <button className="mp-btn-save" onClick={handleSubmit} disabled={loading} style={{marginTop:4}}>
              {loading
                ? <span className="mp-spinner"/>
                : <Send size={13}/>
              }
              {loading ? 'Envoi en cours…' : 'Envoyer la suggestion'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Methods modal ── */
function MethodsModal({ provider, onClose }) {
  if (!provider) return null;
  return (
    <div className="mp-overlay" onClick={onClose}>
      <div className="mp-modal" onClick={e=>e.stopPropagation()}>
        <div className="mp-modal-header">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div className="mp-provider-logo">{provider.name.slice(0,2).toUpperCase()}</div>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:'#0f172a'}}>{provider.name}</div>
              <div style={{fontSize:12,color:'#94a3b8'}}>{provider.countries} pays · {provider.methods.length} méthodes</div>
            </div>
          </div>
          <button className="mp-modal-close" onClick={onClose}><X size={15}/></button>
        </div>
        <div style={{padding:20}}>
          <p style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:12}}>Méthodes acceptées</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {provider.methods.map((m,i)=>(
              <div key={i} className="mp-method-chip">
                <CheckCircle size={13} style={{color:'#16a34a',flexShrink:0}}/>{m}
              </div>
            ))}
          </div>
          <hr className="mp-divider"/>
          <p style={{fontSize:12,color:'#64748b',marginBottom:10}}>{provider.desc}</p>
          <a href={provider.website} target="_blank" rel="noopener noreferrer"
            style={{fontSize:12,color:'#0f172a',fontWeight:600,display:'inline-flex',alignItems:'center',gap:5,textDecoration:'none'}}>
            <Globe size={13}/> Visiter le site <ExternalLink size={11}/>
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Provider card ── */
function ProviderCard({ provider, onToggle, onSave, onShowMethods, saving }) {
  const [showKeys, setShowKeys] = useState({});
  const [localKeys, setLocalKeys] = useState(
    ()=>provider.keys.reduce((acc,k)=>({...acc,[k.name]:k.value}),{})
  );
  const [errors, setErrors] = useState({});

  useEffect(()=>{
    setLocalKeys(provider.keys.reduce((acc,k)=>({...acc,[k.name]:k.value}),{}));
  },[provider.keys]);

  const handleSave = () => {
    const newErrors = {};
    provider.keys.forEach(k=>{ if(!localKeys[k.name]?.trim()) newErrors[k.name]=true; });
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      toast.error('Remplissez tous les champs avant d\'enregistrer');
      return;
    }
    setErrors({});
    onSave(provider.id, localKeys);
  };

  const allFilled = provider.keys.every(k=>localKeys[k.name]?.trim());

  return (
    <div className={`mp-card ${provider.active?'active':''}`}>
      <div className="mp-card-header">
        <div className="mp-provider-logo">{provider.name.slice(0,2).toUpperCase()}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span style={{fontWeight:700,fontSize:14,color:'#0f172a'}}>{provider.name}</span>
            {provider.active && allFilled && (
              <span className="mp-badge mp-badge-green"><CheckCircle size={10}/> Configuré</span>
            )}
            {provider.active && !allFilled && (
              <span className="mp-badge mp-badge-amber">Incomplet</span>
            )}
          </div>
          <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{provider.desc}</div>
        </div>
        <label className="mp-toggle" title={provider.active?'Désactiver':'Activer'}>
          <input type="checkbox" checked={provider.active} onChange={()=>onToggle(provider.id)}/>
          <span className="mp-slider"/>
        </label>
      </div>

      {provider.active && (
        <div className="mp-card-body">
          <div className="mp-action-row">
            <button className="mp-btn-ghost" onClick={()=>onShowMethods(provider)}>
              <Info size={11}/> Méthodes ({provider.methods.length})
            </button>
            <a className="mp-btn-ghost" href={provider.website} target="_blank" rel="noopener noreferrer">
              <Globe size={11}/> Site web <ExternalLink size={10}/>
            </a>
          </div>
          <hr className="mp-divider" style={{margin:'0 0 14px'}}/>
          {provider.keys.map(key=>(
            <div key={key.name} className="mp-field">
              <label className="mp-label">{key.name}<span className="mp-label-req">*</span></label>
              <div className="mp-input-wrap">
                <input
                  className={`mp-input${errors[key.name]?' error':''}`}
                  type={showKeys[key.name]?'text':'password'}
                  value={localKeys[key.name]||''}
                  onChange={e=>{
                    setLocalKeys(p=>({...p,[key.name]:e.target.value}));
                    if(errors[key.name]) setErrors(p=>({...p,[key.name]:false}));
                  }}
                  placeholder={`Votre ${key.name}`}
                />
                <button className="mp-input-eye"
                  onClick={()=>setShowKeys(p=>({...p,[key.name]:!p[key.name]}))}>
                  {showKeys[key.name]?<EyeOff size={13}/>:<Eye size={13}/>}
                </button>
              </div>
              {errors[key.name] && (
                <p className="mp-error-msg"><AlertCircle size={10}/> Ce champ est requis</p>
              )}
            </div>
          ))}
          <button className="mp-btn-save" onClick={handleSave} disabled={saving===provider.id}>
            {saving===provider.id ? <span className="mp-spinner"/> : <Save size={13}/>}
            Enregistrer
          </button>
        </div>
      )}

      {!provider.active && (
        <div className="mp-inactive-hint">Activez le toggle pour configurer les clés API</div>
      )}
    </div>
  );
}

/* ── Main ── */
export default function MerchantProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [methodsModal, setMethodsModal] = useState(null);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(()=>{ loadProviders(); },[]);

  const loadProviders = async () => {
    try {
      const snap = await getDoc(doc(db,'gateway_merchants',user.uid));
      const saved = snap.exists()?snap.data().providers||{}:{};
      setProviders(PROVIDER_LIST.map(p=>({
        ...p,
        active: saved[p.id]?.active||false,
        keys: p.keys.map(k=>({name:k, value:saved[p.id]?.[k]||''})),
      })));
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  };

  const handleToggle = async (id) => {
    const provider = providers.find(p=>p.id===id);
    const next = !provider.active;
    setProviders(prev=>prev.map(p=>p.id===id?{...p,active:next}:p));
    try {
      const snap = await getDoc(doc(db,'gateway_merchants',user.uid));
      const current = snap.exists()?snap.data().providers||{}:{};
      current[id]={...(current[id]||{}),active:next};
      await setDoc(doc(db,'gateway_merchants',user.uid),{providers:current,updatedAt:new Date().toISOString()},{merge:true});
      toast.success(next?`${provider.name} activé`:`${provider.name} désactivé`);
    } catch {
      setProviders(prev=>prev.map(p=>p.id===id?{...p,active:!next}:p));
      toast.error('Erreur de sauvegarde');
    }
  };

  const handleSave = async (id, localKeys) => {
    setSaving(id);
    const provider = providers.find(p=>p.id===id);
    try {
      const snap = await getDoc(doc(db,'gateway_merchants',user.uid));
      const current = snap.exists()?snap.data().providers||{}:{};
      current[id]={active:provider.active,...localKeys};
      await setDoc(doc(db,'gateway_merchants',user.uid),{providers:current,updatedAt:new Date().toISOString()},{merge:true});
      setProviders(prev=>prev.map(p=>p.id!==id?p:{
        ...p, keys:p.keys.map(k=>({...k,value:localKeys[k.name]??k.value}))
      }));
      toast.success(`${provider.name} enregistré`);
    } catch{ toast.error('Erreur de sauvegarde'); }
    finally{ setSaving(null); }
  };

  if (loading) return (
    <div style={{display:'flex',justifyContent:'center',padding:'80px 0'}}>
      <div style={{width:28,height:28,border:'2px solid #e2e8f0',borderTopColor:'#0f172a',borderRadius:'50%',animation:'mpspin .7s linear infinite'}}/>
      <style>{`@keyframes mpspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const activeCount = providers.filter(p=>p.active).length;
  const configuredCount = providers.filter(p=>p.active&&p.keys.every(k=>k.value?.trim())).length;

  return (
    <div className="mp-root" style={{maxWidth:1100,margin:'0 auto',padding:'24px 16px 60px'}}>
      <style>{styles}</style>

      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:'#0f172a',margin:0}}>Providers de paiement</h1>
        <p style={{fontSize:12,color:'#94a3b8',marginTop:4}}>
          {activeCount} activé{activeCount!==1?'s':''} · {configuredCount} configuré{configuredCount!==1?'s':''} sur {PROVIDER_LIST.length}
        </p>
      </div>

      <div className="mp-info-strip">
        <Info size={15} style={{color:'#64748b',flexShrink:0,marginTop:1}}/>
        <p style={{fontSize:12,color:'#64748b',margin:0,lineHeight:1.6}}>
          Créez un compte chez le provider de votre choix, récupérez vos clés API, activez puis enregistrez.
          Vos clients voient uniquement les méthodes de paiement, pas le nom du provider.
        </p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))',gap:16}}>
        {providers.map(provider=>(
          <ProviderCard
            key={provider.id}
            provider={provider}
            onToggle={handleToggle}
            onSave={handleSave}
            onShowMethods={setMethodsModal}
            saving={saving}
          />
        ))}
      </div>

      <div className="mp-suggest-banner">
        <div>
          <p style={{fontWeight:700,fontSize:14,color:'#0f172a',margin:0}}>Vous ne trouvez pas votre provider ?</p>
          <p style={{fontSize:12,color:'#94a3b8',marginTop:3,marginBottom:0}}>
            Suggérez un provider ou agrégateur, nous l'étudierons pour l'intégrer.
          </p>
        </div>
        <button className="mp-btn-suggest" onClick={()=>setSuggestOpen(true)}>
          <Plus size={14}/> Suggérer un provider
        </button>
      </div>

      <MethodsModal provider={methodsModal} onClose={()=>setMethodsModal(null)}/>
      {suggestOpen && <SuggestModal onClose={()=>setSuggestOpen(false)}/>}
    </div>
  );
}