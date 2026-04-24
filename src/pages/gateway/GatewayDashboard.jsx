import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { TrendingUp, DollarSign, CreditCard, Key, Clock, CheckCircle, Plus, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function GatewayDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ balance: 0, totalTransactions: 0, todayTransactions: 0, recentTransactions: [], providersCount: 0 });
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const merchantSnap = await getDoc(doc(db, 'gateway_merchants', user.uid));
      const merchantData = merchantSnap.exists() ? merchantSnap.data() : {};
      setMerchant(merchantData);

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

  const isVerified = merchant?.verificationStatus === 'approved';
  const isPending = merchant?.verificationStatus === 'pending';
  const isRejected = merchant?.verificationStatus === 'rejected';

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Bannière vérification */}
      {!isVerified && (
        <div className={`rounded-2xl p-5 sm:p-6 ${isPending ? 'bg-amber-50 border border-amber-200' : isRejected ? 'bg-red-50 border border-red-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPending ? 'bg-amber-100' : 'bg-red-100'}`}>
              {isPending ? <Clock size={20} className="text-amber-600"/> : <AlertTriangle size={20} className="text-red-600"/>}
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-gray-900">
                {isPending ? 'Vérification en cours' : isRejected ? 'Vérification refusée' : 'Compte non vérifié'}
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {isPending 
                  ? 'Vos documents sont en cours d\'examen. Vous recevrez une notification une fois validé. Délai : 24 à 48h.'
                  : isRejected
                    ? 'Vos documents n\'ont pas été acceptés. Veuillez soumettre à nouveau.'
                    : 'Vous devez faire vérifier votre identité pour activer votre compte et accepter les paiements.'}
              </p>
            </div>
            <Link to="/verification" className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
              isPending ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}>
              {isPending ? 'Voir le statut' : isRejected ? 'Réessayer' : 'Vérifier mon compte'}
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500">Bienvenue, {user?.displayName || user?.email}</p>
        </div>
        {isVerified && (
          <Link to="/providers" className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5">
            <Key size={14} /> Providers ({stats.providersCount})
          </Link>
        )}
      </div>

      {/* Stats - grisées si non vérifié */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 ${!isVerified ? 'opacity-50 pointer-events-none select-none' : ''}`}>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
            <DollarSign size={20} className="text-emerald-600" />
          </div>
          <p className="text-sm text-gray-500">Solde</p>
          <p className="text-xl font-bold text-gray-900">{isVerified ? stats.balance.toLocaleString() : '0'} XOF</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <CreditCard size={20} className="text-blue-600" />
          </div>
          <p className="text-sm text-gray-500">Transactions</p>
          <p className="text-xl font-bold text-gray-900">{isVerified ? stats.totalTransactions : '0'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-orange-600" />
          </div>
          <p className="text-sm text-gray-500">Aujourd'hui</p>
          <p className="text-xl font-bold text-gray-900">{isVerified ? stats.todayTransactions : '0'}</p>
        </div>
      </div>

      {/* Transactions récentes */}
      <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${!isVerified ? 'opacity-50 pointer-events-none select-none' : ''}`}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Transactions récentes</h3>
          {isVerified && <Link to="/transactions" className="text-xs text-orange-500 hover:text-orange-600">Voir tout</Link>}
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
      {isVerified && stats.providersCount === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
          <h3 className="text-lg font-bold text-orange-900 mb-2">Configurez vos moyens de paiement</h3>
          <p className="text-sm text-orange-700 mb-4">Ajoutez vos clés API pour commencer à accepter les paiements.</p>
          <Link to="/providers" className="bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-orange-600 inline-flex items-center gap-2">
            <Plus size={16} /> Configurer mes providers
          </Link>
        </div>
      )}

      {/* Bannière vérification si pas fait */}
      {!isVerified && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <Shield size={40} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Vérification requise</h3>
          <p className="text-sm text-gray-500 mb-4">Faites vérifier votre identité pour débloquer toutes les fonctionnalités.</p>
          <Link to="/verification" className="bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-orange-600 inline-flex items-center gap-2">
            <Shield size={16} /> Vérifier mon compte
          </Link>
        </div>
      )}
    </div>
  );
}