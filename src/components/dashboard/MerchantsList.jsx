import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Search, Plus, Copy, Trash2, CheckCircle, XCircle, Key, Eye, EyeOff, Mail, Globe, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function MerchantsList() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showKey, setShowKey] = useState({});
  const [formData, setFormData] = useState({
    name: '', email: '', website: '', country: 'bj', commission: 1
  });

  const generateApiKey = () => 'gw_' + Array.from({ length: 48 }, () => Math.random().toString(36)[2]).join('');

  useEffect(() => { loadMerchants(); }, []);

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
        ...formData, apiKey, balance: 0, totalTransactions: 0, active: true, createdAt: new Date().toISOString()
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
    toast.success(active ? 'Désactivé' : 'Activé');
  };

  const copyKey = (key) => { navigator.clipboard.writeText(key); toast.success('Clé copiée !'); };
  const toggleShowKey = (id) => setShowKey(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = merchants.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Marchands</h1>
          <p className="text-xs text-gray-500">{merchants.length} marchand{merchants.length > 1 ? 's' : ''} enregistré{merchants.length > 1 ? 's' : ''}</p>
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

      <div className="space-y-2">
        {filtered.map(m => (
          <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.active ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                    {m.active ? <CheckCircle size={14} className="text-emerald-600"/> : <XCircle size={14} className="text-gray-400"/>}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{m.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail size={11} /> {m.email}
                      {m.website && <><Globe size={11} /> {m.website}</>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 ml-11">
                  <span>Solde: <strong className="text-gray-900">{(m.balance || 0).toLocaleString()} XOF</strong></span>
                  <span>{m.totalTransactions || 0} transactions</span>
                  <span>Commission: {m.commission || 1}%</span>
                </div>
                <div className="flex items-center gap-2 mt-2 ml-11">
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-600">
                    {showKey[m.id] ? m.apiKey : m.apiKey?.substring(0, 16) + '...'}
                  </code>
                  <button onClick={() => toggleShowKey(m.id)} className="text-gray-400 hover:text-gray-600"><Eye size={12}/></button>
                  <button onClick={() => copyKey(m.apiKey)} className="text-gray-400 hover:text-gray-600"><Copy size={12}/></button>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleToggleActive(m.id, m.active)}
                  className={`p-1.5 rounded-lg text-xs font-medium ${m.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                  {m.active ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Ajouter un marchand</h3>
            <form onSubmit={handleAddMerchant} className="space-y-3">
              <div><label className="text-xs text-gray-500 uppercase mb-1 block">Nom *</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required/></div>
              <div><label className="text-xs text-gray-500 uppercase mb-1 block">Email *</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required/></div>
              <div><label className="text-xs text-gray-500 uppercase mb-1 block">Site web</label><input type="url" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="https://..."/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 uppercase mb-1 block">Pays</label><select value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">{['bj','ci','tg','sn','cg','ng','gh','ke','fr','gb','de'].map(c=><option key={c} value={c}>{c.toUpperCase()}</option>)}</select></div>
                <div><label className="text-xs text-gray-500 uppercase mb-1 block">Commission %</label><input type="number" value={formData.commission} onChange={e => setFormData({...formData, commission: parseFloat(e.target.value)||0})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" min="0" max="10" step="0.5"/></div>
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium">Créer le marchand</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}