import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { TrendingUp, DollarSign, CreditCard, Key, Clock, CheckCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function GatewayDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ balance: 0, totalTransactions: 0, todayTransactions: 0, recentTransactions: [], providersCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const merchantSnap = await getDoc(doc(db, 'gateway_merchants', user.uid));
      const merchantData = merchantSnap.exists() ? merchantSnap.data() : {};

      const txQuery = query(
        collection(db, 'gateway_transactions'),
        where('merchantId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const snap = await getDocs(txQuery);
      const transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const today = transactions.filter(tx => {
        const d = new Date(tx.createdAt);
        const now = new Date();
        return d.toDateString() === now.toDateString();
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

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500">Bienvenue, {user?.displayName || user?.email}</p>
        </div>
        <Link to="/providers" className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5">
          <Key size={14} /> Providers ({stats.providersCount})
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
            <DollarSign size={20} className="text-emerald-600" />
          </div>
          <p className="text-sm text-gray-500">Solde</p>
          <p className="text-xl font-bold text-gray-900">{stats.balance.toLocaleString()} XOF</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <CreditCard size={20} className="text-blue-600" />
          </div>
          <p className="text-sm text-gray-500">Transactions</p>
          <p className="text-xl font-bold text-gray-900">{stats.totalTransactions}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-orange-600" />
          </div>
          <p className="text-sm text-gray-500">Aujourd'hui</p>
          <p className="text-xl font-bold text-gray-900">{stats.todayTransactions}</p>
        </div>
      </div>

      {/* Transactions récentes */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Transactions récentes</h3>
          <Link to="/transactions" className="text-xs text-orange-500 hover:text-orange-600">Voir tout</Link>
        </div>
        {stats.recentTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Aucune transaction</p>
            <p className="text-xs text-gray-400 mt-1">Les paiements apparaîtront ici</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.recentTransactions.map(tx => (
              <div key={tx.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.status === 'completed' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {tx.status === 'completed' ? <CheckCircle size={14} className="text-emerald-600"/> : <Clock size={14} className="text-amber-600"/>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{parseFloat(tx.amount || 0).toLocaleString()} XOF</p>
                    <p className="text-xs text-gray-500">{tx.provider} • {tx.country?.toUpperCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {tx.status === 'completed' ? 'Réussi' : 'En cours'}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">{tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM HH:mm') : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bannière providers */}
      {stats.providersCount === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
          <h3 className="text-lg font-bold text-orange-900 mb-2">Configurez vos moyens de paiement</h3>
          <p className="text-sm text-orange-700 mb-4">Ajoutez vos clés API pour commencer à accepter les paiements.</p>
          <Link to="/providers" className="bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-orange-600 inline-flex items-center gap-2">
            <Plus size={16} /> Configurer mes providers
          </Link>
        </div>
      )}
    </div>
  );
}