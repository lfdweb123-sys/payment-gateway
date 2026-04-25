import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Search, CheckCircle, XCircle, Ban, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function AdminMerchants() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadMerchants(); }, []);

  const loadMerchants = async () => {
    const snap = await getDocs(collection(db, 'gateway_merchants'));
    setMerchants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const handleToggleActive = async (id, active) => {
    await updateDoc(doc(db, 'gateway_merchants', id), { active: !active, updatedAt: new Date().toISOString() });
    setMerchants(prev => prev.map(m => m.id === id ? { ...m, active: !active } : m));
    toast.success(active ? 'Marchand désactivé' : 'Marchand activé');
  };

  const filtered = merchants.filter(m => {
    const s = search.toLowerCase();
    const match = !s || (m.name || '').toLowerCase().includes(s) || (m.email || '').toLowerCase().includes(s);
    if (filter === 'all') return match;
    return match && m.verificationStatus === filter;
  });

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Marchands</h1>
        <p className="text-xs text-gray-500">{merchants.length} marchands</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'approved', 'pending', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter===s?'bg-gray-900 text-white':'text-gray-500 hover:bg-gray-100'}`}>
            {s==='all'?'Tous':s==='approved'?'Vérifiés':s==='pending'?'En attente':'Rejetés'}
          </button>
        ))}
        <div className="flex-1"/>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-40"/>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
          <div className="col-span-4">Marchand</div>
          <div className="col-span-2">Statut</div>
          <div className="col-span-2">Solde</div>
          <div className="col-span-2">Inscrit le</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {filtered.map(m => (
          <div key={m.id} className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-50 items-center">
            <div className="col-span-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">{m.name?.charAt(0)||'?'}</div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{m.name||'Sans nom'}</p>
                <p className="text-xs text-gray-500 truncate">{m.email}</p>
              </div>
            </div>
            <div className="col-span-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                m.verificationStatus==='approved'?'bg-emerald-50 text-emerald-700':
                m.verificationStatus==='pending'?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700'
              }`}>{m.verificationStatus||'Non vérifié'}</span>
            </div>
            <div className="col-span-2 text-sm font-bold">{(m.balance||0).toLocaleString()} XOF</div>
            <div className="col-span-2 text-xs text-gray-500">{m.createdAt ? format(new Date(m.createdAt), 'dd/MM/yy') : '—'}</div>
            <div className="col-span-2 flex justify-end gap-1">
              <button onClick={() => handleToggleActive(m.id, m.active)} className={`p-1.5 rounded-lg ${m.active !== false ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-600 hover:bg-red-50'}`}>
                {m.active !== false ? <CheckCircle size={14}/> : <Ban size={14}/>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}