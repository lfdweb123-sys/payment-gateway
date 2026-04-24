import { Code, Key, Shield, Zap, Server, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function GatewayApiDocs() {
  const [copied, setCopied] = useState(null);

  const copyCode = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copié !');
    setTimeout(() => setCopied(null), 2000);
  };

  const endpoints = [
    {
      method: 'POST',
      path: '/api/gateway/pay',
      title: 'Initier un paiement',
      description: 'Démarre une transaction de paiement pour un client.',
      body: `{
  "token": "VOTRE_CLE_API",
  "amount": 5000,
  "country": "bj",
  "method": "mtn_money",
  "phone": "22997000000",
  "description": "Facture #123"
}`,
      response: `{
  "success": true,
  "transactionId": "abc123",
  "reference": "Fdbgfd122546",
  "message": "Paiement initié"
}`
    },
    {
      method: 'GET',
      path: '/api/gateway/verify/:reference',
      title: 'Vérifier un paiement',
      description: 'Vérifie le statut d\'une transaction.',
      response: `{
  "success": true,
  "status": "SUCCESSFUL",
  "reference": "Fdbgfd122546",
  "amount": 5000
}`
    },
    {
      method: 'GET',
      path: '/api/gateway/methods/:country',
      title: 'Méthodes de paiement par pays',
      description: 'Retourne les méthodes disponibles pour un pays.',
      response: `{
  "country": "bj",
  "name": "Bénin",
  "currency": "XOF",
  "methods": [
    { "id": "mtn_money", "name": "MTN Mobile Money" },
    { "id": "moov_money", "name": "Moov Money" }
  ]
}`
    },
    {
      method: 'GET',
      path: '/api/gateway/balance',
      title: 'Solde du compte',
      description: 'Retourne le solde disponible du marchand.',
      headers: 'x-api-key: VOTRE_CLE_API',
      response: `{
  "balance": 150000,
  "currency": "XOF",
  "pendingBalance": 25000
}`
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Documentation API</h1>
        <p className="text-xs text-gray-500 mt-0.5">Intégrez la passerelle de paiement à votre site</p>
      </div>

      {/* Introduction */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-orange-500"/>
          <h2 className="text-sm font-semibold text-gray-900">Démarrage rapide</h2>
        </div>
        <div className="bg-gray-900 text-white rounded-xl p-4 font-mono text-xs overflow-x-auto">
{`<!-- Ajoutez ce bouton sur votre site -->
<form action="https://paiement.factureapp.com/pay" method="GET">
  <input type="hidden" name="token" value="VOTRE_CLE_API">
  <input type="hidden" name="amount" value="5000">
  <button type="submit">Payer 5 000 XOF</button>
</form>`}
        </div>
        <button onClick={() => copyCode(`<form action="${import.meta.env.VITE_APP_URL}/pay" method="GET"><input type="hidden" name="token" value="VOTRE_CLE_API"><input type="hidden" name="amount" value="5000"><button type="submit">Payer 5 000 XOF</button></form>`, 'html')} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
          {copied === 'html' ? <CheckCircle size={12} className="text-emerald-500"/> : <Copy size={12}/>} Copier le code HTML
        </button>
      </div>

      {/* Authentification */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Key size={18} className="text-gray-700"/>
          <h2 className="text-sm font-semibold text-gray-900">Authentification</h2>
        </div>
        <p className="text-sm text-gray-500">Toutes les requêtes API doivent inclure votre clé API dans le header :</p>
        <div className="bg-gray-900 text-emerald-400 rounded-xl p-4 font-mono text-xs overflow-x-auto">
          Authorization: Bearer VOTRE_CLE_API
        </div>
        <p className="text-xs text-gray-400">Ou via le paramètre <code className="bg-gray-100 px-1 rounded">?token=VOTRE_CLE_API</code> pour les requêtes GET.</p>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-gray-700"/>
          <h2 className="text-sm font-semibold text-gray-900">Endpoints</h2>
        </div>

        {endpoints.map((ep, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  ep.method === 'POST' ? 'bg-emerald-100 text-emerald-700' :
                  ep.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}>{ep.method}</span>
                <code className="text-sm font-mono text-gray-900">{ep.path}</code>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{ep.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{ep.description}</p>
              </div>

              {ep.body && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Corps de la requête</p>
                  <div className="relative bg-gray-900 text-gray-100 rounded-xl p-4 font-mono text-xs overflow-x-auto">
                    <pre>{ep.body}</pre>
                    <button onClick={() => copyCode(ep.body, `body-${i}`)} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                      {copied === `body-${i}` ? <CheckCircle size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                    </button>
                  </div>
                </div>
              )}

              {ep.response && (
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2">Réponse</p>
                  <div className="relative bg-gray-900 text-emerald-400 rounded-xl p-4 font-mono text-xs overflow-x-auto">
                    <pre>{ep.response}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sécurité */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-gray-700"/>
          <h2 className="text-sm font-semibold text-gray-900">Sécurité</h2>
        </div>
        <ul className="space-y-2 text-sm text-gray-500">
          <li>• Toutes les requêtes doivent être en HTTPS</li>
          <li>• Gardez votre clé API secrète (ne la mettez pas dans du code client)</li>
          <li>• Limite de 1000 requêtes par heure par clé API</li>
          <li>• Commission fixe de 1% sur chaque transaction réussie</li>
          <li>• Les paiements sont traités via nos providers certifiés PCI DSS</li>
        </ul>
      </div>
    </div>
  );
}