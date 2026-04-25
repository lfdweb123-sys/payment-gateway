import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { 
  Users, FileText, DollarSign, Shield, Clock, CheckCircle, 
  TrendingUp, Search, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalMerchants: 0,
    verifiedMerchants: 0,
    pendingVerifications: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    totalCommission: 0,
    pendingDocs: [],
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const [merchantsSnap, transactionsSnap] = await Promise.all([
        getDocs(collection(db, 'gateway_merchants')),
        getDocs(collection(db, 'gateway_transactions'))
      ]);

      const merchants = merchantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const transactions = transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const totalCommission = transactions.reduce((s, tx) => s + (parseFloat(tx.commission) || 0), 0);
      const totalRevenue = transactions.reduce((s, tx) => s + (parseFloat(tx.amount) || 0), 0);
      const pendingDocs = merchants.filter(m => m.verificationStatus === 'pending');
      const verifiedMerchants = merchants.filter(m => m.verificationStatus === 'approved');

      setStats({
        totalMerchants: merchants.length,
        verifiedMerchants: verifiedMerchants.length,
        pendingVerifications: pendingDocs.length,
        totalTransactions: transactions.length,
        totalRevenue,
        totalCommission,
        pendingDocs: pendingDocs.slice(0, 5),
        recentTransactions: transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-xs text-gray-500">Vue d'ensemble de la plateforme</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Users, label: 'Marchands', value: stats.totalMerchants, color: 'bg-blue-50 text-blue-600' },
          { icon: CheckCircle, label: 'Vérifiés', value: stats.verifiedMerchants, color: 'bg-emerald-50 text-emerald-600' },
          { icon: Clock, label: 'En attente', value: stats.pendingVerifications, color: 'bg-amber-50 text-amber-600' },
          { icon: FileText, label: 'Transactions', value: stats.totalTransactions, color: 'bg-purple-50 text-purple-600' },
          { icon: DollarSign, label: 'Revenus', value: `${(stats.totalRevenue / 1000000).toFixed(1)}M`, color: 'bg-emerald-50 text-emerald-600' },
          { icon: TrendingUp, label: 'Commissions', value: `${stats.totalCommission.toLocaleString()} XOF`, color: 'bg-orange-50 text-orange-600' }
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`w-8 h-8 ${s.color} rounded-lg flex items-center justify-center mb-2`}><s.icon size={16}/></div>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Vérifications en attente */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">🔍 Vérifications en attente ({stats.pendingVerifications})</h3>
            <Link to="/admin/verifications" className="text-xs text-orange-500 hover:text-orange-600">Tout voir</Link>
          </div>
          {stats.pendingDocs.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">Aucune vérification en attente</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.pendingDocs.map(m => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 text-xs font-bold">{m.name?.charAt(0) || '?'}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.name || m.email}</p>
                      <p className="text-xs text-gray-500">{m.verificationData?.documentType || 'Document'}</p>
                    </div>
                  </div>
                  <Link to="/admin/verifications" className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg">Examiner</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dernières transactions */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Dernières transactions</h3>
          </div>
          {stats.recentTransactions.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">Aucune transaction</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.recentTransactions.map(tx => (
                <div key={tx.id} className="px-5 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{parseFloat(tx.amount || 0).toLocaleString()} XOF</p>
                    <p className="text-xs text-gray-500">Com: {parseFloat(tx.commission || 0).toLocaleString()} XOF</p>
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
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/admin/merchants', icon: Users, label: 'Marchands', desc: 'Gérer les comptes' },
          { to: '/admin/verifications', icon: Shield, label: 'Vérifications', desc: 'Valider les documents' },
          { to: '/admin/transactions', icon: FileText, label: 'Transactions', desc: 'Historique complet' },
          { to: '/admin/commissions', icon: DollarSign, label: 'Commissions', desc: 'Revenus plateforme' }
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