import { useState, useEffect, useRef } from 'react';
import {
  collection, query, orderBy, limit, getDocs,
  where, onSnapshot, doc, setDoc, getDoc, deleteDoc, writeBatch
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  Activity, Search, X, ChevronDown, ChevronLeft, ChevronRight,
  RefreshCw, Trash2, Download, ToggleLeft, ToggleRight,
  AlertTriangle, Info, AlertCircle, Bug, Clock, Filter,
  ArrowUpRight, Wifi, WifiOff
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const PAGE_SIZE    = 25;
const LEVELS       = ['Tous', 'INFO', 'WARN', 'ERROR', 'DEBUG'];
const SOURCES      = ['Tous', 'pay', 'webhook', 'payout', 'auth', 'admin', 'kkiapay-verify', 'other'];

const LEVEL_CFG = {
  INFO:  { bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6',  label: 'INFO'  },
  WARN:  { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b',  label: 'WARN'  },
  ERROR: { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444',  label: 'ERROR' },
  DEBUG: { bg: '#f5f3ff', color: '#7c3aed', dot: '#8b5cf6',  label: 'DEBUG' },
};

function LevelBadge({ level }) {
  const cfg = LEVEL_CFG[level] || { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8', label: level };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      fontSize: 10, fontWeight: 800, letterSpacing: '.04em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }}/>
      {cfg.label}
    </span>
  );
}

/* ── JSON viewer compact ── */
function JsonViewer({ data }) {
  const [open, setOpen] = useState(false);
  if (!data || Object.keys(data).length === 0) return <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>;
  const preview = JSON.stringify(data).substring(0, 80);
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontSize: 11, color: '#94a3b8', fontFamily: "'DM Mono', monospace",
        textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <ChevronDown size={10} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}/>
        {preview}{preview.length >= 80 ? '…' : ''}
      </button>
      {open && (
        <pre style={{
          marginTop: 6, padding: '10px 12px',
          background: '#0f172a', borderRadius: 8, color: '#e2e8f0',
          fontSize: 11, fontFamily: "'DM Mono', monospace",
          overflowX: 'auto', maxHeight: 200, overflowY: 'auto',
          lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ── Stats mini ── */
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

export default function AdminLogs() {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [logsEnabled, setLogsEnabled] = useState(true);
  const [toggling, setToggling]   = useState(false);
  const [liveMode, setLiveMode]   = useState(false);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [levelFilter, setLevel]   = useState('Tous');
  const [sourceFilter, setSource] = useState('Tous');
  const [expandedId, setExpanded] = useState(null);
  const liveUnsubRef              = useRef(null);

  useEffect(() => {
    loadLogsStatus();
    fetchLogs();
    return () => { if (liveUnsubRef.current) liveUnsubRef.current(); };
  }, []);

  /* ── Charger le statut logs ── */
  const loadLogsStatus = async () => {
    try {
      const snap = await getDoc(doc(db, 'gateway_settings', 'logs'));
      setLogsEnabled(snap.exists() ? snap.data().enabled !== false : true);
    } catch {}
  };

  /* ── Toggle logs ── */
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

  /* ── Fetch logs (one-shot) ── */
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q    = query(collection(db, 'gateway_logs'), orderBy('timestamp', 'desc'), limit(500));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); toast.error('Erreur chargement logs'); }
    finally { setLoading(false); }
  };

  /* ── Live mode (onSnapshot) ── */
  const toggleLive = () => {
    if (liveMode) {
      if (liveUnsubRef.current) { liveUnsubRef.current(); liveUnsubRef.current = null; }
      setLiveMode(false);
      toast('Mode live désactivé');
    } else {
      setLiveMode(true);
      toast.success('Mode live activé — mise à jour en temps réel');
      const q = query(collection(db, 'gateway_logs'), orderBy('timestamp', 'desc'), limit(200));
      liveUnsubRef.current = onSnapshot(q, (snap) => {
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  };

  /* ── Vider tous les logs ── */
  const clearAllLogs = async () => {
    if (!window.confirm('Supprimer TOUS les logs ? Cette action est irréversible.')) return;
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

  /* ── Export CSV ── */
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

  /* ── Filtrage ── */
  const filtered = logs.filter(l => {
    const matchLevel  = levelFilter  === 'Tous' || l.level  === levelFilter;
    const matchSource = sourceFilter === 'Tous' || l.source === sourceFilter || (sourceFilter === 'other' && !SOURCES.slice(1, -1).includes(l.source));
    const s           = search.toLowerCase();
    const matchSearch = !s || (l.message || '').toLowerCase().includes(s) || (l.source || '').toLowerCase().includes(s) || JSON.stringify(l.data || {}).toLowerCase().includes(s);
    return matchLevel && matchSource && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = levelFilter !== 'Tous' || sourceFilter !== 'Tous' || !!search;

  // Stats par level
  const countByLevel = (lvl) => logs.filter(l => l.level === lvl).length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .log-row:hover { background: #fafafa !important; }
        .log-row-error { border-left: 3px solid #ef4444 !important; }
        .log-row-warn  { border-left: 3px solid #f59e0b !important; }
        .log-row-info  { border-left: 3px solid #3b82f6 !important; }
        .adm-select    { appearance: none; }
        .live-dot      { animation: pulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12, animation: 'fadeUp .3s ease' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-.02em' }}>Journal des logs</h1>
            {liveMode && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '3px 10px', borderRadius: 999 }}>
                <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}/>
                LIVE
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
            {logs.length.toLocaleString('fr-FR')} entrée{logs.length !== 1 ? 's' : ''} · global.log
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Toggle logs activés/désactivés */}
          <button onClick={toggleLogs} disabled={toggling} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px',
            borderRadius: 12, border: `1.5px solid ${logsEnabled ? '#bbf7d0' : '#e2e8f0'}`,
            background: logsEnabled ? '#f0fdf4' : '#f8fafc',
            cursor: toggling ? 'not-allowed' : 'pointer', transition: 'all .2s',
          }}>
            <div style={{ width: 32, height: 18, borderRadius: 999, position: 'relative', background: logsEnabled ? '#22c55e' : '#cbd5e1', transition: 'background .2s' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: logsEnabled ? 17 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}/>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: logsEnabled ? '#16a34a' : '#64748b' }}>
              {logsEnabled ? 'Logs ON' : 'Logs OFF'}
            </span>
          </button>

          {/* Live mode */}
          <button onClick={toggleLive} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
            borderRadius: 12, border: `1.5px solid ${liveMode ? '#bfdbfe' : '#e2e8f0'}`,
            background: liveMode ? '#eff6ff' : '#f8fafc',
            cursor: 'pointer', fontSize: 12, fontWeight: 700,
            color: liveMode ? '#2563eb' : '#64748b',
            transition: 'all .2s',
          }}>
            {liveMode ? <Wifi size={13}/> : <WifiOff size={13}/>}
            {liveMode ? 'Live activé' : 'Mode live'}
          </button>

          {/* Refresh */}
          <button onClick={fetchLogs} disabled={loading || liveMode} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
            borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc',
            cursor: loading || liveMode ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, color: '#374151',
            opacity: liveMode ? .4 : 1,
          }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin .7s linear infinite' : 'none' }}/>
            Rafraîchir
          </button>

          {/* Export */}
          <button onClick={exportCsv} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
            borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151'; }}
          >
            <Download size={13}/> Export CSV
          </button>

          {/* Clear */}
          <button onClick={clearAllLogs} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
            borderRadius: 12, border: '1px solid #fee2e2', background: '#fef2f2',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#dc2626',
            transition: 'all .15s',
          }}>
            <Trash2 size={13}/> Vider
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', animation: 'fadeUp .3s ease .05s both' }}>
        <StatPill label="Total" value={logs.length} bg="#f8fafc" color="#64748b"/>
        <StatPill label="INFO"  value={countByLevel('INFO')}  bg="#eff6ff" color="#3b82f6"/>
        <StatPill label="WARN"  value={countByLevel('WARN')}  bg="#fffbeb" color="#f59e0b"/>
        <StatPill label="ERROR" value={countByLevel('ERROR')} bg="#fef2f2" color="#ef4444"/>
        <StatPill label="DEBUG" value={countByLevel('DEBUG')} bg="#f5f3ff" color="#8b5cf6"/>
      </div>

      {/* ── Alerte si logs désactivés ── */}
      {!logsEnabled && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeUp .3s ease' }}>
          <AlertTriangle size={16} color="#d97706"/>
          <p style={{ fontSize: 13, color: '#92400e', margin: 0, fontWeight: 500 }}>
            Les logs sont actuellement <strong>désactivés</strong>. Aucune nouvelle entrée ne sera enregistrée.
          </p>
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
              <button onClick={() => { setLevel('Tous'); setSource('Tous'); setSearch(''); setPage(1); }}
                style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              >
                <X size={11}/> Réinitialiser les filtres
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher dans les logs…"
                style={{ width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, background: '#f8fafc', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                  <X size={11}/>
                </button>
              )}
            </div>

            {/* Level filter */}
            <div style={{ position: 'relative' }}>
              <select value={levelFilter} onChange={e => { setLevel(e.target.value); setPage(1); }} className="adm-select"
                style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 10, background: levelFilter !== 'Tous' ? (LEVEL_CFG[levelFilter]?.bg || '#f8fafc') : '#f8fafc', paddingLeft: 12, paddingRight: 28, paddingTop: 8, paddingBottom: 8, color: levelFilter !== 'Tous' ? (LEVEL_CFG[levelFilter]?.color || '#374151') : '#374151', fontWeight: levelFilter !== 'Tous' ? 700 : 500, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}
              >
                {LEVELS.map(l => <option key={l} value={l}>{l === 'Tous' ? 'Tous les niveaux' : l}</option>)}
              </select>
              <ChevronDown size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}/>
            </div>

            {/* Source filter */}
            <div style={{ position: 'relative' }}>
              <select value={sourceFilter} onChange={e => { setSource(e.target.value); setPage(1); }} className="adm-select"
                style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 10, background: sourceFilter !== 'Tous' ? '#fff7ed' : '#f8fafc', paddingLeft: 12, paddingRight: 28, paddingTop: 8, paddingBottom: 8, color: sourceFilter !== 'Tous' ? '#f97316' : '#374151', fontWeight: sourceFilter !== 'Tous' ? 700 : 500, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}
              >
                {SOURCES.map(s => <option key={s} value={s}>{s === 'Tous' ? 'Toutes les sources' : s}</option>)}
              </select>
              <ChevronDown size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}/>
            </div>
          </div>
        </div>

        {/* Table header */}
        {paginated.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '160px 60px 90px 1fr', padding: '8px 22px', gap: 12, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid #f8fafc' }}>
            <span>Timestamp</span><span>Level</span><span>Source</span><span>Message · Données</span>
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
              {hasFilters ? 'Essayez de modifier vos filtres' : logsEnabled ? 'Les logs apparaîtront ici au fur et à mesure' : 'Activez les logs pour commencer l\'enregistrement'}
            </p>
          </div>
        )}

        {/* Rows */}
        {!loading && paginated.map((log, i) => {
          const isExpanded = expandedId === log.id;
          const rowClass   = log.level === 'ERROR' ? 'log-row log-row-error' : log.level === 'WARN' ? 'log-row log-row-warn' : 'log-row log-row-info';
          return (
            <div
              key={log.id}
              className={rowClass}
              onClick={() => setExpanded(isExpanded ? null : log.id)}
              style={{
                display: 'grid', gridTemplateColumns: '160px 60px 90px 1fr',
                padding: '11px 22px', gap: 12,
                borderBottom: i < paginated.length - 1 ? '1px solid #f8fafc' : 'none',
                alignItems: 'flex-start', cursor: 'pointer', transition: 'background .1s',
                borderLeft: '3px solid transparent',
              }}
            >
              {/* Timestamp */}
              <div style={{ fontSize: 11, color: '#64748b', fontFamily: "'DM Mono', monospace", lineHeight: 1.4 }}>
                {log.timestamp ? format(new Date(log.timestamp), 'dd/MM HH:mm:ss', { locale: fr }) : '—'}
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>
                  {log.timestamp ? format(new Date(log.timestamp), 'yyyy') : ''}
                </div>
              </div>

              {/* Level */}
              <LevelBadge level={log.level}/>

              {/* Source */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 7px', display: 'inline-flex', alignItems: 'center', width: 'fit-content' }}>
                {log.source || '?'}
              </div>

              {/* Message + data */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.4 }}>
                  {log.message || '—'}
                </p>
                {isExpanded && log.data && <JsonViewer data={log.data}/>}
                {!isExpanded && log.data && Object.keys(log.data).length > 0 && (
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    {Object.keys(log.data).slice(0, 4).join(', ')}{Object.keys(log.data).length > 4 ? '…' : ''}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 22px', borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Page {page} / {totalPages} · {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                style={{ width:28,height:28,borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',cursor:page===1?'not-allowed':'pointer',opacity:page===1?.3:1,display:'flex',alignItems:'center',justifyContent:'center' }}>
                <ChevronLeft size={12} color="#374151"/>
              </button>
              {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1)
                .reduce((acc,p,idx,arr)=>{if(idx>0&&p-arr[idx-1]>1)acc.push('…');acc.push(p);return acc;},[])
                .map((p,i)=>p==='…'
                  ?<span key={`d${i}`} style={{width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#94a3b8'}}>…</span>
                  :<button key={p} onClick={()=>setPage(p)} style={{width:28,height:28,borderRadius:7,border:`1px solid ${page===p?'#f97316':'#e2e8f0'}`,background:page===p?'#f97316':'#fff',cursor:'pointer',fontSize:12,fontWeight:700,color:page===p?'#fff':'#374151',display:'flex',alignItems:'center',justifyContent:'center'}}>{p}</button>
                )
              }
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                style={{ width:28,height:28,borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',cursor:page===totalPages?'not-allowed':'pointer',opacity:page===totalPages?.3:1,display:'flex',alignItems:'center',justifyContent:'center' }}>
                <ChevronRight size={12} color="#374151"/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}