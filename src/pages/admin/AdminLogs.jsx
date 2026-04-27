import { useState, useEffect, useRef } from 'react';
import {
  collection, query, orderBy, limit, getDocs,
  onSnapshot, doc, setDoc, getDoc, writeBatch
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  Activity, Search, X, ChevronDown, ChevronLeft, ChevronRight,
  RefreshCw, Trash2, Download, AlertTriangle, Wifi, WifiOff,
  Copy, Check, ClipboardList
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const PAGE_SIZE = 25;
const LEVELS    = ['Tous', 'INFO', 'WARN', 'ERROR', 'DEBUG'];
const SOURCES   = ['Tous', 'pay', 'webhook', 'payout', 'auth', 'admin', 'kkiapay-verify', 'other'];

const LEVEL_CFG = {
  INFO:  { bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6', border: '#bfdbfe' },
  WARN:  { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b', border: '#fde68a' },
  ERROR: { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444', border: '#fecaca' },
  DEBUG: { bg: '#f5f3ff', color: '#7c3aed', dot: '#8b5cf6', border: '#ddd6fe' },
};

/* ─── Bouton copier générique ─────────────────────────────────────────────── */
function CopyBtn({ text, label = 'Copier', size = 'sm' }) {
  const [copied, setCopied] = useState(false);
  const handle = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text || ''))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => toast.error('Impossible de copier'));
  };
  const big = size === 'md';
  return (
    <button onClick={handle} title="Copier" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: big ? '5px 12px' : '3px 8px',
      borderRadius: 7,
      border: `1px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`,
      background: copied ? '#f0fdf4' : '#f8fafc',
      color: copied ? '#16a34a' : '#64748b',
      fontSize: big ? 12 : 10, fontWeight: 700,
      cursor: 'pointer', transition: 'all .15s', flexShrink: 0,
      fontFamily: 'inherit',
    }}>
      {copied ? <Check size={big ? 12 : 10}/> : <Copy size={big ? 12 : 10}/>}
      {copied ? 'Copié !' : label}
    </button>
  );
}

/* ─── Formater un log en texte lisible pour copie ─────────────────────────── */
function formatLogText(log) {
  const lines = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `ID        : ${log.id || '—'}`,
    `Timestamp : ${log.timestamp || '—'}`,
    `Level     : ${log.level || '—'}`,
    `Source    : ${log.source || '—'}`,
    `Message   : ${log.message || '—'}`,
  ];
  if (log.data && Object.keys(log.data).length > 0) {
    lines.push(`Data :`);
    lines.push(JSON.stringify(log.data, null, 2));
  }
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  return lines.join('\n');
}

/* ─── JSON viewer avec copier ─────────────────────────────────────────────── */
function JsonViewer({ data }) {
  const [open, setOpen] = useState(false);
  if (!data || Object.keys(data).length === 0) {
    return <span style={{ fontSize: 11, color: '#cbd5e1', fontStyle: 'italic' }}>Aucune donnée</span>;
  }
  const str     = JSON.stringify(data, null, 2);
  const preview = JSON.stringify(data).substring(0, 100);
  return (
    <div>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: '#94a3b8', fontFamily: "'DM Mono', monospace", textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}
      >
        <ChevronDown size={10} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}/>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preview}{preview.length >= 100 ? '…' : ''}
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
            <CopyBtn text={str} label="Copier JSON" size="md"/>
          </div>
          <pre style={{ margin: 0, padding: '12px 14px', background: '#0f172a', borderRadius: 10, color: '#e2e8f0', fontSize: 11, fontFamily: "'DM Mono', monospace", overflowX: 'auto', maxHeight: 320, overflowY: 'auto', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {str}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ─── StatPill ─────────────────────────────────────────────────────────────── */
function StatPill({ label, value, bg, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: bg, border: `1px solid ${color}22` }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}/>
      <div>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 1 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── LevelBadge ───────────────────────────────────────────────────────────── */
function LevelBadge({ level }) {
  const cfg = LEVEL_CFG[level] || { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 800, letterSpacing: '.04em', border: `1px solid ${cfg.border || '#e2e8f0'}` }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }}/>
      {level || '?'}
    </span>
  );
}

