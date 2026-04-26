import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Search, CheckCircle, Ban, ChevronLeft, ChevronRight, ChevronDown, X, Users, Shield, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

function Badge({ status }) {
  const cfg = {
    approved: { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e', label: 'Vérifié' },
    pending:  { bg: '#fffbeb', color: '#d97706', dot: '#f59e0b', label: 'En attente' },
    rejected: { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444', label: 'Rejeté' },
  }[status] || { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8', label: 'Non vérifié' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot }}/>
      {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, bg, color, label, value }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 18, padding: '18px 20px', transition: 'box-shadow .2s, transform .2s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,.07)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={16} color={color}/>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-.02em' }}>{value}</div>
    </div>
  );
}

export default function AdminMerchants() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');
  const [page, setPage]           = useState(1);

  useEffect(() => { loadMerchants(); }, []);

  const loadMerchants = async () => {
    try {
      const snap = await getDocs(collection(db, 'gateway_merchants'));
      setMerchants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleToggleActive = async (id, active) => {
    try {
      await updateDoc(doc(db, 'gateway_merchants', id), { active: !active, updatedAt: new Date().toISOString() });
      setMerchants(prev => prev.map(m => m.id === id ? { ...m, active: !active } : m));
      toast.success(active ? 'Marchand désactivé' : 'Marchand activé');
    } catch { toast.error('Erreur de mise à jour'); }
  };

  const filtered = merchants.filter(m => {
    const s   = search.toLowerCase();
    const matchSearch = !s || (m.name || '').toLowerCase().includes(s) || (m.email || '').toLowerCase().includes(s);
    const matchFilter = filter === 'all' || m.verificationStatus === filter || (filter === 'active' && m.active !== false) || (filter === 'inactive' && m.active === false);
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = filter !== 'all' || !!search;

  const counts = {
    all:      merchants.length,
    approved: merchants.filter(m => m.verificationStatus === 'approved').length,
    pending:  merchants.filter(m => m.verificationStatus === 'pending').length,
    rejected: merchants.filter(m => m.verificationStatus === 'rejected').length,
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
        .adm-tab { cursor: pointer; transition: all .15s; }
        .adm-tab:hover { background: #f8fafc !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28, animation: 'fadeUp .3s ease' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-.02em' }}>Marchands</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '3px 0 0' }}>{merchants.length} comptes enregistrés</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24, animation: 'fadeUp .3s ease .05s both' }}>
        <StatCard icon={Users}         bg="#eff6ff" color="#2563eb" label="Total"      value={counts.all}/>
        <StatCard icon={CheckCircle}   bg="#f0fdf4" color="#16a34a" label="Vérifiés"   value={counts.approved}/>
        <StatCard icon={Clock}         bg="#fffbeb" color="#d97706" label="En attente" value={counts.pending}/>
        <StatCard icon={AlertTriangle} bg="#fef2f2" color="#dc2626" label="Rejetés"    value={counts.rejected}/>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 20, overflow: 'hidden', animation: 'fadeUp .3s ease .1s both' }}>

        {/* Filtres */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>

            {/* Onglets filtre */}
            <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 10, padding: 4 }}>
              {[
                { val: 'all',      label: 'Tous',        count: counts.all },
                { val: 'approved', label: 'Vérifiés',    count: counts.approved },
                { val: 'pending',  label: 'En attente',  count: counts.pending },
                { val: 'rejected', label: 'Rejetés',     count: counts.rejected },
              ].map(t => (
                <button
                  key={t.val}
                  className="adm-tab"
                  onClick={() => { setFilter(t.val); setPage(1); }}
                  style={{
                    padding: '6px 12px', borderRadius: 7, border: 'none',
                    background: filter === t.val ? '#fff' : 'transparent',
                    boxShadow: filter === t.val ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                    fontSize: 12, fontWeight: filter === t.val ? 700 : 500,
                    color: filter === t.val ? '#0f172a' : '#64748b',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {t.label}
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '1px 5px', borderRadius: 999,
                    background: filter === t.val ? '#f97316' : '#e2e8f0',
                    color: filter === t.val ? '#fff' : '#64748b',
                  }}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Nom ou email…"
                  style={{ paddingLeft: 30, paddingRight: search ? 28 : 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, background: '#f8fafc', outline: 'none', fontFamily: 'inherit', width: 180 }}
                  onFocus={e => e.target.style.borderColor = '#f97316'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                {search && (
                  <button onClick={() => { setSearch(''); setPage(1); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                    <X size={11}/>
                  </button>
                )}
              </div>

              {hasFilters && (
                <button onClick={() => { setFilter('all'); setSearch(''); setPage(1); }} style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  <X size={11}/> Reset
                </button>
              )}
            </div>
          </div>

          <span style={{ fontSize: 11, color: '#94a3b8' }}>{filtered.length} marchand{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table header */}
        {paginated.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 100px 80px', padding: '8px 22px', gap: 12, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', borderBottom: '1px solid #f8fafc' }}>
            <span>Marchand</span><span>Email</span><span>Statut KYC</span><span>Solde</span><span>Inscrit le</span><span style={{ textAlign: 'right' }}>Accès</span>
          </div>
        )}

        {/* Rows */}
        {paginated.length === 0 ? (
          <div style={{ padding: '48px 22px', textAlign: 'center' }}>
            <Users size={28} color="#e2e8f0" style={{ margin: '0 auto 10px', display: 'block' }}/>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              {hasFilters ? 'Aucun marchand ne correspond à vos filtres' : 'Aucun marchand enregistré'}
            </p>
          </div>
        ) : (
          paginated.map((m, i) => (
            <div
              key={m.id}
              className="adm-row"
              style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 100px 80px', padding: '13px 22px', gap: 12, borderBottom: i < paginated.length - 1 ? '1px solid #f8fafc' : 'none', alignItems: 'center', transition: 'background .1s' }}
            >
              {/* Nom */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: m.active !== false ? '#fff7ed' : '#f8fafc',
                  border: `1px solid ${m.active !== false ? '#fed7aa' : '#e2e8f0'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: m.active !== false ? '#f97316' : '#94a3b8',
                }}>
                  {m.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name || 'Sans nom'}
                  </p>
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0' }}>
                    {m.totalTransactions || 0} transaction{m.totalTransactions !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Email */}
              <p style={{ fontSize: 12, color: '#475569', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.email || '—'}
              </p>

              {/* Statut KYC */}
              <Badge status={m.verificationStatus}/>

              {/* Solde */}
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{(m.balance || 0).toLocaleString('fr-FR')}</span>
                <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 3 }}>XOF</span>
              </div>

              {/* Date */}
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {m.createdAt ? format(new Date(m.createdAt), 'dd/MM/yy') : '—'}
              </span>

              {/* Toggle actif */}
              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={() => handleToggleActive(m.id, m.active !== false)}
                  title={m.active !== false ? 'Désactiver' : 'Activer'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 8, border: 'none',
                    background: m.active !== false ? '#f0fdf4' : '#fef2f2',
                    color: m.active !== false ? '#16a34a' : '#dc2626',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  {m.active !== false ? <CheckCircle size={12}/> : <Ban size={12}/>}
                  {m.active !== false ? 'Actif' : 'Inactif'}
                </button>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 22px', borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Page {page} / {totalPages} · {filtered.length} marchand{filtered.length !== 1 ? 's' : ''}</span>
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
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={{width:28,height:28,borderRadius:7,border:'1px solid #e2e8f0',background:'#fff',cursor:page===totalPages?'not-allowed':'pointer',opacity:page===totalPages?.3:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ChevronRight size={12} color="#374151"/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}