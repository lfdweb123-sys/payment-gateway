import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Key, Copy, Eye, EyeOff, Plus, Trash2, Save, Loader,
  Code, Globe, CheckCircle, XCircle,
  Terminal, Webhook, RefreshCw, ChevronRight,
  Lock, Zap, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

const TABS = [
  { id: 'api',       label: 'Clé API',      icon: Key },
  { id: 'webhooks',  label: 'Webhooks',     icon: Webhook },
  { id: 'docs',      label: 'Documentation',icon: BookOpen },
];

const availableEvents = [
  { value: 'payment.completed', label: 'Paiement réussi',      color: '#00A550' },
  { value: 'payment.failed',    label: 'Paiement échoué',      color: '#EF4444' },
  { value: 'payment.pending',   label: 'Paiement en attente',  color: '#F59E0B' },
  { value: 'payment.refunded',  label: 'Paiement remboursé',   color: '#6366F1' },
];

/* ── tiny helpers ── */
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
      width: 34, height: 34, borderRadius: 9,
      border: '1px solid #E8E8E8', background: done ? '#F0FDF4' : '#FAFAFA',
      cursor: 'pointer', color: done ? '#00A550' : '#888',
      flexShrink: 0, transition: 'all .2s',
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
      padding: '3px 9px', borderRadius: 100,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

/* ── MASKED KEY ── */
function MaskedKey({ value, show }) {
  if (!value) return <span style={{ color: '#BBB', fontStyle: 'italic' }}>—</span>;
  return show ? value : value.substring(0, 10) + '••••••••••••••••••••••••••••';
}

