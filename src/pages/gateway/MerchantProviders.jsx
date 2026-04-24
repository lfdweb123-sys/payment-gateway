import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle, Eye, EyeOff, Save, Loader, ExternalLink,
  X, Globe, ChevronDown, ChevronUp, Plus, AlertCircle, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Design tokens ─────────────────────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  .mp-root { font-family: 'DM Sans', sans-serif; }
  .mp-mono { font-family: 'DM Mono', monospace; }

  .mp-toggle { position:relative; display:inline-block; width:40px; height:22px; cursor:pointer; }
  .mp-toggle input { opacity:0; width:0; height:0; }
  .mp-slider {
    position:absolute; inset:0;
    background:#e2e8f0; border-radius:999px;
    transition:background .2s;
  }
  .mp-slider::before {
    content:''; position:absolute;
    width:16px; height:16px; left:3px; bottom:3px;
    background:white; border-radius:50%;
    transition:transform .2s;
    box-shadow:0 1px 3px rgba(0,0,0,.25);
  }
  input:checked + .mp-slider { background:#0f172a; }
  input:checked + .mp-slider::before { transform:translateX(18px); }

  .mp-card {
    background:#fff;
    border:1px solid #e8ecf0;
    border-radius:14px;
    transition:box-shadow .15s, border-color .15s;
    overflow:hidden;
  }
  .mp-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.07); border-color:#d1d9e0; }
  .mp-card.active { border-color:#cbd5e1; }

  .mp-badge {
    display:inline-flex; align-items:center; gap:4px;
    background:#f1f5f9; color:#64748b;
    font-size:11px; font-weight:500;
    padding:3px 8px; border-radius:6px;
  }
  .mp-badge.green { background:#f0fdf4; color:#16a34a; }
  .mp-badge.blue  { background:#eff6ff; color:#2563eb; }

  .mp-input {
    width:100%; padding:8px 36px 8px 10px;
    border:1px solid #e2e8f0; border-radius:8px;
    font-size:12px; font-family:'DM Mono',monospace;
    color:#0f172a; background:#fafbfc;
    outline:none; transition:border-color .15s, box-shadow .15s;
    box-sizing:border-box;
  }
  .mp-input:focus { border-color:#94a3b8; box-shadow:0 0 0 3px rgba(148,163,184,.15); background:#fff; }
  .mp-input.error { border-color:#f87171; box-shadow:0 0 0 3px rgba(248,113,113,.12); }

  .mp-btn-primary {
    width:100%; padding:9px;
    background:#0f172a; color:#fff;
    border:none; border-radius:8px;
    font-size:12px; font-weight:600; font-family:'DM Sans',sans-serif;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;
    transition:background .15s;
  }
  .mp-btn-primary:hover:not(:disabled) { background:#1e293b; }
  .mp-btn-primary:disabled { opacity:.5; cursor:not-allowed; }

  .mp-btn-ghost {
    flex:1; padding:7px 10px;
    background:#f8fafc; color:#475569;
    border:1px solid #e8ecf0; border-radius:8px;
    font-size:11px; font-weight:500; font-family:'DM Sans',sans-serif;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;
    transition:background .15s, border-color .15s;
    text-decoration:none;
  }
  .mp-btn-ghost:hover { background:#f1f5f9; border-color:#d1d9e0; }

  .mp-overlay {
    position:fixed; inset:0; background:rgba(15,23,42,.45);
    z-index:50; display:flex; align-items:center; justify-content:center; padding:16px;
    backdrop-filter:blur(2px);
  }
  .mp-modal {
    background:#fff; border-radius:16px;
    width:100%; max-width:420px;
    box-shadow:0 20px 60px rgba(0,0,0,.18);
    overflow:hidden;
  }
  .mp-modal-header {
    padding:20px;
    border-bottom:1px solid #f1f5f9;
    display:flex; align-items:center; justify-content:space-between;
  }
  .mp-method-chip {
    display:flex; align-items:center; gap:6px;
    background:#f8fafc; border:1px solid #e8ecf0;
    border-radius:8px; padding:8px 10px;
    font-size:12px; color:#374151;
  }

  .mp-suggest-banner {
    background:#fff; border:1px solid #e8ecf0;
    border-radius:14px; padding:20px 24px;
    display:flex; align-items:center; justify-content:space-between; gap:16px;
  }

  .mp-section-header {
    display:flex; align-items:center; justify-content:space-between;
    padding-bottom:12px; border-bottom:1px solid #f1f5f9;
  }

  .mp-info-strip {
    background:#f8fafc; border:1px solid #e8ecf0;
    border-radius:10px; padding:12px 14px;
    display:flex; gap:10px; align-items:flex-start;
  }

  .spinner {
    width:14px; height:14px;
    border:2px solid rgba(255,255,255,.3);
    border-top-color:#fff;
    border-radius:50%;
    animation:spin .6s linear infinite;
  }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

/* ─── Provider definitions ───────────────────────────────────────────────────── */
const PROVIDER_LIST = [
  {
    id: 'feexpay', name: 'FeexPay',
    keys: ['FEEXPAY_TOKEN', 'FEEXPAY_SHOP_ID'],
    website: 'https://feexpay.me', countries: 5,
    methods: ['MTN Mobile Money', 'Moov Money', 'CELTIIS Money'],
    desc: 'Bénin · Togo · Côte d\'Ivoire · Sénégal · Congo',
    region: 'Afrique de l\'Ouest'
  },
  {
    id: 'stripe', name: 'Stripe',
    keys: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLIC_KEY'],
    website: 'https://stripe.com', countries: 35,
    methods: ['Carte Bancaire', 'Apple Pay', 'Google Pay', 'iDEAL', 'Giropay'],
    desc: 'Europe · USA · Canada',
    region: 'International'
  },
  {
    id: 'paystack', name: 'Paystack',
    keys: ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY'],
    website: 'https://paystack.com', countries: 4,
    methods: ['Carte Bancaire', 'Virement Bancaire', 'USSD', 'QR Code'],
    desc: 'Nigeria · Ghana · Kenya · Afrique du Sud',
    region: 'Afrique anglophone'
  },
  {
    id: 'flutterwave', name: 'Flutterwave',
    keys: ['FLW_SECRET_KEY', 'FLW_PUBLIC_KEY'],
    website: 'https://flutterwave.com', countries: 15,
    methods: ['Carte Bancaire', 'Mobile Money', 'USSD', 'Bank Transfer'],
    desc: '15 pays africains',
    region: 'Afrique'
  },
  {
    id: 'kkiapay', name: 'KKiaPay',
    keys: ['KKIAPAY_PUBLIC_KEY', 'KKIAPAY_PRIVATE_KEY', 'KKIAPAY_SECRET_KEY'],
    website: 'https://kkiapay.me', countries: 9,
    methods: ['MTN Mobile Money', 'Moov Money', 'Orange Money', 'Wave', 'Carte Bancaire'],
    desc: 'UEMOA · CEMAC',
    region: 'Afrique de l\'Ouest'
  },
  {
    id: 'fedapay', name: 'FedaPay',
    keys: ['FEDAPAY_SECRET_KEY', 'FEDAPAY_PUBLIC_KEY'],
    website: 'https://fedapay.com', countries: 10,
    methods: ['Mobile Money', 'Carte Bancaire'],
    desc: '10 pays Afrique',
    region: 'Afrique'
  },
  {
    id: 'paydunya', name: 'PayDunya',
    keys: ['PAYDUNYA_MASTER_KEY', 'PAYDUNYA_PRIVATE_KEY'],
    website: 'https://paydunya.com', countries: 8,
    methods: ['Orange Money', 'Free Money', 'Wave', 'MTN Mobile Money', 'Carte Bancaire'],
    desc: 'Sénégal · Côte d\'Ivoire · Bénin · Togo',
    region: 'Afrique de l\'Ouest'
  },
  {
    id: 'cinetpay', name: 'CinetPay',
    keys: ['CINETPAY_API_KEY', 'CINETPAY_SITE_ID', 'CINETPAY_SECRET_KEY'],
    website: 'https://cinetpay.com', countries: 11,
    methods: ['MTN Mobile Money', 'Moov Money', 'Orange Money', 'Wave', 'Carte Bancaire'],
    desc: '11 pays Afrique',
    region: 'Afrique'
  },
  {
    id: 'lygos', name: 'Lygos',
    keys: ['LYGOS_API_KEY', 'LYGOS_SECRET_KEY'],
    website: 'https://lygosapp.com', countries: 13,
    methods: ['Mobile Money', 'Carte Bancaire'],
    desc: '13 pays Afrique',
    region: 'Afrique'
  },
  {
    id: 'paypal', name: 'PayPal',
    keys: ['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET_KEY'],
    website: 'https://paypal.com', countries: 200,
    methods: ['PayPal', 'Carte Bancaire', 'Venmo'],
    desc: '200+ pays dans le monde',
    region: 'International'
  },
  {
    id: 'mbiyopay', name: 'MbiyoPay',
    keys: ['MBIYOPAY_API_KEY'],
    website: 'https://mbiyopay.com', countries: 11,
    methods: ['Mobile Money'],
    desc: '11 pays Afrique',
    region: 'Afrique'
  },
  {
    id: 'qosic', name: 'Qosic',
    keys: ['QOSIC_API_KEY', 'QOSIC_MERCHANT_ID'],
    website: 'https://qosic.com', countries: 13,
    methods: ['Mobile Money'],
    desc: '13 pays Afrique',
    region: 'Afrique'
  },
  {
    id: 'bizao', name: 'Bizao',
    keys: ['BIZAO_API_KEY', 'BIZAO_MERCHANT_ID'],
    website: 'https://bizao.com', countries: 11,
    methods: ['Mobile Money'],
    desc: '11 pays Afrique',
    region: 'Afrique'
  },
  {
    id: 'hub2', name: 'Hub2',
    keys: ['HUB2_API_KEY'],
    website: 'https://hub2.io', countries: 10,
    methods: ['Mobile Money', 'Carte Bancaire', 'Wave'],
    desc: '10 pays Afrique',
    region: 'Afrique'
  },
  {
    id: 'chipper', name: 'Chipper Cash',
    keys: ['CHIPPER_API_KEY'],
    website: 'https://chippercash.com', countries: 9,
    methods: ['Chipper Wallet', 'Mobile Money', 'Carte Bancaire'],
    desc: 'Afrique anglophone · USA · UK',
    region: 'Afrique & International'
  },
];

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
function ProviderInitial({ name }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: '#f1f5f9', border: '1px solid #e2e8f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      fontWeight: 700, fontSize: 14, color: '#0f172a',
      flexShrink: 0,
    }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function ProviderCard({ provider, onToggle, onSave, onShowMethods, saving }) {
  const [open, setOpen] = useState(false);
  const [showKeys, setShowKeys] = useState({});
  const [localKeys, setLocalKeys] = useState(
    provider.keys.reduce((acc, k) => ({ ...acc, [k.name]: k.value }), {})
  );
  const [errors, setErrors] = useState({});

  // Sync when parent updates
  useEffect(() => {
    setLocalKeys(provider.keys.reduce((acc, k) => ({ ...acc, [k.name]: k.value }), {}));
  }, [provider.keys]);

  const handleSave = () => {
    const newErrors = {};
    provider.keys.forEach(k => {
      if (!localKeys[k.name]?.trim()) newErrors[k.name] = true;
    });
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      toast.error('Remplissez tous les champs requis');
      return;
    }
    setErrors({});
    onSave(provider.id, localKeys);
  };

  const allFilled = provider.keys.every(k => localKeys[k.name]?.trim());

  return (
    <div className={`mp-card ${provider.active ? 'active' : ''}`}>
      {/* Card header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <ProviderInitial name={provider.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{provider.name}</span>
            {provider.active && allFilled && (
              <span className="mp-badge green">
                <CheckCircle size={10} /> Configuré
              </span>
            )}
            {provider.active && !allFilled && (
              <span className="mp-badge" style={{ background: '#fffbeb', color: '#d97706' }}>
                Incomplet
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
            {provider.countries} pays · {provider.region}
          </div>
        </div>

        {/* Toggle */}
        <label className="mp-toggle" title={provider.active ? 'Désactiver' : 'Activer'}>
          <input type="checkbox" checked={provider.active} onChange={() => onToggle(provider.id)} />
          <span className="mp-slider" />
        </label>

        {/* Expand */}
        {provider.active && (
          <button
            onClick={() => setOpen(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: 4, display: 'flex', alignItems: 'center'
            }}
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Expanded config */}
      {provider.active && open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button className="mp-btn-ghost" onClick={() => onShowMethods(provider)}>
              {provider.methods.length} méthodes
            </button>
            <a className="mp-btn-ghost" href={provider.website} target="_blank" rel="noopener noreferrer">
              <Globe size={11} /> Site <ExternalLink size={10} />
            </a>
          </div>

          {/* API Keys */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {provider.keys.map(key => (
              <div key={key.name}>
                <label style={{ fontSize: 11, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  {key.name}
                  <span style={{ color: '#f87171', marginLeft: 2 }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className={`mp-input${errors[key.name] ? ' error' : ''}`}
                    type={showKeys[key.name] ? 'text' : 'password'}
                    value={localKeys[key.name] || ''}
                    onChange={e => {
                      setLocalKeys(prev => ({ ...prev, [key.name]: e.target.value }));
                      if (errors[key.name]) setErrors(prev => ({ ...prev, [key.name]: false }));
                    }}
                    placeholder={`Votre ${key.name}`}
                  />
                  <button
                    onClick={() => setShowKeys(prev => ({ ...prev, [key.name]: !prev[key.name] }))}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                      display: 'flex', padding: 0
                    }}
                  >
                    {showKeys[key.name] ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                {errors[key.name] && (
                  <p style={{ fontSize: 11, color: '#f87171', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={10} /> Ce champ est requis
                  </p>
                )}
              </div>
            ))}
          </div>

          <button
            className="mp-btn-primary"
            style={{ marginTop: 14 }}
            onClick={handleSave}
            disabled={saving === provider.id}
          >
            {saving === provider.id
              ? <span className="spinner" />
              : <Save size={12} />}
            Enregistrer
          </button>
        </div>
      )}

      {/* Inactive hint */}
      {!provider.active && (
        <div style={{
          padding: '8px 16px 12px',
          fontSize: 11, color: '#c0cad4', textAlign: 'center',
          borderTop: '1px solid #f8fafc'
        }}>
          Activez le toggle pour configurer
        </div>
      )}
    </div>
  );
}

function MethodsModal({ provider, onClose }) {
  if (!provider) return null;
  return (
    <div className="mp-overlay" onClick={onClose}>
      <div className="mp-modal" onClick={e => e.stopPropagation()}>
        <div className="mp-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ProviderInitial name={provider.name} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{provider.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {provider.countries} pays · {provider.methods.length} méthodes
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#f1f5f9', border: 'none', cursor: 'pointer',
            borderRadius: 8, padding: 6, display: 'flex', color: '#64748b'
          }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
            Méthodes acceptées
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {provider.methods.map((m, i) => (
              <div key={i} className="mp-method-chip">
                <CheckCircle size={12} style={{ color: '#16a34a', flexShrink: 0 }} />
                {m}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{provider.desc}</p>
            <a
              href={provider.website} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#0f172a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}
            >
              <Globe size={13} /> Visiter le site <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestModal({ onClose }) {
  const [form, setForm] = useState({ name: '', website: '', countries: '', methods: '', reason: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Nom du provider requis'); return; }
    // Here you'd call a real API endpoint; for now we simulate
    setSent(true);
    setTimeout(onClose, 2200);
  };

  return (
    <div className="mp-overlay" onClick={onClose}>
      <div className="mp-modal" onClick={e => e.stopPropagation()}>
        <div className="mp-modal-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Suggérer un provider</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
              Votre suggestion sera examinée par l'équipe
            </div>
          </div>
          <button onClick={onClose} style={{
            background: '#f1f5f9', border: 'none', cursor: 'pointer',
            borderRadius: 8, padding: 6, display: 'flex', color: '#64748b'
          }}>
            <X size={15} />
          </button>
        </div>

        {sent ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <CheckCircle size={36} style={{ color: '#16a34a', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>Suggestion envoyée !</p>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Merci pour votre contribution.</p>
          </div>
        ) : (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { field: 'name', label: 'Nom du provider ou agrégateur', placeholder: 'Ex : WavePay', required: true },
              { field: 'website', label: 'Site web', placeholder: 'https://...' },
              { field: 'countries', label: 'Pays couverts', placeholder: 'Ex : Bénin, Togo, Cameroun' },
              { field: 'methods', label: 'Méthodes de paiement', placeholder: 'Ex : Mobile Money, Carte Bancaire' },
              { field: 'reason', label: 'Pourquoi l\'ajouter ?', placeholder: 'Optionnel' },
            ].map(({ field, label, placeholder, required }) => (
              <div key={field}>
                <label style={{ fontSize: 11, fontWeight: 500, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  {label}{required && <span style={{ color: '#f87171', marginLeft: 2 }}>*</span>}
                </label>
                <input
                  className="mp-input"
                  style={{ paddingRight: 10 }}
                  value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  placeholder={placeholder}
                />
              </div>
            ))}
            <button className="mp-btn-primary" onClick={handleSubmit} style={{ marginTop: 4 }}>
              <Send size={12} /> Envoyer la suggestion
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
export default function MerchantProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [methodsModal, setMethodsModal] = useState(null);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(() => { loadProviders(); }, []);

  const loadProviders = async () => {
    try {
      const snap = await getDoc(doc(db, 'gateway_merchants', user.uid));
      const saved = snap.exists() ? snap.data().providers || {} : {};
      setProviders(PROVIDER_LIST.map(p => ({
        ...p,
        active: saved[p.id]?.active || false,
        keys: p.keys.map(k => ({ name: k, value: saved[p.id]?.[k] || '' })),
      })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleToggle = async (id) => {
    const provider = providers.find(p => p.id === id);
    const next = !provider.active;
    setProviders(prev => prev.map(p => p.id === id ? { ...p, active: next } : p));
    try {
      const snap = await getDoc(doc(db, 'gateway_merchants', user.uid));
      const current = snap.exists() ? snap.data().providers || {} : {};
      current[id] = { ...(current[id] || {}), active: next };
      await setDoc(doc(db, 'gateway_merchants', user.uid), { providers: current, updatedAt: new Date().toISOString() }, { merge: true });
      toast.success(next ? `${provider.name} activé` : `${provider.name} désactivé`);
    } catch {
      setProviders(prev => prev.map(p => p.id === id ? { ...p, active: !next } : p));
      toast.error('Erreur de sauvegarde');
    }
  };

  const handleSave = async (id, localKeys) => {
    setSaving(id);
    const provider = providers.find(p => p.id === id);
    try {
      const snap = await getDoc(doc(db, 'gateway_merchants', user.uid));
      const current = snap.exists() ? snap.data().providers || {} : {};
      current[id] = { active: provider.active, ...localKeys };
      await setDoc(doc(db, 'gateway_merchants', user.uid), { providers: current, updatedAt: new Date().toISOString() }, { merge: true });
      // Update local state with new key values
      setProviders(prev => prev.map(p => p.id !== id ? p : {
        ...p,
        keys: p.keys.map(k => ({ ...k, value: localKeys[k.name] ?? k.value }))
      }));
      toast.success(`${provider.name} enregistré`);
    } catch { toast.error('Erreur de sauvegarde'); }
    finally { setSaving(null); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{
        width: 28, height: 28, border: '2px solid #e2e8f0',
        borderTopColor: '#0f172a', borderRadius: '50%',
        animation: 'spin .7s linear infinite'
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const activeCount = providers.filter(p => p.active).length;
  const configuredCount = providers.filter(p => p.active && p.keys.every(k => k.value?.trim())).length;

  return (
    <div className="mp-root" style={{ maxWidth: 980, margin: '0 auto', padding: '24px 16px 60px' }}>
      <style>{styles}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Providers de paiement
        </h1>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
          {activeCount} activé{activeCount !== 1 ? 's' : ''} · {configuredCount} configuré{configuredCount !== 1 ? 's' : ''} sur {PROVIDER_LIST.length}
        </p>
      </div>

      {/* Info strip */}
      <div className="mp-info-strip" style={{ marginBottom: 24 }}>
        <AlertCircle size={15} style={{ color: '#64748b', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
          Activez un provider, renseignez vos clés API puis enregistrez. Vos clients verront les méthodes de paiement, pas le nom du provider.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Providers disponibles', value: PROVIDER_LIST.length },
          { label: 'Activés', value: activeCount },
          { label: 'Prêts à l\'emploi', value: configuredCount },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '1px solid #e8ecf0', borderRadius: 10,
            padding: '10px 16px', flex: '1 1 120px', minWidth: 100
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
        gap: 12
      }}>
        {providers.map(provider => (
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

      {/* Suggest banner */}
      <div className="mp-suggest-banner" style={{ marginTop: 32 }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', margin: 0 }}>
            Vous ne trouvez pas votre provider ?
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, margin: 0 }}>
            Suggérez un provider ou agrégateur, nous l'étudierons pour l'ajouter.
          </p>
        </div>
        <button
          onClick={() => setSuggestOpen(true)}
          style={{
            background: '#0f172a', color: '#fff',
            border: 'none', borderRadius: 9, cursor: 'pointer',
            padding: '10px 18px', fontSize: 12, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <Plus size={13} /> Suggérer un provider
        </button>
      </div>

      {/* Modals */}
      <MethodsModal provider={methodsModal} onClose={() => setMethodsModal(null)} />
      {suggestOpen && <SuggestModal onClose={() => setSuggestOpen(false)} />}
    </div>
  );
}