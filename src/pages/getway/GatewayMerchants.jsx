import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Search, Plus, Copy, Trash2, CheckCircle, XCircle, Key, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function GatewayMerchants() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showKey, setShowKey] = useState({});
  const [formData, setFormData] = useState({
    name: '', email: '', website: '', country: 'bj', commission: 1
  });

  const generateApiKey = () => 'gw_' + Array.from({ length: 48 }, () => Math.random().toString(36)[2]).join('');

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    const snap = await getDocs(collection(db, 'gateway_merchants'));
    setMerchants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const handleAddMerchant = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) { toast.error('Nom et email requis'); return; }
    try {
      const apiKey = generateApiKey();
      await addDoc(collection(db, 'gateway_merchants'), {
        ...formData,
        apiKey,
        balance: 0,
        totalTransactions: 0,
        active: true,
        createdAt: new Date().toISOString()
      });
      toast.success('Marchand créé !');
      setShowAddModal(false);
      setFormData({ name: '', email: '', website: '', country: 'bj', commission: 1 });
      loadMerchants();
    } catch { toast.error('Erreur'); }
  };

  const handleToggleActive = async (id, active) => {
    await updateDoc(doc(db, 'gateway_merchants', id), { active: !active });
    loadMerchants();
    toast.success(active ? 'Marchand désactivé' : 'Marchand activé');
  };

  const toggleShowKey = (id) => setShowKey(prev => ({ ...prev, [id]: !prev[id] }));

  const copyKey = (key) => { navigator.clipboard.writeText(key); toast.success('Clé copiée !'); };

  const filtered = merchants.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Marchands</h1>
          <p className="text-xs text-gray-500">{merchants.length} marchand{merchants.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs"/>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
          <div className="col-span-3">Marchand</div>
          <div className="col-span-2">Pays</div>
          <div className="col-span-2">Solde</div>
          <div className="col-span-2">Transactions</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        {filtered.map(m => (
          <div key={m.id} className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-50 items-center">
            <div className="col-span-3">
              <p className="text-sm font-medium text-gray-900">{m.name}</p>
              <p className="text-xs text-gray-500">{m.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                  {showKey[m.id] ? m.apiKey : m.apiKey?.substring(0, 12) + '...'}
                </code>
                <button onClick={() => toggleShowKey(m.id)} className="text-gray-400 hover:text-gray-600"><Eye size={11}/></button>
                <button onClick={() => copyKey(m.apiKey)} className="text-gray-400 hover:text-gray-600"><Copy size={11}/></button>
              </div>
            </div>
            <div className="col-span-2 text-sm">{m.country?.toUpperCase()}</div>
            <div className="col-span-2 text-sm font-bold">{(m.balance || 0).toLocaleString()} XOF</div>
            <div className="col-span-2 text-sm">{m.totalTransactions || 0}</div>
            <div className="col-span-3 flex justify-end gap-1">
              <button onClick={() => handleToggleActive(m.id, m.active)} className={`p-1.5 rounded-lg ${m.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-600 hover:bg-red-50'}`}>
                {m.active ? <CheckCircle size={14}/> : <XCircle size={14}/>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal ajout */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Ajouter un marchand</h3>
            <form onSubmit={handleAddMerchant} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Nom</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required/>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required/>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Site web</label>
                <input type="url" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="https://..."/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Pays</label>
                  <select value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    {['bj','ci','tg','sn','cg','ng','gh','ke','fr','gb','de'].map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase mb-1 block">Commission %</label>
                  <input type="number" value={formData.commission} onChange={e => setFormData({...formData, commission: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" min="0" max="10" step="0.5"/>
                </div>
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium">Créer le marchand</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}