import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  TrendingUp, DollarSign, CreditCard, Key, Clock,
  CheckCircle, Plus, Shield, AlertTriangle, Search,
  X, ChevronDown, ChevronLeft, ChevronRight, ArrowUpRight,
  Activity, Zap, Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_FILTERS = ['Tous', 'completed', 'pending', 'failed'];
const STATUS_LABELS  = { completed: 'Réussi', pending: 'En cours', failed: 'Échoué' };
const PAGE_SIZE = 10;

/* ── Mini sparkline SVG ── */
function Sparkline({ data = [], color = '#f97316', height = 32 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 80, h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h * 0.85 - 2;
    return `${x},${y}`;
  }).join(' ');
  const fill = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h * 0.85 - 2;
    return `${x},${y}`;
  });
  const areaPath = `M${fill[0]} L${fill.slice(1).join(' L')} L${w},${h} L0,${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${color.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Stat Card ── */
function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, sparkData, sparkColor, trend }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #f0f0f0',
      borderRadius: 20,
      padding: '22px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      position: 'relative',
      overflow: 'hidden',
      transition: 'box-shadow .2s, transform .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Background deco */}
      <div style={{
        position: 'absolute', right: -16, top: -16,
        width: 80, height: 80, borderRadius: '50%',
        background: iconBg, opacity: 0.5,
      }}/>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} color={iconColor}/>
        </div>
        {sparkData && <Sparkline data={sparkData} color={sparkColor || iconColor}/>}
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-.02em', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          {trend !== undefined && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
              background: trend >= 0 ? '#f0fdf4' : '#fef2f2',
              color: trend >= 0 ? '#16a34a' : '#dc2626',
            }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          <span style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</span>
        </div>
      )}
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const cfg = {
    completed: { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e', label: 'Réussi' },
    pending:   { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b', label: 'En cours' },
    failed:    { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444', label: 'Échoué' },
    processing:{ bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6', label: 'Traitement' },
  }[status] || { bg: '#f9fafb', color: '#6b7280', dot: '#9ca3af', label: status };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }}/>
      {cfg.label}
    </span>
  );
}

/* ── Method icon ── */
function MethodIcon({ method }) {
  const emoji = {
    mtn_money: '📱', moov_money: '📱', orange_money: '🟠', wave_money: '🌊',
    celtiis_money: '📱', togocom_money: '📱', airtel_money: '📱', mpesa: '📱',
    card: '💳', paypal: '🅿️', bank_transfer: '🏦', mobile_money: '📱',
  }[method] || '💰';

  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: '#f8fafc', border: '1px solid #f1f5f9',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16,
    }}>
      {emoji}
    </div>
  );
}

/* ── Main ── */
export default function GatewayDashboard() {
  const { user } = useAuth();
  const [stats, setStats]     = useState({ balance: 0, totalTransactions: 0, todayTransactions: 0, recentTransactions: [], providersCount: 0, successRate: 0 });
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState(null);

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [providerFilter, setProviderFilter] = useState('Tous');
  const [page, setPage]                 = useState(1);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    try {
      const merchantSnap = await getDoc(doc(db, 'gateway_merchants', user.uid));
      const merchantData = merchantSnap.exists() ? merchantSnap.data() : {};
      setMerchant(merchantData);

      const txQuery = query(
        collection(db, 'gateway_transactions'),
        where('merchantId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
      const snap = await getDocs(txQuery);
      const transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const today = transactions.filter(tx => {
        const d = new Date(tx.createdAt);
        return d.toDateString() === new Date().toDateString();
      });

      const completed  = transactions.filter(t => t.status === 'completed');
      const successRate = transactions.length ? Math.round((completed.length / transactions.length) * 100) : 0;

      const providers     = merchantData.providers || {};
      const activeProviders = Object.values(providers).filter(p => p.active).length;

      setStats({
        balance:           merchantData.balance || 0,
        totalTransactions: merchantData.totalTransactions || 0,
        todayTransactions: today.length,
        recentTransactions: transactions,
        providersCount:    activeProviders,
        successRate,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #fed7aa', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isVerified = merchant?.verificationStatus === 'approved';
  const isPending  = merchant?.verificationStatus === 'pending';
  const isRejected = merchant?.verificationStatus === 'rejected';

  const allProviders = ['Tous', ...new Set(stats.recentTransactions.map(tx => tx.provider).filter(Boolean))];

  const filtered = stats.recentTransactions.filter(tx => {
    const matchStatus   = statusFilter === 'Tous' || tx.status === statusFilter;
    const matchProvider = providerFilter === 'Tous' || tx.provider === providerFilter;
    const matchSearch   = !search ||
      tx.provider?.toLowerCase().includes(search.toLowerCase()) ||
      String(tx.amount).includes(search) ||
      tx.country?.toLowerCase().includes(search.toLowerCase()) ||
      tx.method?.toLowerCase().includes(search.toLowerCase()) ||
      tx.providerRef?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchProvider && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = statusFilter !== 'Tous' || providerFilter !== 'Tous' || !!search;

  const resetFilters = () => { setStatusFilter('Tous'); setProviderFilter('Tous'); setSearch(''); setPage(1); };
  const handleFilter = (fn) => { fn(); setPage(1); };

  // Sparkline data : volumes des 7 derniers jours
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return stats.recentTransactions.filter(tx => {
      const td = new Date(tx.createdAt);
      return td.toDateString() === d.toDateString() && tx.status === 'completed';
    }).reduce((sum, tx) => sum + (tx.amount || 0), 0);
  });

  const last7Count = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return stats.recentTransactions.filter(tx => {
      const td = new Date(tx.createdAt);
      return td.toDateString() === d.toDateString();
    }).length;
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .gd-row:hover { background: #fafafa !important; }
        .gd-filter-select { appearance: none; }
      `}</style>

      {/* ── Bannière vérification ── */}
      {!isVerified && (
        <div style={{
          borderRadius: 18, padding: '18px 22px', marginBottom: 24,
          background: isPending ? '#fffbeb' : '#fef2f2',
          border: `1px solid ${isPending ? '#fde68a' : '#fecaca'}`,
          display: 'flex', alignItems: 'center', gap: 14,
          animation: 'fadeUp .3s ease',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: isPending ? '#fef3c7' : '#fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isPending ? <Clock size={18} color="#d97706"/> : <AlertTriangle size={18} color="#dc2626"/>}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {isPending ? 'Vérification en cours' : isRejected ? 'Vérification refusée' : 'Compte non vérifié'}
            </p>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
              {isPending
                ? "Vos documents sont en cours d'examen. Délai : 24 à 48h."
                : isRejected
                  ? "Vos documents n'ont pas été acceptés. Veuillez soumettre à nouveau."
                  : "Vérifiez votre identité pour activer votre compte."}
            </p>
          </div>
          <Link to="/verification" style={{
            padding: '9px 18px', borderRadius: 11, fontSize: 12, fontWeight: 700,
            background: isPending ? '#f59e0b' : '#0f172a', color: '#fff',
            textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {isPending ? 'Voir le statut' : isRejected ? 'Réessayer' : 'Vérifier →'}
          </Link>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12, animation: 'fadeUp .3s ease' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-.02em' }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '3px 0 0' }}>Bienvenue, {user?.displayName?.split(' ')[0] || user?.email}</p>
        </div>
        {isVerified && (
          <Link to="/providers" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: '#fff', border: '1px solid #e2e8f0', color: '#374151',
            textDecoration: 'none', transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151'; }}
          >
            <Key size={14}/> Providers ({stats.providersCount})
          </Link>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16, marginBottom: 28,
        opacity: !isVerified ? .4 : 1,
        pointerEvents: !isVerified ? 'none' : 'auto',
        animation: 'fadeUp .4s ease .05s both',
      }}>
        <StatCard
          icon={DollarSign} iconBg="#f0fdf4" iconColor="#16a34a"
          label="Solde disponible"
          value={`${stats.balance.toLocaleString('fr-FR')} XOF`}
          sub="Prêt à retirer"
          sparkData={last7}
          sparkColor="#22c55e"
        />
        <StatCard
          icon={CreditCard} iconBg="#eff6ff" iconColor="#2563eb"
          label="Total transactions"
          value={stats.totalTransactions.toLocaleString('fr-FR')}
          sub={`${stats.successRate}% de succès`}
          sparkData={last7Count}
          sparkColor="#3b82f6"
        />
        <StatCard
          icon={TrendingUp} iconBg="#fff7ed" iconColor="#f97316"
          label="Aujourd'hui"
          value={stats.todayTransactions}
          sub="transactions ce jour"
        />
        <StatCard
          icon={Activity} iconBg="#fdf4ff" iconColor="#a855f7"
          label="Taux de succès"
          value={`${stats.successRate}%`}
          sub="sur toutes les transactions"
          sparkData={last7Count.map((v, i) => {
            const total = stats.recentTransactions.filter(tx => {
              const d = new Date(); d.setDate(d.getDate() - (6 - i));
              return new Date(tx.createdAt).toDateString() === d.toDateString();
            }).length;
            return total ? Math.round((v / total) * 100) : 0;
          })}
          sparkColor="#a855f7"
        />
      </div>

      {/* ── Transactions ── */}
      <div style={{
        background: '#fff', borderRadius: 20, border: '1px solid #f0f0f0',
        overflow: 'hidden',
        opacity: !isVerified ? .4 : 1,
        pointerEvents: !isVerified ? 'none' : 'auto',
        animation: 'fadeUp .4s ease .1s both',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Transactions récentes</h3>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: '#f1f5f9', color: '#64748b',
              }}>
                {filtered.length}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {hasFilters && (
                <button onClick={resetFilters} style={{
                  fontSize: 11, color: '#94a3b8', background: 'none', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  <X size={11}/> Réinitialiser
                </button>
              )}
              {isVerified && (
                <Link to="/transactions" style={{
                  fontSize: 12, fontWeight: 600, color: '#f97316',
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  Voir tout <ArrowUpRight size={12}/>
                </Link>
              )}
            </div>
          </div>

          {/* Filtres */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
              <input
                type="text" value={search}
                onChange={e => handleFilter(() => setSearch(e.target.value))}
                placeholder="Rechercher…"
                style={{
                  width: '100%', paddingLeft: 32, paddingRight: search ? 28 : 12,
                  paddingTop: 8, paddingBottom: 8,
                  border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12,
                  background: '#f8fafc', outline: 'none', fontFamily: 'inherit',
                  color: '#0f172a', boxSizing: 'border-box',
                  transition: 'border-color .15s',
                }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              {search && (
                <button onClick={() => handleFilter(() => setSearch(''))} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                  display: 'flex', padding: 0,
                }}>
                  <X size={11}/>
                </button>
              )}
            </div>

            {/* Statut */}
            <div style={{ position: 'relative' }}>
              <select
                value={statusFilter}
                onChange={e => handleFilter(() => setStatusFilter(e.target.value))}
                className="gd-filter-select"
                style={{
                  fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 10,
                  background: statusFilter !== 'Tous' ? '#fff7ed' : '#f8fafc',
                  paddingLeft: 12, paddingRight: 28, paddingTop: 8, paddingBottom: 8,
                  color: statusFilter !== 'Tous' ? '#f97316' : '#374151',
                  fontWeight: statusFilter !== 'Tous' ? 700 : 500,
                  cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
                }}
              >
                {STATUS_FILTERS.map(s => (
                  <option key={s} value={s}>{s === 'Tous' ? 'Tous les statuts' : STATUS_LABELS[s]}</option>
                ))}
              </select>
              <ChevronDown size={11} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}/>
            </div>

            {/* Provider */}
            <div style={{ position: 'relative' }}>
              <select
                value={providerFilter}
                onChange={e => handleFilter(() => setProviderFilter(e.target.value))}
                className="gd-filter-select"
                style={{
                  fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 10,
                  background: providerFilter !== 'Tous' ? '#fff7ed' : '#f8fafc',
                  paddingLeft: 12, paddingRight: 28, paddingTop: 8, paddingBottom: 8,
                  color: providerFilter !== 'Tous' ? '#f97316' : '#374151',
                  fontWeight: providerFilter !== 'Tous' ? 700 : 500,
                  cursor: 'pointer', outline: 'none', fontFamily: 'inherit',
                }}
              >
                {allProviders.map(p => (
                  <option key={p} value={p}>{p === 'Tous' ? 'Tous les providers' : p}</option>
                ))}
              </select>
              <ChevronDown size={11} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}/>
            </div>
          </div>
        </div>

        {/* Table header */}
        {paginated.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px 100px',
            padding: '8px 24px', gap: 12,
            fontSize: 10, fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '.08em',
            borderBottom: '1px solid #f8fafc',
          }}>
            <span>Transaction</span>
            <span>Méthode</span>
            <span>Provider</span>
            <span style={{ textAlign: 'right' }}>Montant</span>
            <span style={{ textAlign: 'right' }}>Statut</span>
          </div>
        )}

        {/* Rows */}
        {paginated.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: '#f8fafc',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
            }}>
              <CreditCard size={22} color="#cbd5e1"/>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Aucune transaction trouvée</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              {hasFilters ? 'Essayez de modifier vos filtres' : 'Les paiements apparaîtront ici'}
            </p>
          </div>
        ) : (
          <div>
            {paginated.map((tx, i) => (
              <div
                key={tx.id}
                className="gd-row"
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px 100px',
                  padding: '13px 24px', gap: 12,
                  borderBottom: i < paginated.length - 1 ? '1px solid #f8fafc' : 'none',
                  alignItems: 'center', transition: 'background .1s', cursor: 'default',
                }}
              >
                {/* Transaction info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <MethodIcon method={tx.method}/>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 1 }}>
                      {tx.description || tx.method?.replace(/_/g, ' ') || 'Paiement'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Globe size={9}/>
                      {tx.country?.toUpperCase()} ·{' '}
                      {tx.createdAt ? format(new Date(tx.createdAt), 'dd MMM HH:mm', { locale: fr }) : '—'}
                    </div>
                  </div>
                </div>

                {/* Méthode */}
                <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
                  {tx.method?.replace(/_/g, ' ') || '—'}
                </div>

                {/* Provider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: tx.provider === 'feexpay' ? '#f97316'
                               : tx.provider === 'stripe' ? '#6366f1'
                               : tx.provider === 'paystack' ? '#22c55e'
                               : '#94a3b8',
                  }}/>
                  <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{tx.provider || '—'}</span>
                </div>

                {/* Montant */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', letterSpacing: '-.01em' }}>
                    {parseFloat(tx.amount || 0).toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>XOF</div>
                </div>

                {/* Statut */}
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge status={tx.status}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '14px 24px', borderTop: '1px solid #f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Page {page} / {totalPages} · {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0',
                  background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: page === 1 ? .35 : 1,
                }}
              >
                <ChevronLeft size={13} color="#374151"/>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p); return acc;
                }, [])
                .map((p, i) =>
                  p === '…'
                    ? <span key={`d${i}`} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#94a3b8' }}>…</span>
                    : (
                      <button key={p} onClick={() => setPage(p)} style={{
                        width: 30, height: 30, borderRadius: 8, border: `1px solid ${page === p ? '#f97316' : '#e2e8f0'}`,
                        background: page === p ? '#f97316' : '#fff', cursor: 'pointer',
                        fontSize: 12, fontWeight: 700, color: page === p ? '#fff' : '#374151',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .15s',
                      }}>
                        {p}
                      </button>
                    )
                )
              }

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0',
                  background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: page === totalPages ? .35 : 1,
                }}
              >
                <ChevronRight size={13} color="#374151"/>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bannière providers ── */}
      {isVerified && stats.providersCount === 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fff7ed, #fff)',
          border: '1px solid #fed7aa', borderRadius: 20,
          padding: '28px', textAlign: 'center', marginTop: 20,
          animation: 'fadeUp .4s ease .15s both',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: '#fff7ed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <Zap size={22} color="#f97316"/>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Configurez vos moyens de paiement</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 18px' }}>Ajoutez vos clés API pour commencer à accepter les paiements.</p>
          <Link to="/providers" style={{
            background: '#f97316', color: '#fff',
            padding: '11px 24px', borderRadius: 12, fontSize: 13, fontWeight: 700,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7,
          }}>
            <Plus size={15}/> Configurer mes providers
          </Link>
        </div>
      )}

      {/* ── Bannière vérification ── */}
      {!isVerified && (
        <div style={{
          background: '#fff', border: '1px solid #f0f0f0', borderRadius: 20,
          padding: '32px 24px', textAlign: 'center', marginTop: 20,
          animation: 'fadeUp .4s ease .15s both',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: '#f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <Shield size={22} color="#94a3b8"/>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Vérification requise</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 18px' }}>Faites vérifier votre identité pour débloquer toutes les fonctionnalités.</p>
          <Link to="/verification" style={{
            background: '#0f172a', color: '#fff',
            padding: '11px 24px', borderRadius: 12, fontSize: 13, fontWeight: 700,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7,
          }}>
            <Shield size={15}/> Vérifier mon compte
          </Link>
        </div>
      )}
    </div>
  );
}