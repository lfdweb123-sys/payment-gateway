import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { Search, Download, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function GatewayTransactions() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadTransactions(); }, [user]);

  const loadTransactions = async () => {
    try {
      let snap;
      if (isAdmin) {
        // Admin voit tout
        snap = await getDocs(query(collection(db, 'gateway_transactions'), orderBy('createdAt', 'desc'), limit(500)));
      } else {
        // Marchand voit ses transactions
        snap = await getDocs(query(collection(db, 'gateway_transactions'), where('merchantId', '==', user.uid), orderBy('createdAt', 'desc'), limit(200)));
      }
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = transactions.filter(tx => {
    const s = search.toLowerCase();
    const match = !s || (tx.id || '').toLowerCase().includes(s) || (tx.provider || '').toLowerCase().includes(s);
    if (filter === 'all') return match;
    return match && tx.status === filter;
  });

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
      pending: { bg: 'bg-amber-50 text-amber-700', icon: Clock, label: 'En cours' },
      failed: { bg: 'bg-red-50 text-red-700', icon: XCircle, label: 'Échoué' }
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${c.bg}`}><Icon size={11}/> {c.label}</span>;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
          <p className="text-xs text-gray-500">
            {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
            {isAdmin && <> • Commission totale : <strong>{totalCommission.toLocaleString()} XOF</strong></>}
          </p>
        </div>
        <button onClick={exportCSV} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 rounded-lg">
          <Download size={14}/> Exporter CSV
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'completed', 'pending', 'failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            {f === 'all' ? 'Toutes' : f === 'completed' ? 'Réussies' : f === 'pending' ? 'En cours' : 'Échouées'}
          </button>
        ))}
        <div className="flex-1"/>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-36 sm:w-48"/>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
          <div className="col-span-2">ID</div>
          <div className="col-span-2">Montant</div>
          {isAdmin && <div className="col-span-1">Com.</div>}
          <div className={`${isAdmin ? 'col-span-2' : 'col-span-3'}`}>Provider</div>
          <div className="col-span-2">Pays</div>
          <div className="col-span-2">Statut</div>
          <div className="col-span-1">Date</div>
        </div>
        {filtered.map(tx => (
          <div key={tx.id} className="sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-50 items-center">
            <div className="col-span-2 text-xs font-mono text-gray-500 truncate">{tx.id?.substring(0, 12)}</div>
            <div className="col-span-2 text-sm font-bold">{parseFloat(tx.amount || 0).toLocaleString()} XOF</div>
            {isAdmin && <div className="col-span-1 text-xs text-gray-500">{parseFloat(tx.commission || 0).toLocaleString()}</div>}
            <div className={`${isAdmin ? 'col-span-2' : 'col-span-3'} text-sm text-gray-600`}>{tx.provider || '—'}</div>
            <div className="col-span-2 text-sm">{tx.country ? tx.country.toUpperCase() : '—'}</div>
            <div className="col-span-2">{statusBadge(tx.status)}</div>
            <div className="col-span-1 text-xs text-gray-400">{tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM HH:mm') : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}