import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Wallet, ArrowDown, Clock, CheckCircle, XCircle, DollarSign, Send, History } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function MerchantPayouts() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [form, setForm] = useState({ amount: '', phone: '', name: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const snap = await getDoc(doc(db, 'gateway_merchants', user.uid));
      if (snap.exists()) {
        setBalance(snap.data().balance || 0);
      }
      const txSnap = await getDocs(query(collection(db, 'withdrawals'), where('merchantId', '==', user.uid), orderBy('createdAt', 'desc'), limit(20)));
      setWithdrawals(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Montant invalide'); return; }
    if (amount < 100) { toast.error('Montant minimum : 100 XOF'); return; }
    if (amount > balance) { toast.error('Solde insuffisant'); return; }
    if (!form.phone) { toast.error('Numéro requis'); return; }

    try {
      await addDoc(collection(db, 'withdrawals'), {
        merchantId: user.uid,
        amount,
        phone: form.phone,
        name: form.name || user?.displayName || '',
        email: user?.email || '',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Demande de retrait envoyée !');
      setShowForm(false);
      setForm({ amount: '', phone: '', name: '' });
      loadData();
    } catch (e) { toast.error('Erreur'); }
  };

  const statusBadge = (status) => {
    const config = {
      completed: { bg: 'bg-emerald-50 text-emerald-700', icon: CheckCircle, label: 'Effectué' },
      pending: { bg: 'bg-amber-50 text-amber-700', icon: Clock, label: 'En attente' },
      rejected: { bg: 'bg-red-50 text-red-700', icon: XCircle, label: 'Rejeté' }
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${c.bg}`}><Icon size={11}/> {c.label}</span>;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Retraits</h1>
          <p className="text-xs text-gray-500">Solde disponible : <strong>{balance.toLocaleString()} XOF</strong></p>
        </div>
        <button onClick={() => setShowForm(true)} disabled={balance < 100}
          className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1.5">
          <Send size={14}/> Demander un retrait
        </button>
      </div>

      {/* Historique */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <History size={16} className="text-gray-500"/>
          <h3 className="text-sm font-semibold text-gray-900">Historique des retraits</h3>
        </div>
        {withdrawals.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Aucun retrait</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {withdrawals.map(w => (
              <div key={w.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">-{parseFloat(w.amount || 0).toLocaleString()} XOF</p>
                  <p className="text-xs text-gray-500">{w.phone}</p>
                </div>
                <div className="text-right">
                  {statusBadge(w.status)}
                  <p className="text-xs text-gray-400 mt-0.5">{w.createdAt ? format(new Date(w.createdAt), 'dd/MM HH:mm') : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal demande */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Demander un retrait</h3>
            <p className="text-sm text-gray-500">Solde disponible : <strong>{balance.toLocaleString()} XOF</strong></p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><label className="text-xs text-gray-500 uppercase mb-1 block">Montant (XOF)</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="5000" min="100" max={balance} required/></div>
              <div><label className="text-xs text-gray-500 uppercase mb-1 block">Numéro Mobile Money</label><input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="22997000000" required/></div>
              <div><label className="text-xs text-gray-500 uppercase mb-1 block">Nom du bénéficiaire</label><input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder={user?.displayName || ''}/></div>
              <button type="submit" className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl hover:bg-orange-600">Confirmer le retrait</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}