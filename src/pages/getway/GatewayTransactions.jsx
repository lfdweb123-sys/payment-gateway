import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Search, Filter, Download, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function GatewayTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const perPage = 50;

  const countryNames = { bj: '🇧🇯 Bénin', ci: '🇨🇮 CI', tg: '🇹🇬 Togo', sn: '🇸🇳 Sénégal', ng: '🇳🇬 Nigeria', gh: '🇬🇭 Ghana', ke: '🇰🇪 Kenya', fr: '🇫🇷 France', gb: '🇬🇧 UK', de: '🇩🇪 Allemagne' };

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'gateway_transactions'), orderBy('createdAt', 'desc'), limit(200)));
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

  const totalAmount = filtered.reduce((s, tx) => s + (parseFloat(tx.amount) || 0), 0);
  const totalCommission = filtered.reduce((s, tx) => s + (parseFloat(tx.commission) || 0), 0);

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

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
          <p className="text-xs text-gray-500">{transactions.length} transactions • Commission: {totalCommission.toLocaleString()} XOF</p>
        </div>
        <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 rounded-lg">
          <Download size={14}/> Exporter CSV
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Toutes' },
          { key: 'completed', label: 'Réussies' },
          { key: 'pending', label: 'En cours' },
          { key: 'failed', label: 'Échouées' }
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f.key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{f.label}</button>
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
          <div className="col-span-1">Com.</div>
          <div className="col-span-2">Provider</div>
          <div className="col-span-2">Pays</div>
          <div className="col-span-2">Statut</div>
          <div className="col-span-1">Date</div>
        </div>
        {filtered.slice(page * perPage, (page + 1) * perPage).map(tx => (
          <div key={tx.id} className="sm:grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-50 items-center">
            <div className="col-span-2 text-xs font-mono text-gray-500 truncate">{tx.id?.substring(0, 12)}</div>
            <div className="col-span-2 text-sm font-bold">{parseFloat(tx.amount || 0).toLocaleString()} XOF</div>
            <div className="col-span-1 text-xs text-gray-500">{parseFloat(tx.commission || 0).toLocaleString()}</div>
            <div className="col-span-2 text-sm text-gray-600">{tx.provider}</div>
            <div className="col-span-2 text-sm">{countryNames[tx.country] || tx.country}</div>
            <div className="col-span-2">{statusBadge(tx.status)}</div>
            <div className="col-span-1 text-xs text-gray-400">{tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM HH:mm') : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}