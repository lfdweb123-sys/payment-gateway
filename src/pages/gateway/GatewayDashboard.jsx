import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, CreditCard, Copy, Key, Eye, EyeOff, ExternalLink, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function GatewayDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ balance: 0, totalTransactions: 0, todayTransactions: 0, recentTransactions: [] });
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);

  const merchant = user?.merchant || {};
  const apiKey = merchant.apiKey || '';
  const paymentLink = `${window.location.origin}/pay?token=${apiKey}`;

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
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

      setStats({
        balance: merchant.balance || 0,
        totalTransactions: merchant.totalTransactions || 0,
        todayTransactions: today.length,
        recentTransactions: transactions
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const copyKey = () => { navigator.clipboard.writeText(apiKey); toast.success('Clé API copiée !'); };
  const copyLink = () => { navigator.clipboard.writeText(paymentLink); toast.success('Lien de paiement copié !'); };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-xs text-gray-500">Bienvenue, {user?.displayName || user?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { icon: DollarSign, label: 'Solde', value: `${stats.balance.toLocaleString()} XOF`, color: 'bg-emerald-50 text-emerald-600' },
          { icon: CreditCard, label: 'Transactions', value: stats.totalTransactions, color: 'bg-blue-50 text-blue-600' },
          { icon: TrendingUp, label: 'Aujourd\'hui', value: stats.todayTransactions, color: 'bg-orange-50 text-orange-600' }
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center mb-3`}><s.icon size={20}/></div>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Clé API */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Key size={16}/> Votre clé API</h3>
        <div className="flex items-center gap-2 mb-3">
          <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-sm text-gray-700">
            {showKey ? apiKey : apiKey?.substring(0, 20) + '...'}
          </code>
          <button onClick={() => setShowKey(!showKey)} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">{showKey ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          <button onClick={copyKey} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50"><Copy size={16}/></button>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-2">Lien de paiement direct :</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-600 truncate">{paymentLink}</code>
            <button onClick={copyLink} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 flex-shrink-0"><Copy size={14}/></button>
          </div>
        </div>
      </div>

      {/* Transactions récentes */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Transactions récentes</h3>
        </div>
        {stats.recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Aucune transaction</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.recentTransactions.map(tx => (
              <div key={tx.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.status === 'completed' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {tx.status === 'completed' ? <CheckCircle size={14} className="text-emerald-600"/> : <Clock size={14} className="text-amber-600"/>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{parseFloat(tx.amount || 0).toLocaleString()} XOF</p>
                    <p className="text-xs text-gray-500">{tx.provider} • {tx.country?.toUpperCase()}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">{tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM HH:mm') : '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}