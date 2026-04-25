import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { DollarSign, TrendingUp, Download, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminCommissions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalCommission: 0, todayCommission: 0, monthCommission: 0, totalTransactions: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'gateway_transactions'), orderBy('createdAt', 'desc'), limit(200)));
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(txs);

      const now = new Date();
      const today = txs.filter(tx => new Date(tx.createdAt).toDateString() === now.toDateString());
      const thisMonth = txs.filter(tx => new Date(tx.createdAt).getMonth() === now.getMonth() && new Date(tx.createdAt).getFullYear() === now.getFullYear());

      setStats({
        totalCommission: txs.reduce((s, tx) => s + (parseFloat(tx.commission) || 0), 0),
        todayCommission: today.reduce((s, tx) => s + (parseFloat(tx.commission) || 0), 0),
        monthCommission: thisMonth.reduce((s, tx) => s + (parseFloat(tx.commission) || 0), 0),
        totalTransactions: txs.length
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = transactions.filter(tx => {
    const s = search.toLowerCase();
    return !s || (tx.merchantId || '').toLowerCase().includes(s) || (tx.provider || '').toLowerCase().includes(s);
  });

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Commissions</h1>
          <p className="text-xs text-gray-500">Revenus de la plateforme</p>
        </div>
        <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 rounded-lg">
          <Download size={14}/> Exporter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total commissions', value: `${stats.totalCommission.toLocaleString()} XOF`, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Aujourd\'hui', value: `${stats.todayCommission.toLocaleString()} XOF`, color: 'bg-blue-50 text-blue-600' },
          { label: 'Ce mois', value: `${stats.monthCommission.toLocaleString()} XOF`, color: 'bg-orange-50 text-orange-600' },
          { label: 'Transactions', value: stats.totalTransactions, color: 'bg-purple-50 text-purple-600' }
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}><DollarSign size={20}/></div>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Historique des commissions</h3>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-40"/>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {filtered.map(tx => (
            <div key={tx.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">+{parseFloat(tx.commission || 0).toLocaleString()} XOF</p>
                <p className="text-xs text-gray-500">Transaction {parseFloat(tx.amount || 0).toLocaleString()} XOF • {tx.provider}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {tx.status === 'completed' ? 'Encaissée' : 'En attente'}
                </span>
                <p className="text-xs text-gray-400 mt-0.5">{tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM HH:mm') : '—'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}