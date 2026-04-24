import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { 
  TrendingUp, Users, CreditCard, DollarSign, 
  Activity, ArrowUpRight, ArrowDownRight, Globe,
  BarChart3, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function GatewayDashboard() {
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalRevenue: 0,
    totalCommission: 0,
    activeMerchants: 0,
    successRate: 0,
    recentTransactions: [],
    topCountries: [],
    monthlyRevenue: []
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    try {
      const [txSnap, merchantsSnap] = await Promise.all([
        getDocs(query(collection(db, 'gateway_transactions'), orderBy('createdAt', 'desc'), limit(50))),
        getDocs(collection(db, 'gateway_merchants'))
      ]);

      const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const merchants = merchantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const totalRevenue = transactions.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
      const totalCommission = transactions.reduce((s, t) => s + (parseFloat(t.commission) || 0), 0);
      const successful = transactions.filter(t => t.status === 'completed');

      // Top pays
      const countryCount = {};
      transactions.forEach(t => {
        if (t.country) countryCount[t.country] = (countryCount[t.country] || 0) + 1;
      });
      const topCountries = Object.entries(countryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([code, count]) => ({ code, count }));

      // Revenus mensuels
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        const monthStr = month.toLocaleString('fr-FR', { month: 'short' });
        const revenue = transactions
          .filter(t => {
            const d = new Date(t.createdAt);
            return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
          })
          .reduce((s, t) => s + parseFloat(t.commission || 0), 0);
        monthlyData.push({ month: monthStr, revenue });
      }

      setStats({
        totalTransactions: transactions.length,
        totalRevenue,
        totalCommission,
        activeMerchants: merchants.length,
        successRate: transactions.length > 0 ? Math.round((successful.length / transactions.length) * 100) : 0,
        recentTransactions: transactions.slice(0, 10),
        topCountries,
        monthlyRevenue: monthlyData
      });
    } catch (e) {
      console.error('Erreur stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status) => {
    const config = {
      completed: 'bg-emerald-50 text-emerald-700',
      pending: 'bg-amber-50 text-amber-700',
      failed: 'bg-red-50 text-red-700'
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config[status] || 'bg-gray-100 text-gray-600'}`}>{status === 'completed' ? 'Réussi' : status === 'pending' ? 'En cours' : 'Échoué'}</span>;
  };

  const countryNames = { bj: '🇧🇯 Bénin', ci: '🇨🇮 Côte d\'Ivoire', tg: '🇹🇬 Togo', sn: '🇸🇳 Sénégal', cg: '🇨🇬 Congo', ng: '🇳🇬 Nigeria', gh: '🇬🇭 Ghana', ke: '🇰🇪 Kenya', fr: '🇫🇷 France', gb: '🇬🇧 UK', de: '🇩🇪 Allemagne' };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Passerelle de paiement</h1>
          <p className="text-xs text-gray-500">Vue d'ensemble de votre passerelle</p>
        </div>
        <div className="flex gap-2">
          {['today', 'week', 'month'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period === p ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {p === 'today' ? 'Aujourd\'hui' : p === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: TrendingUp, label: 'Transactions', value: stats.totalTransactions, color: 'bg-blue-50 text-blue-600' },
          { icon: DollarSign, label: 'Commissions', value: `${stats.totalCommission.toLocaleString()} XOF`, color: 'bg-emerald-50 text-emerald-600' },
          { icon: Users, label: 'Marchands', value: stats.activeMerchants, color: 'bg-purple-50 text-purple-600' },
          { icon: Activity, label: 'Taux réussite', value: `${stats.successRate}%`, color: 'bg-amber-50 text-amber-600' }
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`w-8 h-8 ${s.color} rounded-lg flex items-center justify-center mb-2`}><s.icon size={14}/></div>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Transactions récentes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Transactions récentes</h3>
            <Link to="/gateway/transactions" className="text-xs text-gray-500 hover:text-gray-900">Voir tout</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">Aucune transaction</div>
            ) : (
              stats.recentTransactions.slice(0, 8).map(tx => (
                <div key={tx.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.status === 'completed' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                      {tx.status === 'completed' ? <CheckCircle size={14} className="text-emerald-600"/> : <Clock size={14} className="text-amber-600"/>}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{parseFloat(tx.amount || 0).toLocaleString()} {tx.currency || 'XOF'}</p>
                      <p className="text-xs text-gray-500">{tx.country ? countryNames[tx.country] || tx.country : '—'} • {tx.provider}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {statusBadge(tx.status)}
                    <p className="text-xs text-gray-400 mt-0.5">{tx.createdAt ? format(new Date(tx.createdAt), 'dd/MM HH:mm') : '—'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top pays */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Top pays</h3>
          </div>
          <div className="p-4 space-y-2">
            {stats.topCountries.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Aucune donnée</p>
            ) : (
              stats.topCountries.map((c, i) => (
                <div key={c.code} className="flex items-center justify-between">
                  <span className="text-sm">{countryNames[c.code] || c.code}</span>
                  <span className="text-xs text-gray-500">{c.count} transactions</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/gateway/merchants', icon: Users, label: 'Marchands', desc: 'Gérer les comptes' },
          { to: '/gateway/transactions', icon: CreditCard, label: 'Transactions', desc: 'Historique complet' },
          { to: '/gateway/providers', icon: Globe, label: 'Providers', desc: 'Configurer les API' },
          { to: '/gateway/settings', icon: BarChart3, label: 'Paramètres', desc: 'Commission, frais' }
        ].map((a, i) => (
          <Link key={i} to={a.to} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mb-2"><a.icon size={14} className="text-gray-600"/></div>
            <h3 className="text-xs font-semibold text-gray-900">{a.label}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}