/* ── TAB: API KEY ── */
function TabApiKey({ merchant, apiKey, setApiKey }) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      const k = 'gw_live_' + Array.from({ length: 44 }, () => Math.random().toString(36)[2]).join('');
      setApiKey(k);
      setShow(true);
      setGenerating(false);
    }, 600);
  };

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'gateway_merchants', user.uid), {
        apiKey, updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Clé enregistrée avec succès');
    } catch { toast.error('Erreur lors de l\'enregistrement'); }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Clé API Card */}
      <div style={cardStyle}>
        <div style={cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={iconBox('#FFF3EA')}>
              <Key size={16} color="#FF6B00" />
            </div>
            <div>
              <div style={cardTitle}>Clé API secrète</div>
              <div style={cardSub}>Utilisée pour authentifier toutes vos requêtes</div>
            </div>
          </div>
          {apiKey && (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#EDFAF3', color: '#00A550', padding: '4px 10px', borderRadius: 100 }}>
              ● Active
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            flex: 1, background: '#F7F8FC', border: '1px solid #EBEBEB',
            borderRadius: 12, padding: '12px 16px',
            fontFamily: "'Fira Code', 'Courier New', monospace",
            fontSize: 13, color: '#333', letterSpacing: '.04em',
            minHeight: 46, display: 'flex', alignItems: 'center',
          }}>
            <MaskedKey value={apiKey} show={show} />
          </div>
          {apiKey && (
            <button onClick={() => setShow(v => !v)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 46, height: 46, borderRadius: 12,
              border: '1px solid #E8E8E8', background: '#FAFAFA',
              cursor: 'pointer', color: '#888', flexShrink: 0,
            }}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {apiKey && <CopyBtn text={apiKey} />}
        </div>

        {apiKey && show && (
          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 12, color: '#92400E', display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <Lock size={13} style={{ marginTop: 1, flexShrink: 0, color: '#D97706' }} />
            Ne partagez jamais cette clé. Elle donne un accès total à vos paiements.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
          <button onClick={generate} disabled={generating} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: apiKey ? '#F7F8FC' : 'linear-gradient(135deg,#FF6B00,#FFAA00)',
            color: apiKey ? '#555' : '#fff',
            border: apiKey ? '1px solid #E8E8E8' : 'none',
            padding: '10px 20px', borderRadius: 12,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: apiKey ? 'none' : '0 4px 16px rgba(255,107,0,.3)',
            transition: 'all .2s',
          }}>
            {generating
              ? <><Loader size={14} style={{ animation: 'spin .7s linear infinite' }} /> Génération...</>
              : <><RefreshCw size={14} /> {apiKey ? 'Regénérer' : 'Générer ma clé API'}</>
            }
          </button>
          {apiKey && (
            <button onClick={save} disabled={saving} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'linear-gradient(135deg,#FF6B00,#FFAA00)',
              color: '#fff', border: 'none',
              padding: '10px 20px', borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255,107,0,.3)',
              opacity: saving ? .6 : 1,
            }}>
              {saving ? <><Loader size={14} style={{ animation: 'spin .7s linear infinite' }} /> Enregistrement...</> : <><Save size={14} /> Enregistrer</>}
            </button>
          )}
        </div>
      </div>

      {apiKey && <>
        {/* Lien de paiement */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={iconBox('#EBF0FF')}>
                <Globe size={16} color="#0057FF" />
              </div>
              <div>
                <div style={cardTitle}>Lien de paiement</div>
                <div style={cardSub}>Partagez directement ce lien à vos clients</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{
              flex: 1, background: '#F7F8FC', border: '1px solid #EBEBEB',
              borderRadius: 12, padding: '12px 16px',
              fontSize: 12, color: '#555', overflowX: 'auto',
              display: 'block', whiteSpace: 'nowrap',
            }}>{paymentLink}</code>
            <CopyBtn text={paymentLink} />
          </div>
        </div>

        {/* cURL */}
        <div style={cardStyle}>
          <div style={cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={iconBox('#1A1A2E')}>
                <Terminal size={16} color="#A0AEC0" />
              </div>
              <div>
                <div style={cardTitle}>Test rapide cURL</div>
                <div style={cardSub}>Testez votre intégration depuis le terminal</div>
              </div>
            </div>
            <CopyBtn text={curlExample} />
          </div>
          <div style={{
            background: '#0D1117', borderRadius: 12, padding: '16px 20px',
            overflow: 'auto', position: 'relative',
          }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {['#FF5F56','#FFBD2E','#27C93F'].map((c,i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <pre style={{
              fontFamily: "'Fira Code','Courier New',monospace",
              fontSize: 12, lineHeight: 1.8, color: '#E6EDF3', margin: 0,
            }}>{curlExample}</pre>
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
  const [form, setForm] = useState({ url: '', events: ['payment.completed'] });
  const [saving, setSaving] = useState(false);

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
    toast.success('Webhook supprimé');
  };

  const toggle = async (id) => {
    const updated = webhooks.map(w => w.id === id ? { ...w, active: !w.active } : w);
    await setDoc(doc(db, 'gateway_merchants', user.uid), { webhooks: updated, updatedAt: new Date().toISOString() }, { merge: true });
    setWebhooks(updated);
  };

  const toggleEvent = (ev) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* URLs Providers */}
      {providerUrls.length > 0 && (
        <div style={cardStyle}>
          <div style={cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={iconBox('#FFF3EA')}>
                <Webhook size={16} color="#FF6B00" />
              </div>
              <div>
                <div style={cardTitle}>URLs à configurer chez vos providers</div>
                <div style={cardSub}>Copiez ces URLs dans le tableau de bord de chaque provider</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {providerUrls.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: '#F7F8FC', border: '1px solid #EBEBEB',
                borderRadius: 12, padding: '12px 14px',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: '#FFF3EA', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#FF6B00', flexShrink: 0,
                }}>
                  {p.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 2 }}>{p.name}</div>
                  <code style={{ fontSize: 11, color: '#888', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</code>
                </div>
                <CopyBtn text={p.url} size={13} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhooks personnalisés */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={iconBox('#EBF0FF')}>
              <Zap size={16} color="#0057FF" />
            </div>
            <div>
              <div style={cardTitle}>Webhooks personnalisés</div>
              <div style={cardSub}>Notifications temps réel vers votre serveur</div>
            </div>
          </div>
          <button onClick={() => setShowForm(v => !v)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: showForm ? '#F7F8FC' : 'linear-gradient(135deg,#FF6B00,#FFAA00)',
            color: showForm ? '#555' : '#fff',
            border: showForm ? '1px solid #E8E8E8' : 'none',
            padding: '9px 16px', borderRadius: 11,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 3px 12px rgba(255,107,0,.3)',
          }}>
            <Plus size={13} /> Nouveau
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{
            background: '#F7F8FC', border: '1px solid #EBEBEB',
            borderRadius: 14, padding: '18px', marginBottom: 16,
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div>
              <label style={labelStyle}>URL du webhook</label>
              <input type="url" value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://votre-serveur.com/webhook"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Événements à écouter</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {availableEvents.map(ev => {
                  const active = form.events.includes(ev.value);
                  return (
                    <button key={ev.value} onClick={() => toggleEvent(ev.value)} style={{
                      padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', border: 'none', transition: 'all .15s',
                      background: active ? ev.color : '#EBEBEB',
                      color: active ? '#fff' : '#888',
                    }}>
                      {ev.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button onClick={addWebhook} disabled={saving} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: '#111', color: '#fff', border: 'none',
                padding: '10px 20px', borderRadius: 11,
                fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1,
              }}>
                {saving ? <><Loader size={13} style={{ animation: 'spin .7s linear infinite' }} /> Ajout...</> : 'Ajouter le webhook'}
              </button>
              <button onClick={() => setShowForm(false)} style={{
                background: 'none', border: 'none', fontSize: 13, color: '#888', cursor: 'pointer', padding: '10px 14px',
              }}>Annuler</button>
            </div>
          </div>
        )}

        {/* List */}
        {webhooks.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 0',
            color: '#CCC', fontSize: 13,
          }}>
            <Webhook size={28} style={{ marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
            Aucun webhook configuré
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {webhooks.map(w => (
              <div key={w.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                background: w.active ? '#fff' : '#F7F8FC',
                border: `1px solid ${w.active ? '#EBEBEB' : '#E0E0E0'}`,
                borderRadius: 12, padding: '12px 14px',
                opacity: w.active ? 1 : .55, transition: 'all .2s',
              }}>
                <button onClick={() => toggle(w.id)} style={{
                  marginTop: 2, background: 'none', border: 'none', cursor: 'pointer',
                  color: w.active ? '#00A550' : '#CCC', flexShrink: 0,
                }}>
                  {w.active ? <CheckCircle size={18} /> : <XCircle size={18} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#222', marginBottom: 6, wordBreak: 'break-all' }}>{w.url}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 4 }}>
                    {w.events.map(e => {
                      const ev = availableEvents.find(ev => ev.value === e);
                      return ev ? <Badge key={e} color={ev.color}>{ev.label}</Badge> : null;
                    })}
                  </div>
                  <span style={{ fontSize: 11, color: '#AAA' }}>
                    Créé le {new Date(w.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <button onClick={() => del(w.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#DDD', padding: 4, marginTop: 2,
                  transition: 'color .2s',
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
  const steps = [
    {
      num: '01', title: 'Générez votre clé API',
      desc: 'Dans l\'onglet "Clé API", générez et enregistrez votre clé. Elle servira à authentifier chaque requête.',
      icon: Key, color: '#FF6B00', bg: '#FFF3EA',
    },
    {
      num: '02', title: 'Intégrez le lien de paiement',
      desc: 'Redirigez vos clients vers votre lien de paiement ou appelez l\'API REST depuis votre backend.',
      icon: Globe, color: '#0057FF', bg: '#EBF0FF',
    },
    {
      num: '03', title: 'Configurez vos webhooks',
      desc: 'Recevez des notifications POST sur votre serveur à chaque événement : succès, échec, remboursement…',
      icon: Webhook, color: '#00A550', bg: '#EDFAF3',
    },
    {
      num: '04', title: 'Vérifiez dans le dashboard',
      desc: 'Toutes vos transactions sont centralisées dans l\'onglet Transactions avec export CSV.',
      icon: CheckCircle, color: '#9B00E8', bg: '#F4EBFF',
    },
  ];

  const endpoints = [
    { method: 'POST', path: '/api/gateway/pay', desc: 'Initier un paiement' },
    { method: 'GET',  path: '/api/gateway/status/:id', desc: 'Statut d\'une transaction' },
    { method: 'GET',  path: '/api/gateway/transactions', desc: 'Lister les transactions' },
    { method: 'POST', path: '/api/gateway/refund/:id', desc: 'Rembourser un paiement' },
  ];

  const methodColors = { POST: '#FF6B00', GET: '#0057FF', PUT: '#00A550', DELETE: '#EF4444' };

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Steps */}
      <div style={cardStyle}>
        <div style={{ ...cardHeader, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={iconBox('#F7F8FC', '#888')}>
              <BookOpen size={16} color="#555" />
            </div>
            <div>
              <div style={cardTitle}>Guide d'intégration</div>
              <div style={cardSub}>Démarrez en 4 étapes simples</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              background: '#F7F8FC', border: '1px solid #EBEBEB',
              borderRadius: 14, padding: '18px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ ...iconBox(s.bg), width: 38, height: 38 }}>
                  <s.icon size={16} color={s.color} />
                </div>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#EBEBEB', letterSpacing: '-.02em' }}>{s.num}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{s.title}</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.65 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoints */}
      <div style={cardStyle}>
        <div style={cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={iconBox('#0D1117', '#666')}>
              <Code size={16} color="#A0AEC0" />
            </div>
            <div>
              <div style={cardTitle}>Endpoints REST</div>
              <div style={cardSub}>Base URL : <code style={{ fontSize: 11, color: '#FF6B00' }}>{APP_URL}/api/gateway</code></div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid #EBEBEB' }}>
          {endpoints.map((ep, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 16px',
              background: i % 2 === 0 ? '#fff' : '#FAFAFA',
              borderBottom: i < endpoints.length - 1 ? '1px solid #F0F0F0' : 'none',
            }}>
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: methodColors[ep.method] || '#888',
                background: `${methodColors[ep.method]}15`,
                padding: '3px 9px', borderRadius: 6,
                minWidth: 46, textAlign: 'center', flexShrink: 0,
              }}>{ep.method}</span>
              <code style={{ fontSize: 12, color: '#444', flex: 1, fontFamily: "'Fira Code', monospace" }}>{ep.path}</code>
              <span style={{ fontSize: 12, color: '#AAA' }}>{ep.desc}</span>
              <ChevronRight size={13} color="#DDD" />
            </div>
          ))}
        </div>
      </div>

      {/* Webhook payload */}
      <div style={cardStyle}>
        <div style={cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={iconBox('#EDFAF3')}>
              <Webhook size={16} color="#00A550" />
            </div>
            <div>
              <div style={cardTitle}>Payload Webhook</div>
              <div style={cardSub}>Format JSON envoyé en POST sur votre endpoint</div>
            </div>
          </div>
          <CopyBtn text={webhookPayload} />
        </div>
        <div style={{
          background: '#0D1117', borderRadius: 12, padding: '16px 20px', overflow: 'auto',
        }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {['#FF5F56','#FFBD2E','#27C93F'].map((c,i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <pre style={{
            fontFamily: "'Fira Code','Courier New',monospace",
            fontSize: 12, lineHeight: 1.8, color: '#E6EDF3', margin: 0,
          }}>{webhookPayload}</pre>
        </div>
      </div>
    </div>
  );
}

/* ── shared styles ── */
const cardStyle = {
  background: '#fff',
  border: '1px solid #EBEBEB',
  borderRadius: 18,
  padding: '22px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};
const cardHeader = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
};
const cardTitle = { fontSize: 15, fontWeight: 800, color: '#111' };
const cardSub = { fontSize: 12, color: '#AAA', marginTop: 2 };
const labelStyle = { fontSize: 11, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 };
const inputStyle = {
  width: '100%', padding: '10px 14px',
  border: '1px solid #E0E0E0', borderRadius: 10,
  fontSize: 13, color: '#333', outline: 'none',
  background: '#fff', fontFamily: 'inherit',
  boxSizing: 'border-box',
};
const iconBox = (bg, _) => ({
  width: 38, height: 38, borderRadius: 11,
  background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
});

/* ── MAIN ── */
export default function Developer() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('api');
  const [merchant, setMerchant] = useState(null);
  const [apiKey, setApiKey] = useState('');
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
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2.5px solid #FF6B00', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{
      maxWidth: 780,
      margin: '0 auto',
      padding: '24px 20px',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:#FF6B00!important; box-shadow:0 0 0 3px rgba(255,107,0,.08)!important;}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0A0A0A', letterSpacing: '-.02em', marginBottom: 4 }}>
          Espace Développeur
        </h1>
        <p style={{ fontSize: 13, color: '#AAA' }}>Gérez vos clés API, webhooks et consultez la documentation.</p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4,
        background: '#F3F4F6',
        borderRadius: 14, padding: 4,
        marginBottom: 24,
      }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '10px 16px', borderRadius: 11, border: 'none',
              cursor: 'pointer', transition: 'all .2s',
              background: active ? '#fff' : 'transparent',
              color: active ? '#111' : '#888',
              fontWeight: active ? 700 : 500,
              fontSize: 13,
              boxShadow: active ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
            }}>
              <t.icon size={14} style={{ color: active ? '#FF6B00' : '#BBB' }} />
              <span style={{ whiteSpace: 'nowrap' }}>{t.label}</span>
              {t.id === 'api' && apiKey && (
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#00A550', flexShrink: 0,
                }} />
              )}
              {t.id === 'webhooks' && webhooks.length > 0 && (
                <span style={{
                  background: '#FF6B00', color: '#fff',
                  fontSize: 10, fontWeight: 800,
                  padding: '1px 6px', borderRadius: 100,
                  minWidth: 18, textAlign: 'center',
                }}>
                  {webhooks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tab === 'api' && <TabApiKey merchant={merchant} apiKey={apiKey} setApiKey={setApiKey} />}
      {tab === 'webhooks' && <TabWebhooks merchant={merchant} webhooks={webhooks} setWebhooks={setWebhooks} />}
      {tab === 'docs' && <TabDocs apiKey={apiKey} />}
    </div>
  );
}