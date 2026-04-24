import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Code, Key, Shield, Zap, Server, Copy, CheckCircle, Globe, 
  Smartphone, CreditCard, FileText, Terminal, Monitor, 
  SmartphoneIcon, QrCode, Mail, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function GatewayApiDocs() {
  const [activeTab, setActiveTab] = useState('quickstart');
  const [copied, setCopied] = useState(null);

  const copyCode = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copié !');
    setTimeout(() => setCopied(null), 2000);
  };

  const tabs = [
    { id: 'quickstart', label: 'Démarrage', icon: Zap },
    { id: 'html', label: 'HTML', icon: Monitor },
    { id: 'javascript', label: 'JavaScript', icon: Code },
    { id: 'php', label: 'PHP', icon: Server },
    { id: 'python', label: 'Python', icon: Terminal },
    { id: 'wordpress', label: 'WordPress', icon: Globe },
    { id: 'api', label: 'API REST', icon: Key },
    { id: 'webhooks', label: 'Webhooks', icon: Shield },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
    { id: 'qrcode', label: 'QR Code', icon: QrCode }
  ];

  const methods = {
    quickstart: {
      title: 'Démarrage rapide',
      items: [
        {
          name: 'Redirection simple (GET)',
          description: 'Un simple formulaire HTML. Idéal pour débuter.',
          code: `<form action="https://payment-gateway.vercel.app/pay" method="GET">
  <input type="hidden" name="token" value="VOTRE_CLE_API" />
  <input type="hidden" name="amount" value="5000" />
  <input type="hidden" name="desc" value="Facture #123" />
  <button type="submit">Payer 5 000 XOF</button>
</form>`
        },
        {
          name: 'Bouton avec popup',
          description: 'Ouvre une fenêtre de paiement sans quitter votre site.',
          code: `<button onclick="startPayment()" style="background:#f97316;color:#fff;padding:14px 28px;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer">
  💳 Payer 5 000 XOF
</button>
<script>
function startPayment() {
  window.open(
    'https://payment-gateway.vercel.app/pay?token=VOTRE_CLE_API&amount=5000&desc=Facture',
    'payment',
    'width=480,height=700'
  );
}
</script>`
        },
        {
          name: 'Montant variable',
          description: 'Laissez le client choisir le montant.',
          code: `<input type="number" id="amount" placeholder="Montant (XOF)" style="padding:10px;border:1px solid #ddd;border-radius:8px;margin-right:8px" />
<button onclick="pay()" style="background:#f97316;color:#fff;padding:12px 24px;border:none;border-radius:8px;cursor:pointer">Payer</button>
<script>
function pay() {
  const amount = document.getElementById('amount').value;
  window.open('https://payment-gateway.vercel.app/pay?token=VOTRE_CLE_API&amount='+amount, 'payment', 'width=480,height=700');
}
</script>`
        },
        {
          name: 'Lien de paiement (Email/SMS)',
          description: 'Envoyez un lien direct par email ou SMS.',
          code: `https://payment-gateway.vercel.app/pay?token=VOTRE_CLE_API&amount=5000&desc=Facture%20%23123`
        }
      ]
    },
    html: {
      title: 'Intégration HTML',
      items: [
        {
          name: 'Bouton stylisé complet',
          description: 'Bouton professionnel avec icône.',
          code: `<form action="https://payment-gateway.vercel.app/pay" method="GET" style="display:inline-block">
  <input type="hidden" name="token" value="VOTRE_CLE_API" />
  <input type="hidden" name="amount" value="5000" />
  <input type="hidden" name="desc" value="Facture #INV-2026-001" />
  <button type="submit" style="background:#f97316;color:#fff;border:none;padding:12px 32px;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    Payer 5 000 XOF
  </button>
</form>`
        },
        {
          name: 'Plusieurs boutons (plusieurs produits)',
          code: `<button onclick="pay(5000, 'Formation HTML')" class="btn-orange">Formation HTML - 5 000 XOF</button>
<button onclick="pay(15000, 'Pack Complet')" class="btn-orange">Pack Complet - 15 000 XOF</button>
<button onclick="pay(50000, 'Accompagnement')" class="btn-orange">Accompagnement - 50 000 XOF</button>

<script>
function pay(amount, desc) {
  window.open('https://payment-gateway.vercel.app/pay?token=VOTRE_CLE_API&amount='+amount+'&desc='+encodeURIComponent(desc), 'payment', 'width=480,height=700');
}
</script>`
        }
      ]
    },
    javascript: {
      title: 'JavaScript / Node.js',
      items: [
        {
          name: 'Fetch API (navigateur)',
          code: `// API POST avec redirection
async function payer(amount, description) {
  const res = await fetch('https://payment-gateway.vercel.app/api/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'VOTRE_CLE_API' },
    body: JSON.stringify({ amount, description })
  });
  const data = await res.json();
  window.location.href = data.paymentUrl;
}

// Usage
payer(5000, 'Facture #123');`
        },
        {
          name: 'Popup + vérification statut',
          code: `async function payerEtSuivre(amount, description) {
  const res = await fetch('https://payment-gateway.vercel.app/api/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'VOTRE_CLE_API' },
    body: JSON.stringify({ amount, description })
  });
  const data = await res.json();
  
  const popup = window.open(data.paymentUrl, 'payment', 'width=480,height=700');
  
  // Vérifier le statut toutes les 5 secondes
  const interval = setInterval(async () => {
    const statusRes = await fetch('https://payment-gateway.vercel.app/api/verify/' + data.reference);
    const statusData = await statusRes.json();
    if (statusData.status === 'SUCCESSFUL') {
      clearInterval(interval);
      popup.close();
      alert('✅ Paiement réussi !');
    }
  }, 5000);
}`
        },
        {
          name: 'Node.js (Express)',
          code: `const fetch = require('node-fetch');

app.post('/creer-paiement', async (req, res) => {
  const response = await fetch('https://payment-gateway.vercel.app/api/pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GATEWAY_API_KEY
    },
    body: JSON.stringify({
      amount: req.body.amount,
      description: req.body.description
    })
  });
  const data = await response.json();
  res.redirect(data.paymentUrl);
});`
        },
        {
          name: 'React / Next.js',
          code: `import { useState } from 'react';

export default function PayButton({ amount, description }) {
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    setLoading(true);
    const res = await fetch('https://payment-gateway.vercel.app/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'VOTRE_CLE_API' },
      body: JSON.stringify({ amount, description })
    });
    const data = await res.json();
    window.open(data.paymentUrl, 'payment', 'width=480,height=700');
    setLoading(false);
  };

  return (
    <button onClick={pay} disabled={loading} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold">
      {loading ? 'Chargement...' : \`Payer \${amount} XOF\`}
    </button>
  );
}`
        }
      ]
    },
    php: {
      title: 'PHP',
      items: [
        {
          name: 'cURL simple',
          code: `<?php
function initierPaiement($amount, $description) {
  $ch = curl_init('https://payment-gateway.vercel.app/api/pay');
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: VOTRE_CLE_API'
  ]);
  curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'amount' => $amount,
    'description' => $description
  ]));
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  $response = curl_exec($ch);
  curl_close($ch);
  return json_decode($response, true);
}

// Usage
$paiement = initierPaiement(5000, 'Facture #123');
header('Location: ' . $paiement['paymentUrl']);
exit;`
        },
        {
          name: 'PHP avec webhook callback',
          code: `<?php
// callback.php - À configurer dans votre dashboard
$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

if ($data['event'] === 'payment.completed') {
  $reference = $data['transaction']['reference'];
  $amount = $data['transaction']['amount'];
  
  // Mettre à jour la commande en base
  $db->query("UPDATE commandes SET statut='paye' WHERE reference='$reference'");
  
  // Envoyer un email de confirmation
  mail($data['transaction']['email'], 'Paiement confirmé', "Votre paiement de $amount XOF a été reçu.");
}

http_response_code(200);
echo json_encode(['received' => true]);`
        }
      ]
    },
    python: {
      title: 'Python',
      items: [
        {
          name: 'Requests (Flask/Django)',
          code: `import requests

def initier_paiement(amount, description):
    response = requests.post(
        'https://payment-gateway.vercel.app/api/pay',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': 'VOTRE_CLE_API'
        },
        json={
            'amount': amount,
            'description': description
        }
    )
    return response.json()

# Usage dans une vue Django
def payer(request):
    paiement = initier_paiement(5000, 'Facture #123')
    return redirect(paiement['paymentUrl'])`
        },
        {
          name: 'Webhook receiver (Flask)',
          code: `from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    if data['event'] == 'payment.completed':
        reference = data['transaction']['reference']
        # Mettre à jour la commande
        update_order(reference, 'paid')
    return jsonify({'received': True})`
        }
      ]
    },
    wordpress: {
      title: 'WordPress',
      items: [
        {
          name: 'Shortcode',
          code: `// Dans functions.php de votre thème
define('GATEWAY_API_KEY', 'VOTRE_CLE_API');

add_shortcode('bouton_paiement', function($atts) {
  $atts = shortcode_atts(['montant' => '5000', 'desc' => 'Paiement'], $atts);
  $url = 'https://payment-gateway.vercel.app/pay?token=' . GATEWAY_API_KEY . '&amount=' . $atts['montant'] . '&desc=' . urlencode($atts['desc']);
  return '<a href="' . esc_url($url) . '" target="_blank" class="btn-paiement">Payer ' . number_format($atts['montant']) . ' XOF</a>';
});

// Usage dans une page : [bouton_paiement montant="10000" desc="Formation"]`
        },
        {
          name: 'WooCommerce Gateway',
          code: `// Plugin WooCommerce personnalisé
add_filter('woocommerce_payment_gateways', 'ajouter_gateway_personnalisee');
function ajouter_gateway_personnalisee($gateways) {
  $gateways[] = 'WC_Gateway_Personnalisee';
  return $gateways;
}

// Le reste du code du gateway WooCommerce...`
        }
      ]
    },
    api: {
      title: 'API REST',
      items: [
        {
          name: 'POST /api/pay - Initier un paiement',
          code: `curl -X POST https://payment-gateway.vercel.app/api/pay \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: VOTRE_CLE_API" \\
  -d '{"amount":5000,"description":"Facture #123"}'
  
// Réponse
{
  "success": true,
  "reference": "GW-abc123",
  "paymentUrl": "https://payment-gateway.vercel.app/pay?token=...",
  "status": "pending"
}`
        },
        {
          name: 'GET /api/verify/:reference - Vérifier un paiement',
          code: `curl https://payment-gateway.vercel.app/api/verify/GW-abc123 \\
  -H "x-api-key: VOTRE_CLE_API"
  
// Réponse
{
  "success": true,
  "status": "SUCCESSFUL",
  "reference": "GW-abc123",
  "amount": 5000
}`
        },
        {
          name: 'GET /api/methods/:country - Méthodes par pays',
          code: `curl https://payment-gateway.vercel.app/api/methods/bj

// Réponse
{
  "country": "bj",
  "name": "Bénin",
  "currency": "XOF",
  "methods": [
    {"id":"mtn_money","name":"MTN Mobile Money","icon":"📱"},
    {"id":"moov_money","name":"Moov Money","icon":"📱"}
  ]
}`
        },
        {
          name: 'GET /api/balance - Solde du compte',
          code: `curl https://payment-gateway.vercel.app/api/balance \\
  -H "x-api-key: VOTRE_CLE_API"

// Réponse
{
  "balance": 150000,
  "currency": "XOF",
  "pendingBalance": 25000
}`
        }
      ]
    },
    webhooks: {
      title: 'Webhooks',
      items: [
        {
          name: 'Configuration',
          description: 'Ajoutez votre URL de callback dans le dashboard pour recevoir les événements en temps réel.',
          code: `// Événements disponibles :
- payment.completed  (paiement réussi)
- payment.failed     (paiement échoué)
- payment.pending    (paiement en attente)`
        },
        {
          name: 'Récepteur Node.js',
          code: `app.post('/webhook', express.json(), (req, res) => {
  const { event, transaction } = req.body;
  
  switch(event) {
    case 'payment.completed':
      updateOrder(transaction.metadata.orderId, 'paid');
      sendConfirmationEmail(transaction.email);
      break;
    case 'payment.failed':
      updateOrder(transaction.metadata.orderId, 'failed');
      break;
  }
  
  res.json({ received: true });
});`
        }
      ]
    },
    mobile: {
      title: 'Mobile (Flutter/React Native)',
      items: [
        {
          name: 'Flutter (Dart)',
          code: `import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';

Future<void> payer(double amount, String description) async {
  final res = await http.post(
    Uri.parse('https://payment-gateway.vercel.app/api/pay'),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'VOTRE_CLE_API'
    },
    body: jsonEncode({
      'amount': amount,
      'description': description
    })
  );
  final data = jsonDecode(res.body);
  await launchUrl(Uri.parse(data['paymentUrl']));
}`
        },
        {
          name: 'React Native',
          code: `import { Linking } from 'react-native';

async function payer(amount, description) {
  const res = await fetch('https://payment-gateway.vercel.app/api/pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'VOTRE_CLE_API'
    },
    body: JSON.stringify({ amount, description })
  });
  const data = await res.json();
  Linking.openURL(data.paymentUrl);
}`
        }
      ]
    },
    qrcode: {
      title: 'QR Code',
      items: [
        {
          name: 'Génération dynamique',
          code: `<img id="qrcode" />
<script>
const url = 'https://payment-gateway.vercel.app/pay?token=VOTRE_CLE_API&amount=5000';
document.getElementById('qrcode').src = 
  'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url);
</script>`
        },
        {
          name: 'QR Code avec montant variable',
          code: `<input type="number" id="qrAmount" placeholder="Montant" />
<button onclick="generateQR()">Générer QR Code</button>
<img id="qrcode" style="margin-top:10px" />

<script>
function generateQR() {
  const amount = document.getElementById('qrAmount').value;
  const url = 'https://payment-gateway.vercel.app/pay?token=VOTRE_CLE_API&amount=' + amount;
  document.getElementById('qrcode').src = 
    'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(url);
}
</script>`
        }
      ]
    }
  };

  const activeMethod = methods[activeTab];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Documentation API</h1>
        <p className="text-gray-500 mt-1">Toutes les méthodes pour intégrer la passerelle de paiement</p>
      </div>

      {/* Tabs navigation */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 overflow-x-auto">
          <nav className="flex px-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">{activeMethod.title}</h2>
          
          {activeMethod.items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
                  {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                </div>
                <button onClick={() => copyCode(item.code, `${activeTab}-${index}`)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                  {copied === `${activeTab}-${index}` ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  Copier
                </button>
              </div>
              <div className="bg-gray-900 text-gray-100 p-4 sm:p-5 font-mono text-xs sm:text-sm overflow-x-auto max-h-80 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{item.code}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Providers */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Providers supportés</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { name: 'FeexPay', countries: 'BJ, CI, TG, SN, CG' },
            { name: 'Stripe', countries: 'Europe, US, CA' },
            { name: 'Paystack', countries: 'NG, GH, KE, ZA' },
            { name: 'Flutterwave', countries: '15 pays Afrique' },
            { name: 'KKiaPay', countries: 'UEMOA + CEMAC' },
            { name: 'FedaPay', countries: '10 pays Afrique' },
            { name: 'PayDunya', countries: 'UEMOA' },
            { name: 'CinetPay', countries: '11 pays Afrique' },
            { name: 'Lygos', countries: '13 pays Afrique' },
            { name: 'PayPal', countries: '200+ pays' },
            { name: 'MbiyoPay', countries: '11 pays Afrique' },
            { name: 'Qosic', countries: '13 pays Afrique' },
            { name: 'Bizao', countries: '11 pays Afrique' },
            { name: 'Hub2', countries: '10 pays Afrique' },
            { name: 'Chipper Cash', countries: 'Afrique + US/UK' }
          ].map(provider => (
            <div key={provider.name} className="border border-gray-200 rounded-xl p-3 text-center hover:border-orange-300 transition-all">
              <p className="text-sm font-semibold text-gray-900">{provider.name}</p>
              <p className="text-xs text-gray-500 mt-1">{provider.countries}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Besoin d'aide */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
        <h3 className="text-lg font-bold text-orange-900 mb-2">Besoin d'aide ?</h3>
        <p className="text-sm text-orange-700 mb-4">Notre équipe est disponible pour vous aider à intégrer la passerelle.</p>
        <a href="mailto:support@payment-gateway.vercel.app" className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-orange-600 transition-all">
          <Mail size={16} /> Contactez le support
        </a>
      </div>
    </div>
  );
}