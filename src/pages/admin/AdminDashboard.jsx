import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  Users, FileText, DollarSign, Shield, Clock, CheckCircle,
  TrendingUp, Search, ChevronRight, Activity, Zap,
  ToggleLeft, ToggleRight, Globe, ArrowUpRight,
  ChevronLeft, X, ChevronDown, Menu
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

/* ── Mini sparkline ── */
function Sparkline({ data = [], color = '#f97316' }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 64, h = 24;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h * 0.85 - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity=".7"/>
    </svg>
  );
}

/* ── Stat card ── */
function StatCard({ icon: Icon, bg, color, label, value, sub, spark, sparkColor }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #f0f0f0', borderRadius: 18,
      padding: '16px 18px', position: 'relative', overflow: 'hidden',
      transition: 'box-shadow .2s, transform .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,.07)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ position: 'absolute', right: -14, top: -14, width: 64, height: 64, borderRadius: '50%', background: bg, opacity: .4 }}/>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color}/>
        </div>
        {spark && <Sparkline data={spark} color={sparkColor || color}/>}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', letterSpacing: '-.02em', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ── Status badge ── */
function Badge({ status }) {
  const cfg = {
    completed:  { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e', label: 'Réussi' },
    pending:    { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b', label: 'En cours' },
    failed:     { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444', label: 'Échoué' },
    approved:   { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e', label: 'Vérifié' },
    pending_v:  { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b', label: 'En attente' },
    rejected:   { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444', label: 'Rejeté' },
  }[status] || { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot }}/>
      {cfg.label}
    </span>
  );
}

export default function AdminDashboard() {
  const [stats, setStats]       = useState({ totalMerchants: 0, verifiedMerchants: 0, pendingVerifications: 0, totalTransactions: 0, totalRevenue: 0, totalCommission: 0, pendingDocs: [], recentTransactions: [] });
  const [loading, setLoading]   = useState(true);
  const [logsEnabled, setLogsEnabled] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pagination transactions
  const [txPage, setTxPage]     = useState(1);
  const [txSearch, setTxSearch] = useState('');
  const [txStatus, setTxStatus] = useState('Tous');

  useEffect(() => { loadStats(); loadLogsStatus(); }, []);

  const loadLogsStatus = async () => {
    try {
      const snap = await getDoc(doc(db, 'gateway_settings', 'logs'));
      setLogsEnabled(snap.exists() ? snap.data().enabled !== false : true);
    } catch {}
  };

  const toggleLogs = async () => {
    setLogsLoading(true);
    try {
      const next = !logsEnabled;
      await setDoc(doc(db, 'gateway_settings', 'logs'), { enabled: next, updatedAt: new Date().toISOString() }, { merge: true });
      setLogsEnabled(next);
      toast.success(next ? 'Logs activés' : 'Logs désactivés');
    } catch { toast.error('Erreur'); }
    finally { setLogsLoading(false); }
  };

  const loadStats = async () => {
    try {
      const [merchantsSnap, transactionsSnap] = await Promise.all([
        getDocs(collection(db, 'gateway_merchants')),
        getDocs(query(collection(db, 'gateway_transactions'), orderBy('createdAt', 'desc'), limit(200))),
      ]);
      const merchants    = merchantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const transactions = transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const completedTx     = transactions.filter(tx => tx.status === 'completed');
      const totalCommission = completedTx.reduce((s, tx) => s + (parseFloat(tx.commission) || 0), 0);
      const totalRevenue    = completedTx.reduce((s, tx) => s + (parseFloat(tx.amount) || 0), 0);

      setStats({
        totalMerchants:      merchants.length,
        verifiedMerchants:   merchants.filter(m => m.verificationStatus === 'approved').length,
        pendingVerifications:merchants.filter(m => m.verificationStatus === 'pending').length,
        totalTransactions:   transactions.length,
        totalRevenue,
        totalCommission,
        pendingDocs:    merchants.filter(m => m.verificationStatus === 'pending'),
        recentTransactions: transactions,
        merchants,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #fed7aa', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return stats.recentTransactions.filter(tx =>
      tx.status === 'completed' && new Date(tx.createdAt).toDateString() === d.toDateString()
    ).reduce((s, tx) => s + (tx.commission || 0), 0);
  });

  const txFiltered = stats.recentTransactions.filter(tx => {
    const ms = txStatus === 'Tous' || tx.status === txStatus;
    const ms2 = !txSearch || tx.provider?.toLowerCase().includes(txSearch.toLowerCase())
      || String(tx.amount).includes(txSearch)
      || tx.merchantId?.toLowerCase().includes(txSearch.toLowerCase());
    return ms && ms2;
  });
  const txTotalPages = Math.ceil(txFiltered.length / PAGE_SIZE);
  const txPaginated  = txFiltered.slice((txPage - 1) * PAGE_SIZE, txPage * PAGE_SIZE);

  const getMerchantName = (merchantId) => {
    const m = stats.merchants?.find(m => m.id === merchantId);
    return m?.name || m?.email || merchantId?.substring(0, 8) + '…' || '—';
  };

  return (
    <div style={{ padding: '20px 16px 60px', fontFamily: "'DM Sans', sans-serif", maxWidth: '100%', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
        .adm-row:hover { background: #fafafa !important; }
        .adm-select { appearance: none; }
        @media (max-width: 768px) {
          .mobile-stack { flex-direction: column !important; }
          .mobile-grid { grid-template-columns: 1fr !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>

      {/* ── Header responsive ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12, animation: 'fadeUp .3s ease' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-.02em' }}>Administration</h1>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>Vue d'ensemble de la plateforme</p>
        </div>

        {/* Version mobile : bouton menu */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '8px 12px',
            cursor: 'pointer',
            '@media (max-width: 768px)': { display: 'flex' }
          }}
          className="mobile-menu-btn"
        >
          <Menu size={18} color="#64748b"/>
        </button>

        {/* Toggle logs - responsive */}
        <div style={{ 
          flexShrink: 0,
          width: 'auto',
          maxWidth: '100%'
        }}>
          <button
            onClick={toggleLogs}
            disabled={logsLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 13, border: `1.5px solid ${logsEnabled ? '#bbf7d0' : '#e2e8f0'}`,
              background: logsEnabled ? '#f0fdf4' : '#f8fafc',
              cursor: logsLoading ? 'not-allowed' : 'pointer',
              transition: 'all .2s', width: '100%',
            }}
          >
            <div style={{
              width: 32, height: 18, borderRadius: 999, position: 'relative',
              background: logsEnabled ? '#22c55e' : '#cbd5e1',
              transition: 'background .2s', flexShrink: 0,
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: logsEnabled ? 17 : 3,
                transition: 'left .2s',
                boxShadow: '0 1px 3px rgba(0,0,0,.2)',
              }}/>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: logsEnabled ? '#16a34a' : '#64748b', whiteSpace: 'nowrap' }}>
                Logs {logsEnabled ? 'activés' : 'désactivés'}
              </div>
              <div style={{ fontSize: 9, color: '#94a3b8' }}>global.log</div>
            </div>
            <Link
              to="/admin/logs"
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: 10, fontWeight: 600, color: '#f97316',
                textDecoration: 'none', marginLeft: 'auto',
                display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
              }}
            >
              Voir <ArrowUpRight size={10}/>
            </Link>
          </button>
        </div>
      </div>

      {/* ── Stats responsive ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
        gap: 12, 
        marginBottom: 20, 
        animation: 'fadeUp .3s ease .05s both' 
      }}>
        <StatCard icon={Users}      bg="#eff6ff" color="#2563eb" label="Marchands"    value={stats.totalMerchants}    sub={`${stats.verifiedMerchants} vérifiés`}/>
        <StatCard icon={Clock}      bg="#fffbeb" color="#d97706" label="En attente"   value={stats.pendingVerifications} sub="vérifications"/>
        <StatCard icon={FileText}   bg="#fdf4ff" color="#a855f7" label="Transactions" value={stats.totalTransactions}  sub="toutes périodes"/>
        <StatCard icon={DollarSign} bg="#f0fdf4" color="#16a34a" label="Revenus"      value={`${(stats.totalRevenue / 1000).toFixed(0)}K XOF`} sub="paiements réussis"/>
        <StatCard icon={TrendingUp} bg="#fff7ed" color="#f97316" label="Commissions"  value={`${stats.totalCommission.toLocaleString('fr-FR')} XOF`} sub="sur paiements réussis" spark={last7} sparkColor="#f97316"/>
      </div>

      {/* ── Grille vérifications + actions rapides responsive ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: 16, 
        marginBottom: 20, 
        animation: 'fadeUp .3s ease .1s both' 
      }}>

        {/* Vérifications en attente */}
        <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Vérifications en attente</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: stats.pendingVerifications > 0 ? '#fef3c7' : '#f1f5f9', color: stats.pendingVerifications > 0 ? '#d97706' : '#64748b' }}>
                {stats.pendingVerifications}
              </span>
            </div>
            <Link to="/admin/verifications" style={{ fontSize: 11, fontWeight: 600, color: '#f97316', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              Tout voir <ArrowUpRight size={10}/>
            </Link>
          </div>
          {stats.pendingDocs.length === 0 ? (
            <div style={{ padding: '36px 18px', textAlign: 'center' }}>
              <CheckCircle size={28} color="#d1fae5" style={{ margin: '0 auto 10px', display: 'block' }}/>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Aucune vérification en attente</p>
            </div>
          ) : (
            <div>
              {stats.pendingDocs.slice(0, 5).map(m => (
                <div key={m.id} style={{ padding: '12px 18px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#d97706', flexShrink: 0 }}>
                    {m.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0 }}>{m.name || 'Sans nom'}</p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</p>
                  </div>
                  <Link to="/admin/verifications" style={{ fontSize: 10, fontWeight: 700, padding: '5px 12px', borderRadius: 8, background: '#0f172a', color: '#fff', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Examiner
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions rapides responsive */}
        <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 20, padding: '16px 18px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>Actions rapides</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {[
              { to: '/admin/merchants',     icon: Users,     label: 'Marchands',    desc: 'Gérer les comptes',     bg: '#eff6ff', color: '#2563eb' },
              { to: '/admin/verifications', icon: Shield,    label: 'Vérifications',desc: 'Valider les documents', bg: '#fff7ed', color: '#f97316' },
              { to: '/admin/transactions',  icon: FileText,  label: 'Transactions', desc: 'Historique complet',    bg: '#fdf4ff', color: '#a855f7' },
              { to: '/admin/commissions',   icon: DollarSign,label: 'Commissions',  desc: 'Revenus plateforme',    bg: '#f0fdf4', color: '#16a34a' },
              { to: '/admin/logs',          icon: Activity,  label: 'Logs',         desc: 'Journal système',       bg: '#f8fafc', color: '#64748b' },
            ].map((a, i) => (
              <Link key={i} to={a.to} style={{
                background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 14,
                padding: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = a.color + '44'; e.currentTarget.style.background = a.bg; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.background = '#fafafa'; }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 9, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <a.icon size={14} color={a.color}/>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', margin: 0 }}>{a.label}</p>
                  <p style={{ fontSize: 9, color: '#94a3b8', margin: '1px 0 0' }}>{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dernières transactions responsive ── */}
      <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 20, overflow: 'hidden', animation: 'fadeUp .3s ease .15s both' }}>

        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Dernières transactions</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#f1f5f9', color: '#64748b' }}>{txFiltered.length}</span>
            </div>
            <Link to="/admin/transactions" style={{ fontSize: 11, fontWeight: 600, color: '#f97316', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              Voir tout <ArrowUpRight size={10}/>
            </Link>
          </div>

          {/* Filtres responsive */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
              <input
                value={txSearch} onChange={e => { setTxSearch(e.target.value); setTxPage(1); }}
                placeholder="Rechercher..."
                style={{
                  width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                  border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 11,
                  background: '#f8fafc', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <select
                value={txStatus} onChange={e => { setTxStatus(e.target.value); setTxPage(1); }}
                className="adm-select"
                style={{
                  fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 10,
                  background: txStatus !== 'Tous' ? '#fff7ed' : '#f8fafc',
                  paddingLeft: 10, paddingRight: 28, paddingTop: 7, paddingBottom: 7,
                  color: txStatus !== 'Tous' ? '#f97316' : '#374151', fontWeight: txStatus !== 'Tous' ? 700 : 500,
                  cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
                }}
              >
                {['Tous', 'completed', 'pending', 'failed'].map(s => (
                  <option key={s} value={s}>{s === 'Tous' ? 'Tous' : s === 'completed' ? 'Réussi' : s === 'pending' ? 'En cours' : 'Échoué'}</option>
                ))}
              </select>
              <ChevronDown size={10} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}/>
            </div>
          </div>
        </div>

        {/* Version mobile : carte par carte */}
        <div style={{ display: 'block' }}>
          {txPaginated.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center' }}>
              <FileText size={28} color="#e2e8f0" style={{ margin: '0 auto 10px', display: 'block' }}/>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Aucune transaction</p>
            </div>
          ) : (
            <>
              {/* Desktop version (table) */}
              <div style={{ display: 'none', '@media (min-width: 768px)': { display: 'grid' } }} className="desktop-table">
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 100px 100px 90px', padding: '8px 18px', gap: 12, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid #f8fafc' }}>
                  <span>Marchand</span><span>Provider</span><span>Pays / Méthode</span><span style={{ textAlign: 'right' }}>Montant</span><span style={{ textAlign: 'right' }}>Commission</span><span style={{ textAlign: 'right' }}>Statut</span>
                </div>
                {txPaginated.map((tx, i) => (
                  <div key={tx.id} className="adm-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 100px 100px 90px', padding: '10px 18px', gap: 12, borderBottom: i < txPaginated.length - 1 ? '1px solid #f8fafc' : 'none', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getMerchantName(tx.merchantId)}
                      </p>
                      <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0' }}>
                        {tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM HH:mm') : '—'}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{tx.provider || '—'}</span>
                    <div>
                      <span style={{ fontSize: 11, color: '#475569' }}>{tx.country?.toUpperCase() || '—'}</span>
                      <span style={{ fontSize: 9, color: '#94a3b8', display: 'block' }}>{tx.method?.replace(/_/g, ' ') || '—'}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{parseFloat(tx.amount || 0).toLocaleString('fr-FR')}</span>
                      <span style={{ fontSize: 9, color: '#94a3b8', display: 'block' }}>XOF</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {tx.status === 'completed' ? (
                        <>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>+{parseFloat(tx.commission || 0).toLocaleString('fr-FR')}</span>
                          <span style={{ fontSize: 9, color: '#94a3b8', display: 'block' }}>XOF</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: '#cbd5e1', fontStyle: 'italic' }}>—</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Badge status={tx.status}/>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile version (cards) */}
              <div style={{ display: 'block', '@media (min-width: 768px)': { display: 'none' } }} className="mobile-cards">
                {txPaginated.map((tx) => (
                  <div key={tx.id} style={{ padding: '14px 18px', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          {getMerchantName(tx.merchantId)}
                        </p>
                        <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>
                          {tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm') : '—'}
                        </p>
                      </div>
                      <Badge status={tx.status}/>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', margin: 0, textTransform: 'uppercase' }}>Provider</p>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#475569', margin: '2px 0 0' }}>{tx.provider || '—'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', margin: 0, textTransform: 'uppercase' }}>Pays / Méthode</p>
                        <p style={{ fontSize: 12, color: '#475569', margin: '2px 0 0' }}>
                          {tx.country?.toUpperCase() || '—'} / {tx.method?.replace(/_/g, ' ') || '—'}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', margin: 0, textTransform: 'uppercase' }}>Montant</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '2px 0 0' }}>
                          {parseFloat(tx.amount || 0).toLocaleString('fr-FR')} XOF
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', margin: 0, textTransform: 'uppercase' }}>Commission</p>
                        {tx.status === 'completed' ? (
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', margin: '2px 0 0' }}>
                            +{parseFloat(tx.commission || 0).toLocaleString('fr-FR')} XOF
                          </p>
                        ) : (
                          <p style={{ fontSize: 12, color: '#cbd5e1', margin: '2px 0 0' }}>—</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination responsive */}
        {txTotalPages > 1 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Page {txPage} / {txTotalPages}</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={() => setTxPage(p => Math.max(1, p-1))} disabled={txPage === 1} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: txPage === 1 ? 'not-allowed' : 'pointer', opacity: txPage === 1 ? .3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={12} color="#374151"/>
              </button>
              {Array.from({ length: txTotalPages }, (_, i) => i + 1).filter(p => p === 1 || p === txTotalPages || Math.abs(p - txPage) <= 1)
                .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx-1] > 1) acc.push('…'); acc.push(p); return acc; }, [])
                .map((p, i) => p === '…'
                  ? <span key={`d${i}`} style={{ width: 24, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#94a3b8' }}>…</span>
                  : <button key={p} onClick={() => setTxPage(p)} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${txPage===p?'#f97316':'#e2e8f0'}`, background: txPage===p?'#f97316':'#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: txPage===p?'#fff':'#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p}</button>
                )
              }
              <button onClick={() => setTxPage(p => Math.min(txTotalPages, p+1))} disabled={txPage === txTotalPages} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: txPage === txTotalPages ? 'not-allowed' : 'pointer', opacity: txPage === txTotalPages ? .3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={12} color="#374151"/>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-table {
            display: none !important;
          }
          .mobile-cards {
            display: block !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .desktop-table {
            display: block !important;
          }
          .mobile-cards {
            display: none !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}