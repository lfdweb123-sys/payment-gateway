import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Key, Copy, Eye, EyeOff, Plus, Trash2, Save, Loader,
  Code, Globe, CheckCircle, XCircle,
  Terminal, Webhook, RefreshCw,
  Lock, Zap, BookOpen, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
const API_URL = import.meta.env.VITE_API_URL || APP_URL;

/* ─── CSS injecté une seule fois, scoped au préfixe .dev- ─── */
const CSS = `
  .dev-wrap {
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    padding: 20px 14px 40px;
    font-family: 'Plus Jakarta Sans','DM Sans',sans-serif;
    box-sizing: border-box;
  }
  .dev-wrap *, .dev-wrap *::before, .dev-wrap *::after {
    box-sizing: border-box;
  }
  .dev-card {
    background: #fff;
    border: 1px solid #EBEBEB;
    border-radius: 16px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    /* les deux règles qui bloquent le débordement */
    width: 100%;
    overflow: hidden;
  }
  /* row avec boutons copy — l'élément texte prend tout l'espace restant */
  .dev-keyrow {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
  }
  .dev-keyrow-text {
    flex: 1 1 0%;     /* 0% = peut rétrécir en-dessous de son contenu naturel */
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: #F7F8FC;
    border: 1px solid #EBEBEB;
    border-radius: 10px;
    padding: 10px 12px;
    font-family: 'Fira Code','Courier New',monospace;
    font-size: 12px;
    color: #444;
  }
  /* terminal block */
  .dev-terminal {
    background: #0D1117;
    border-radius: 11px;
    width: 100%;
    overflow: hidden;   /* jamais de débordement latéral */
  }
  .dev-terminal-dots {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 13px;
  }
  .dev-terminal-scroll {
    overflow-x: auto;
    padding: 0 13px 13px;
    /* scrollbar fine */
    scrollbar-width: thin;
    scrollbar-color: #333 transparent;
  }
  .dev-terminal-scroll::-webkit-scrollbar { height: 3px; }
  .dev-terminal-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
  .dev-terminal pre {
    font-family: 'Fira Code','Courier New',monospace;
    font-size: 11px;
    line-height: 1.8;
    color: #E6EDF3;
    margin: 0;
    white-space: pre;
  }
  /* tab bar */
  .dev-tabs {
    display: flex;
    gap: 3px;
    background: #F3F4F6;
    border-radius: 13px;
    padding: 4px;
    margin-bottom: 18px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .dev-tabs::-webkit-scrollbar { display: none; }
  .dev-tab {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 14px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    font-size: 12px;
    font-family: inherit;
    transition: all .18s;
  }
  /* provider row & webhook row */
  .dev-prow {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #F7F8FC;
    border: 1px solid #EBEBEB;
    border-radius: 10px;
    padding: 10px 12px;
    width: 100%;
    overflow: hidden;
    min-width: 0;
  }
  .dev-prow-text {
    flex: 1 1 0%;
    min-width: 0;
    overflow: hidden;
  }
  .dev-prow-url {
    font-size: 10px;
    color: #999;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    font-family: 'Fira Code',monospace;
  }
  /* webhook item row */
  .dev-wrow {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    border-radius: 11px;
    padding: 11px 12px;
    width: 100%;
    overflow: hidden;
  }
  .dev-wrow-body {
    flex: 1 1 0%;
    min-width: 0;
    overflow: hidden;
  }
  .dev-wrow-url {
    font-size: 11px;
    font-weight: 600;
    color: #222;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    margin-bottom: 5px;
  }
  /* warning box */
  .dev-warn {
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 11px;
    color: #92400E;
    display: flex;
    gap: 7px;
    align-items: flex-start;
  }
  /* btn copy */
  .dev-copybtn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    min-width: 34px;
    border-radius: 9px;
    flex-shrink: 0;
    border: 1px solid #E8E8E8;
    cursor: pointer;
    transition: all .2s;
  }
  /* eye btn */
  .dev-eyebtn {
    width: 34px;
    height: 34px;
    min-width: 34px;
    border-radius: 9px;
    border: 1px solid #E8E8E8;
    background: #FAFAFA;
    cursor: pointer;
    color: #888;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  /* gradient btn */
  .dev-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg,#FF6B00,#FFAA00);
    color: #fff;
    border: none;
    padding: 9px 15px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 3px 10px rgba(255,107,0,.25);
  }
  .dev-btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #F7F8FC;
    color: #555;
    border: 1px solid #E8E8E8;
    padding: 9px 15px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
  }
  .dev-btn-dark {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #111;
    color: #fff;
    border: none;
    padding: 9px 15px;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
  }
  .dev-btn-ghost {
    background: none;
    border: none;
    font-size: 12px;
    color: #888;
    cursor: pointer;
    font-family: inherit;
    padding: 9px 8px;
  }
  /* input */
  .dev-input {
    width: 100%;
    padding: 9px 12px;
    border: 1px solid #E0E0E0;
    border-radius: 9px;
    font-size: 12px;
    color: #333;
    background: #fff;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  }
  .dev-input:focus {
    border-color: #FF6B00;
    box-shadow: 0 0 0 3px rgba(255,107,0,.08);
  }
  @keyframes dev-spin { to { transform: rotate(360deg); } }
  .dev-spin { animation: dev-spin .7s linear infinite; }
`;

