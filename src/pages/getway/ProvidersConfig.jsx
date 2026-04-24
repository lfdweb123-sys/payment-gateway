import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { CheckCircle, XCircle, Key, Eye, EyeOff, Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProvidersConfig() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState({});
  const [saving, setSaving] = useState(null);

  const providerList = [
    { id: 'feexpay', name: 'FeexPay', logo: '🟠', keys: ['FEEXPAY_TOKEN', 'FEEXPAY_SHOP_ID'], countries: 5 },
    { id: 'stripe', name: 'Stripe', logo: '💜', keys: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLIC_KEY'], countries: 35 },
    { id: 'paystack', name: 'Paystack', logo: '🟢', keys: ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY'], countries: 4 },
    { id: 'flutterwave', name: 'Flutterwave', logo: '🟡', keys: ['FLW_SECRET_KEY', 'FLW_PUBLIC_KEY'], countries: 15 },
    { id: 'kkiapay', name: 'KKiaPay', logo: '🔵', keys: ['KKIAPAY_PUBLIC_KEY', 'KKIAPAY_PRIVATE_KEY', 'KKIAPAY_SECRET_KEY'], countries: 9 },
    { id: 'fedapay', name: 'FedaPay', logo: '🟣', keys: ['FEDAPAY_SECRET_KEY', 'FEDAPAY_PUBLIC_KEY'], countries: 10 },
    { id: 'paydunya', name: 'PayDunya', logo: '🟤', keys: ['PAYDUNYA_MASTER_KEY', 'PAYDUNYA_PRIVATE_KEY'], countries: 8 },
    { id: 'cinetpay', name: 'CinetPay', logo: '🔴', keys: ['CINETPAY_API_KEY', 'CINETPAY_SITE_ID', 'CINETPAY_SECRET_KEY'], countries: 11 },
    { id: 'lygos', name: 'Lygos', logo: '⚫', keys: ['LYGOS_API_KEY', 'LYGOS_SECRET_KEY'], countries: 13 },
    { id: 'paypal', name: 'PayPal', logo: '🅿️', keys: ['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET_KEY'], countries: 200 },
    { id: 'mbiyopay', name: 'MbiyoPay', logo: '📱', keys: ['MBIYOPAY_API_KEY'], countries: 11 },
    { id: 'qosic', name: 'Qosic', logo: '💚', keys: ['QOSIC_API_KEY', 'QOSIC_MERCHANT_ID'], countries: 13 },
    { id: 'bizao', name: 'Bizao', logo: '💙', keys: ['BIZAO_API_KEY', 'BIZAO_MERCHANT_ID'], countries: 11 },
    { id: 'hub2', name: 'Hub2', logo: '🧡', keys: ['HUB2_API_KEY'], countries: 10 },
    { id: 'chipper', name: 'Chipper Cash', logo: '💜', keys: ['CHIPPER_API_KEY'], countries: 9 }
  ];

  useEffect(() => { loadProviders(); }, []);

  const loadProviders = async () => {
    try {
      const snap = await getDocs(collection(db, 'gateway_providers'));
      const data = providerList.map(p => {
        const docData = snap.docs.find(d => d.id === p.id)?.data();
        return { ...p, active: docData?.active || false, keys: p.keys.map(k => ({ name: k, value: docData?.[k] || '' })) };
      });
      setProviders(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async (providerId) => {
    setSaving(providerId);
    const provider = providers.find(p => p.id === providerId);
    try {
      const data = { active: provider.active, updatedAt: new Date().toISOString() };
      provider.keys.forEach(k => { data[k.name] = k.value; });
      await setDoc(doc(db, 'gateway_providers', providerId), data, { merge: true });
      toast.success(`${provider.name} enregistré`);
    } catch { toast.error('Erreur'); }
    finally { setSaving(null); }
  };

  const handleToggle = (providerId) => {
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, active: !p.active } : p));
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configuration des providers</h1>
        <p className="text-xs text-gray-500">{providers.filter(p => p.active).length}/{providers.length} providers actifs</p>
      </div>

      <div className="space-y-2">
        {providers.map(provider => (
          <div key={provider.id} className={`bg-white rounded-2xl border p-5 transition-all ${provider.active ? 'border-gray-200' : 'opacity-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{provider.logo}</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{provider.name}</h3>
                  <p className="text-xs text-gray-500">{provider.countries} pays • {provider.keys.length} clé{provider.keys.length > 1 ? 's' : ''}</p>
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
                    <Key size={14} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 relative">
                      <label className="text-xs text-gray-500 mb-0.5 block">{key.name}</label>
                      <input type={showKeys[`${provider.id}-${key.name}`] ? 'text' : 'password'} value={key.value}
                        onChange={e => {
                          setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, keys: p.keys.map(k => k.name === key.name ? { ...k, value: e.target.value } : k) } : p));
                        }}
                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-xs font-mono" placeholder={`${key.name}...`} />
                      <button onClick={() => setShowKeys(prev => ({ ...prev, [`${provider.id}-${key.name}`]: !prev[`${provider.id}-${key.name}`] }))}
                        className="absolute right-2 top-6 text-gray-400 hover:text-gray-600">
                        {showKeys[`${provider.id}-${key.name}`] ? <EyeOff size={14}/> : <Eye size={14}/>}
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => handleSave(provider.id)} disabled={saving === provider.id}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5">
                  {saving === provider.id ? <><Loader className="animate-spin" size={12}/> ...</> : <><Save size={12}/> Enregistrer</>}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}