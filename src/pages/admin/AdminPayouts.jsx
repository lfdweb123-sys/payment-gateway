import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { CheckCircle, XCircle, RefreshCw, Settings, Search, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function AdminPayouts() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoMode, setAutoMode] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [payoutSettings, setPayoutSettings] = useState({
    autoApproveMax: 50000,
    minBalance: 1000
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [wSnap, sSnap] = await Promise.all([
        getDocs(query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'gateway_settings'))
      ]);
      setWithdrawals(wSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const configDoc = sSnap.docs.find(d => d.id === 'payouts');
      if (configDoc) {
        const data = configDoc.data();
        setAutoMode(data.autoMode || false);
        setPayoutSettings(prev => ({ ...prev, ...data }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleAutoMode = async () => {
    const newMode = !autoMode;
    setAutoMode(newMode);
    try {
      await setDoc(doc(db, 'gateway_settings', 'payouts'), { autoMode: newMode, updatedAt: new Date().toISOString() }, { merge: true });
      toast.success(newMode ? 'Mode automatique activé' : 'Mode manuel');
    } catch { toast.error('Erreur'); setAutoMode(!newMode); }
  };

  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'gateway_settings', 'payouts'), { ...payoutSettings, updatedAt: new Date().toISOString() }, { merge: true });
      toast.success('Paramètres enregistrés');
    } catch { toast.error('Erreur'); }
  };

  const handleProcessPayout = async (withdrawalId) => {
    setProcessingId(withdrawalId);
    try {
      const res = await fetch('/api/gateway/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Payout envoyé !');
        loadData();
      } else {
        toast.error(data.error || 'Erreur payout');
      }
    } catch { toast.error('Erreur de connexion'); }
    finally { setProcessingId(null); }
  };

  const handleApprove = async (id) => {
    await updateDoc(doc(db, 'withdrawals', id), { status: 'completed', processedAt: new Date().toISOString() });
    loadData();
    toast.success('Retrait marqué effectué');
  };

  const handleReject = async (id) => {
    await updateDoc(doc(db, 'withdrawals', id), { status: 'rejected', processedAt: new Date().toISOString() });
    loadData();
    toast.success('Retrait rejeté');
  };

  const filtered = withdrawals.filter(w => {
    const s = search.toLowerCase();
    const match = !s || (w.name || '').toLowerCase().includes(s) || (w.phone || '').includes(s);
    if (filter === 'all') return match;
    return match && w.status === filter;
  });

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestion des retraits</h1>
          <p className="text-xs text-gray-500">{withdrawals.length} retraits • {pendingCount} en attente</p>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <span className="text-gray-600">Auto</span>
          <button onClick={toggleAutoMode} className={`relative w-11 h-6 rounded-full transition-colors ${autoMode ? 'bg-emerald-600' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoMode ? 'translate-x-5' : ''}`} />
          </button>
        </label>
      </div>

      {/* Paramètres */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Settings size={16}/> Paramètres payout automatique</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Montant max auto (XOF)</label>
            <input type="number" value={payoutSettings.autoApproveMax} onChange={e => setPayoutSettings({...payoutSettings, autoApproveMax: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Solde minimum (XOF)</label>
            <input type="number" value={payoutSettings.minBalance} onChange={e => setPayoutSettings({...payoutSettings, minBalance: parseInt(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={saveSettings} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm w-full">Enregistrer</button>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'pending', 'completed', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            {s === 'all' ? 'Tous' : s === 'pending' ? 'En attente' : s === 'completed' ? 'Effectués' : 'Rejetés'}
          </button>
        ))}
        <div className="flex-1"/>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-40"/>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
          <div className="col-span-3">Bénéficiaire</div>
          <div className="col-span-2">Montant</div>
          <div className="col-span-2">Téléphone</div>
          <div className="col-span-2">Statut</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        {filtered.map(w => (
          <div key={w.id} className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-50 items-center">
            <div className="col-span-3">
              <p className="text-sm font-medium text-gray-900">{w.name || '—'}</p>
              <p className="text-xs text-gray-500">{w.email}</p>
            </div>
            <div className="col-span-2 text-sm font-bold text-gray-900">{parseFloat(w.amount || 0).toLocaleString()} XOF</div>
            <div className="col-span-2 text-sm text-gray-600">{w.phone}</div>
            <div className="col-span-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                w.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : w.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
              }`}>{w.status === 'completed' ? 'Effectué' : w.status === 'pending' ? 'En attente' : 'Rejeté'}</span>
            </div>
            <div className="col-span-3 flex justify-end gap-1">
              {w.payoutRef && (
                <span className="text-xs text-gray-400 mr-2 font-mono">{w.payoutRef?.substring(0, 8)}</span>
              )}
              {w.status === 'pending' && (
                <>
                  <button onClick={() => handleProcessPayout(w.id)} disabled={processingId === w.id}
                    className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" title="Payout via FeexPay">
                    {processingId === w.id ? <Clock className="animate-spin" size={14}/> : <RefreshCw size={14}/>}
                  </button>
                  <button onClick={() => handleApprove(w.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Marquer effectué">
                    <CheckCircle size={14}/>
                  </button>
                  <button onClick={() => handleReject(w.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Rejeter">
                    <XCircle size={14}/>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-400">Aucun retrait</div>
        )}
      </div>
    </div>
  );
}