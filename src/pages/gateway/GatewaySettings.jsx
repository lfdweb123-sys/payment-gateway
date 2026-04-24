import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Settings, Save, Loader, DollarSign, Globe, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GatewaySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    defaultCommission: 1,
    minPayout: 5000,
    maxTransactionLimit: 50000000,
    autoApprovePayouts: false,
    autoApproveMaxAmount: 50000,
    notificationEmail: '',
    maintenanceMode: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const snap = await getDoc(doc(db, 'gateway_settings', 'config'));
      if (snap.exists()) {
        setSettings(prev => ({ ...prev, ...snap.data() }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'gateway_settings', 'config'), {
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Paramètres enregistrés');
    } catch { toast.error('Erreur'); }
    finally { setSaving(false); }
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-gray-900 outline-none";
  const labelClass = "block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5";

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Paramètres de la passerelle</h1>
        <p className="text-xs text-gray-500">Configuration générale</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        {/* Commission */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} className="text-gray-700"/>
            <h3 className="text-sm font-semibold text-gray-900">Commission</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Commission par défaut (%)</label>
              <input type="number" value={settings.defaultCommission} onChange={e => setSettings({...settings, defaultCommission: parseFloat(e.target.value) || 0})} className={inputClass} min="0" max="10" step="0.1"/>
            </div>
            <div>
              <label className={labelClass}>Seuil minimum de retrait (XOF)</label>
              <input type="number" value={settings.minPayout} onChange={e => setSettings({...settings, minPayout: parseInt(e.target.value) || 0})} className={inputClass} min="1000"/>
            </div>
          </div>
        </div>

        {/* Limites */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-gray-700"/>
            <h3 className="text-sm font-semibold text-gray-900">Sécurité et limites</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Montant max par transaction (XOF)</label>
              <input type="number" value={settings.maxTransactionLimit} onChange={e => setSettings({...settings, maxTransactionLimit: parseInt(e.target.value) || 0})} className={inputClass}/>
            </div>
            <div>
              <label className={labelClass}>Email notifications</label>
              <input type="email" value={settings.notificationEmail} onChange={e => setSettings({...settings, notificationEmail: e.target.value})} className={inputClass} placeholder="admin@example.com"/>
            </div>
          </div>
        </div>

        {/* Auto */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={16} className="text-gray-700"/>
            <h3 className="text-sm font-semibold text-gray-900">Automatisation</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900">Approbation automatique des retraits</p>
                <p className="text-xs text-gray-500">Les retraits sous le montant max seront approuvés automatiquement</p>
              </div>
              <button onClick={() => setSettings({...settings, autoApprovePayouts: !settings.autoApprovePayouts})}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoApprovePayouts ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.autoApprovePayouts ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {settings.autoApprovePayouts && (
              <div>
                <label className={labelClass}>Montant max auto-approbation (XOF)</label>
                <input type="number" value={settings.autoApproveMaxAmount} onChange={e => setSettings({...settings, autoApproveMaxAmount: parseInt(e.target.value) || 0})} className={inputClass}/>
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900">Mode maintenance</p>
                <p className="text-xs text-gray-500">Désactive temporairement les paiements</p>
              </div>
              <button onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
                className={`relative w-11 h-6 rounded-full transition-colors ${settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.maintenanceMode ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
          {saving ? <Loader className="animate-spin" size={14}/> : <Save size={14}/>} Enregistrer tous les paramètres
        </button>
      </div>
    </div>
  );
}