const TABS = [
  { id: 'api',      label: 'Clé API',       icon: Key },
  { id: 'webhooks', label: 'Webhooks',      icon: Webhook },
  { id: 'docs',     label: 'Documentation', icon: BookOpen },
];

const EVENTS = [
  { value: 'payment.completed', label: 'Réussi',     color: '#00A550' },
  { value: 'payment.failed',    label: 'Échoué',     color: '#EF4444' },
  { value: 'payment.pending',   label: 'En attente', color: '#F59E0B' },
  { value: 'payment.refunded',  label: 'Remboursé',  color: '#6366F1' },
];

/* ─── micro composants ─── */

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button className="dev-copybtn"
      style={{ background: done ? '#F0FDF4' : '#FAFAFA', color: done ? '#00A550' : '#888' }}
      onClick={() => { navigator.clipboard.writeText(text); toast.success('Copié !'); setDone(true); setTimeout(() => setDone(false), 1800); }}>
      {done ? <CheckCircle size={14} /> : <Copy size={14} />}
    </button>
  );
}

function IconBox({ bg, color, icon: Icon }) {
  return (
    <div style={{ width: 36, height: 36, minWidth: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={15} color={color} />
    </div>
  );
}

function CardHead({ iconBg, iconColor, icon, title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <IconBox bg={iconBg} color={iconColor} icon={icon} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: '#AAA' }}>{sub}</div>}
        </div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

function TerminalBlock({ code }) {
  return (
    <div className="dev-terminal">
      <div className="dev-terminal-dots">
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F56','#FFBD2E','#27C93F'].map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
        </div>
        <CopyBtn text={code} />
      </div>
      <div className="dev-terminal-scroll">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

function EventBadge({ color, label }) {
  const map = { '#00A550': '#EDFAF3', '#EF4444': '#FEF2F2', '#F59E0B': '#FFFBEB', '#6366F1': '#EEF2FF' };
  return (
    <span style={{ background: map[color] || '#F3F4F6', color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {label}
    </span>
  );
}

/* ─── TAB: CLÉ API ─── */
function TabApiKey({ apiKey, setApiKey }) {
  const { user } = useAuth();
  const [show, setShow]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [genning, setGenning] = useState(false);

  const generate = () => {
    setGenning(true);
    setTimeout(() => {
      setApiKey('gw_live_' + Array.from({ length: 44 }, () => Math.random().toString(36)[2]).join(''));
      setShow(true);
      setGenning(false);
    }, 600);
  };

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'gateway_merchants', user.uid), { apiKey, updatedAt: new Date().toISOString() }, { merge: true });
      toast.success('Clé enregistrée');
    } catch { toast.error('Erreur'); }
    finally { setSaving(false); }
  };

  const masked  = apiKey ? (show ? apiKey : apiKey.substring(0, 10) + '••••••••••••••') : null;
  const payLink = `${APP_URL}/pay?token=${apiKey}`;
  const curl    = `curl -X POST ${APP_URL}/api/gateway/pay \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}" \\\n  -d '{"amount":5000,"currency":"XOF"}'`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Clé */}
      <div className="dev-card">
        <CardHead iconBg="#FFF3EA" iconColor="#FF6B00" icon={Key}
          title="Clé API secrète" sub="Authentifie toutes vos requêtes"
          right={apiKey && <span style={{ fontSize: 10, fontWeight: 700, background: '#EDFAF3', color: '#00A550', padding: '4px 9px', borderRadius: 100, whiteSpace: 'nowrap' }}>● Active</span>}
        />

        {/* ligne clé */}
        <div className="dev-keyrow">
          <div className="dev-keyrow-text">
            {masked ?? <span style={{ color: '#CCC', fontStyle: 'italic' }}>Aucune clé générée</span>}
          </div>
          {apiKey && <>
            <button className="dev-eyebtn" onClick={() => setShow(v => !v)}>
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <CopyBtn text={apiKey} />
          </>}
        </div>

        {apiKey && show && (
          <div className="dev-warn">
            <Lock size={12} style={{ marginTop: 1, flexShrink: 0, color: '#D97706' }} />
            <span>Ne partagez jamais cette clé — elle donne accès total à vos paiements.</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={apiKey ? 'dev-btn-secondary' : 'dev-btn-primary'} onClick={generate} disabled={genning}>
            {genning ? <><Loader size={12} className="dev-spin" /> Génération…</> : <><RefreshCw size={12} /> {apiKey ? 'Regénérer' : 'Générer ma clé'}</>}
          </button>
          {apiKey && (
            <button className="dev-btn-primary" onClick={save} disabled={saving} style={{ opacity: saving ? .6 : 1 }}>
              {saving ? <><Loader size={12} className="dev-spin" /> Enreg…</> : <><Save size={12} /> Enregistrer</>}
            </button>
          )}
        </div>
      </div>

      {apiKey && <>
        {/* Lien paiement */}
        <div className="dev-card">
          <CardHead iconBg="#EBF0FF" iconColor="#0057FF" icon={Globe} title="Lien de paiement" sub="Partagez ce lien à vos clients" />
          <div className="dev-keyrow">
            <code className="dev-keyrow-text" style={{ fontSize: 11, color: '#555' }}>{payLink}</code>
            <CopyBtn text={payLink} />
          </div>
        </div>

        {/* cURL */}
        <div className="dev-card">
          <CardHead iconBg="#1A1A2E" iconColor="#A0AEC0" icon={Terminal} title="Test cURL" sub="Testez depuis votre terminal" />
          <TerminalBlock code={curl} />
        </div>
      </>}
    </div>
  );
}

/* ─── TAB: WEBHOOKS ─── */
function TabWebhooks({ merchant, webhooks, setWebhooks }) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ url: '', events: ['payment.completed'] });
  const [saving, setSaving]     = useState(false);

  const activeProviders = merchant?.providers
    ? Object.keys(merchant.providers).filter(k => merchant.providers[k]?.active)
    : [];
  const providerUrls = activeProviders.map(id => ({
    id, name: id.charAt(0).toUpperCase() + id.slice(1),
    url: `${APP_URL}/api/webhook/${id}`,
  }));

  const addWebhook = async () => {
    if (!form.url) { toast.error('URL requise'); return; }
    if (!form.url.startsWith('https://')) { toast.error("L'URL doit commencer par https://"); return; }
    setSaving(true);
    try {
      const item = { id: 'wh_' + Date.now(), url: form.url, events: form.events, active: true, createdAt: new Date().toISOString() };
      const updated = [...webhooks, item];
      await setDoc(doc(db, 'gateway_merchants', user.uid), { webhooks: updated, updatedAt: new Date().toISOString() }, { merge: true });
      setWebhooks(updated);
      setForm({ url: '', events: ['payment.completed'] });
      setShowForm(false);
      toast.success('Webhook ajouté');
    } catch { toast.error('Erreur'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    const updated = webhooks.filter(w => w.id !== id);
    await setDoc(doc(db, 'gateway_merchants', user.uid), { webhooks: updated, updatedAt: new Date().toISOString() }, { merge: true });
    setWebhooks(updated);
    toast.success('Supprimé');
  };

  const toggle = async (id) => {
    const updated = webhooks.map(w => w.id === id ? { ...w, active: !w.active } : w);
    await setDoc(doc(db, 'gateway_merchants', user.uid), { webhooks: updated, updatedAt: new Date().toISOString() }, { merge: true });
    setWebhooks(updated);
  };

  const toggleEvent = (val) => setForm(f => ({
    ...f, events: f.events.includes(val) ? f.events.filter(e => e !== val) : [...f.events, val],
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {providerUrls.length > 0 && (
        <div className="dev-card">
          <CardHead iconBg="#FFF3EA" iconColor="#FF6B00" icon={Webhook} title="URLs pour vos providers" sub="Copiez dans le dashboard de chaque provider" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {providerUrls.map(p => (
              <div key={p.id} className="dev-prow">
                <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: 8, background: '#FFF3EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#FF6B00', flexShrink: 0 }}>
                  {p.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="dev-prow-text">
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#222', marginBottom: 2 }}>{p.name}</div>
                  <code className="dev-prow-url">{p.url}</code>
                </div>
                <CopyBtn text={p.url} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhooks perso */}
      <div className="dev-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <IconBox bg="#EBF0FF" color="#0057FF" icon={Zap} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>Webhooks personnalisés</div>
              <div style={{ fontSize: 11, color: '#AAA' }}>Notifications temps réel</div>
            </div>
          </div>
          <button
            className={showForm ? 'dev-btn-secondary' : 'dev-btn-primary'}
            style={{ flexShrink: 0 }}
            onClick={() => setShowForm(v => !v)}
          >
            <Plus size={12} /> Nouveau
          </button>
        </div>

        {showForm && (
          <div style={{ background: '#F7F8FC', border: '1px solid #E8E8E8', borderRadius: 12, padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 5 }}>URL du webhook</label>
              <input className="dev-input" type="url" value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://votre-serveur.com/webhook"
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 7 }}>Événements</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {EVENTS.map(ev => {
                  const on = form.events.includes(ev.value);
                  return (
                    <button key={ev.value} onClick={() => toggleEvent(ev.value)}
                      style={{ padding: '6px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: on ? ev.color : '#E8E8E8', color: on ? '#fff' : '#888' }}>
                      {ev.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="dev-btn-dark" onClick={addWebhook} disabled={saving} style={{ opacity: saving ? .6 : 1 }}>
                {saving ? <><Loader size={12} className="dev-spin" /> Ajout…</> : 'Ajouter'}
              </button>
              <button className="dev-btn-ghost" onClick={() => setShowForm(false)}>Annuler</button>
            </div>
          </div>
        )}

        {webhooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: '#CCC', fontSize: 12 }}>
            <Webhook size={22} style={{ display: 'block', margin: '0 auto 8px' }} />
            Aucun webhook configuré
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {webhooks.map(w => (
              <div key={w.id} className="dev-wrow"
                style={{ background: w.active ? '#fff' : '#F7F8FC', border: `1px solid ${w.active ? '#EBEBEB' : '#E0E0E0'}`, opacity: w.active ? 1 : .55 }}>
                <button onClick={() => toggle(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: w.active ? '#00A550' : '#CCC', flexShrink: 0, padding: 0, marginTop: 2 }}>
                  {w.active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                </button>
                <div className="dev-wrow-body">
                  <span className="dev-wrow-url">{w.url}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 3 }}>
                    {w.events.map(e => {
                      const ev = EVENTS.find(ev => ev.value === e);
                      return ev ? <EventBadge key={e} color={ev.color} label={ev.label} /> : null;
                    })}
                  </div>
                  <span style={{ fontSize: 10, color: '#BBB' }}>{new Date(w.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <button onClick={() => del(w.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DDD', padding: 3, flexShrink: 0, transition: 'color .2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#DDD'}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── TAB: DOCS ─── */
function TabDocs() {
  const docsUrl = `${API_URL}/api-documentation`;

  const steps = [
    { num: '01', title: 'Clé API',     desc: 'Générez et enregistrez votre clé dans l\'onglet Clé API.',          icon: Key,        color: '#FF6B00', bg: '#FFF3EA' },
    { num: '02', title: 'Intégration', desc: 'Utilisez le lien de paiement ou l\'API REST depuis votre backend.',  icon: Globe,      color: '#0057FF', bg: '#EBF0FF' },
    { num: '03', title: 'Webhooks',    desc: 'Recevez des notifications POST à chaque événement de paiement.',     icon: Webhook,    color: '#00A550', bg: '#EDFAF3' },
    { num: '04', title: 'Dashboard',   desc: 'Suivez toutes vos transactions avec export CSV intégré.',            icon: CheckCircle,color: '#9B00E8', bg: '#F4EBFF' },
  ];

  const endpoints = [
    { method: 'POST', path: '/api/gateway/pay',          desc: 'Initier' },
    { method: 'GET',  path: '/api/gateway/status/:id',   desc: 'Statut' },
    { method: 'GET',  path: '/api/gateway/transactions', desc: 'Lister' },
    { method: 'POST', path: '/api/gateway/refund/:id',   desc: 'Rembourser' },
  ];

  const MC = { POST: '#FF6B00', GET: '#0057FF' };
  const payload = `{\n  "event": "payment.completed",\n  "data": {\n    "id": "txn_abc123",\n    "amount": 5000,\n    "currency": "XOF",\n    "status": "completed"\n  }\n}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Lien doc externe */}
      <a href={docsUrl} target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '15px 16px', background: 'linear-gradient(135deg,#FF6B00,#FFAA00)', borderRadius: 16, textDecoration: 'none', boxShadow: '0 5px 18px rgba(255,107,0,.25)', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, flex: 1 }}>
          <div style={{ width: 38, height: 38, minWidth: 38, borderRadius: 10, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={17} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Documentation complète</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>Référence, exemples et guides</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.2)', borderRadius: 8, padding: '6px 11px', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Ouvrir</span>
          <ExternalLink size={11} color="#fff" />
        </div>
      </a>

      {/* Steps */}
      <div className="dev-card">
        <CardHead iconBg="#F7F8FC" iconColor="#555" icon={BookOpen} title="Guide d'intégration" sub="4 étapes pour démarrer" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ background: '#F7F8FC', border: '1px solid #EBEBEB', borderRadius: 12, padding: '13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={13} color={s.color} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#E8E8E8' }}>{s.num}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#111' }}>{s.title}</div>
              <div style={{ fontSize: 11, color: '#999', lineHeight: 1.55 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoints */}
      <div className="dev-card">
        <CardHead iconBg="#0D1117" iconColor="#A0AEC0" icon={Code} title="Endpoints REST" sub="API Gateway" />
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #EBEBEB' }}>
          {endpoints.map((ep, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: i % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: i < endpoints.length - 1 ? '1px solid #F0F0F0' : 'none', overflow: 'hidden' }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: MC[ep.method] || '#888', background: `${MC[ep.method] || '#888'}15`, padding: '2px 7px', borderRadius: 5, minWidth: 34, textAlign: 'center', flexShrink: 0 }}>{ep.method}</span>
              <code style={{ flex: '1 1 0%', minWidth: 0, fontSize: 11, color: '#444', fontFamily: "'Fira Code',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.path}</code>
              <span style={{ fontSize: 10, color: '#AAA', flexShrink: 0 }}>{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook payload */}
      <div className="dev-card">
        <CardHead iconBg="#EDFAF3" iconColor="#00A550" icon={Webhook} title="Payload Webhook" sub="Format JSON reçu sur votre endpoint" />
        <TerminalBlock code={payload} />
      </div>
    </div>
  );
}

/* ─── MAIN ─── */
export default function Developer() {
  const { user } = useAuth();
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('api');
  const [merchant, setMerchant] = useState(null);
  const [apiKey, setApiKey]     = useState('');
  const [webhooks, setWebhooks] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'gateway_merchants', user.uid));
        const data = snap.exists() ? snap.data() : {};
        setMerchant(data);
        setApiKey(data.apiKey || '');
        setWebhooks(data.webhooks || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
      <style>{`@keyframes dev-spin{to{transform:rotate(360deg)}}.dev-spin{animation:dev-spin .7s linear infinite}`}</style>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid #FF6B00', borderTopColor: 'transparent' }} className="dev-spin" />
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="dev-wrap">

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 19, fontWeight: 900, color: '#0A0A0A', letterSpacing: '-.02em', marginBottom: 3 }}>
            Espace Développeur
          </h1>
          <p style={{ fontSize: 12, color: '#AAA' }}>Gérez vos clés API, webhooks et consultez la documentation.</p>
        </div>

        {/* Tab bar */}
        <div className="dev-tabs">
          {TABS.map(t => {
            const on = tab === t.id;
            return (
              <button key={t.id} className="dev-tab" onClick={() => setTab(t.id)}
                style={{ background: on ? '#fff' : 'transparent', color: on ? '#111' : '#888', fontWeight: on ? 700 : 500, boxShadow: on ? '0 1px 5px rgba(0,0,0,.07)' : 'none', fontFamily: 'inherit' }}>
                <t.icon size={13} color={on ? '#FF6B00' : '#CCC'} />
                {t.label}
                {t.id === 'api' && apiKey && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00A550', flexShrink: 0 }} />}
                {t.id === 'webhooks' && webhooks.length > 0 && (
                  <span style={{ background: '#FF6B00', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 100 }}>
                    {webhooks.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenu */}
        {tab === 'api'      && <TabApiKey   apiKey={apiKey} setApiKey={setApiKey} />}
        {tab === 'webhooks' && <TabWebhooks merchant={merchant} webhooks={webhooks} setWebhooks={setWebhooks} />}
        {tab === 'docs'     && <TabDocs />}

      </div>
    </>
  );
}