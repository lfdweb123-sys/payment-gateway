import { useState, useEffect } from 'react';
import {
  collection, query, where, getDocs, orderBy,
  limit, updateDoc, doc, getDoc, setDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import antiFraud from '../../services/antiFraud';
import {
  Shield, AlertTriangle, CheckCircle, X, ChevronDown,
  ChevronLeft, ChevronRight, Search, Trash2, Ban,
  Activity, TrendingUp, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const PAGE_SIZE = 15;

const SIGNAL_LABELS = {
  DUPLICATE_TRANSACTION:  'Doublon exact',
  PHONE_VELOCITY_1MIN:    'Trop rapide (1 min)',
  PHONE_VELOCITY_10MIN:   'Trop rapide (10 min)',
  MERCHANT_VELOCITY_1MIN: 'Rafale transactions',
  MERCHANT_VELOCITY_1H:   'Volume horaire élevé',
  REPEAT_AMOUNT_PATTERN:  'Montant répété',
  SUSPICIOUS_HOUR:        'Heure suspecte',
  LARGE_AMOUNT:           'Gros montant',
  AMOUNT_EXCEEDS_LIMIT:   'Dépassement limite',
  BLACKLISTED:            'Blacklisté',
  LOW_TRUST_SCORE:        'Score confiance faible',
};

function RiskBadge({ score }) {
  const cfg = score >= 70 ? { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444', label: 'Bloqué'  }
            : score >= 40 ? { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b', label: 'Revue'   }
            :               { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e', label: 'Approuvé' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 800 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot }}/>
      {score} — {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, bg, color, label, value, sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 18, padding: '20px 22px', position: 'relative', overflow: 'hidden', transition: 'box-shadow .2s, transform .2s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,.07)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ position: 'absolute', right: -14, top: -14, width: 64, height: 64, borderRadius: '50%', background: bg, opacity: .4 }}/>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Icon size={17} color={color}/>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ── Toggle switch réutilisable ── */
function Toggle({ enabled, loading, onToggle, labelOn, labelOff, colorOn = '#22c55e' }) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 18px', borderRadius: 13,
        border: `1.5px solid ${enabled ? '#bbf7d0' : '#e2e8f0'}`,
        background: enabled ? '#f0fdf4' : '#f8fafc',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all .2s', opacity: loading ? .6 : 1,
      }}
    >
      {/* Slider */}
      <div style={{ width: 36, height: 20, borderRadius: 999, position: 'relative', background: enabled ? colorOn : '#cbd5e1', transition: 'background .2s', flexShrink: 0 }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: enabled ? 19 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}/>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: enabled ? '#16a34a' : '#64748b', lineHeight: 1.2 }}>
          {enabled ? labelOn : labelOff}
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
          {enabled ? 'Actif' : 'Désactivé'}
        </div>
      </div>
    </button>
  );
}

export default function FraudDashboard() {
  const [alerts, setAlerts]       = useState([]);
  const [stats, setStats]         = useState(null);
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('alerts');
  const [expanded, setExpanded]   = useState(null);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('Tous');
  const [page, setPage]           = useState(1);

  // Toggle anti-fraude
  const [fraudEnabled, setFraudEnabled]   = useState(true);
  const [fraudToggling, setFraudToggling] = useState(false);

  // Blacklist form
  const [blForm, setBlForm]       = useState({ type: 'phone', value: '', reason: '' });
  const [blLoading, setBlLoading] = useState(false);

  useEffect(() => { loadData(); loadFraudStatus(); }, []);

  /* ── Charger le statut anti-fraude depuis Firestore ── */
  const loadFraudStatus = async () => {
    try {
      const snap = await getDoc(doc(db, 'gateway_settings', 'antiFraud'));
      setFraudEnabled(snap.exists() ? snap.data().enabled !== false : true);
    } catch {}
  };

  /* ── Toggle anti-fraude ── */
  const toggleFraud = async () => {
    setFraudToggling(true);
    try {
      const next = !fraudEnabled;
      await setDoc(
        doc(db, 'gateway_settings', 'antiFraud'),
        { enabled: next, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setFraudEnabled(next);
      toast.success(next ? '🛡️ Anti-fraude activé' : '⏸️ Anti-fraude désactivé');
    } catch {
      toast.error('Erreur lors du changement de statut');
    } finally {
      setFraudToggling(false);
    }
  };

  /* ── Charger alertes + blacklist + stats ── */
  const loadData = async () => {
    setLoading(true);
    try {
      const [alertsSnap, blSnap, statsData] = await Promise.all([
        getDocs(query(collection(db, 'fraud_alerts'), orderBy('timestamp', 'desc'), limit(200))),
        getDocs(query(collection(db, 'blacklist'),    orderBy('addedAt',   'desc'), limit(100))),
        antiFraud.getStats(30),
      ]);
      setAlerts(alertsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setBlacklist(blSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setStats(statsData);
    } catch (e) { console.error(e); toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  /* ── Approuver / Bloquer une alerte ── */
  const handleReview = async (alertId, decision) => {
    try {
      await updateDoc(doc(db, 'fraud_alerts', alertId), {
        status:     decision === 'approve' ? 'approved' : 'blocked',
        reviewed:   true,
        reviewedAt: new Date().toISOString(),
      });
      setAlerts(prev => prev.map(a =>
        a.id === alertId ? { ...a, reviewed: true, status: decision === 'approve' ? 'approved' : 'blocked' } : a
      ));
      toast.success(decision === 'approve' ? 'Alerte approuvée' : 'Transaction bloquée');
    } catch { toast.error('Erreur'); }
  };

  /* ── Ajouter à la blacklist ── */
  const handleAddBlacklist = async () => {
    if (!blForm.value.trim() || !blForm.reason.trim()) { toast.error('Remplissez tous les champs'); return; }
    setBlLoading(true);
    try {
      await antiFraud.addToBlacklist(blForm.type, blForm.value.trim(), blForm.reason.trim(), 'admin');
      toast.success('Ajouté à la blacklist');
      setBlForm({ type: 'phone', value: '', reason: '' });
      loadData();
    } catch { toast.error('Erreur'); }
    finally { setBlLoading(false); }
  };

  /* ── Retirer de la blacklist ── */
  const handleRemoveBlacklist = async (id) => {
    if (!window.confirm('Retirer de la blacklist ?')) return;
    try {
      await antiFraud.removeFromBlacklist(id);
      setBlacklist(prev => prev.filter(b => b.id !== id));
      toast.success('Retiré de la blacklist');
    } catch { toast.error('Erreur'); }
  };

  /* ── Filtrage alertes ── */
  const filteredAlerts = alerts.filter(a => {
    const mf = filter === 'Tous'
      || (filter === 'pending'  && !a.reviewed)
      || (filter === 'reviewed' && a.reviewed)
      || (filter === 'blocked'  && a.decision === 'BLOCKED');
    const ms = !search
      || (a.merchantId || '').toLowerCase().includes(search.toLowerCase())
      || String(a.amount).includes(search);
    return mf && ms;
  });
  const totalPages = Math.ceil(filteredAlerts.length / PAGE_SIZE);
  const paginated  = filteredAlerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #fed7aa', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        .fd-row:hover  { background: #fafafa !important; }
        .fd-tab        { cursor: pointer; transition: all .15s; }
        .adm-select    { appearance: none; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16, animation: 'fadeUp .3s ease' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-.02em' }}>Anti-Fraude</h1>
            {/* Indicateur statut */}
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700,
              padding: '3px 10px', borderRadius: 999,
              background: fraudEnabled ? '#f0fdf4' : '#f8fafc',
              color: fraudEnabled ? '#16a34a' : '#94a3b8',
              border: `1px solid ${fraudEnabled ? '#bbf7d0' : '#e2e8f0'}`,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: fraudEnabled ? '#22c55e' : '#94a3b8',
                animation: fraudEnabled ? 'pulse 2s ease-in-out infinite' : 'none',
              }}/>
              {fraudEnabled ? 'Surveillance active' : 'Surveillance inactive'}
            </span>

            {stats?.pendingAlerts > 0 && (
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: '#fef2f2', color: '#dc2626' }}>
                {stats.pendingAlerts} en attente
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Surveillance des transactions · 30 derniers jours</p>
        </div>

        {/* Boutons header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

          {/* ── TOGGLE ANTI-FRAUDE ── */}
          <Toggle
            enabled={fraudEnabled}
            loading={fraudToggling}
            onToggle={toggleFraud}
            labelOn="Anti-fraude ON"
            labelOff="Anti-fraude OFF"
            colorOn="#22c55e"
          />

          {/* Rafraîchir */}
          <button onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151'; }}
          >
            <RefreshCw size={13}/> Rafraîchir
          </button>
        </div>
      </div>

      {/* ── Alerte si anti-fraude désactivé ── */}
      {!fraudEnabled && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeUp .3s ease' }}>
          <AlertTriangle size={16} color="#d97706"/>
          <p style={{ fontSize: 13, color: '#92400e', margin: 0, fontWeight: 500 }}>
            L'anti-fraude est actuellement <strong>désactivé</strong>. Toutes les transactions passent sans vérification de sécurité.
          </p>
          <button onClick={toggleFraud} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
            Activer
          </button>
        </div>
      )}

      {/* ── Stats ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28, animation: 'fadeUp .3s ease .05s both' }}>
          <StatCard icon={Activity}      bg="#f8fafc" color="#64748b" label="Vérifications"  value={stats.totalChecks}  sub="total"/>
          <StatCard icon={CheckCircle}   bg="#f0fdf4" color="#16a34a" label="Approuvées"     value={stats.approved}     sub={`${stats.totalChecks ? Math.round(stats.approved / stats.totalChecks * 100) : 0}%`}/>
          <StatCard icon={AlertTriangle} bg="#fffbeb" color="#d97706" label="En revue"       value={stats.reviewed}     sub="surveillance"/>
          <StatCard icon={X}             bg="#fef2f2" color="#dc2626" label="Bloquées"       value={stats.blocked}      sub="fraudes"/>
          <StatCard icon={TrendingUp}    bg="#f5f3ff" color="#7c3aed" label="Score moyen"    value={`${stats.avgRiskScore}/100`} sub="risque"/>
        </div>
      )}

      {/* ── Signaux fréquents ── */}
      {stats?.signalDistribution && Object.keys(stats.signalDistribution).length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 18, padding: '18px 22px', marginBottom: 24, animation: 'fadeUp .3s ease .1s both' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>Signaux les plus déclenchés</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(stats.signalDistribution)
              .sort((a, b) => b[1] - a[1]).slice(0, 8)
              .map(([code, count]) => (
                <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: '#475569' }}>{SIGNAL_LABELS[code] || code}</span>
                  <span style={{ fontWeight: 800, color: '#f97316', background: '#fff7ed', padding: '1px 6px', borderRadius: 5, fontSize: 11 }}>{count}x</span>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 12, padding: 4, marginBottom: 20, width: 'fit-content', animation: 'fadeUp .3s ease .15s both' }}>
        {[
          { val: 'alerts',    label: `Alertes (${stats?.totalAlerts || 0})` },
          { val: 'blacklist', label: `Blacklist (${blacklist.length})` },
        ].map(t => (
          <button key={t.val} className="fd-tab" onClick={() => setTab(t.val)} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: tab === t.val ? '#fff' : 'transparent', boxShadow: tab === t.val ? '0 1px 4px rgba(0,0,0,.08)' : 'none', fontSize: 13, fontWeight: tab === t.val ? 700 : 500, color: tab === t.val ? '#0f172a' : '#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════ TAB ALERTES ══════════════════════════ */}
      {tab === 'alerts' && (
        <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 20, overflow: 'hidden', animation: 'fadeUp .3s ease .2s both' }}>

          {/* Filtres */}
          <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Onglets statut */}
              <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 9, padding: 3 }}>
                {[
                  { v: 'Tous',     l: 'Toutes'    },
                  { v: 'pending',  l: 'En attente' },
                  { v: 'blocked',  l: 'Bloquées'   },
                  { v: 'reviewed', l: 'Traitées'   },
                ].map(t => (
                  <button key={t.v} onClick={() => { setFilter(t.v); setPage(1); }} className="fd-tab" style={{ padding: '5px 11px', borderRadius: 7, border: 'none', background: filter === t.v ? '#fff' : 'transparent', boxShadow: filter === t.v ? '0 1px 3px rgba(0,0,0,.07)' : 'none', fontSize: 11, fontWeight: filter === t.v ? 700 : 500, color: filter === t.v ? '#0f172a' : '#64748b' }}>
                    {t.l}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Marchand, montant…"
                  style={{ width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 12, background: '#f8fafc', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#f97316'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
                {filteredAlerts.length} alerte{filteredAlerts.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Liste alertes */}
          {paginated.length === 0 ? (
            <div style={{ padding: '48px 22px', textAlign: 'center' }}>
              <CheckCircle size={32} color="#d1fae5" style={{ margin: '0 auto 12px', display: 'block' }}/>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>Aucune alerte</p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>Toutes les transactions sont propres.</p>
            </div>
          ) : (
            paginated.map((alert) => (
              <div key={alert.id}>
                <div
                  className="fd-row"
                  onClick={() => setExpanded(expanded === alert.id ? null : alert.id)}
                  style={{
                    padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background .1s',
                    borderLeft: `3px solid ${alert.riskScore >= 70 ? '#ef4444' : alert.riskScore >= 40 ? '#f59e0b' : '#22c55e'}`,
                  }}
                >
                  {/* Icône */}
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: alert.riskScore >= 70 ? '#fef2f2' : alert.riskScore >= 40 ? '#fffbeb' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {alert.riskScore >= 40
                      ? <AlertTriangle size={15} color={alert.riskScore >= 70 ? '#dc2626' : '#d97706'}/>
                      : <CheckCircle  size={15} color="#16a34a"/>
                    }
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        {Number(alert.amount || 0).toLocaleString('fr-FR')} XOF
                      </span>
                      <RiskBadge score={alert.riskScore}/>
                      {alert.reviewed && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#f1f5f9', color: '#64748b' }}>Traité</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{alert.method?.replace(/_/g, ' ')} · {alert.country?.toUpperCase()}</span>
                      <span>·</span>
                      <span>{alert.timestamp ? format(new Date(alert.timestamp), 'dd MMM HH:mm', { locale: fr }) : '—'}</span>
                    </div>
                  </div>

                  {/* Signaux résumés */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 260 }}>
                    {(alert.signals || []).slice(0, 3).map((s, j) => (
                      <span key={j} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                        {SIGNAL_LABELS[s.code] || s.code}
                      </span>
                    ))}
                    {(alert.signals || []).length > 3 && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: '#f1f5f9', color: '#94a3b8' }}>
                        +{alert.signals.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  {!alert.reviewed && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleReview(alert.id, 'approve')} style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', transition: 'all .15s' }}>
                        Approuver
                      </button>
                      <button onClick={() => handleReview(alert.id, 'block')} style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', transition: 'all .15s' }}>
                        Bloquer
                      </button>
                    </div>
                  )}

                  <ChevronDown size={13} color="#94a3b8" style={{ transform: expanded === alert.id ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}/>
                </div>

                {/* Expanded — détail des signaux */}
                {expanded === alert.id && (
                  <div style={{ padding: '14px 22px 18px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
                      Signaux détectés
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(alert.signals || []).map((s, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: '#fff', border: '1px solid #e2e8f0' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: s.score >= 50 ? '#fef2f2' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <AlertTriangle size={12} color={s.score >= 50 ? '#dc2626' : '#d97706'}/>
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{SIGNAL_LABELS[s.code] || s.code}</span>
                            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{s.detail}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: s.score >= 50 ? '#fef2f2' : '#fffbeb', color: s.score >= 50 ? '#dc2626' : '#d97706' }}>
                            +{s.score}
                          </span>
                        </div>
                      ))}
                    </div>

                    {alert.merchantId && !alert.reviewed && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
                        <button
                          onClick={async () => {
                            await antiFraud.addToBlacklist('user', alert.merchantId, 'Fraude confirmée', 'admin');
                            toast.success('Marchand blacklisté');
                          }}
                          style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 9, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          <Ban size={11}/> Blacklister ce marchand
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 22px', borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Page {page} / {totalPages}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ width:28,height:28,borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',cursor:page===1?'not-allowed':'pointer',opacity:page===1?.3:1,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <ChevronLeft size={12} color="#374151"/>
                </button>
                {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1)
                  .reduce((acc,p,idx,arr)=>{if(idx>0&&p-arr[idx-1]>1)acc.push('…');acc.push(p);return acc;},[])
                  .map((p,i)=>p==='…'
                    ?<span key={`d${i}`} style={{width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#94a3b8'}}>…</span>
                    :<button key={p} onClick={()=>setPage(p)} style={{width:28,height:28,borderRadius:7,border:`1px solid ${page===p?'#f97316':'#e2e8f0'}`,background:page===p?'#f97316':'#fff',cursor:'pointer',fontSize:12,fontWeight:700,color:page===p?'#fff':'#374151',display:'flex',alignItems:'center',justifyContent:'center'}}>{p}</button>
                  )
                }
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={{ width:28,height:28,borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',cursor:page===totalPages?'not-allowed':'pointer',opacity:page===totalPages?.3:1,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <ChevronRight size={12} color="#374151"/>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════ TAB BLACKLIST ══════════════════════════ */}
      {tab === 'blacklist' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp .3s ease .2s both' }}>

          {/* Formulaire ajout */}
          <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 20, padding: '22px' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Ajouter à la blacklist</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>

              {/* Type */}
              <div style={{ position: 'relative' }}>
                <select value={blForm.type} onChange={e => setBlForm(p => ({ ...p, type: e.target.value }))} className="adm-select"
                  style={{ fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', padding: '9px 28px 9px 12px', color: '#374151', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                  <option value="phone">Téléphone</option>
                  <option value="email">Email</option>
                  <option value="user">Marchand ID</option>
                  <option value="ip">Adresse IP</option>
                </select>
                <ChevronDown size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}/>
              </div>

              {/* Valeur */}
              <input value={blForm.value} onChange={e => setBlForm(p => ({ ...p, value: e.target.value }))} placeholder="Valeur à bloquer…"
                style={{ flex: 1, minWidth: 160, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, background: '#f8fafc', outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />

              {/* Raison */}
              <input value={blForm.reason} onChange={e => setBlForm(p => ({ ...p, reason: e.target.value }))} placeholder="Raison…"
                style={{ flex: 1, minWidth: 160, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, background: '#f8fafc', outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />

              {/* Bouton */}
              <button onClick={handleAddBlacklist} disabled={blLoading} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: blLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: blLoading ? .6 : 1 }}>
                <Ban size={13}/> {blLoading ? 'Ajout…' : 'Blacklister'}
              </button>
            </div>
          </div>

          {/* Liste blacklist */}
          <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid #f8fafc' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Entrées blacklistées ({blacklist.length})
              </span>
            </div>

            {blacklist.length === 0 ? (
              <div style={{ padding: '40px 22px', textAlign: 'center' }}>
                <Shield size={28} color="#e2e8f0" style={{ margin: '0 auto 10px', display: 'block' }}/>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Blacklist vide</p>
              </div>
            ) : (
              blacklist.map((entry, i) => (
                <div key={entry.id} className="fd-row" style={{ padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < blacklist.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background .1s' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Ban size={13} color="#dc2626"/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#f1f5f9', color: '#64748b', textTransform: 'uppercase' }}>
                        {entry.type}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', fontFamily: "'DM Mono', monospace" }}>
                        {entry.value}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {entry.reason} · {entry.addedAt ? format(new Date(entry.addedAt), 'dd/MM/yyyy HH:mm') : '—'}
                    </div>
                  </div>
                  <button onClick={() => handleRemoveBlacklist(entry.id)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all .15s' }}>
                    <Trash2 size={11}/> Retirer
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}