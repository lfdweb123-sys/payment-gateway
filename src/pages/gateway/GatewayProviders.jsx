import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Shield, CheckCircle, XCircle, Settings, Key, Eye, EyeOff, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GatewayProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState({});
  const [saving, setSaving] = useState(null);

  const providerList = [
    { id: 'feexpay', name: 'FeexPay', keys: ['FEEXPAY_TOKEN', 'FEEXPAY_SHOP_ID'] },
    { id: 'stripe', name: 'Stripe', keys: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLIC_KEY'] },
    { id: 'paystack', name: 'Paystack', keys: ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY'] },
    { id: 'flutterwave', name: 'Flutterwave', keys: ['FLW_SECRET_KEY', 'FLW_PUBLIC_KEY'] },
    { id: 'kkiapay', name: 'KKiaPay', keys: ['KKIAPAY_PUBLIC_KEY', 'KKIAPAY_PRIVATE_KEY', 'KKIAPAY_SECRET_KEY'] },
    { id: 'fedapay', name: 'FedaPay', keys: ['FEDAPAY_SECRET_KEY', 'FEDAPAY_PUBLIC_KEY'] },
    { id: 'paydunya', name: 'PayDunya', keys: ['PAYDUNYA_MASTER_KEY', 'PAYDUNYA_PRIVATE_KEY'] },
    { id: 'cinetpay', name: 'CinetPay', keys: ['CINETPAY_API_KEY', 'CINETPAY_SITE_ID', 'CINETPAY_SECRET_KEY'] },
    { id: 'lygos', name: 'Lygos', keys: ['LYGOS_API_KEY', 'LYGOS_SECRET_KEY'] },
    { id: 'paypal', name: 'PayPal', keys: ['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET_KEY'] },
    { id: 'mbiyopay', name: 'MbiyoPay', keys: ['MBIYOPAY_API_KEY'] },
    { id: 'qosic', name: 'Qosic', keys: ['QOSIC_API_KEY', 'QOSIC_MERCHANT_ID'] },
    { id: 'bizao', name: 'Bizao', keys: ['BIZAO_API_KEY', 'BIZAO_MERCHANT_ID'] },
    { id: 'hub2', name: 'Hub2', keys: ['HUB2_API_KEY'] },
    { id: 'chipper', name: 'Chipper Cash', keys: ['CHIPPER_API_KEY'] }
  ];

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const snap = await getDocs(collection(db, 'gateway_providers'));
      const data = providerList.map(p => {
        const doc = snap.docs.find(d => d.id === p.id);
        return {
          ...p,
          active: doc?.data()?.active || false,
          keys: p.keys.map(k => ({ name: k, value: doc?.data()?.[k] || '' }))
        };
      });
      setProviders(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async (providerId) => {
    setSaving(providerId);
    const provider = providers.find(p => p.id === providerId);
    try {
      const data = {
        active: provider.active,
        updatedAt: new Date().toISOString()
      };
      provider.keys.forEach(k => { data[k.name] = k.value; });
      
      await setDoc(doc(db, 'gateway_providers', providerId), data, { merge: true });
      toast.success(`${provider.name} enregistré`);
    } catch { toast.error('Erreur'); }
    finally { setSaving(null); }
  };

  const handleToggle = (providerId) => {
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, active: !p.active } : p));
  };

  const handleKeyChange = (providerId, keyName, value) => {
    setProviders(prev => prev.map(p => {
      if (p.id !== providerId) return p;
      return {
        ...p,
        keys: p.keys.map(k => k.name === keyName ? { ...k, value } : k)
      };
    }));
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configuration des providers</h1>
        <p className="text-xs text-gray-500">Activez et configurez les APIs de paiement</p>
      </div>

      <div className="space-y-3">
        {providers.map(provider => (
          <div key={provider.id} className={`bg-white rounded-2xl border p-5 transition-all ${provider.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${provider.active ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  {provider.active ? <CheckCircle size={18} className="text-emerald-600"/> : <XCircle size={18} className="text-gray-400"/>}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{provider.name}</h3>
                  <p className="text-xs text-gray-500">{provider.keys.length} clé{provider.keys.length > 1 ? 's' : ''} API requise{provider.keys.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={() => handleToggle(provider.id)}
                className={`relative w-11 h-6 rounded-full transition-colors ${provider.active ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${provider.active ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {provider.active && (
              <div className="space-y-2 pt-3 border-t border-gray-100">
                {provider.keys.map(key => (
                  <div key={key.name} className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Key size={14} className="text-gray-600"/>
                    </div>
                    <div className="flex-1 relative">
                      <label className="text-xs text-gray-500 uppercase mb-0.5 block">{key.name}</label>
                      <input
                        type={showKeys[`${provider.id}-${key.name}`] ? 'text' : 'password'}
                        value={key.value}
                        onChange={e => handleKeyChange(provider.id, key.name, e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-xs font-mono"
                        placeholder={`Entrez votre ${key.name}`}
                      />
                      <button onClick={() => setShowKeys(prev => ({ ...prev, [`${provider.id}-${key.name}`]: !prev[`${provider.id}-${key.name}`] }))}
                        className="absolute right-2 top-6 text-gray-400 hover:text-gray-600">
                        {showKeys[`${provider.id}-${key.name}`] ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => handleSave(provider.id)} disabled={saving === provider.id}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5">
                  {saving === provider.id ? 'Enregistrement...' : <><Save size={12}/> Enregistrer</>}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}