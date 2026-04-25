import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Search, Download, CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const PAGE_SIZE = 10;

export default function GatewayTransactions() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => { loadTransactions(); }, [user]);

  const loadTransactions = async () => {
    try {
      let snap;
      if (isAdmin) {
        snap = await getDocs(query(collection(db, 'gateway_transactions'), orderBy('createdAt', 'desc'), limit(500)));
      } else {
        snap = await getDocs(query(collection(db, 'gateway_transactions'), where('merchantId', '==', user.uid), orderBy('createdAt', 'desc'), limit(200)));
      }
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleFilter = (fn) => { fn(); setPage(1); };

  const filtered = transactions.filter(tx => {
    const s = search.toLowerCase();
    const match = !s || (tx.id || '').toLowerCase().includes(s) || (tx.provider || '').toLowerCase().includes(s);
    if (filter === 'all') return match;
    return match && tx.status === filter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalCommission = filtered.reduce((s, tx) => s + (parseFloat(tx.commission) || 0), 0);

  const exportCSV = () => {
    const headers = 'ID,Montant,Commission,Provider,Pays,Statut,Date\n';
    const rows = filtered.map(tx =>
      `${tx.id},${tx.amount},${tx.commission},${tx.provider || ''},${tx.country || ''},${tx.status},${tx.createdAt || ''}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Export téléchargé');
  };

  const statusBadge = (status) => {
    const config = {
      completed: { bg: 'bg-emerald-50 text-emerald-700', icon: CheckCircle, label: 'Réussi' },
      pending:   { bg: 'bg-amber-50 text-amber-700',   icon: Clock,         label: 'En cours' },
      failed:    { bg: 'bg-red-50 text-red-700',        icon: XCircle,       label: 'Échoué' }
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${c.bg}`}>
        <Icon size={11}/> {c.label}
      </span>
    );
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
          <p className="text-xs text-gray-500">
            {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
            {isAdmin && <> · Commission totale : <strong>{totalCommission.toLocaleString()} XOF</strong></>}
          </p>
        </div>
        <button onClick={exportCSV} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 rounded-lg">
          <Download size={14}/> Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all','completed','pending','failed'].map(f => (
          <button key={f} onClick={() => handleFilter(() => setFilter(f))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            {f === 'all' ? 'Toutes' : f === 'completed' ? 'Réussies' : f === 'pending' ? 'En cours' : 'Échouées'}
          </button>
        ))}
        <div className="flex-1"/>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input
            value={search}
            onChange={e => handleFilter(() => setSearch(e.target.value))}
            placeholder="Rechercher..."
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-36 sm:w-48 focus:outline-none focus:border-orange-400"
          />
          {search && (
            <button onClick={() => handleFilter(() => setSearch(''))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={11}/>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        {/* Colonnes header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-2">ID</div>
          <div className="col-span-2">Montant</div>
          {isAdmin && <div className="col-span-1">Com.</div>}
          <div className={isAdmin ? 'col-span-2' : 'col-span-3'}>Provider</div>
          <div className="col-span-2">Pays</div>
          <div className="col-span-2">Statut</div>
          <div className="col-span-1">Date</div>
        </div>

        {paginated.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">Aucune transaction trouvée</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {paginated.map(tx => (
              <div key={tx.id} className="sm:grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-gray-50 transition-colors">
                <div className="col-span-2 text-xs font-mono text-gray-400 truncate">{tx.id?.substring(0,12)}</div>
                <div className="col-span-2 text-sm font-bold text-gray-900">{parseFloat(tx.amount||0).toLocaleString()} XOF</div>
                {isAdmin && <div className="col-span-1 text-xs text-gray-500">{parseFloat(tx.commission||0).toLocaleString()}</div>}
                <div className={`${isAdmin ? 'col-span-2' : 'col-span-3'} text-sm text-gray-600`}>{tx.provider||'—'}</div>
                <div className="col-span-2 text-sm text-gray-700">{tx.country ? tx.country.toUpperCase() : '—'}</div>
                <div className="col-span-2">{statusBadge(tx.status)}</div>
                <div className="col-span-1 text-xs text-gray-400">{tx.createdAt ? format(new Date(tx.createdAt),'dd/MM HH:mm') : '—'}</div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-gray-400">
              Page {page} / {totalPages} · {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={13}/>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx-1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === '…'
                  ? <span key={`d-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
                  : (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium border transition-colors ${
                        page === p ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {p}
                    </button>
                  )
                )
              }
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={13}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}