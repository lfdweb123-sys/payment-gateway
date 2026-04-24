import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, XCircle, Key, Eye, EyeOff, Save, Loader, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MerchantProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState({});
  const [saving, setSaving] = useState(null);

  const providerList = [
    { id: 'feexpay', name: 'FeexPay', logo: '🟠', keys: ['FEEXPAY_TOKEN', 'FEEXPAY_SHOP_ID'], desc: 'Mobile Money Bénin, Togo, Côte d\'Ivoire, Sénégal, Congo' },
    { id: 'stripe', name: 'Stripe', logo: '💜', keys: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLIC_KEY'], desc: 'Cartes bancaires Europe, USA, Canada' },
    { id: 'paystack', name: 'Paystack', logo: '🟢', keys: ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY'], desc: 'Nigeria, Ghana, Kenya, Afrique du Sud' },
    { id: 'flutterwave', name: 'Flutterwave', logo: '🟡', keys: ['FLW_SECRET_KEY', 'FLW_PUBLIC_KEY'], desc: '15 pays africains' },
    { id: 'kkiapay', name: 'KKiaPay', logo: '🔵', keys: ['KKIAPAY_PUBLIC_KEY', 'KKIAPAY_PRIVATE_KEY', 'KKIAPAY_SECRET_KEY'], desc: 'UEMOA + CEMAC' },
    { id: 'fedapay', name: 'FedaPay', logo: '🟣', keys: ['FEDAPAY_SECRET_KEY', 'FEDAPAY_PUBLIC_KEY'], desc: '10 pays Afrique' },
    { id: 'paydunya', name: 'PayDunya', logo: '🟤', keys: ['PAYDUNYA_MASTER_KEY', 'PAYDUNYA_PRIVATE_KEY'], desc: 'Sénégal, Côte d\'Ivoire, Bénin, Togo' },
    { id: 'cinetpay', name: 'CinetPay', logo: '🔴', keys: ['CINETPAY_API_KEY', 'CINETPAY_SITE_ID', 'CINETPAY_SECRET_KEY'], desc: '11 pays Afrique' },
    { id: 'lygos', name: 'Lygos', logo: '⚫', keys: ['LYGOS_API_KEY', 'LYGOS_SECRET_KEY'], desc: '13 pays Afrique' },
    { id: 'paypal', name: 'PayPal', logo: '🅿️', keys: ['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET_KEY'], desc: '200+ pays dans le monde' },
    { id: 'mbiyopay', name: 'MbiyoPay', logo: '📱', keys: ['MBIYOPAY_API_KEY'], desc: '11 pays Afrique' },
    { id: 'qosic', name: 'Qosic', logo: '💚', keys: ['QOSIC_API_KEY', 'QOSIC_MERCHANT_ID'], desc: '13 pays Afrique' },
    { id: 'bizao', name: 'Bizao', logo: '💙', keys: ['BIZAO_API_KEY', 'BIZAO_MERCHANT_ID'], desc: '11 pays Afrique' },
    { id: 'hub2', name: 'Hub2', logo: '🧡', keys: ['HUB2_API_KEY'], desc: '10 pays Afrique' },
    { id: 'chipper', name: 'Chipper Cash', logo: '💜', keys: ['CHIPPER_API_KEY'], desc: 'Afrique anglophone + USA/UK' }
  ];

  useEffect(() => {
    loadMerchantProviders();
  }, []);

  const loadMerchantProviders = async () => {
    try {
      const snap = await getDoc(doc(db, 'gateway_merchants', user.uid));
      const merchantData = snap.exists() ? snap.data() : {};
      const savedProviders = merchantData.providers || {};

      const data = providerList.map(p => ({
        ...p,
        active: savedProviders[p.id]?.active || false,
        keys: p.keys.map(k => ({ name: k, value: savedProviders[p.id]?.[k] || '' }))
      }));
      setProviders(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async (providerId) => {
    setSaving(providerId);
    const provider = providers.find(p => p.id === providerId);
    try {
      const snap = await getDoc(doc(db, 'gateway_merchants', user.uid));
      const merchantData = snap.exists() ? snap.data() : {};
      const currentProviders = merchantData.providers || {};

      const providerData = { active: provider.active };
      provider.keys.forEach(k => { providerData[k.name] = k.value; });

      currentProviders[providerId] = providerData;

      await setDoc(doc(db, 'gateway_merchants', user.uid), {
        providers: currentProviders,
        updatedAt: new Date().toISOString()
      }, { merge: true });

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
      return { ...p, keys: p.keys.map(k => k.name === keyName ? { ...k, value } : k) };
    }));
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  const activeCount = providers.filter(p => p.active).length;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Configuration des paiements</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {activeCount}/15 providers actifs • Ajoutez vos clés API pour activer les moyens de paiement
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        💡 Vous devez créer un compte chez chaque provider pour obtenir vos clés API. Les clients verront uniquement les méthodes de paiement, pas le nom du provider.
      </div>

      <div className="space-y-3">
        {providers.map(provider => (
          <div key={provider.id} className={`bg-white rounded-2xl border p-5 transition-all ${provider.active ? 'border-gray-200' : 'opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{provider.logo}</span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{provider.name}</h3>
                  <p className="text-xs text-gray-500">{provider.desc}</p>
                </div>
              </div>
              <button onClick={() => handleToggle(provider.id)}
                className={`relative w-11 h-6 rounded-full transition-colors ${provider.active ? 'bg-orange-500' : 'bg-gray-200'}`}>
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
                      <input
                        type={showKeys[`${provider.id}-${key.name}`] ? 'text' : 'password'}
                        value={key.value}
                        onChange={e => handleKeyChange(provider.id, key.name, e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-xs font-mono"
                        placeholder={`Votre ${key.name}`}
                      />
                      <button onClick={() => setShowKeys(prev => ({ ...prev, [`${provider.id}-${key.name}`]: !prev[`${provider.id}-${key.name}`] }))}
                        className="absolute right-2 top-6 text-gray-400 hover:text-gray-600">
                        {showKeys[`${provider.id}-${key.name}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => handleSave(provider.id)} disabled={saving === provider.id}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1.5">
                  {saving === provider.id ? <Loader className="animate-spin" size={12} /> : <Save size={12} />}
                  Enregistrer
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}