import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Key, Copy, Eye, EyeOff, Plus, Trash2, Save, Loader,
  Code, Globe, CheckCircle, XCircle,
  Terminal, Webhook, RefreshCw, ChevronRight,
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
  { value: 'payment.completed', label: 'Paiement réussi',     color: '#00A550' },
  { value: 'payment.failed',    label: 'Paiement échoué',     color: '#EF4444' },
  { value: 'payment.pending',   label: 'En attente',          color: '#F59E0B' },
  { value: 'payment.refunded',  label: 'Remboursé',           color: '#6366F1' },
];

/* ── helpers ── */
function CopyBtn({ text, size = 14 }) {
  const [done, setDone] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    toast.success('Copié !');
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <button onClick={handle} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
      border: '1px solid #E8E8E8', background: done ? '#F0FDF4' : '#FAFAFA',
      cursor: 'pointer', color: done ? '#00A550' : '#888', transition: 'all .2s',
    }}>
      {done ? <CheckCircle size={size} /> : <Copy size={size} />}
    </button>
  );
}

function Badge({ color, children }) {
  const map = {
    '#00A550': { bg: '#EDFAF3', text: '#00A550' },
    '#EF4444': { bg: '#FEF2F2', text: '#DC2626' },
    '#F59E0B': { bg: '#FFFBEB', text: '#D97706' },
    '#6366F1': { bg: '#EEF2FF', text: '#4F46E5' },
  };
  const c = map[color] || { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <span style={{
      background: c.bg, color: c.text,
      fontSize: 11, fontWeight: 700,
      padding: '3px 8px', borderRadius: 100, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

/* ── shared card style ── */
const card = {
  background: '#fff', border: '1px solid #EBEBEB',
  borderRadius: 18, padding: '20px',
  display: 'flex', flexDirection: 'column', gap: 16,
};

const cardTitle = { fontSize: 15, fontWeight: 800, color: '#111' };
const cardSub   = { fontSize: 12, color: '#AAA', marginTop: 2 };

function iconBox(bg) {
  return {
    width: 38, height: 38, borderRadius: 11,
    background: bg, display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  };
}

function CardHeader({ iconBg, icon: Icon, iconColor, title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={iconBox(iconBg)}><Icon size={16} color={iconColor} /></div>
        <div><div style={cardTitle}>{title}</div><div style={cardSub}>{sub}</div></div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

/* ── TAB: API KEY ── */
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

  const paymentLink = `${APP_URL}/pay?token=${apiKey}`;
  const curlExample = `curl -X POST ${APP_URL}/api/gateway/pay \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || 'YOUR_API_KEY'}" \\
  -d '{
    "amount": 5000,
    "currency": "XOF",
    "description": "Commande #1234"
  }'`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Clé */}
      <div style={card}>
        <CardHeader iconBg="#FFF3EA" icon={Key} iconColor="#FF6B00"
          title="Clé API secrète"
          sub="Authentifie toutes vos requêtes"
          right={apiKey && (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#EDFAF3', color: '#00A550', padding: '4px 10px', borderRadius: 100 }}>
              ● Active
            </span>
          )}
        />

        {/* champ clé */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            flex: 1, minWidth: 0,
            background: '#F7F8FC', border: '1px solid #EBEBEB', borderRadius: 11,
            padding: '11px 14px', fontFamily: "'Fira Code',monospace",
            fontSize: 12, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {apiKey
              ? show ? apiKey : apiKey.substring(0, 12) + '••••••••••••••••••••'
              : <span style={{ color: '#CCC', fontStyle: 'italic' }}>Aucune clé générée</span>
            }
          </div>
          {apiKey && <>
            <button onClick={() => setShow(v => !v)} style={{
              width: 36, height: 36, borderRadius: 9, border: '1px solid #E8E8E8',
              background: '#FAFAFA', cursor: 'pointer', color: '#888',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <CopyBtn text={apiKey} />
          </>}
        </div>

        {apiKey && show && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 10, padding: '10px 13px',
            fontSize: 12, color: '#92400E', display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <Lock size={13} style={{ marginTop: 1, flexShrink: 0, color: '#D97706' }} />
            Ne partagez jamais cette clé. Elle donne un accès total à vos paiements.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={generate} disabled={genning} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: apiKey ? '#F7F8FC' : 'linear-gradient(135deg,#FF6B00,#FFAA00)',
            color: apiKey ? '#555' : '#fff',
            border: apiKey ? '1px solid #E8E8E8' : 'none',
            padding: '10px 18px', borderRadius: 11, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', boxShadow: apiKey ? 'none' : '0 4px 14px rgba(255,107,0,.3)',
          }}>
            {genning
              ? <><Loader size={13} style={{ animation: 'spin .7s linear infinite' }} /> Génération…</>
              : <><RefreshCw size={13} /> {apiKey ? 'Regénérer' : 'Générer ma clé API'}</>
            }
          </button>
          {apiKey && (
            <button onClick={save} disabled={saving} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'linear-gradient(135deg,#FF6B00,#FFAA00)', color: '#fff', border: 'none',
              padding: '10px 18px', borderRadius: 11, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(255,107,0,.3)',
              opacity: saving ? .6 : 1,
            }}>
              {saving
                ? <><Loader size={13} style={{ animation: 'spin .7s linear infinite' }} /> Enregistrement…</>
                : <><Save size={13} /> Enregistrer</>
              }
            </button>
          )}
        </div>
      </div>

      {apiKey && <>
        {/* Lien de paiement */}
        <div style={card}>
          <CardHeader iconBg="#EBF0FF" icon={Globe} iconColor="#0057FF"
            title="Lien de paiement" sub="Partagez ce lien à vos clients" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{
              flex: 1, minWidth: 0, display: 'block',
              background: '#F7F8FC', border: '1px solid #EBEBEB', borderRadius: 11,
              padding: '11px 14px', fontSize: 12, color: '#555',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{paymentLink}</code>
            <CopyBtn text={paymentLink} />
          </div>
        </div>

        {/* cURL */}
        <div style={card}>
          <CardHeader iconBg="#1A1A2E" icon={Terminal} iconColor="#A0AEC0"
            title="Test cURL" sub="Testez depuis votre terminal" right={<CopyBtn text={curlExample} />} />
          <div style={{ background: '#0D1117', borderRadius: 12, padding: '14px 16px', overflow: 'auto' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {['#FF5F56','#FFBD2E','#27C93F'].map((c,i) => <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
            </div>
            <pre style={{ fontFamily: "'Fira Code',monospace", fontSize: 11, lineHeight: 1.8, color: '#E6EDF3', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {curlExample}
            </pre>
          </div>
        </div>
      </>}
    </div>
  );
}

/* ── TAB: WEBHOOKS ── */
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
    if (!form.url)                        { toast.error('URL requise'); return; }
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

  const toggleEvent = (ev) => {
    setForm(f => ({
      ...f, events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* URLs providers */}
      {providerUrls.length > 0 && (
        <div style={card}>
          <CardHeader iconBg="#FFF3EA" icon={Webhook} iconColor="#FF6B00"
            title="URLs à configurer chez vos providers"
            sub="Copiez ces URLs dans le tableau de bord de chaque provider" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {providerUrls.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#F7F8FC', border: '1px solid #EBEBEB', borderRadius: 11, padding: '10px 12px',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, background: '#FFF3EA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: '#FF6B00', flexShrink: 0,
                }}>
                  {p.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>{p.name}</div>
                  <code style={{ fontSize: 11, color: '#999', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</code>
                </div>
                <CopyBtn text={p.url} size={13} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhooks perso */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={iconBox('#EBF0FF')}><Zap size={16} color="#0057FF" /></div>
            <div><div style={cardTitle}>Webhooks personnalisés</div><div style={cardSub}>Notifications temps réel vers votre serveur</div></div>
          </div>
          <button onClick={() => setShowForm(v => !v)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: showForm ? '#F7F8FC' : 'linear-gradient(135deg,#FF6B00,#FFAA00)',
            color: showForm ? '#555' : '#fff',
            border: showForm ? '1px solid #E8E8E8' : 'none',
            padding: '9px 16px', borderRadius: 10,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 3px 12px rgba(255,107,0,.3)',
          }}>
            <Plus size={13} /> Nouveau
          </button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div style={{
            background: '#F7F8FC', border: '1px solid #EBEBEB',
            borderRadius: 13, padding: '16px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
                URL du webhook
              </label>
              <input type="url" value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://votre-serveur.com/webhook"
                style={{ width: '100%', padding: '10px 13px', border: '1px solid #E0E0E0', borderRadius: 10, fontSize: 13, color: '#333', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 8 }}>
                Événements
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {availableEvents.map(ev => {
                  const active = form.events.includes(ev.value);
                  return (
                    <button key={ev.value} onClick={() => toggleEvent(ev.value)} style={{
                      padding: '7px 13px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', border: 'none', transition: 'all .15s',
                      background: active ? ev.color : '#E8E8E8',
                      color: active ? '#fff' : '#888',
                    }}>
                      {ev.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={addWebhook} disabled={saving} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: '#111', color: '#fff', border: 'none',
                padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', opacity: saving ? .6 : 1,
              }}>
                {saving ? <><Loader size={13} style={{ animation: 'spin .7s linear infinite' }} /> Ajout…</> : 'Ajouter'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 13, color: '#888', cursor: 'pointer', padding: '10px 12px' }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Liste */}
        {webhooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#CCC', fontSize: 13 }}>
            <Webhook size={26} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
            Aucun webhook configuré
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {webhooks.map(w => (
              <div key={w.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: w.active ? '#fff' : '#F7F8FC',
                border: `1px solid ${w.active ? '#EBEBEB' : '#E0E0E0'}`,
                borderRadius: 12, padding: '12px',
                opacity: w.active ? 1 : .55, transition: 'all .2s',
              }}>
                <button onClick={() => toggle(w.id)} style={{
                  marginTop: 2, background: 'none', border: 'none', cursor: 'pointer',
                  color: w.active ? '#00A550' : '#CCC', flexShrink: 0, padding: 0,
                }}>
                  {w.active ? <CheckCircle size={18} /> : <XCircle size={18} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#222', marginBottom: 6, wordBreak: 'break-all' }}>{w.url}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 4 }}>
                    {w.events.map(e => {
                      const ev = availableEvents.find(ev => ev.value === e);
                      return ev ? <Badge key={e} color={ev.color}>{ev.label}</Badge> : null;
                    })}
                  </div>
                  <span style={{ fontSize: 11, color: '#BBB' }}>
                    {new Date(w.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <button onClick={() => del(w.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#DDD', padding: 4, marginTop: 2, flexShrink: 0, transition: 'color .2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#DDD'}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── TAB: DOCS ── */
function TabDocs({ apiKey }) {
  const docsUrl = `${API_URL}/api-documentation`;

  const steps = [
    { num: '01', title: 'Générez votre clé API', desc: 'Dans l\'onglet "Clé API", générez et enregistrez votre clé. Elle sert à authentifier chaque requête.', icon: Key,      color: '#FF6B00', bg: '#FFF3EA' },
    { num: '02', title: 'Intégrez le paiement',  desc: 'Redirigez vos clients via le lien de paiement ou appelez l\'API REST depuis votre backend.',          icon: Globe,     color: '#0057FF', bg: '#EBF0FF' },
    { num: '03', title: 'Configurez les webhooks',desc: 'Recevez des notifications POST sur votre serveur à chaque événement de paiement.',                    icon: Webhook,   color: '#00A550', bg: '#EDFAF3' },
    { num: '04', title: 'Suivez vos transactions',desc: 'Toutes vos transactions sont centralisées dans l\'onglet Transactions avec export CSV.',              icon: CheckCircle,color: '#9B00E8', bg: '#F4EBFF' },
  ];

  const endpoints = [
    { method: 'POST', path: '/api/gateway/pay',              desc: 'Initier un paiement' },
    { method: 'GET',  path: '/api/gateway/status/:id',       desc: 'Statut d\'une transaction' },
    { method: 'GET',  path: '/api/gateway/transactions',     desc: 'Lister les transactions' },
    { method: 'POST', path: '/api/gateway/refund/:id',       desc: 'Rembourser' },
  ];

  const methodColor = { POST: '#FF6B00', GET: '#0057FF', PUT: '#00A550', DELETE: '#EF4444' };

  const webhookPayload = `{
  "event": "payment.completed",
  "data": {
    "id": "txn_abc123",
    "amount": 5000,
    "currency": "XOF",
    "provider": "mtn",
    "status": "completed",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Lien vers doc complète ── */}
      <a
        href={docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 14, padding: '18px 20px',
          background: 'linear-gradient(135deg,#FF6B00,#FFAA00)',
          borderRadius: 18, textDecoration: 'none',
          boxShadow: '0 6px 24px rgba(255,107,0,.25)',
          transition: 'transform .2s, box-shadow .2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(255,107,0,.35)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = '0 6px 24px rgba(255,107,0,.25)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <BookOpen size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
              Documentation complète de l'API
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>
              Référence complète, exemples de code et guides d'intégration
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,.2)', borderRadius: 10,
          padding: '8px 14px', flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>Ouvrir</span>
          <ExternalLink size={13} color="#fff" />
        </div>
      </a>

      {/* Guide étapes */}
      <div style={card}>
        <CardHeader iconBg="#F7F8FC" icon={BookOpen} iconColor="#555"
          title="Guide d'intégration" sub="Démarrez en 4 étapes simples" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              background: '#F7F8FC', border: '1px solid #EBEBEB',
              borderRadius: 13, padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={15} color={s.color} />
                </div>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#E8E8E8', letterSpacing: '-.02em' }}>{s.num}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{s.title}</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoints */}
      <div style={card}>
        <CardHeader iconBg="#0D1117" icon={Code} iconColor="#A0AEC0"
          title="Endpoints REST"
          sub={<>Base URL : <code style={{ fontSize: 11, color: '#FF6B00' }}>{APP_URL}/api/gateway</code></>}
        />
        <div style={{ borderRadius: 11, overflow: 'hidden', border: '1px solid #EBEBEB' }}>
          {endpoints.map((ep, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', flexWrap: 'wrap',
              background: i % 2 === 0 ? '#fff' : '#FAFAFA',
              borderBottom: i < endpoints.length - 1 ? '1px solid #F0F0F0' : 'none',
            }}>
              <span style={{
                fontSize: 10, fontWeight: 800,
                color: methodColor[ep.method],
                background: `${methodColor[ep.method]}15`,
                padding: '3px 8px', borderRadius: 6,
                minWidth: 40, textAlign: 'center', flexShrink: 0,
              }}>{ep.method}</span>
              <code style={{ fontSize: 12, color: '#444', flex: 1, minWidth: 140, fontFamily: "'Fira Code',monospace", wordBreak: 'break-all' }}>{ep.path}</code>
              <span style={{ fontSize: 11, color: '#AAA', whiteSpace: 'nowrap' }}>{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payload webhook */}
      <div style={card}>
        <CardHeader iconBg="#EDFAF3" icon={Webhook} iconColor="#00A550"
          title="Payload Webhook" sub="Format JSON envoyé en POST sur votre endpoint"
          right={<CopyBtn text={webhookPayload} />}
        />
        <div style={{ background: '#0D1117', borderRadius: 11, padding: '14px 16px', overflow: 'auto' }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
            {['#FF5F56','#FFBD2E','#27C93F'].map((c,i) => <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
          </div>
          <pre style={{ fontFamily: "'Fira Code',monospace", fontSize: 12, lineHeight: 1.8, color: '#E6EDF3', margin: 0 }}>
            {webhookPayload}
          </pre>
        </div>
      </div>

    </div>
  );
}

/* ── MAIN ── */
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
      <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2.5px solid #FF6B00', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{
      maxWidth: 720, margin: '0 auto',
      padding: '20px 16px',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #FF6B00 !important; box-shadow: 0 0 0 3px rgba(255,107,0,.08) !important; outline: none !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0A0A0A', letterSpacing: '-.02em', marginBottom: 3 }}>
          Espace Développeur
        </h1>
        <p style={{ fontSize: 12, color: '#AAA' }}>Gérez vos clés API, webhooks et consultez la documentation.</p>
      </div>

      {/* Tab bar — scroll horizontal sur mobile */}
      <div style={{
        display: 'flex', gap: 4,
        background: '#F3F4F6', borderRadius: 14, padding: 4,
        marginBottom: 20,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: '1 0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 10, border: 'none',
              cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap',
              background: active ? '#fff' : 'transparent',
              color: active ? '#111' : '#888',
              fontWeight: active ? 700 : 500, fontSize: 13,
              boxShadow: active ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
              fontFamily: 'inherit',
            }}>
              <t.icon size={14} color={active ? '#FF6B00' : '#CCC'} />
              {t.label}
              {t.id === 'api' && apiKey && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00A550', flexShrink: 0 }} />
              )}
              {t.id === 'webhooks' && webhooks.length > 0 && (
                <span style={{
                  background: '#FF6B00', color: '#fff',
                  fontSize: 10, fontWeight: 800, padding: '1px 6px',
                  borderRadius: 100, minWidth: 16, textAlign: 'center',
                }}>
                  {webhooks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tab === 'api'      && <TabApiKey      apiKey={apiKey} setApiKey={setApiKey} />}
      {tab === 'webhooks' && <TabWebhooks    merchant={merchant} webhooks={webhooks} setWebhooks={setWebhooks} />}
      {tab === 'docs'     && <TabDocs        apiKey={apiKey} />}
    </div>
  );
}