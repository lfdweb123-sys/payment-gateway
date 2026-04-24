import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, XCircle, Key, Eye, EyeOff, Save, Loader, ExternalLink, X, Info, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MerchantProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState({});
  const [saving, setSaving] = useState(null);
  const [expandedProvider, setExpandedProvider] = useState(null);
  const [methodsModal, setMethodsModal] = useState(null);

  const providerList = [
    { 
      id: 'feexpay', name: 'FeexPay', logo: '🟠', color: 'from-orange-400 to-orange-600',
      keys: ['FEEXPAY_TOKEN', 'FEEXPAY_SHOP_ID'],
      website: 'https://feexpay.me',
      countries: 5,
      methods: ['MTN Mobile Money', 'Moov Money', 'CELTIIS Money'],
      desc: 'Bénin, Togo, Côte d\'Ivoire, Sénégal, Congo'
    },
    { 
      id: 'stripe', name: 'Stripe', logo: '💜', color: 'from-purple-400 to-purple-600',
      keys: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLIC_KEY'],
      website: 'https://stripe.com',
      countries: 35,
      methods: ['Carte Bancaire', 'Apple Pay', 'Google Pay', 'iDEAL', 'Giropay'],
      desc: 'Europe, USA, Canada'
    },
    { 
      id: 'paystack', name: 'Paystack', logo: '🟢', color: 'from-green-400 to-green-600',
      keys: ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY'],
      website: 'https://paystack.com',
      countries: 4,
      methods: ['Carte Bancaire', 'Virement Bancaire', 'USSD', 'QR Code'],
      desc: 'Nigeria, Ghana, Kenya, Afrique du Sud'
    },
    { 
      id: 'flutterwave', name: 'Flutterwave', logo: '🟡', color: 'from-yellow-400 to-yellow-600',
      keys: ['FLW_SECRET_KEY', 'FLW_PUBLIC_KEY'],
      website: 'https://flutterwave.com',
      countries: 15,
      methods: ['Carte Bancaire', 'Mobile Money', 'USSD', 'Bank Transfer'],
      desc: '15 pays africains'
    },
    { 
      id: 'kkiapay', name: 'KKiaPay', logo: '🔵', color: 'from-blue-400 to-blue-600',
      keys: ['KKIAPAY_PUBLIC_KEY', 'KKIAPAY_PRIVATE_KEY', 'KKIAPAY_SECRET_KEY'],
      website: 'https://kkiapay.me',
      countries: 9,
      methods: ['MTN Mobile Money', 'Moov Money', 'Orange Money', 'Wave', 'Carte Bancaire'],
      desc: 'UEMOA + CEMAC'
    },
    { 
      id: 'fedapay', name: 'FedaPay', logo: '🟣', color: 'from-indigo-400 to-indigo-600',
      keys: ['FEDAPAY_SECRET_KEY', 'FEDAPAY_PUBLIC_KEY'],
      website: 'https://fedapay.com',
      countries: 10,
      methods: ['Mobile Money', 'Carte Bancaire'],
      desc: '10 pays Afrique'
    },
    { 
      id: 'paydunya', name: 'PayDunya', logo: '🟤', color: 'from-amber-400 to-amber-600',
      keys: ['PAYDUNYA_MASTER_KEY', 'PAYDUNYA_PRIVATE_KEY'],
      website: 'https://paydunya.com',
      countries: 8,
      methods: ['Orange Money', 'Free Money', 'Wave', 'MTN Mobile Money', 'Carte Bancaire'],
      desc: 'Sénégal, Côte d\'Ivoire, Bénin, Togo'
    },
    { 
      id: 'cinetpay', name: 'CinetPay', logo: '🔴', color: 'from-red-400 to-red-600',
      keys: ['CINETPAY_API_KEY', 'CINETPAY_SITE_ID', 'CINETPAY_SECRET_KEY'],
      website: 'https://cinetpay.com',
      countries: 11,
      methods: ['MTN Mobile Money', 'Moov Money', 'Orange Money', 'Wave', 'Carte Bancaire'],
      desc: '11 pays Afrique'
    },
    { 
      id: 'lygos', name: 'Lygos', logo: '⚫', color: 'from-gray-400 to-gray-600',
      keys: ['LYGOS_API_KEY', 'LYGOS_SECRET_KEY'],
      website: 'https://lygosapp.com',
      countries: 13,
      methods: ['Mobile Money', 'Carte Bancaire'],
      desc: '13 pays Afrique'
    },
    { 
      id: 'paypal', name: 'PayPal', logo: '🅿️', color: 'from-blue-500 to-blue-700',
      keys: ['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET_KEY'],
      website: 'https://paypal.com',
      countries: 200,
      methods: ['PayPal', 'Carte Bancaire', 'Venmo'],
      desc: '200+ pays dans le monde'
    },
    { 
      id: 'mbiyopay', name: 'MbiyoPay', logo: '📱', color: 'from-teal-400 to-teal-600',
      keys: ['MBIYOPAY_API_KEY'],
      website: 'https://mbiyopay.com',
      countries: 11,
      methods: ['Mobile Money'],
      desc: '11 pays Afrique'
    },
    { 
      id: 'qosic', name: 'Qosic', logo: '💚', color: 'from-emerald-400 to-emerald-600',
      keys: ['QOSIC_API_KEY', 'QOSIC_MERCHANT_ID'],
      website: 'https://qosic.com',
      countries: 13,
      methods: ['Mobile Money'],
      desc: '13 pays Afrique'
    },
    { 
      id: 'bizao', name: 'Bizao', logo: '💙', color: 'from-cyan-400 to-cyan-600',
      keys: ['BIZAO_API_KEY', 'BIZAO_MERCHANT_ID'],
      website: 'https://bizao.com',
      countries: 11,
      methods: ['Mobile Money'],
      desc: '11 pays Afrique'
    },
    { 
      id: 'hub2', name: 'Hub2', logo: '🧡', color: 'from-orange-300 to-orange-500',
      keys: ['HUB2_API_KEY'],
      website: 'https://hub2.io',
      countries: 10,
      methods: ['Mobile Money', 'Carte Bancaire', 'Wave'],
      desc: '10 pays Afrique'
    },
    { 
      id: 'chipper', name: 'Chipper Cash', logo: '💜', color: 'from-violet-400 to-violet-600',
      keys: ['CHIPPER_API_KEY'],
      website: 'https://chippercash.com',
      countries: 9,
      methods: ['Chipper Wallet', 'Mobile Money', 'Carte Bancaire'],
      desc: 'Afrique anglophone + USA/UK'
    }
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
      setExpandedProvider(null);
    } catch { toast.error('Erreur'); }
    finally { setSaving(null); }
  };

  const handleToggle = async (providerId) => {
    const provider = providers.find(p => p.id === providerId);
    const newActive = !provider.active;
    
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, active: newActive } : p));

    // Sauvegarder immédiatement
    try {
      const snap = await getDoc(doc(db, 'gateway_merchants', user.uid));
      const merchantData = snap.exists() ? snap.data() : {};
      const currentProviders = merchantData.providers || {};

      if (!currentProviders[providerId]) {
        currentProviders[providerId] = { active: newActive };
      } else {
        currentProviders[providerId].active = newActive;
      }

      await setDoc(doc(db, 'gateway_merchants', user.uid), {
        providers: currentProviders,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast.success(newActive ? `${provider.name} activé` : `${provider.name} désactivé`);
    } catch { 
      setProviders(prev => prev.map(p => p.id === providerId ? { ...p, active: !newActive } : p));
      toast.error('Erreur'); 
    }
  };

  const handleKeyChange = (providerId, keyName, value) => {
    setProviders(prev => prev.map(p => {
      if (p.id !== providerId) return p;
      return { ...p, keys: p.keys.map(k => k.name === keyName ? { ...k, value } : k) };
    }));
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const activeCount = providers.filter(p => p.active).length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Providers de paiement</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeCount}/15 configurés • Activez les providers et ajoutez vos clés API
          </p>
        </div>
      </div>

      {/* Alerte info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Comment ça marche ?</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Créez un compte chez le provider de votre choix, récupérez vos clés API, puis activez-les ici. 
            Vos clients verront uniquement les méthodes de paiement, pas le nom du provider.
          </p>
        </div>
      </div>

      {/* Grille des providers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map(provider => (
          <div key={provider.id} 
            className={`bg-white rounded-2xl border transition-all overflow-hidden ${
              provider.active ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-75'
            }`}>
            
            {/* En-tête du cadre */}
            <div className={`bg-gradient-to-r ${provider.color} p-4 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.logo}</span>
                  <div>
                    <h3 className="font-bold text-sm">{provider.name}</h3>
                    <p className="text-xs text-white/80">{provider.countries} pays</p>
                  </div>
                </div>
                <button onClick={() => handleToggle(provider.id)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${provider.active ? 'bg-white' : 'bg-white/30'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-transform ${
                    provider.active ? 'translate-x-5 bg-orange-500' : 'left-0.5 bg-white'
                  }`} />
                </button>
              </div>
              <p className="text-xs text-white/70 mt-2">{provider.desc}</p>
            </div>

            {/* Contenu */}
            <div className="p-4 space-y-3">
              {/* Boutons */}
              <div className="flex gap-2">
                <button onClick={() => setMethodsModal(provider)}
                  className="flex-1 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1">
                  <Info size={12} /> Méthodes ({provider.methods.length})
                </button>
                <a href={provider.website} target="_blank" rel="noopener noreferrer"
                  className="flex-1 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1">
                  <Globe size={12} /> Site web <ExternalLink size={10} />
                </a>
              </div>

              {/* Configuration */}
              {provider.active && (
                <>
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    {provider.keys.map(key => (
                      <div key={key.name}>
                        <label className="text-xs text-gray-500 mb-0.5 block">{key.name}</label>
                        <div className="relative">
                          <input
                            type={showKeys[`${provider.id}-${key.name}`] ? 'text' : 'password'}
                            value={key.value}
                            onChange={e => handleKeyChange(provider.id, key.name, e.target.value)}
                            className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-orange-500 outline-none"
                            placeholder={`Votre ${key.name}`}
                          />
                          <button onClick={() => setShowKeys(prev => ({ ...prev, [`${provider.id}-${key.name}`]: !prev[`${provider.id}-${key.name}`] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showKeys[`${provider.id}-${key.name}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handleSave(provider.id)} disabled={saving === provider.id}
                    className="w-full bg-orange-500 text-white py-2.5 rounded-lg text-xs font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {saving === provider.id ? <Loader className="animate-spin" size={12} /> : <Save size={12} />}
                    Enregistrer
                  </button>
                </>
              )}

              {!provider.active && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400 text-center">Activez pour configurer les clés API</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal méthodes de paiement */}
      {methodsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setMethodsModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className={`bg-gradient-to-r ${methodsModal.color} p-5 text-white flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{methodsModal.logo}</span>
                <div>
                  <h3 className="font-bold">{methodsModal.name}</h3>
                  <p className="text-xs text-white/80">{methodsModal.countries} pays • {methodsModal.methods.length} méthodes</p>
                </div>
              </div>
              <button onClick={() => setMethodsModal(null)} className="p-1.5 hover:bg-white/10 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Méthodes de paiement acceptées</h4>
              <div className="grid grid-cols-2 gap-2">
                {methodsModal.methods.map((method, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                    <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{method}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-700 mb-2">{methodsModal.desc}</p>
                <a href={methodsModal.website} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 font-medium">
                  <Globe size={14} /> Visiter le site web <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}