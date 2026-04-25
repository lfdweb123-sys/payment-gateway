import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  TrendingUp, DollarSign, CreditCard, Key, Clock, CheckCircle,
  Plus, Shield, AlertTriangle, Search, Filter, ArrowUpRight,
  BarChart2, Activity, ChevronDown, X, SlidersHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG = {
  completed: { label: 'Réussi', bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  pending:   { label: 'En cours', bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  failed:    { label: 'Échoué',  bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

const FILTERS = ['Tous', 'Réussi', 'En cours', 'Échoué'];

export default function GatewayDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    balance: 0, totalTransactions: 0, todayTransactions: 0,
    recentTransactions: [], providersCount: 0
  });
  const [loading, setLoading]       = useState(true);
  const [merchant, setMerchant]     = useState(null);
  const [filter, setFilter]         = useState('Tous');
  const [search, setSearch]         = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [providerFilter, setProviderFilter] = useState('Tous');

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
        limit(50)
      );
      const snap = await getDocs(txQuery);
      const transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const today = transactions.filter(tx => {
        const d = new Date(tx.createdAt);
        return d.toDateString() === new Date().toDateString();
      });
      const providers = merchantData.providers || {};
      const activeProviders = Object.values(providers).filter(p => p.active).length;
      setStats({
        balance: merchantData.balance || 0,
        totalTransactions: merchantData.totalTransactions || 0,
        todayTransactions: today.length,
        recentTransactions: transactions,
        providersCount: activeProviders
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const allProviders = ['Tous', ...new Set(stats.recentTransactions.map(tx => tx.provider).filter(Boolean))];

  const filtered = stats.recentTransactions.filter(tx => {
    const statusLabel = STATUS_CONFIG[tx.status]?.label || tx.status;
    const matchStatus   = filter === 'Tous' || statusLabel === filter;
    const matchProvider = providerFilter === 'Tous' || tx.provider === providerFilter;
    const matchSearch   = !search || 
      tx.provider?.toLowerCase().includes(search.toLowerCase()) ||
      String(tx.amount).includes(search) ||
      tx.country?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchProvider && matchSearch;
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #FF6B00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isVerified = merchant?.verificationStatus === 'approved';
  const isPending  = merchant?.verificationStatus === 'pending';
  const isRejected = merchant?.verificationStatus === 'rejected';

  const totalFiltered = filtered.reduce((s, tx) => s + parseFloat(tx.amount || 0), 0);

  return (
    <div style={{ fontFamily: "'DM Sans', 'Plus Jakarta Sans', sans-serif", minHeight: '100vh', background: '#F5F5F7', color: '#111' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .5 } }
        .dash-card { background: #fff; border-radius: 20px; border: 1px solid #EBEBEB; transition: box-shadow .2s, transform .2s; }
        .dash-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,.07); transform: translateY(-1px); }
        .filter-chip { border: 1.5px solid #E5E5E5; background: #fff; color: #666; border-radius: 100px; padding: 6px 16px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s; white-space: nowrap; }
        .filter-chip:hover { border-color: #FF6B00; color: #FF6B00; }
        .filter-chip.active { background: #FF6B00; border-color: #FF6B00; color: #fff; font-weight: 600; }
        .tx-row { padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F5F5F5; transition: background .15s; cursor: default; }
        .tx-row:last-child { border-bottom: none; }
        .tx-row:hover { background: #FAFAFA; }
        .search-input { background: #F7F7F7; border: 1.5px solid #EBEBEB; border-radius: 12px; padding: 10px 14px 10px 40px; font-size: 13.5px; font-family: inherit; color: #111; width: 100%; outline: none; transition: border-color .2s; }
        .search-input:focus { border-color: #FF6B00; background: #fff; }
        .stat-val { font-family: 'DM Mono', monospace; font-size: 22px; font-weight: 500; color: #111; letter-spacing: -.02em; }
        .badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 100px; }
        .alert-bar { border-radius: 16px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; animation: fadeSlideUp .4s ease; }
        select { appearance: none; background: #F7F7F7; border: 1.5px solid #EBEBEB; border-radius: 12px; padding: 10px 36px 10px 14px; font-size: 13px; font-family: inherit; color: #555; cursor: pointer; outline: none; }
        select:focus { border-color: #FF6B00; }
        .btn-orange { background: linear-gradient(135deg,#FF6B00,#FF9500); color: #fff; border: none; border-radius: 12px; padding: 10px 20px; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 7px; transition: all .2s; }
        .btn-orange:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,107,0,.35); }
        .empty-state { padding: 56px 32px; text-align: center; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* ── VERIFICATION BANNER ── */}
        {!isVerified && (
          <div className="alert-bar" style={{
            background: isPending ? '#FFFBEB' : '#FFF1F0',
            border: `1.5px solid ${isPending ? '#FCD34D' : '#FECACA'}`,
            marginBottom: 24
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: isPending ? '#FEF3C7' : '#FEE2E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {isPending
                ? <Clock size={18} style={{ color: '#D97706' }} />
                : <AlertTriangle size={18} style={{ color: '#DC2626' }} />
              }
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: '#111', marginBottom: 2 }}>
                {isPending ? 'Vérification en cours' : isRejected ? 'Vérification refusée' : 'Compte non vérifié'}
              </p>
              <p style={{ fontSize: 12.5, color: '#666', lineHeight: 1.5 }}>
                {isPending
                  ? "Vos documents sont en cours d'examen. Délai estimé : 24–48h."
                  : isRejected
                  ? "Vos documents n'ont pas été acceptés. Veuillez soumettre à nouveau."
                  : "Vérifiez votre identité pour débloquer toutes les fonctionnalités."}
              </p>
            </div>
            <Link to="/verification" style={{
              padding: '8px 18px', borderRadius: 10, fontSize: 12.5, fontWeight: 600,
              textDecoration: 'none', whiteSpace: 'nowrap',
              background: isPending ? '#FEF3C7' : '#111', color: isPending ? '#92400E' : '#fff'
            }}>
              {isPending ? 'Voir le statut' : isRejected ? 'Réessayer' : 'Vérifier →'}
            </Link>
          </div>
        )}

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-.03em' }}>Dashboard</h1>
            <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>Bienvenue, {user?.displayName || user?.email}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {isVerified && (
              <Link to="/providers" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fff', border: '1.5px solid #E5E5E5', color: '#555',
                padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                transition: 'all .15s'
              }}>
                <Key size={13} /> Providers
                <span style={{ background: '#FF6B00', color: '#fff', borderRadius: 100, fontSize: 10, fontWeight: 700, padding: '1px 7px' }}>{stats.providersCount}</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── STATS CARDS ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16, marginBottom: 28,
          ...(isVerified ? {} : { opacity: 0.4, pointerEvents: 'none', userSelect: 'none' })
        }}>
          {[
            {
              icon: <DollarSign size={18} style={{ color: '#10B981' }} />,
              iconBg: '#D1FAE5', label: 'Solde disponible',
              value: `${stats.balance.toLocaleString('fr-FR')} XOF`,
              sub: 'Mis à jour maintenant', subColor: '#10B981'
            },
            {
              icon: <CreditCard size={18} style={{ color: '#3B82F6' }} />,
              iconBg: '#DBEAFE', label: 'Total transactions',
              value: stats.totalTransactions.toLocaleString('fr-FR'),
              sub: 'Depuis l\'inscription', subColor: '#3B82F6'
            },
            {
              icon: <Activity size={18} style={{ color: '#FF6B00' }} />,
              iconBg: '#FFF3EA', label: "Aujourd'hui",
              value: stats.todayTransactions,
              sub: format(new Date(), 'EEEE d MMM', { locale: fr }), subColor: '#FF6B00'
            },
            {
              icon: <TrendingUp size={18} style={{ color: '#8B5CF6' }} />,
              iconBg: '#EDE9FE', label: 'Volume filtré',
              value: `${totalFiltered.toLocaleString('fr-FR')} XOF`,
              sub: `${filtered.length} transactions`, subColor: '#8B5CF6'
            },
          ].map((s, i) => (
            <div key={i} className="dash-card" style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.icon}
                </div>
                <ArrowUpRight size={14} style={{ color: '#CCC' }} />
              </div>
              <p style={{ fontSize: 12, color: '#999', fontWeight: 500, marginBottom: 4 }}>{s.label}</p>
              <p className="stat-val">{s.value}</p>
              <p style={{ fontSize: 11.5, color: s.subColor, marginTop: 6, fontWeight: 500 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── TRANSACTIONS TABLE ── */}
        <div className="dash-card" style={{ overflow: 'hidden', ...(isVerified ? {} : { opacity: 0.4, pointerEvents: 'none', userSelect: 'none' }) }}>
          
          {/* Table Header */}
          <div style={{ padding: '20px 20px 0', borderBottom: '1px solid #F0F0F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Transactions récentes</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isVerified && (
                  <button onClick={() => setShowFilters(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: showFilters ? '#FFF3EA' : '#F7F7F7',
                    border: `1.5px solid ${showFilters ? '#FF6B00' : '#EBEBEB'}`, color: showFilters ? '#FF6B00' : '#666',
                    borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                    <SlidersHorizontal size={13} /> Filtres
                    {(filter !== 'Tous' || providerFilter !== 'Tous') && (
                      <span style={{ background: '#FF6B00', color: '#fff', width: 16, height: 16, borderRadius: '50%', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>!</span>
                    )}
                  </button>
                )}
                {isVerified && (
                  <Link to="/transactions" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600,
                    color: '#FF6B00', textDecoration: 'none'
                  }}>
                    Voir tout <ArrowUpRight size={13} />
                  </Link>
                )}
              </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: 14, marginBottom: 16, border: '1px solid #F0F0F0', animation: 'fadeSlideUp .2s ease' }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {/* Search */}
                  <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 200 }}>
                    <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#AAA' }} />
                    <input
                      className="search-input"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Rechercher…"
                    />
                    {search && (
                      <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', display: 'flex' }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Provider dropdown */}
                  <div style={{ position: 'relative', flex: '0 0 auto' }}>
                    <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}>
                      {allProviders.map(p => <option key={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} />
                  </div>

                  {/* Reset */}
                  {(filter !== 'Tous' || providerFilter !== 'Tous' || search) && (
                    <button onClick={() => { setFilter('Tous'); setProviderFilter('Tous'); setSearch(''); }} style={{
                      background: 'none', border: '1.5px solid #EEE', borderRadius: 10, padding: '9px 14px',
                      fontSize: 12.5, color: '#999', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5
                    }}>
                      <X size={12} /> Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Status chips */}
            <div style={{ display: 'flex', gap: 8, paddingBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`filter-chip ${filter === f ? 'active' : ''}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Table body */}
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div style={{ width: 52, height: 52, borderRadius: 16, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CreditCard size={22} style={{ color: '#CCC' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 6 }}>Aucune transaction trouvée</p>
              <p style={{ fontSize: 13, color: '#AAA' }}>Essayez de modifier vos filtres</p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px', padding: '10px 20px', background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
                {['Transaction', 'Provider', 'Statut', 'Date'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#BBB', textTransform: 'uppercase', letterSpacing: '.07em' }}>{h}</span>
                ))}
              </div>

              <div>
                {filtered.slice(0, 20).map((tx, i) => {
                  const sc = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
                  return (
                    <div key={tx.id} className="tx-row" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px', gap: 8, animation: `fadeSlideUp ${.1 + i * .03}s ease both` }}>
                      {/* Amount + country */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: tx.status === 'completed' ? '#D1FAE5' : tx.status === 'failed' ? '#FEE2E2' : '#FEF3C7',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {tx.status === 'completed'
                            ? <CheckCircle size={15} style={{ color: '#10B981' }} />
                            : tx.status === 'failed'
                            ? <X size={15} style={{ color: '#EF4444' }} />
                            : <Clock size={15} style={{ color: '#F59E0B' }} />
                          }
                        </div>
                        <div>
                          <p style={{ fontSize: 13.5, fontWeight: 700, color: '#111', fontFamily: 'DM Mono, monospace', letterSpacing: '-.01em' }}>
                            +{parseFloat(tx.amount || 0).toLocaleString('fr-FR')} XOF
                          </p>
                          <p style={{ fontSize: 11.5, color: '#AAA', marginTop: 1 }}>{tx.country?.toUpperCase() || '—'}</p>
                        </div>
                      </div>

                      {/* Provider */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: '#555', background: '#F5F5F5', padding: '4px 10px', borderRadius: 8 }}>
                          {tx.provider || '—'}
                        </span>
                      </div>

                      {/* Status badge */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="badge" style={{ background: sc.bg, color: sc.color }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                          {sc.label}
                        </span>
                      </div>

                      {/* Date */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#AAA', fontFamily: 'DM Mono, monospace' }}>
                          {tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM HH:mm') : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filtered.length > 20 && (
                <div style={{ padding: '14px 20px', textAlign: 'center', borderTop: '1px solid #F5F5F5' }}>
                  <Link to="/transactions" style={{ fontSize: 13, color: '#FF6B00', textDecoration: 'none', fontWeight: 600 }}>
                    Voir les {filtered.length - 20} transactions restantes →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── BANNERS ── */}
        {isVerified && stats.providersCount === 0 && (
          <div style={{
            marginTop: 20, background: 'linear-gradient(135deg,#FFF8F3,#FFF3EA)',
            border: '1.5px solid #FFD6B0', borderRadius: 20, padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FF6B00', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Key size={22} style={{ color: '#fff' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111', marginBottom: 8 }}>Configurez vos moyens de paiement</h3>
            <p style={{ fontSize: 13.5, color: '#888', marginBottom: 22, maxWidth: 360, margin: '0 auto 22px' }}>
              Ajoutez vos clés API pour commencer à accepter les paiements.
            </p>
            <Link to="/providers" className="btn-orange" style={{ textDecoration: 'none' }}>
              <Plus size={15} /> Configurer mes providers
            </Link>
          </div>
        )}

        {!isVerified && (
          <div style={{
            marginTop: 20, background: '#fff', border: '1.5px solid #EBEBEB',
            borderRadius: 20, padding: '40px 32px', textAlign: 'center'
          }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Shield size={24} style={{ color: '#CCC' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111', marginBottom: 8 }}>Vérification requise</h3>
            <p style={{ fontSize: 13.5, color: '#999', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
              Faites vérifier votre identité pour débloquer toutes les fonctionnalités.
            </p>
            <Link to="/verification" className="btn-orange" style={{ textDecoration: 'none' }}>
              <Shield size={15} /> Vérifier mon compte
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}