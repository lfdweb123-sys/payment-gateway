import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Search, Download, CheckCircle, Clock, XCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TransactionsList() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadTransactions(); }, []);

  const loadTransactions = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'gateway_transactions'), orderBy('createdAt', 'desc'), limit(200)));
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = transactions.filter(tx => {
    const s = search.toLowerCase();
    const match = !s || tx.id?.toLowerCase().includes(s) || tx.provider?.toLowerCase().includes(s);
    return filter === 'all' ? match : match && tx.status === filter;
  });

  const statusBadge = (status) => {
    const config = {
      completed: { bg: 'bg-emerald-50 text-emerald-700', icon: CheckCircle, label: 'Réussi' },
      pending: { bg: 'bg-amber-50 text-amber-700', icon: Clock, label: 'En cours' },
      failed: { bg: 'bg-red-50 text-red-700', icon: XCircle, label: 'Échoué' }
    };
    const c = config[status] || config.pending;
    return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${c.bg}`}><c.icon size={11}/> {c.label}</span>;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
          <p className="text-xs text-gray-500">{transactions.length} transactions</p>
        </div>
        <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 rounded-lg">
          <Download size={14}/> Exporter
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'completed', 'pending', 'failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            {f === 'all' ? 'Toutes' : f === 'completed' ? 'Réussies' : f === 'pending' ? 'En cours' : 'Échouées'}
          </button>
        ))}
        <div className="flex-1"/>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-36 sm:w-48"/>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(tx => (
          <div key={tx.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.status === 'completed' ? 'bg-emerald-100' : tx.status === 'pending' ? 'bg-amber-100' : 'bg-red-100'}`}>
                  {tx.status === 'completed' ? <CheckCircle size={18} className="text-emerald-600"/> : tx.status === 'pending' ? <Clock size={18} className="text-amber-600"/> : <XCircle size={18} className="text-red-600"/>}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{parseFloat(tx.amount || 0).toLocaleString()} {tx.currency || 'XOF'}</p>
                    {statusBadge(tx.status)}
                  </div>
                  <p className="text-xs text-gray-500">{tx.provider} • {tx.country?.toUpperCase()} • {tx.method}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-900">Com: {parseFloat(tx.commission || 0).toLocaleString()} XOF</p>
                <p className="text-xs text-gray-400">{tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm') : '—'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}