/* ─── Panneau détail d'un log (expandé) ───────────────────────────────────── */
function LogDetail({ log }) {
  const fields = [
    { label: 'ID log',    value: log.id },
    { label: 'Timestamp', value: log.timestamp },
    { label: 'Level',     value: log.level },
    { label: 'Source',    value: log.source },
    { label: 'Message',   value: log.message },
  ].filter(f => f.value);

  return (
    <div style={{ padding: '14px 22px 18px', background: '#f8fafc', borderBottom: '1px solid #f0f0f0' }} onClick={e => e.stopPropagation()}>

      {/* Bouton copier tout le log */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em' }}>
          <ClipboardList size={12}/> Détail complet
        </div>
        <CopyBtn text={formatLogText(log)} label="Copier tout" size="md"/>
      </div>

      {/* Champs un par un avec copier individuel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {fields.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', minWidth: 72, paddingTop: 1, flexShrink: 0 }}>{label}</span>
            <span style={{ flex: 1, fontSize: 12, color: '#0f172a', fontFamily: label === 'ID log' || label === 'Timestamp' ? "'DM Mono', monospace" : 'inherit', lineHeight: 1.5, wordBreak: 'break-all' }}>{value}</span>
            <CopyBtn text={value}/>
          </div>
        ))}
      </div>

      {/* Données JSON */}
      {log.data && Object.keys(log.data).length > 0 && (
        <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Données</div>
          <JsonViewer data={log.data}/>
        </div>
      )}

      {/* CinetPay / provider error spécifique */}
      {log.data?.fullResponse && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.07em' }}>Réponse provider (erreur)</span>
            <CopyBtn text={log.data.fullResponse} size="md"/>
          </div>
          <pre style={{ margin: 0, fontSize: 11, fontFamily: "'DM Mono', monospace", color: '#7f1d1d', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
            {typeof log.data.fullResponse === 'object'
              ? JSON.stringify(log.data.fullResponse, null, 2)
              : String(log.data.fullResponse)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ─── Composant principal ─────────────────────────────────────────────────── */
export default function AdminLogs() {
  const [logs, setLogs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [logsEnabled, setLogsEnabled] = useState(true);
  const [toggling, setToggling]       = useState(false);
  const [liveMode, setLiveMode]       = useState(false);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [levelFilter, setLevel]       = useState('Tous');
  const [sourceFilter, setSource]     = useState('Tous');
  const [expandedId, setExpanded]     = useState(null);
  const liveUnsubRef                  = useRef(null);

  useEffect(() => {
    loadLogsStatus();
    fetchLogs();
    return () => { if (liveUnsubRef.current) liveUnsubRef.current(); };
  }, []);

  const loadLogsStatus = async () => {
    try {
      const snap = await getDoc(doc(db, 'gateway_settings', 'logs'));
      setLogsEnabled(snap.exists() ? snap.data().enabled !== false : true);
    } catch {}
  };

  const toggleLogs = async () => {
    setToggling(true);
    try {
      const next = !logsEnabled;
      await setDoc(doc(db, 'gateway_settings', 'logs'), { enabled: next, updatedAt: new Date().toISOString() }, { merge: true });
      setLogsEnabled(next);
      toast.success(next ? '✅ Logs activés' : '⏸️ Logs désactivés');
    } catch { toast.error('Erreur'); }
    finally { setToggling(false); }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q    = query(collection(db, 'gateway_logs'), orderBy('timestamp', 'desc'), limit(500));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); toast.error('Erreur chargement logs'); }
    finally { setLoading(false); }
  };

  const toggleLive = () => {
    if (liveMode) {
      if (liveUnsubRef.current) { liveUnsubRef.current(); liveUnsubRef.current = null; }
      setLiveMode(false);
      toast('Mode live désactivé');
    } else {
      setLiveMode(true);
      toast.success('Mode live activé');
      const q = query(collection(db, 'gateway_logs'), orderBy('timestamp', 'desc'), limit(200));
      liveUnsubRef.current = onSnapshot(q, snap => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  };

  const clearAllLogs = async () => {
    if (!window.confirm('Supprimer TOUS les logs ? Irréversible.')) return;
    setLoading(true);
    try {
      const snap  = await getDocs(collection(db, 'gateway_logs'));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      setLogs([]);
      toast.success('Logs supprimés');
    } catch { toast.error('Erreur suppression'); }
    finally { setLoading(false); }
  };

  const exportCsv = () => {
    const rows = [
      ['Timestamp', 'Level', 'Source', 'Message', 'Data'],
      ...filtered.map(l => [
        l.timestamp,
        l.level,
        l.source,
        `"${(l.message || '').replace(/"/g, "'")}"`,
        `"${JSON.stringify(l.data || {}).replace(/"/g, "'")}"`,
      ]),
    ].map(r => r.join(',')).join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ── Copier tous les logs filtrés ── */
  const copyAllFiltered = () => {
    const text = filtered.map(formatLogText).join('\n\n');
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${filtered.length} logs copiés`))
      .catch(() => toast.error('Erreur copie'));
  };

  const filtered = logs.filter(l => {
    const matchLevel  = levelFilter  === 'Tous' || l.level  === levelFilter;
    const matchSource = sourceFilter === 'Tous' || l.source === sourceFilter
      || (sourceFilter === 'other' && !SOURCES.slice(1, -1).includes(l.source));
    const s           = search.toLowerCase();
    const matchSearch = !s
      || (l.message || '').toLowerCase().includes(s)
      || (l.source  || '').toLowerCase().includes(s)
      || JSON.stringify(l.data || {}).toLowerCase().includes(s);
    return matchLevel && matchSource && matchSearch;
  });

  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters   = levelFilter !== 'Tous' || sourceFilter !== 'Tous' || !!search;
  const countByLevel = lvl => logs.filter(l => l.level === lvl).length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        .log-row:hover    { background: #f8fafc !important; }
        .adm-select       { appearance: none; }
        .live-dot         { animation: pulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12, animation: 'fadeUp .3s ease' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-.02em' }}>Journal des logs</h1>
            {liveMode && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '3px 10px', borderRadius: 999, border: '1px solid #bbf7d0' }}>
                <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}/>
                LIVE
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
            {logs.length.toLocaleString('fr-FR')} entrée{logs.length !== 1 ? 's' : ''} chargée{logs.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

          {/* Toggle logs */}
          <button onClick={toggleLogs} disabled={toggling} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 12, border: `1.5px solid ${logsEnabled ? '#bbf7d0' : '#e2e8f0'}`, background: logsEnabled ? '#f0fdf4' : '#f8fafc', cursor: toggling ? 'not-allowed' : 'pointer', transition: 'all .2s', opacity: toggling ? .6 : 1 }}>
            <div style={{ width: 32, height: 18, borderRadius: 999, position: 'relative', background: logsEnabled ? '#22c55e' : '#cbd5e1', transition: 'background .2s' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: logsEnabled ? 17 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}/>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: logsEnabled ? '#16a34a' : '#64748b' }}>
              {logsEnabled ? 'Logs ON' : 'Logs OFF'}
            </span>
          </button>

          {/* Live */}
          <button onClick={toggleLive} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, border: `1.5px solid ${liveMode ? '#bfdbfe' : '#e2e8f0'}`, background: liveMode ? '#eff6ff' : '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: liveMode ? '#2563eb' : '#64748b', transition: 'all .2s' }}>
            {liveMode ? <Wifi size={13}/> : <WifiOff size={13}/>}
            {liveMode ? 'Live ON' : 'Mode live'}
          </button>

          {/* Refresh */}
          <button onClick={fetchLogs} disabled={loading || liveMode} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: loading || liveMode ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', opacity: liveMode ? .4 : 1 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin .7s linear infinite' : 'none' }}/>
            Rafraîchir
          </button>

          {/* Copier filtrés */}
          <button onClick={copyAllFiltered} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#7c3aed'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151'; }}
          >
            <Copy size={13}/> Copier ({filtered.length})
          </button>

          {/* Export CSV */}
          <button onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151'; }}
          >
            <Download size={13}/> CSV
          </button>

          {/* Vider */}
          <button onClick={clearAllLogs} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#dc2626' }}>
            <Trash2 size={13}/> Vider
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', animation: 'fadeUp .3s ease .05s both' }}>
        <StatPill label="Total" value={logs.length}           bg="#f8fafc" color="#64748b"/>
        <StatPill label="INFO"  value={countByLevel('INFO')}  bg="#eff6ff" color="#3b82f6"/>
        <StatPill label="WARN"  value={countByLevel('WARN')}  bg="#fffbeb" color="#f59e0b"/>
        <StatPill label="ERROR" value={countByLevel('ERROR')} bg="#fef2f2" color="#ef4444"/>
        <StatPill label="DEBUG" value={countByLevel('DEBUG')} bg="#f5f3ff" color="#8b5cf6"/>
      </div>

      {/* ── Alerte logs désactivés ── */}
      {!logsEnabled && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeUp .3s ease' }}>
          <AlertTriangle size={16} color="#d97706"/>
          <p style={{ fontSize: 13, color: '#92400e', margin: 0, fontWeight: 500 }}>
            Les logs sont <strong>désactivés</strong>. Aucune nouvelle entrée ne sera enregistrée.
          </p>
          <button onClick={toggleLogs} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
            Activer
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 20, overflow: 'hidden', animation: 'fadeUp .3s ease .1s both' }}>

        {/* Filtres */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Entrées</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#f1f5f9', color: '#64748b' }}>{filtered.length}</span>
            </div>
            {hasFilters && (
              <button onClick={() => { setLevel('Tous'); setSource('Tous'); setSearch(''); setPage(1); }} style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              >
                <X size={11}/> Réinitialiser
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher message, source, données…"
                style={{ width: '100%', paddingLeft: 30, paddingRight: 28, paddingTop: 8, paddingBottom: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, background: '#f8fafc', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                  <X size={11}/>
                </button>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <select value={levelFilter} onChange={e => { setLevel(e.target.value); setPage(1); }} className="adm-select"
                style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 10, background: levelFilter !== 'Tous' ? (LEVEL_CFG[levelFilter]?.bg || '#f8fafc') : '#f8fafc', paddingLeft: 12, paddingRight: 28, paddingTop: 8, paddingBottom: 8, color: levelFilter !== 'Tous' ? (LEVEL_CFG[levelFilter]?.color || '#374151') : '#374151', fontWeight: levelFilter !== 'Tous' ? 700 : 500, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                {LEVELS.map(l => <option key={l} value={l}>{l === 'Tous' ? 'Tous niveaux' : l}</option>)}
              </select>
              <ChevronDown size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}/>
            </div>

            <div style={{ position: 'relative' }}>
              <select value={sourceFilter} onChange={e => { setSource(e.target.value); setPage(1); }} className="adm-select"
                style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 10, background: sourceFilter !== 'Tous' ? '#fff7ed' : '#f8fafc', paddingLeft: 12, paddingRight: 28, paddingTop: 8, paddingBottom: 8, color: sourceFilter !== 'Tous' ? '#f97316' : '#374151', fontWeight: sourceFilter !== 'Tous' ? 700 : 500, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                {SOURCES.map(s => <option key={s} value={s}>{s === 'Tous' ? 'Toutes sources' : s}</option>)}
              </select>
              <ChevronDown size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}/>
            </div>
          </div>
        </div>

        {/* Header colonnes */}
        {paginated.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '150px 68px 96px 1fr 90px', padding: '8px 22px', gap: 12, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid #f8fafc', background: '#fafafa' }}>
            <span>Timestamp</span>
            <span>Level</span>
            <span>Source</span>
            <span>Message · Données</span>
            <span style={{ textAlign: 'right' }}>Copier</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ padding: '48px 22px', textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #fed7aa', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }}/>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Chargement des logs…</p>
          </div>
        )}

        {/* Empty */}
        {!loading && paginated.length === 0 && (
          <div style={{ padding: '56px 22px', textAlign: 'center' }}>
            <Activity size={32} color="#e2e8f0" style={{ margin: '0 auto 14px', display: 'block' }}/>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Aucun log trouvé</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              {hasFilters ? 'Modifiez vos filtres' : logsEnabled ? 'Les logs apparaîtront ici en temps réel' : 'Activez les logs pour commencer'}
            </p>
          </div>
        )}

        {/* Lignes */}
        {!loading && paginated.map((log) => {
          const isExpanded = expandedId === log.id;
          const cfg        = LEVEL_CFG[log.level] || {};
          return (
            <div key={log.id}>
              <div
                className="log-row"
                onClick={() => setExpanded(isExpanded ? null : log.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '150px 68px 96px 1fr 90px',
                  padding: '11px 22px', gap: 12,
                  borderBottom: '1px solid #f8fafc',
                  alignItems: 'center', cursor: 'pointer', transition: 'background .1s',
                  borderLeft: `3px solid ${cfg.dot || '#e2e8f0'}`,
                }}
              >
                {/* Timestamp */}
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>
                  <div>{log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yyyy', { locale: fr }) : '—'}</div>
                  <div style={{ color: '#94a3b8', fontSize: 10 }}>{log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss') : ''}</div>
                </div>

                {/* Level */}
                <div><LevelBadge level={log.level}/></div>

                {/* Source */}
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.source || '?'}
                  </span>
                </div>

                {/* Message */}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: '0 0 2px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.message || '—'}
                  </p>
                  {log.data && Object.keys(log.data).length > 0 && !isExpanded && (
                    <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
                      {Object.keys(log.data).slice(0, 5).join(' · ')}{Object.keys(log.data).length > 5 ? ` +${Object.keys(log.data).length - 5}` : ''}
                    </div>
                  )}
                </div>

                {/* Bouton copier */}
                <div style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                  <CopyBtn text={formatLogText(log)} label="Copier" size="md"/>
                </div>
              </div>

              {/* Détail expandé */}
              {isExpanded && <LogDetail log={log}/>}
            </div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 22px', borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Page {page} / {totalPages} · {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? .3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={12} color="#374151"/>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc; }, [])
                .map((p, i) => p === '…'
                  ? <span key={`d${i}`} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#94a3b8' }}>…</span>
                  : <button key={p} onClick={() => setPage(p)} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${page === p ? '#f97316' : '#e2e8f0'}`, background: page === p ? '#f97316' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: page === p ? '#fff' : '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p}</button>
                )
              }
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? .3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={12} color="#374151"/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}