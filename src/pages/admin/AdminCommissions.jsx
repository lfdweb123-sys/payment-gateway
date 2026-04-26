import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { DollarSign, TrendingUp, Download, Search, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PAGE_SIZE = 10;

function Badge({ status }) {
  const cfg = {
    completed: { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e', label: 'Encaissée' },
    pending:   { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b', label: 'En attente' },
    failed:    { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444', label: 'Échouée' },
  }[status] || { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8', label: status };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot }}/>
      {cfg.label}
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
      <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AdminCommissions() {
  const [transactions, setTransactions] = useState([]);
  const [merchants, setMerchants]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [stats, setStats]               = useState({ total: 0, today: 0, month: 0, count: 0 });

  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('Tous');
  const [page, setPage]           = useState(1);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [txSnap, mSnap] = await Promise.all([
        getDocs(query(collection(db, 'gateway_transactions'), orderBy('createdAt', 'desc'), limit(500))),
        getDocs(collection(db, 'gateway_merchants')),
      ]);
      const txs  = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const mers = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMerchants(mers);

      // Seulement les transactions complétées pour les commissions
      const completed = txs.filter(tx => tx.status === 'completed');
      setTransactions(txs);

      const now   = new Date();
      const today = completed.filter(tx => new Date(tx.createdAt).toDateString() === now.toDateString());
      const month = completed.filter(tx => {
        const d = new Date(tx.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      setStats({
        total: completed.reduce((s, tx) => s + (parseFloat(tx.commission) || 0), 0),
        today: today.reduce((s, tx) => s + (parseFloat(tx.commission) || 0), 0),
        month: month.reduce((s, tx) => s + (parseFloat(tx.commission) || 0), 0),
        count: completed.length,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getMerchantName = (id) => {
    const m = merchants.find(m => m.id === id);
    return m?.name || m?.email || (id ? id.substring(0, 8) + '…' : '—');
  };

  // Filtrage — uniquement les transactions complétées ont une commission réelle
  const filtered = transactions.filter(tx => {
    const matchStatus = statusFilter === 'Tous' || tx.status === statusFilter;
    const s = search.toLowerCase();
    const matchSearch = !s
      || getMerchantName(tx.merchantId).toLowerCase().includes(s)
      || (tx.provider || '').toLowerCase().includes(s)
      || String(tx.amount).includes(s);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = statusFilter !== 'Tous' || !!search;

  const handleExport = () => {
    const rows = [
      ['Date', 'Marchand', 'Provider', 'Pays', 'Méthode', 'Montant', 'Commission', 'Statut'],
      ...filtered.map(tx => [
        tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm') : '',
        getMerchantName(tx.merchantId),
        tx.provider || '',
        tx.country?.toUpperCase() || '',
        tx.method || '',
        tx.amount || 0,
        tx.status === 'completed' ? (tx.commission || 0) : 0,
        tx.status,
      ]),
    ].map(r => r.join(',')).join('\n');

    const blob = new Blob([rows], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `commissions-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

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
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
        .adm-row:hover { background: #fafafa !important; }
        .adm-select { appearance: none; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12, animation: 'fadeUp .3s ease' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-.02em' }}>Commissions</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '3px 0 0' }}>Revenus de la plateforme · paiements réussis uniquement</p>
        </div>
        <button onClick={handleExport} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 18px', borderRadius: 12, border: '1px solid #e2e8f0',
          background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151',
          cursor: 'pointer', transition: 'all .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151'; }}
        >
          <Download size={14}/> Exporter CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28, animation: 'fadeUp .3s ease .05s both' }}>
        <StatCard icon={DollarSign} bg="#f0fdf4" color="#16a34a" label="Total commissions"  value={`${stats.total.toLocaleString('fr-FR')} XOF`} sub="sur paiements réussis"/>
        <StatCard icon={TrendingUp} bg="#fff7ed" color="#f97316" label="Aujourd'hui"         value={`${stats.today.toLocaleString('fr-FR')} XOF`}/>
        <StatCard icon={TrendingUp} bg="#eff6ff" color="#2563eb" label="Ce mois"             value={`${stats.month.toLocaleString('fr-FR')} XOF`}/>
        <StatCard icon={DollarSign} bg="#fdf4ff" color="#a855f7" label="Transactions réussies" value={stats.count} sub="payées avec succès"/>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 20, overflow: 'hidden', animation: 'fadeUp .3s ease .1s both' }}>

        {/* Filters */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Historique des commissions</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#f1f5f9', color: '#64748b' }}>{filtered.length}</span>
            </div>
            {hasFilters && (
              <button onClick={() => { setSearch(''); setStatus('Tous'); setPage(1); }} style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
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
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Marchand, provider…"
                style={{ width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, background: '#f8fafc', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }} className="adm-select"
                style={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 10, background: statusFilter !== 'Tous' ? '#fff7ed' : '#f8fafc', paddingLeft: 12, paddingRight: 28, paddingTop: 8, paddingBottom: 8, color: statusFilter !== 'Tous' ? '#f97316' : '#374151', fontWeight: statusFilter !== 'Tous' ? 700 : 500, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}
              >
                {['Tous', 'completed', 'pending', 'failed'].map(s => (
                  <option key={s} value={s}>{s === 'Tous' ? 'Tous les statuts' : s === 'completed' ? 'Réussie' : s === 'pending' ? 'En cours' : 'Échouée'}</option>
                ))}
              </select>
              <ChevronDown size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}/>
            </div>
          </div>
        </div>

        {/* Table header */}
        {paginated.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 100px 110px 90px', padding: '8px 22px', gap: 12, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid #f8fafc' }}>
            <span>Marchand</span><span>Provider</span><span>Pays / Méthode</span><span style={{ textAlign: 'right' }}>Montant</span><span style={{ textAlign: 'right' }}>Commission</span><span style={{ textAlign: 'right' }}>Statut</span>
          </div>
        )}

        {/* Rows */}
        {paginated.length === 0 ? (
          <div style={{ padding: '48px 22px', textAlign: 'center' }}>
            <DollarSign size={28} color="#e2e8f0" style={{ margin: '0 auto 10px', display: 'block' }}/>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Aucune commission trouvée</p>
          </div>
        ) : (
          paginated.map((tx, i) => (
            <div key={tx.id} className="adm-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 100px 110px 90px', padding: '12px 22px', gap: 12, borderBottom: i < paginated.length - 1 ? '1px solid #f8fafc' : 'none', alignItems: 'center', transition: 'background .1s' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getMerchantName(tx.merchantId)}
                </p>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0' }}>
                  {tx.createdAt ? format(new Date(tx.createdAt), 'dd MMM yyyy · HH:mm', { locale: fr }) : '—'}
                </p>
              </div>
              <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{tx.provider || '—'}</span>
              <div>
                <span style={{ fontSize: 12, color: '#475569' }}>{tx.country?.toUpperCase() || '—'}</span>
                <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>{tx.method?.replace(/_/g, ' ') || '—'}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{parseFloat(tx.amount || 0).toLocaleString('fr-FR')}</span>
                <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>XOF</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                {tx.status === 'completed' ? (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>+{parseFloat(tx.commission || 0).toLocaleString('fr-FR')}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>XOF</span>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }}>—</span>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <Badge status={tx.status}/>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 22px', borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Page {page} / {totalPages} · {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: page===1?'not-allowed':'pointer', opacity: page===1?.3:1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={12} color="#374151"/>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p===1||p===totalPages||Math.abs(p-page)<=1)
                .reduce((acc,p,idx,arr)=>{ if(idx>0&&p-arr[idx-1]>1) acc.push('…'); acc.push(p); return acc; },[])
                .map((p,i) => p==='…'
                  ? <span key={`d${i}`} style={{ width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#94a3b8' }}>…</span>
                  : <button key={p} onClick={()=>setPage(p)} style={{ width:28,height:28,borderRadius:7,border:`1px solid ${page===p?'#f97316':'#e2e8f0'}`,background:page===p?'#f97316':'#fff',cursor:'pointer',fontSize:12,fontWeight:700,color:page===p?'#fff':'#374151',display:'flex',alignItems:'center',justifyContent:'center' }}>{p}</button>
                )
              }
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={{ width:28,height:28,borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',cursor:page===totalPages?'not-allowed':'pointer',opacity:page===totalPages?.3:1,display:'flex',alignItems:'center',justifyContent:'center' }}>
                <ChevronRight size={12} color="#374151"/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}