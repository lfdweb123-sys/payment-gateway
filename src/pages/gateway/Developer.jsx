import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { 
  Key, Copy, Eye, EyeOff, Plus, Trash2, Save, Loader, 
  Code, Globe, ExternalLink, CheckCircle, XCircle, Info,
  Terminal, Shield, Webhook
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Developer() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [webhooks, setWebhooks] = useState([]);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: '', events: ['payment.completed'] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const snap = await getDoc(doc(db, 'gateway_merchants', user.uid));
      const data = snap.exists() ? snap.data() : {};
      setMerchant(data);
      setApiKey(data.apiKey || '');
      setWebhooks(data.webhooks || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const generateApiKey = () => {
    const key = 'gw_' + Array.from({ length: 48 }, () => Math.random().toString(36)[2]).join('');
    setApiKey(key);
  };

  const handleSaveApiKey = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'gateway_merchants', user.uid), {
        apiKey,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Clé API enregistrée');
    } catch { toast.error('Erreur'); }
    finally { setSaving(false); }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success('Clé API copiée !');
  };

  const handleAddWebhook = async () => {
    if (!webhookForm.url) { toast.error('URL requise'); return; }
    if (!webhookForm.url.startsWith('https://')) { toast.error('L\'URL doit commencer par https://'); return; }

    setSaving(true);
    try {
      const newWebhook = {
        id: 'wh_' + Date.now(),
        url: webhookForm.url,
        events: webhookForm.events,
        active: true,
        createdAt: new Date().toISOString()
      };
      const updated = [...webhooks, newWebhook];
      await setDoc(doc(db, 'gateway_merchants', user.uid), {
        webhooks: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setWebhooks(updated);
      setWebhookForm({ url: '', events: ['payment.completed'] });
      setShowWebhookForm(false);
      toast.success('Webhook ajouté');
    } catch { toast.error('Erreur'); }
    finally { setSaving(false); }
  };

  const handleDeleteWebhook = async (id) => {
    const updated = webhooks.filter(w => w.id !== id);
    await setDoc(doc(db, 'gateway_merchants', user.uid), {
      webhooks: updated,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    setWebhooks(updated);
    toast.success('Webhook supprimé');
  };

  const handleToggleWebhook = async (id) => {
    const updated = webhooks.map(w => w.id === id ? { ...w, active: !w.active } : w);
    await setDoc(doc(db, 'gateway_merchants', user.uid), {
      webhooks: updated,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    setWebhooks(updated);
  };

  const paymentLink = `${window.location.origin}/pay?token=${apiKey}`;

  const availableEvents = [
    { value: 'payment.completed', label: 'Paiement réussi' },
    { value: 'payment.failed', label: 'Paiement échoué' },
    { value: 'payment.pending', label: 'Paiement en attente' },
    { value: 'payment.refunded', label: 'Paiement remboursé' }
  ];

  const curlExample = `curl -X POST ${window.location.origin}/api/gateway/pay \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || 'VOTRE_CLE_API'}" \\
  -d '{"amount":5000,"description":"Test"}'`;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Développeur</h1>
        <p className="text-xs text-gray-500 mt-0.5">Gérez votre clé API et vos webhooks</p>
      </div>

      {/* Section Clé API */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Key size={20} className="text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">Clé API</h2>
          </div>
          <p className="text-sm text-gray-500">
            Cette clé est utilisée pour authentifier toutes vos requêtes API. Gardez-la secrète.
          </p>

          {apiKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-sm text-gray-700 truncate select-all">
                  {showKey ? apiKey : apiKey.substring(0, 28) + '...'}
                </div>
                <button onClick={() => setShowKey(!showKey)} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={copyKey} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">
                  <Copy size={16} />
                </button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                ⚠️ Cette clé ne sera plus visible après avoir quitté cette page. Copiez-la maintenant.
              </div>
            </div>
          ) : (
            <button onClick={generateApiKey}
              className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 flex items-center gap-2">
              <Key size={16} /> Générer ma clé API
            </button>
          )}

          {apiKey && (
            <button onClick={handleSaveApiKey} disabled={saving}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
              {saving ? <Loader className="animate-spin" size={14} /> : <Save size={14} />}
              Enregistrer la clé
            </button>
          )}
        </div>
      </div>

      {/* Exemple d'utilisation */}
      {apiKey && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Terminal size={20} className="text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Test rapide</h2>
            </div>
            <div className="bg-gray-900 text-gray-100 rounded-xl p-4 font-mono text-xs sm:text-sm overflow-x-auto">
              <pre>{curlExample}</pre>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(curlExample); toast.success('Commande copiée !'); }}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5">
              <Copy size={14} /> Copier la commande cURL
            </button>
          </div>
        </div>
      )}

      {/* Lien de paiement direct */}
      {apiKey && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Globe size={20} className="text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Lien de paiement</h2>
            </div>
            <p className="text-sm text-gray-500">
              Utilisez ce lien pour permettre à vos clients de payer directement.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 truncate">
                {paymentLink}
              </code>
              <button onClick={() => { navigator.clipboard.writeText(paymentLink); toast.success('Lien copié !'); }}
                className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Webhooks */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook size={20} className="text-orange-500" />
              <h2 className="text-lg font-bold text-gray-900">Webhooks</h2>
            </div>
            <button onClick={() => setShowWebhookForm(!showWebhookForm)}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-orange-600 flex items-center gap-1.5">
              <Plus size={14} /> Ajouter
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Recevez des notifications en temps réel sur votre serveur quand un paiement est effectué.
          </p>

          {/* Formulaire ajout */}
          {showWebhookForm && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">URL du webhook</label>
                <input type="url" value={webhookForm.url} onChange={e => setWebhookForm({...webhookForm, url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="https://votre-site.com/webhook" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Événements</label>
                <div className="flex flex-wrap gap-2">
                  {availableEvents.map(ev => (
                    <label key={ev.value} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                      webhookForm.events.includes(ev.value) ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-white border border-gray-200 text-gray-600'
                    }`}>
                      <input type="checkbox" checked={webhookForm.events.includes(ev.value)}
                        onChange={() => setWebhookForm({...webhookForm, events: webhookForm.events.includes(ev.value) ? webhookForm.events.filter(e => e !== ev.value) : [...webhookForm.events, ev.value]})}
                        className="hidden" />
                      {ev.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddWebhook} disabled={saving}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Ajout...' : 'Ajouter le webhook'}
                </button>
                <button onClick={() => setShowWebhookForm(false)} className="px-4 py-2 text-xs text-gray-600 hover:text-gray-900">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Liste des webhooks */}
          {webhooks.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400">
              <Webhook size={24} className="mx-auto mb-2 text-gray-300" />
              Aucun webhook configuré
            </div>
          ) : (
            <div className="space-y-2">
              {webhooks.map(w => (
                <div key={w.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${w.active ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-100 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{w.url}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {w.events.map(e => (
                        <span key={e} className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                          {availableEvents.find(ev => ev.value === e)?.label || e}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Créé le {new Date(w.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button onClick={() => handleToggleWebhook(w.id)}
                      className={`p-1.5 rounded-lg ${w.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-200'}`}>
                      {w.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    </button>
                    <button onClick={() => handleDeleteWebhook(w.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Documentation */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Code size={20} className="text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">Comment ça marche ?</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                <span className="text-orange-600 font-bold text-sm">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Clé API</h3>
              <p className="text-gray-500 text-xs">Générez votre clé API unique pour authentifier vos requêtes.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                <span className="text-orange-600 font-bold text-sm">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Intégration</h3>
              <p className="text-gray-500 text-xs">Utilisez le lien de paiement ou l'API REST pour intégrer les paiements.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                <span className="text-orange-600 font-bold text-sm">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Webhooks</h3>
              <p className="text-gray-500 text-xs">Recevez des notifications en temps réel sur votre serveur.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}