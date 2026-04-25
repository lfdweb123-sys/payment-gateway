import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Settings, Save, Loader, Palette, Monitor, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GatewaySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    paymentDesign: 'modern',
    primaryColor: '#f97316',
    logo: '',
    companyName: '',
    redirectUrl: '',
    defaultCurrency: 'XOF',
    defaultCountry: 'bj'
  });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'gateway_merchants', 'settings'));
      if (snap.exists()) setSettings(prev => ({ ...prev, ...snap.data() }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'gateway_merchants', 'settings'), { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
      toast.success('Paramètres enregistrés');
    } catch { toast.error('Erreur'); }
    finally { setSaving(false); }
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none";
  const labelClass = "block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5";

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-xs text-gray-500">Personnalisez votre page de paiement</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        {/* Design */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={16} className="text-gray-700"/>
            <h3 className="text-sm font-semibold text-gray-900">Design de la page de paiement</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { id: 'modern', label: 'Moderne', desc: 'Design épuré', color: 'bg-gray-900' },
              { id: 'classic', label: 'Classique', desc: 'Design simple', color: 'bg-blue-600' },
              { id: 'bold', label: 'Audacieux', desc: 'Design coloré', color: 'bg-orange-500' }
            ].map(d => (
              <button key={d.id} onClick={() => setSettings({...settings, paymentDesign: d.id})}
                className={`p-4 rounded-xl border-2 text-left transition-all ${settings.paymentDesign === d.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className={`w-full h-16 ${d.color} rounded-lg mb-2`}/>
                <p className="text-sm font-medium text-gray-900">{d.label}</p>
                <p className="text-xs text-gray-500">{d.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Personnalisation */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Personnalisation</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Couleur principale</label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"/>
                <input type="text" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                  className={inputClass} placeholder="#f97316"/>
              </div>
            </div>
            <div>
              <label className={labelClass}>Nom de l'entreprise</label>
              <input type="text" value={settings.companyName} onChange={e => setSettings({...settings, companyName: e.target.value})}
                className={inputClass} placeholder="Mon entreprise"/>
            </div>
            <div>
              <label className={labelClass}>URL de redirection après paiement</label>
              <input type="url" value={settings.redirectUrl} onChange={e => setSettings({...settings, redirectUrl: e.target.value})}
                className={inputClass} placeholder="https://mon-site.com/merci"/>
            </div>
            <div>
              <label className={labelClass}>Devise par défaut</label>
              <select value={settings.defaultCurrency} onChange={e => setSettings({...settings, defaultCurrency: e.target.value})} className={inputClass}>
                <option value="XOF">XOF - Franc CFA</option>
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - Dollar</option>
              </select>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="bg-orange-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
          {saving ? <Loader className="animate-spin" size={14}/> : <Save size={14}/>} Enregistrer
        </button>
      </div>
    </div>
  );
}