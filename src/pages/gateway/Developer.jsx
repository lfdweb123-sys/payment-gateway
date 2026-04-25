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

const TABS = [
  { id: 'api',      label: 'Clé API',       icon: Key },
  { id: 'webhooks', label: 'Webhooks',      icon: Webhook },
  { id: 'docs',     label: 'Documentation', icon: BookOpen },
];

const availableEvents = [
  { value: 'payment.completed', label: 'Réussi',     color: '#00A550' },
  { value: 'payment.failed',    label: 'Échoué',     color: '#EF4444' },
  { value: 'payment.pending',   label: 'En attente', color: '#F59E0B' },
  { value: 'payment.refunded',  label: 'Remboursé',  color: '#6366F1' },
];

/* ────────────────────────────────── helpers ── */

function CopyBtn({ text, size = 14 }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success('Copié !');
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34, minWidth: 34, borderRadius: 9, flexShrink: 0,
        border: '1px solid #E8E8E8', background: done ? '#F0FDF4' : '#FAFAFA',
        cursor: 'pointer', color: done ? '#00A550' : '#888', transition: 'all .2s',
      }}
    >
      {done ? <CheckCircle size={size} /> : <Copy size={size} />}
    </button>
  );
}

function EventBadge({ color, children }) {
  const map = {
    '#00A550': { bg: '#EDFAF3', text: '#00A550' },
    '#EF4444': { bg: '#FEF2F2', text: '#DC2626' },
    '#F59E0B': { bg: '#FFFBEB', text: '#D97706' },
    '#6366F1': { bg: '#EEF2FF', text: '#4F46E5' },
  };
  const c = map[color] || { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {children}
    </span>
  );
}

/* Terminal dark block — scrollable inside, never bleeds */
function TerminalBlock({ code, copyText }) {
  return (
    <div style={{ background: '#0D1117', borderRadius: 11, overflow: 'hidden', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 13px' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F56','#FFBD2E','#27C93F'].map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
        </div>
        <CopyBtn text={copyText || code} size={12} />
      </div>
      <div style={{ overflowX: 'auto', padding: '0 13px 13px' }}>
        <pre style={{ fontFamily: "'Fira Code','Courier New',monospace", fontSize: 11, lineHeight: 1.8, color: '#E6EDF3', margin: 0, whiteSpace: 'pre' }}>
          {code}
        </pre>
      </div>
    </div>
  );
}

/* Shared card */
const CARD = {
  background: '#fff', border: '1px solid #EBEBEB',
  borderRadius: 16, padding: '16px',
  display: 'flex', flexDirection: 'column', gap: 14,
  overflow: 'hidden', width: '100%',
};

function CardHead({ iconBg, iconColor, icon: Icon, title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ width: 36, height: 36, minWidth: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} color={iconColor} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{title}</div>
          <div style={{ fontSize: 11, color: '#AAA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
        </div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

/* ────────────────────────────────── TAB: API KEY ── */
function TabApiKey({ apiKey, setApiKey }) {
  const { user } = useAuth();
  const [show, setShow]     = useState(false);
  const [saving, setSaving] = useState(false);
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

  const masked = apiKey ? (show ? apiKey : apiKey.substring(0, 10) + '••••••••••••••') : null;
  const payLink = `${APP_URL}/pay?token=${apiKey}`;
  const curl    = `curl -X POST ${APP_URL}/api/gateway/pay \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}" \\\n  -d '{"amount":5000,"currency":"XOF"}'`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Clé card */}
      <div style={CARD}>
        <CardHead iconBg="#FFF3EA" iconColor="#FF6B00" icon={Key}
          title="Clé API secrète" sub="Authentifie toutes vos requêtes"
          right={apiKey && <span style={{ fontSize: 10, fontWeight: 700, background: '#EDFAF3', color: '#00A550', padding: '4px 9px', borderRadius: 100 }}>● Active</span>}
        />

        {/* Key field — flex with width:0 trick to prevent overflow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            flex: '1 1 0', minWidth: 0,
            background: '#F7F8FC', border: '1px solid #EBEBEB', borderRadius: 10,
            padding: '10px 12px',
            fontFamily: "'Fira Code',monospace", fontSize: 12, color: '#444',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {masked ?? <span style={{ color: '#CCC', fontStyle: 'italic', fontFamily: 'inherit', fontSize: 12 }}>Aucune clé générée</span>}
          </div>
          {apiKey && <>
            <button onClick={() => setShow(v => !v)} style={{ width: 34, height: 34, minWidth: 34, borderRadius: 9, border: '1px solid #E8E8E8', background: '#FAFAFA', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <CopyBtn text={apiKey} />
          </>}
        </div>

        {apiKey && show && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '9px 12px', fontSize: 11, color: '#92400E', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <Lock size={12} style={{ marginTop: 1, flexShrink: 0, color: '#D97706' }} />
            <span>Ne partagez jamais cette clé — elle donne accès total à vos paiements.</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={generate} disabled={genning} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: apiKey ? '#F7F8FC' : 'linear-gradient(135deg,#FF6B00,#FFAA00)', color: apiKey ? '#555' : '#fff', border: apiKey ? '1px solid #E8E8E8' : 'none', padding: '9px 15px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {genning ? <><Loader size={12} style={{ animation: 'spin .7s linear infinite' }} /> Génération…</> : <><RefreshCw size={12} /> {apiKey ? 'Regénérer' : 'Générer ma clé'}</>}
          </button>
          {apiKey && (
            <button onClick={save} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#FF6B00,#FFAA00)', color: '#fff', border: 'none', padding: '9px 15px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? .6 : 1 }}>
              {saving ? <><Loader size={12} style={{ animation: 'spin .7s linear infinite' }} /> Enreg…</> : <><Save size={12} /> Enregistrer</>}
            </button>
          )}
        </div>
      </div>

      {apiKey && <>
        {/* Lien paiement */}
        <div style={CARD}>
          <CardHead iconBg="#EBF0FF" iconColor="#0057FF" icon={Globe} title="Lien de paiement" sub="Partagez ce lien à vos clients" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ flex: '1 1 0', minWidth: 0, display: 'block', background: '#F7F8FC', border: '1px solid #EBEBEB', borderRadius: 10, padding: '10px 12px', fontSize: 11, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {payLink}
            </code>
            <CopyBtn text={payLink} />
          </div>
        </div>

        {/* cURL */}
        <div style={CARD}>
          <CardHead iconBg="#1A1A2E" iconColor="#A0AEC0" icon={Terminal} title="Test cURL" sub="Testez depuis votre terminal" />
          <TerminalBlock code={curl} />
        </div>
      </>}
    </div>
  );
}

/* ────────────────────────────────── TAB: WEBHOOKS ── */
function TabWebhooks({ merchant, webhooks, setWebhooks }) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ url: '', events: ['payment.completed'] });
  const [saving, setSaving]     = useState(false);

  const activeProviders = merchant?.providers ? Object.keys(merchant.providers).filter(k => merchant.providers[k]?.active) : [];
  const providerUrls = activeProviders.map(id => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1), url: `${APP_URL}/api/webhook/${id}` }));

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {providerUrls.length > 0 && (
        <div style={CARD}>
          <CardHead iconBg="#FFF3EA" iconColor="#FF6B00" icon={Webhook} title="URLs pour vos providers" sub="Copiez dans le dashboard de chaque provider" />
          {providerUrls.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F7F8FC', border: '1px solid #EBEBEB', borderRadius: 10, padding: '10px 12px', overflow: 'hidden' }}>
              <div style={{ width: 32, height: 32, minWidth: 32, borderRadius: 8, background: '#FFF3EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#FF6B00' }}>
                {p.name.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: '1 1 0', minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#222', marginBottom: 2 }}>{p.name}</div>
                <code style={{ fontSize: 10, color: '#999', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</code>
              </div>
              <CopyBtn text={p.url} size={13} />
            </div>
          ))}
        </div>
      )}

      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, minWidth: 36, borderRadius: 10, background: '#EBF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={15} color="#0057FF" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>Webhooks personnalisés</div>
              <div style={{ fontSize: 11, color: '#AAA' }}>Notifications temps réel</div>
            </div>
          </div>
          <button onClick={() => setShowForm(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: showForm ? '#F7F8FC' : 'linear-gradient(135deg,#FF6B00,#FFAA00)', color: showForm ? '#555' : '#fff', border: showForm ? '1px solid #E8E8E8' : 'none', padding: '8px 13px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            <Plus size={12} /> Nouveau
          </button>
        </div>

        {showForm && (
          <div style={{ background: '#F7F8FC', border: '1px solid #E8E8E8', borderRadius: 12, padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 5 }}>URL du webhook</label>
              <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://votre-serveur.com/webhook"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #E0E0E0', borderRadius: 9, fontSize: 12, color: '#333', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 7 }}>Événements</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {availableEvents.map(ev => {
                  const on = form.events.includes(ev.value);
                  return <button key={ev.value} onClick={() => setForm(f => ({ ...f, events: on ? f.events.filter(e => e !== ev.value) : [...f.events, ev.value] }))} style={{ padding: '6px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: on ? ev.color : '#E8E8E8', color: on ? '#fff' : '#888' }}>{ev.label}</button>;
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addWebhook} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111', color: '#fff', border: 'none', padding: '9px 15px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? .6 : 1 }}>
                {saving ? <><Loader size={12} style={{ animation: 'spin .7s linear infinite' }} /> Ajout…</> : 'Ajouter'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#888', cursor: 'pointer', fontFamily: 'inherit', padding: '9px 8px' }}>Annuler</button>
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
              <div key={w.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: w.active ? '#fff' : '#F7F8FC', border: `1px solid ${w.active ? '#EBEBEB' : '#E0E0E0'}`, borderRadius: 11, padding: '11px 12px', opacity: w.active ? 1 : .55, overflow: 'hidden' }}>
                <button onClick={() => toggle(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: w.active ? '#00A550' : '#CCC', flexShrink: 0, padding: 0, marginTop: 1 }}>
                  {w.active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                </button>
                <div style={{ flex: '1 1 0', minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#222', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.url}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 3 }}>
                    {w.events.map(e => { const ev = availableEvents.find(ev => ev.value === e); return ev ? <EventBadge key={e} color={ev.color}>{ev.label}</EventBadge> : null; })}
                  </div>
                  <span style={{ fontSize: 10, color: '#BBB' }}>{new Date(w.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <button onClick={() => del(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DDD', padding: 3, flexShrink: 0, transition: 'color .2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#EF4444'} onMouseLeave={e => e.currentTarget.style.color = '#DDD'}>
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

/* ────────────────────────────────── TAB: DOCS ── */
function TabDocs() {
  const docsUrl = `${API_URL}/api-documentation`;

  const steps = [
    { num: '01', title: 'Clé API',      desc: 'Générez et enregistrez votre clé dans l\'onglet Clé API.',          icon: Key,        color: '#FF6B00', bg: '#FFF3EA' },
    { num: '02', title: 'Intégration',  desc: 'Utilisez le lien de paiement ou l\'API REST depuis votre backend.',  icon: Globe,      color: '#0057FF', bg: '#EBF0FF' },
    { num: '03', title: 'Webhooks',     desc: 'Recevez des notifications POST à chaque événement de paiement.',     icon: Webhook,    color: '#00A550', bg: '#EDFAF3' },
    { num: '04', title: 'Dashboard',    desc: 'Suivez toutes vos transactions avec export CSV intégré.',            icon: CheckCircle,color: '#9B00E8', bg: '#F4EBFF' },
  ];

  const endpoints = [
    { method: 'POST', path: '/api/gateway/pay',          desc: 'Initier' },
    { method: 'GET',  path: '/api/gateway/status/:id',   desc: 'Statut' },
    { method: 'GET',  path: '/api/gateway/transactions', desc: 'Lister' },
    { method: 'POST', path: '/api/gateway/refund/:id',   desc: 'Rembourser' },
  ];

  const MC = { POST: '#FF6B00', GET: '#0057FF' };
  const whPayload = `{\n  "event": "payment.completed",\n  "data": {\n    "id": "txn_abc123",\n    "amount": 5000,\n    "currency": "XOF",\n    "status": "completed"\n  }\n}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Bouton doc externe */}
      <a href={docsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '15px 16px', background: 'linear-gradient(135deg,#FF6B00,#FFAA00)', borderRadius: 16, textDecoration: 'none', boxShadow: '0 5px 18px rgba(255,107,0,.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, minWidth: 38, borderRadius: 10, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
      <div style={CARD}>
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
      <div style={CARD}>
        <CardHead iconBg="#0D1117" iconColor="#A0AEC0" icon={Code} title="Endpoints REST" sub="API Gateway" />
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #EBEBEB' }}>
          {endpoints.map((ep, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: i % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: i < endpoints.length - 1 ? '1px solid #F0F0F0' : 'none', overflow: 'hidden' }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: MC[ep.method] || '#888', background: `${MC[ep.method] || '#888'}15`, padding: '2px 7px', borderRadius: 5, minWidth: 34, textAlign: 'center', flexShrink: 0 }}>{ep.method}</span>
              <code style={{ flex: '1 1 0', minWidth: 0, fontSize: 11, color: '#444', fontFamily: "'Fira Code',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.path}</code>
              <span style={{ fontSize: 10, color: '#AAA', flexShrink: 0 }}>{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook payload */}
      <div style={CARD}>
        <CardHead iconBg="#EDFAF3" iconColor="#00A550" icon={Webhook} title="Payload Webhook" sub="Format JSON reçu sur votre endpoint" />
        <TerminalBlock code={whPayload} />
      </div>
    </div>
  );
}

/* ────────────────────────────────── MAIN ── */
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
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid #FF6B00', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{
      width: '100%', maxWidth: 680, margin: '0 auto',
      /* padding horizontal ne peut pas être en % sinon ça override le width */
      padding: '20px 14px',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      /* les deux lignes clés anti-overflow */
      boxSizing: 'border-box',
      overflowX: 'hidden',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        *, *::before, *::after { box-sizing: border-box; }
        input:focus { border-color: #FF6B00 !important; box-shadow: 0 0 0 3px rgba(255,107,0,.08) !important; outline: none !important; }
        /* Hide all scrollbars that appear on terminal blocks */
        .term-scroll::-webkit-scrollbar { height: 3px; }
        .term-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
      `}</style>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 19, fontWeight: 900, color: '#0A0A0A', letterSpacing: '-.02em', marginBottom: 3 }}>Espace Développeur</h1>
        <p style={{ fontSize: 12, color: '#AAA' }}>Gérez vos clés API, webhooks et consultez la documentation.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 3, background: '#F3F4F6', borderRadius: 13, padding: 4, marginBottom: 18, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`div::-webkit-scrollbar{display:none}`}</style>
        {TABS.map(t => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', background: on ? '#fff' : 'transparent', color: on ? '#111' : '#888', fontWeight: on ? 700 : 500, fontSize: 12, boxShadow: on ? '0 1px 5px rgba(0,0,0,.07)' : 'none', fontFamily: 'inherit', transition: 'all .18s' }}>
              <t.icon size={13} color={on ? '#FF6B00' : '#CCC'} />
              {t.label}
              {t.id === 'api' && apiKey && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00A550', flexShrink: 0 }} />}
              {t.id === 'webhooks' && webhooks.length > 0 && <span style={{ background: '#FF6B00', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 100 }}>{webhooks.length}</span>}
            </button>
          );
        })}
      </div>

      {/* Content wrapper — overflow:hidden is the key guard */}
      <div style={{ width: '100%', overflowX: 'hidden' }}>
        {tab === 'api'      && <TabApiKey   apiKey={apiKey} setApiKey={setApiKey} />}
        {tab === 'webhooks' && <TabWebhooks merchant={merchant} webhooks={webhooks} setWebhooks={setWebhooks} />}
        {tab === 'docs'     && <TabDocs />}
      </div>
    </div>
  );
}