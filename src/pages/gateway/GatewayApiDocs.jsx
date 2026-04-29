import { useState } from 'react';
import {
  Code, Key, Shield, Zap, Server, Copy, CheckCircle, Globe,
  Smartphone, Terminal, Monitor, QrCode, Mail,
  BookOpen, Layers, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── URL de base depuis la variable d'environnement Vite ────────────────── */
const BASE_URL = import.meta.env.VITE_APP_URL || 'https://votre-domaine.vercel.app';

/*
  ─── COMMENT FONCTIONNE LA GÉNÉRATION DE LIEN ────────────────────────────
  
  Le marchand appelle POST /api/gateway/generate-link avec sa clé API.
  La gateway crée un enregistrement dans Firestore (collection payment_links)
  et retourne une URL avec un pid (UUID opaque).

  URL générée : /pay?pid=a1b2c3d4-e5f6-4abc-8def-...
  
  - Le pid est un UUID v4 aléatoire → impossible à deviner
  - Il expire après 15 minutes
  - La clé API du marchand reste dans Firestore, jamais dans l'URL
  - Le GATEWAY_SECRET est uniquement dans les variables Vercel du propriétaire
    de la passerelle — les marchands n'y ont pas accès
  ─────────────────────────────────────────────────────────────────────────
*/

const TABS = [
  { id: 'quickstart',  label: 'Démarrage',   icon: Zap,        color: '#FF6B00' },
  { id: 'html',        label: 'HTML',         icon: Monitor,    color: '#0057FF' },
  { id: 'javascript',  label: 'JavaScript',   icon: Code,       color: '#F59E0B' },
  { id: 'php',         label: 'PHP',          icon: Server,     color: '#9B00E8' },
  { id: 'python',      label: 'Python',       icon: Terminal,   color: '#00A550' },
  { id: 'wordpress',   label: 'WordPress',    icon: Globe,      color: '#0057FF' },
  { id: 'api',         label: 'API REST',     icon: Key,        color: '#EF4444' },
  { id: 'webhooks',    label: 'Webhooks',     icon: Shield,     color: '#6366F1' },
  { id: 'mobile',      label: 'Mobile',       icon: Smartphone, color: '#0EA5E9' },
  { id: 'qrcode',      label: 'QR Code',      icon: QrCode,     color: '#14B8A6' },
];

const METHODS = {
  quickstart: {
    title: 'Démarrage rapide',
    sub: "Appelez generate-link avec votre clé API — la gateway génère un lien sécurisé avec pid.",
    items: [
      {
        name: '① Générer un lien de paiement',
        desc: "Appelez POST /api/gateway/generate-link avec votre clé API. La gateway crée un pid (UUID opaque) et retourne l'URL complète. Le pid expire après 15 minutes.",
        lang: 'javascript',
        code: `// Appelez cet endpoint depuis votre backend ou serveur
// Votre clé API (gw_xxx) dans le header x-api-key — jamais dans l'URL

const response = await fetch('${BASE_URL}/api/gateway/generate-link', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'gw_votre_cle_api'
  },
  body: JSON.stringify({
    amount: 5000,
    description: 'Facture #123',
    country: 'bj',      // optionnel — prérempli côté client
    method: 'mtn_money' // optionnel — prérempli côté client
  })
});

const data = await response.json();
console.log(data.url);
// → ${BASE_URL}/pay?pid=a1b2c3d4-e5f6-4abc-8def-ef1234567890
// Le pid est un UUID opaque — la clé API n'apparaît JAMAIS dans l'URL`,
      },
      {
        name: '② Envoyer le lien (Email / SMS)',
        desc: "L'URL générée contient uniquement un pid UUID — aucune donnée sensible lisible.",
        lang: 'text',
        code: `// Lien de paiement sécurisé — à envoyer par email ou SMS
${BASE_URL}/pay?pid=a1b2c3d4-e5f6-4abc-8def-ef1234567890

// Ce pid :
// ✅ Ne contient aucune donnée — c'est juste une référence Firestore
// ✅ Expire après 15 minutes
// ✅ La clé API reste dans Firestore côté serveur
// ✅ Impossible à deviner (UUID v4 = 2^122 combinaisons)`,
      },
      {
        name: '③ Redirection vers la page de paiement',
        desc: "Après génération, redirigez l'utilisateur vers l'URL retournée.",
        lang: 'javascript',
        code: `// Route Express — générer le lien et rediriger
app.post('/payer', async (req, res) => {
  const { amount, description } = req.body;
  
  const response = await fetch('${BASE_URL}/api/gateway/generate-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GATEWAY_API_KEY // gw_xxx depuis variable d'env
    },
    body: JSON.stringify({ amount, description })
  });
  
  const data = await response.json();
  
  if (data.success) {
    res.redirect(data.url);
    // → ${BASE_URL}/pay?pid=a1b2c3d4-...
  } else {
    res.status(400).json({ error: data.error });
  }
});`,
      },
      {
        name: '④ Paiement direct via API (sans page intermédiaire)',
        desc: "Alternative au lien — initier directement un paiement mobile money ou carte.",
        lang: 'javascript',
        code: `// Pour les paiements directs (vous connaissez déjà le pays, méthode, téléphone)
const res = await fetch('${BASE_URL}/api/gateway/pay', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'gw_votre_cle_api'
  },
  body: JSON.stringify({
    amount: 5000,
    description: 'Facture #123',
    country: 'bj',
    method: 'mtn_money',
    phone: '22961000000',
    email: 'client@email.com'
  })
});
const data = await res.json();
// data.url → rediriger le client
// data.transactionId → pour vérifier le statut`,
      },
    ],
  },

  html: {
    title: 'Intégration HTML',
    sub: "Le lien est généré par votre backend — le bouton HTML redirige vers l'URL avec pid.",
    items: [
      {
        name: 'Bouton de paiement (lien pré-généré)',
        desc: "Générez l'URL côté serveur et injectez-la dans le bouton HTML.",
        lang: 'html',
        code: `<!-- L'URL avec ?pid= est générée côté serveur et injectée dans la page -->
<!-- Exemple avec PHP : -->
<a href="<?php echo $paymentUrl; ?>" class="btn-payer">
  💳 Payer 5 000 XOF
</a>

<!-- URL injectée : ${BASE_URL}/pay?pid=a1b2c3d4-e5f6-4abc-8def-... -->

<style>
.btn-payer {
  display: inline-block;
  background: #f97316;
  color: #fff;
  padding: 12px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
}
</style>`,
      },
      {
        name: 'Bouton avec génération dynamique (JavaScript)',
        desc: "Votre page appelle votre backend pour obtenir le pid avant la redirection.",
        lang: 'html',
        code: `<button onclick="startPayment()">💳 Payer 5 000 XOF</button>

<script>
async function startPayment() {
  // Appel à VOTRE backend (qui appelle generate-link)
  const res = await fetch('/api/creer-lien', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 5000, description: 'Facture #123' })
  });
  const { url } = await res.json();
  
  // Redirection vers ${BASE_URL}/pay?pid=...
  window.location.href = url;
}
</script>`,
      },
      {
        name: 'Plusieurs produits',
        lang: 'html',
        code: `<button onclick="pay(5000, 'Formation HTML')">Formation HTML — 5 000 XOF</button>
<button onclick="pay(15000, 'Pack Complet')">Pack Complet — 15 000 XOF</button>
<button onclick="pay(50000, 'Accompagnement')">Accompagnement — 50 000 XOF</button>

<script>
async function pay(amount, description) {
  const res = await fetch('/api/creer-lien', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, description })
  });
  const { url } = await res.json();
  window.open(url, 'payment', 'width=480,height=700');
}
</script>`,
      },
    ],
  },

  javascript: {
    title: 'JavaScript / Node.js',
    sub: "Appelez generate-link depuis votre backend — la clé API reste côté serveur.",
    items: [
      {
        name: 'Générer un lien de paiement (Node.js / Express)',
        lang: 'javascript',
        code: `const express = require('express');
const fetch   = require('node-fetch');
const app     = express();
app.use(express.json());

// Route qui génère un lien de paiement sécurisé
app.post('/creer-lien', async (req, res) => {
  const { amount, description, country, method } = req.body;
  
  const response = await fetch('${BASE_URL}/api/gateway/generate-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GATEWAY_API_KEY // gw_xxx — jamais côté client
    },
    body: JSON.stringify({ amount, description, country, method })
  });
  
  const data = await response.json();
  
  if (data.success) {
    res.json({ url: data.url });
    // data.url = ${BASE_URL}/pay?pid=a1b2c3d4-...
  } else {
    res.status(400).json({ error: data.error });
  }
});`,
      },
      {
        name: 'Popup + vérification de statut',
        lang: 'javascript',
        code: `async function payerEtSuivre(amount, description) {
  // 1. Générer le lien via votre backend
  const linkRes = await fetch('/creer-lien', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, description })
  });
  const { url, transactionId } = await linkRes.json();
  
  // 2. Ouvrir la page de paiement dans une popup
  const popup = window.open(url, 'payment', 'width=480,height=700');
  
  // 3. Vérifier le statut toutes les 5 secondes
  const interval = setInterval(async () => {
    const statusRes = await fetch('/verifier-paiement/' + transactionId);
    const { status } = await statusRes.json();
    
    if (status === 'completed') {
      clearInterval(interval);
      popup?.close();
      alert('✅ Paiement réussi !');
    } else if (status === 'failed') {
      clearInterval(interval);
      popup?.close();
      alert('❌ Paiement échoué');
    }
  }, 5000);
}`,
      },
      {
        name: 'Route de vérification (Node.js)',
        lang: 'javascript',
        code: `// Vérifier le statut d'une transaction
app.get('/verifier-paiement/:id', async (req, res) => {
  const response = await fetch(
    '${BASE_URL}/api/gateway/verify/' + req.params.id,
    {
      headers: { 'x-api-key': process.env.GATEWAY_API_KEY }
    }
  );
  const data = await response.json();
  res.json(data);
});`,
      },
      {
        name: 'Next.js API Route',
        lang: 'jsx',
        code: `// pages/api/creer-lien.js (ou app/api/creer-lien/route.js)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { amount, description } = req.body;
  
  const response = await fetch('${BASE_URL}/api/gateway/generate-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GATEWAY_API_KEY // dans .env.local
    },
    body: JSON.stringify({ amount, description })
  });
  
  const data = await response.json();
  res.json(data);
}`,
      },
    ],
  },

  php: {
    title: 'PHP',
    sub: "Appelez generate-link côté serveur PHP — clé API dans les variables d'environnement.",
    items: [
      {
        name: 'Générer un lien de paiement',
        lang: 'php',
        code: `<?php
function creerLienPaiement($amount, $description, $country = null, $method = null) {
  $ch = curl_init('${BASE_URL}/api/gateway/generate-link');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'x-api-key: ' . getenv('GATEWAY_API_KEY') // gw_xxx depuis variable d'env
    ],
    CURLOPT_POSTFIELDS => json_encode(array_filter([
      'amount'      => $amount,
      'description' => $description,
      'country'     => $country,
      'method'      => $method,
    ])),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
  ]);
  $response = curl_exec($ch);
  curl_close($ch);
  $data = json_decode($response, true);
  return $data['url'] ?? null;
  // → ${BASE_URL}/pay?pid=a1b2c3d4-e5f6-4abc-8def-...
}

// Utilisation — rediriger vers la page de paiement
$url = creerLienPaiement(5000, 'Facture #123', 'bj', 'mtn_money');
if ($url) {
  header('Location: ' . $url);
  exit;
}`,
      },
      {
        name: 'Paiement direct via API',
        lang: 'php',
        code: `<?php
function initierPaiement($amount, $description, $country = 'bj', $method = 'mtn_money', $phone = '') {
  $ch = curl_init('${BASE_URL}/api/gateway/pay');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'x-api-key: ' . getenv('GATEWAY_API_KEY')
    ],
    CURLOPT_POSTFIELDS => json_encode([
      'amount'      => $amount,
      'description' => $description,
      'country'     => $country,
      'method'      => $method,
      'phone'       => $phone,
    ]),
    CURLOPT_RETURNTRANSFER => true
  ]);
  $response = curl_exec($ch);
  curl_close($ch);
  return json_decode($response, true);
}

$paiement = initierPaiement(5000, 'Facture #123', 'bj', 'mtn_money', '22961000000');
if ($paiement['success']) {
  header('Location: ' . $paiement['url']);
  exit;
}`,
      },
      {
        name: 'Webhook callback',
        lang: 'php',
        code: `<?php
$payload = json_decode(file_get_contents('php://input'), true);
$event   = $payload['event'] ?? '';
$tx      = $payload['transaction'] ?? [];

if ($event === 'payment.completed') {
  $pdo->prepare("UPDATE commandes SET statut='paye' WHERE reference=?")
      ->execute([$tx['reference']]);
  mail($tx['email'] ?? '', 'Paiement confirmé', "Paiement de {$tx['amount']} XOF reçu.");
}

http_response_code(200);
echo json_encode(['received' => true]);`,
      },
    ],
  },

  python: {
    title: 'Python',
    sub: "generate-link depuis Flask/Django — clé API dans os.environ.",
    items: [
      {
        name: 'Générer un lien de paiement',
        lang: 'python',
        code: `import requests, os

GATEWAY_URL = '${BASE_URL}'

def creer_lien_paiement(amount, description, country=None, method=None):
    payload = {'amount': amount, 'description': description}
    if country: payload['country'] = country
    if method:  payload['method']  = method
    
    response = requests.post(
        f'{GATEWAY_URL}/api/gateway/generate-link',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': os.environ['GATEWAY_API_KEY']  # gw_xxx
        },
        json=payload,
        timeout=10
    )
    data = response.json()
    return data.get('url') if data.get('success') else None
    # → ${BASE_URL}/pay?pid=a1b2c3d4-...

# Vue Django
def payer(request):
    url = creer_lien_paiement(5000, 'Facture #123', 'bj', 'mtn_money')
    if url:
        return redirect(url)
    return HttpResponse('Erreur', status=400)`,
      },
      {
        name: 'Paiement direct via API',
        lang: 'python',
        code: `import requests, os

def initier_paiement(amount, description, country='bj', method='mtn_money', phone=''):
    response = requests.post(
        f'${BASE_URL}/api/gateway/pay',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': os.environ['GATEWAY_API_KEY']
        },
        json={
            'amount': amount, 'description': description,
            'country': country, 'method': method, 'phone': phone,
        }
    )
    return response.json()

paiement = initier_paiement(5000, 'Facture #123', 'bj', 'mtn_money', '22961000000')
if paiement['success']:
    return redirect(paiement['url'])`,
      },
      {
        name: 'Webhook receiver (Flask)',
        lang: 'python',
        code: `from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    if data.get('event') == 'payment.completed':
        update_order(data['transaction']['reference'], 'paid')
    elif data.get('event') == 'payment.failed':
        update_order(data['transaction']['reference'], 'failed')
    return jsonify({'received': True})`,
      },
    ],
  },

  wordpress: {
    title: 'WordPress',
    sub: "Shortcode qui appelle generate-link côté serveur PHP.",
    items: [
      {
        name: 'Shortcode avec generate-link',
        lang: 'php',
        code: `// Dans functions.php de votre thème
// Stockez GATEWAY_API_KEY dans wp-config.php :
// define('GATEWAY_API_KEY', 'gw_votre_cle_api');

function creer_lien_gateway($amount, $description) {
  $ch = curl_init('${BASE_URL}/api/gateway/generate-link');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'x-api-key: ' . GATEWAY_API_KEY
    ],
    CURLOPT_POSTFIELDS => json_encode([
      'amount'      => (int) $amount,
      'description' => $description,
    ]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
  ]);
  $data = json_decode(curl_exec($ch), true);
  curl_close($ch);
  return $data['url'] ?? '#';
  // → ${BASE_URL}/pay?pid=a1b2c3d4-...
}

add_shortcode('bouton_paiement', function($atts) {
  $atts = shortcode_atts(['montant' => '5000', 'desc' => 'Paiement'], $atts);
  $url  = creer_lien_gateway($atts['montant'], $atts['desc']);
  return '<a href="' . esc_url($url) . '" target="_blank" class="btn-paiement">'
       . 'Payer ' . number_format($atts['montant']) . ' XOF</a>';
});

// Usage dans une page WordPress :
// [bouton_paiement montant="10000" desc="Formation"]`,
      },
    ],
  },

  api: {
    title: 'API REST',
    sub: "Référence complète — clé API en header x-api-key pour tous les appels.",
    items: [
      {
        name: 'POST /api/gateway/generate-link — Générer un lien sécurisé',
        desc: "Crée un pid UUID dans Firestore et retourne l'URL de paiement. La clé API du marchand ne sera jamais dans l'URL.",
        lang: 'bash',
        code: `curl -X POST ${BASE_URL}/api/gateway/generate-link \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: gw_votre_cle_api" \\
  -d '{
    "amount": 5000,
    "description": "Facture #123",
    "country": "bj",
    "method": "mtn_money"
  }'

# Réponse
{
  "success": true,
  "url": "${BASE_URL}/pay?pid=a1b2c3d4-e5f6-4abc-8def-ef1234567890",
  "pid": "a1b2c3d4-e5f6-4abc-8def-ef1234567890"
}
# Le pid expire dans 15 minutes.`,
      },
      {
        name: 'POST /api/gateway/pay — Initier un paiement direct',
        lang: 'bash',
        code: `# Paiement direct sans page intermédiaire
curl -X POST ${BASE_URL}/api/gateway/pay \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: gw_votre_cle_api" \\
  -d '{
    "amount": 5000,
    "description": "Facture #123",
    "country": "bj",
    "method": "mtn_money",
    "phone": "22961000000",
    "email": "client@email.com"
  }'

# Réponse
{
  "success": true,
  "transactionId": "abc123",
  "reference": "GW-1714000000000",
  "url": "https://...",
  "status": "pending",
  "provider": "feexpay",
  "message": "Paiement initié."
}`,
      },
      {
        name: 'GET /api/gateway/verify/:id — Vérifier un paiement',
        lang: 'bash',
        code: `curl ${BASE_URL}/api/gateway/verify/abc123 \\
  -H "x-api-key: gw_votre_cle_api"

# Réponse
{
  "success": true,
  "status": "completed",
  "reference": "GW-1714000000000",
  "amount": 5000,
  "provider": "feexpay"
}`,
      },
      {
        name: 'GET /api/gateway/methods/:country — Méthodes par pays',
        lang: 'bash',
        code: `# Endpoint public — pas besoin de clé API
curl ${BASE_URL}/api/gateway/methods/bj

# Réponse
{
  "country": "bj",
  "name": "Bénin",
  "currency": "XOF",
  "methods": [
    {"id": "mtn_money",    "name": "MTN Mobile Money"},
    {"id": "moov_money",   "name": "Moov Money"},
    {"id": "celtiis_money","name": "CELTIIS Money"},
    {"id": "card",         "name": "Carte Bancaire"}
  ]
}`,
      },
      {
        name: 'GET /api/gateway/balance — Solde du compte',
        lang: 'bash',
        code: `curl ${BASE_URL}/api/gateway/balance \\
  -H "x-api-key: gw_votre_cle_api"

# Réponse
{
  "balance": 150000,
  "currency": "XOF",
  "pendingBalance": 25000
}`,
      },
    ],
  },

  webhooks: {
    title: 'Webhooks',
    sub: 'Recevez des événements en temps réel sur votre serveur.',
    items: [
      {
        name: 'Événements disponibles',
        lang: 'text',
        code: `payment.completed   → Paiement réussi (solde crédité)
payment.failed      → Paiement échoué ou refusé
payment.pending     → Paiement en attente de confirmation
payment.refunded    → Paiement remboursé`,
      },
      {
        name: 'Format du payload',
        lang: 'javascript',
        code: `{
  "event": "payment.completed",
  "transaction": {
    "id": "abc123",
    "reference": "GW-1714000000000",
    "amount": 5000,
    "netAmount": 4950,
    "commission": 50,
    "country": "bj",
    "method": "mtn_money",
    "provider": "feexpay",
    "status": "completed",
    "createdAt": "2026-01-01T12:00:00.000Z",
    "completedAt": "2026-01-01T12:01:30.000Z"
  }
}`,
      },
      {
        name: 'Récepteur Node.js (Express)',
        lang: 'javascript',
        code: `app.post('/webhook', express.json(), (req, res) => {
  const { event, transaction } = req.body;

  switch (event) {
    case 'payment.completed':
      updateOrder(transaction.reference, 'paid');
      sendConfirmationEmail(transaction.email);
      break;
    case 'payment.failed':
      updateOrder(transaction.reference, 'failed');
      notifyCustomer(transaction.reference);
      break;
  }

  res.json({ received: true });
});`,
      },
      {
        name: 'Récepteur PHP',
        lang: 'php',
        code: `<?php
$payload = json_decode(file_get_contents('php://input'), true);
$event   = $payload['event'] ?? '';
$tx      = $payload['transaction'] ?? [];

if ($event === 'payment.completed') {
  $db->query("UPDATE orders SET status='paid' WHERE ref='{$tx['reference']}'");
}

http_response_code(200);
echo json_encode(['received' => true]);`,
      },
    ],
  },

  mobile: {
    title: 'Mobile — Flutter & React Native',
    sub: "Le lien est généré par votre backend — jamais côté application mobile.",
    items: [
      {
        name: 'Flutter (Dart)',
        lang: 'dart',
        code: `import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';

const gatewayUrl = '${BASE_URL}';

// ⚠️ La clé API ne doit PAS être dans le code mobile.
// Appelez votre propre backend qui appelle generate-link.

Future<String?> creerLien(double amount, String description) async {
  // Appel à VOTRE backend (pas directement à la gateway)
  final res = await http.post(
    Uri.parse('https://votre-api.com/creer-lien'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'amount': amount, 'description': description})
  );
  final data = jsonDecode(res.body);
  return data['url']; // ${BASE_URL}/pay?pid=...
}

Future<void> payer(double amount, String description) async {
  final url = await creerLien(amount, description);
  if (url != null) await launchUrl(Uri.parse(url));
}`,
      },
      {
        name: 'React Native',
        lang: 'jsx',
        code: `import { Linking } from 'react-native';

const GATEWAY_URL = '${BASE_URL}';

// ⚠️ La clé API ne doit PAS être dans le code React Native.
// Appelez votre propre backend (Next.js, Express, etc.)

async function creerLien(amount, description) {
  // Appel à VOTRE backend — pas directement à la gateway
  const res = await fetch('https://votre-api.com/creer-lien', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, description })
  });
  const data = await res.json();
  return data.url; // ${GATEWAY_URL}/pay?pid=...
}

async function payer(amount, description) {
  const url = await creerLien(amount, description);
  if (url) Linking.openURL(url);
}`,
      },
    ],
  },

  qrcode: {
    title: 'QR Code',
    sub: "Le pid dans le QR code — opaque et expirant en 15 minutes.",
    items: [
      {
        name: 'QR Code avec pid (lien sécurisé)',
        lang: 'html',
        code: `<img id="qrcode" alt="QR Code de paiement" />

<script>
async function loadQR() {
  // Appel à VOTRE backend pour générer le lien
  const res = await fetch('/api/creer-lien', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 5000, description: 'Facture #123' })
  });
  const { url } = await res.json();
  // url = ${BASE_URL}/pay?pid=a1b2c3d4-...

  document.getElementById('qrcode').src =
    'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='
    + encodeURIComponent(url);
}

loadQR();
</script>`,
      },
      {
        name: 'QR Code avec montant variable',
        lang: 'html',
        code: `<input type="number" id="qrAmount" placeholder="Montant (XOF)" />
<button onclick="generateQR()">Générer QR Code</button>
<img id="qrcode" style="margin-top:10px" />

<script>
async function generateQR() {
  const amount = document.getElementById('qrAmount').value;
  
  const res = await fetch('/api/creer-lien', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: parseInt(amount), description: 'Paiement' })
  });
  const { url } = await res.json();
  // url = ${BASE_URL}/pay?pid=...

  document.getElementById('qrcode').src =
    'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data='
    + encodeURIComponent(url);
}
</script>`,
      },
    ],
  },
};

const LANG_COLORS = {
  html:       { bg: '#FFF3EA', color: '#FF6B00', label: 'HTML'  },
  javascript: { bg: '#FFFBEB', color: '#D97706', label: 'JS'    },
  jsx:        { bg: '#EBF0FF', color: '#0057FF', label: 'JSX'   },
  php:        { bg: '#F4EBFF', color: '#9B00E8', label: 'PHP'   },
  python:     { bg: '#EDFAF3', color: '#00A550', label: 'PY'    },
  bash:       { bg: '#F7F8FC', color: '#555',    label: 'cURL'  },
  dart:       { bg: '#E0F7FA', color: '#0097A7', label: 'Dart'  },
  text:       { bg: '#F7F8FC', color: '#888',    label: 'TEXT'  },
};

const PROVIDERS = [
  { name:'FeexPay',      zone:'BJ · CI · TG · SN · BF',    color:'#FF6B00', section:'Agrégateurs'    },
  { name:'KKiaPay',      zone:'UEMOA + CEMAC · 11 pays',    color:'#6366F1', section:'Agrégateurs'    },
  { name:'CinetPay',     zone:'11 pays Afrique',             color:'#14B8A6', section:'Agrégateurs'    },
  { name:'Hub2',         zone:'10 pays Afrique',             color:'#F59E0B', section:'Agrégateurs'    },
  { name:'FedaPay',      zone:'10 pays Afrique',             color:'#EF4444', section:'Agrégateurs'    },
  { name:'Qosic',        zone:'12 pays Afrique',             color:'#9B00E8', section:'Agrégateurs'    },
  { name:'Lygos',        zone:'12 pays Afrique',             color:'#EC4899', section:'Agrégateurs'    },
  { name:'Bizao',        zone:'11 pays Afrique',             color:'#00A550', section:'Agrégateurs'    },
  { name:'PayDunya',     zone:'UEMOA · 8 pays',              color:'#0EA5E9', section:'Agrégateurs'    },
  { name:'MbiyoPay',     zone:'11 pays Afrique',             color:'#FF6B00', section:'Agrégateurs'    },
  { name:'GeniusPay',    zone:"CI · SN · BJ · CM · 12 pays",color:'#00A550', section:'Agrégateurs'    },
  { name:'Wave',         zone:'SN · CI · ML · UG · CM',     color:'#00A550', section:'Mobile Money'   },
  { name:'MTN MoMo',     zone:'12 pays africains',           color:'#F59E0B', section:'Mobile Money'   },
  { name:'M-Pesa Daraja',zone:'KE · TZ · MZ',               color:'#00A550', section:'Mobile Money'   },
  { name:'Orange Money', zone:'CI · SN · ML · CM · GN',     color:'#FF6B00', section:'Mobile Money'   },
  { name:'Airtel Money', zone:'14 pays Afrique',             color:'#EF4444', section:'Mobile Money'   },
  { name:'Paystack',     zone:'NG · GH · KE · ZA',          color:'#00A550', section:'Anglophone'     },
  { name:'Flutterwave',  zone:'11 pays africains',           color:'#F59E0B', section:'Anglophone'     },
  { name:'Flouci',       zone:'Tunisie',                     color:'#0EA5E9', section:'Tunisie'        },
  { name:'Paymee',       zone:'Tunisie',                     color:'#6366F1', section:'Tunisie'        },
  { name:'Yoco',         zone:'Afrique du Sud · ZAR',        color:'#0057FF', section:'Afrique du Sud' },
  { name:'PayPal',       zone:'200+ pays',                   color:'#0057FF', section:'International'  },
  { name:'Stripe',       zone:'Europe · USA · Canada',       color:'#6366F1', section:'International'  },
  { name:'Mollie',       zone:'Europe · 15 pays',            color:'#0057FF', section:'International'  },
  { name:'Adyen',        zone:'Mondial · 50+ pays',          color:'#14B8A6', section:'International'  },
  { name:'Checkout.com', zone:'Mondial · 60+ pays',          color:'#0A0A0A', section:'International'  },
  { name:'Braintree',    zone:'USA · Europe · AU',           color:'#0057FF', section:'International'  },
  { name:'Razorpay',     zone:'Inde',                        color:'#0057FF', section:'Inde'           },
  { name:'Square',       zone:'USA · CA · UK · AU',          color:'#0A0A0A', section:'USA / Canada'   },
  { name:'Authorize.net',zone:'USA · Canada',                color:'#0057FF', section:'USA / Canada'   },
];

const PROVIDER_SECTIONS = ['Agrégateurs','Mobile Money','Anglophone','Tunisie','Afrique du Sud','International','Inde','USA / Canada'];
const SECTION_LABELS = {
  'Agrégateurs':    "Agrégateurs Afrique de l'Ouest",
  'Mobile Money':   'Mobile Money direct (opérateurs)',
  'Anglophone':     'Afrique anglophone',
  'Tunisie':        'Tunisie',
  'Afrique du Sud': 'Afrique du Sud',
  'International':  'International',
  'Inde':           'Inde',
  'USA / Canada':   'USA / Canada',
};

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  const lc = LANG_COLORS[lang] || LANG_COLORS.text;
  const copy = () => {
    navigator.clipboard.writeText(code);
    toast.success('Copié !');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div style={{ borderRadius:14, overflow:'hidden', border:'1px solid #1E2433' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#161B27', padding:'10px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', gap:5 }}>
            {['#FF5F56','#FFBD2E','#27C93F'].map((c,i) => <div key={i} style={{ width:9, height:9, borderRadius:'50%', background:c }}/>)}
          </div>
          <span style={{ fontSize:10, fontWeight:800, letterSpacing:'.06em', background:lc.bg, color:lc.color, padding:'2px 8px', borderRadius:5 }}>{lc.label}</span>
        </div>
        <button onClick={copy} style={{ display:'flex', alignItems:'center', gap:5, background:copied?'rgba(0,165,80,.15)':'rgba(255,255,255,.06)', border:`1px solid ${copied?'rgba(0,165,80,.3)':'rgba(255,255,255,.08)'}`, borderRadius:7, padding:'5px 11px', fontSize:11, fontWeight:600, color:copied?'#00A550':'#8899AA', cursor:'pointer', transition:'all .2s' }}>
          {copied ? <CheckCircle size={12}/> : <Copy size={12}/>}
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
      <div style={{ background:'#0D1117', padding:'16px 20px', overflowX:'auto', maxHeight:340, overflowY:'auto' }}>
        <pre style={{ fontFamily:"'Fira Code','Cascadia Code','Courier New',monospace", fontSize:12, lineHeight:1.8, color:'#E6EDF3', margin:0, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{code}</pre>
      </div>
    </div>
  );
}

function ItemCard({ item }) {
  return (
    <div style={{ border:'1px solid #EBEBEB', borderRadius:18, overflow:'hidden', background:'#fff' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'16px 20px', background:'#FAFAFA', borderBottom:'1px solid #F0F0F0', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'#111' }}>{item.name}</div>
          {item.desc && <div style={{ fontSize:12, color:'#AAA', marginTop:3, lineHeight:1.5 }}>{item.desc}</div>}
        </div>
      </div>
      <div style={{ padding:'14px' }}>
        <CodeBlock code={item.code} lang={item.lang}/>
      </div>
    </div>
  );
}

export default function GatewayApiDocs() {
  const [activeTab, setActiveTab] = useState('quickstart');
  const active        = METHODS[activeTab];
  const activeTabMeta = TABS.find(t => t.id === activeTab);

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'20px 16px 48px', fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .doc-tab::-webkit-scrollbar { display:none; }
        .doc-tab { scrollbar-width:none; }
        .provider-card:hover { border-color:var(--hc) !important; background:var(--hb) !important; }
        .provider-section-title { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.08em; margin:18px 0 8px; }
        .provider-section-title:first-child { margin-top:0; }
      `}</style>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#0A0A0F 0%,#1A1A2E 100%)', borderRadius:22, padding:'32px 28px', marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,107,0,.07)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-60, right:80, width:140, height:140, borderRadius:'50%', background:'rgba(0,87,255,.07)', pointerEvents:'none' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#FF6B00,#FFAA00)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(255,107,0,.4)' }}>
              <BookOpen size={18} color="#fff"/>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.1em' }}>Référence</div>
              <div style={{ fontSize:18, fontWeight:900, color:'#fff', letterSpacing:'-.02em', lineHeight:1 }}>Documentation API</div>
            </div>
          </div>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.5)', maxWidth:520, lineHeight:1.6, marginBottom:14 }}>
            Intégrez la passerelle en 2 étapes : appelez <code style={{ color:'#FF6B00', fontFamily:"'DM Mono',monospace" }}>generate-link</code> avec votre clé API, redirigez vers l'URL retournée.
          </p>

          {/* Base URL */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'8px 14px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, width:'fit-content' }}>
            <Key size={12} color="#FF6B00"/>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.4)', fontFamily:"'DM Mono',monospace" }}>Base URL :</span>
            <span style={{ fontSize:12, color:'#FF6B00', fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{BASE_URL}</span>
          </div>

          {/* Note sécurité pid */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8, padding:'10px 14px', background:'rgba(0,165,80,.08)', border:'1px solid rgba(0,165,80,.2)', borderRadius:10, maxWidth:600 }}>
            <Lock size={13} color="#00A550" style={{ flexShrink:0, marginTop:1 }}/>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.55)', lineHeight:1.5 }}>
              <strong style={{ color:'#00A550' }}>URL sécurisée :</strong> les liens générés contiennent un <code style={{ color:'#FF6B00', fontFamily:"'DM Mono',monospace" }}>?pid=UUID</code> opaque — la clé API n'est jamais dans l'URL. Le pid expire après 15 minutes.
            </span>
          </div>

          <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 14px', background:'rgba(255,107,0,.08)', border:'1px solid rgba(255,107,0,.2)', borderRadius:10, maxWidth:600 }}>
            <Shield size={13} color="#FF6B00" style={{ flexShrink:0, marginTop:1 }}/>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.55)', lineHeight:1.5 }}>
              <strong style={{ color:'#FF6B00' }}>Clé API :</strong> toujours dans le header <code style={{ color:'#FF6B00', fontFamily:"'DM Mono',monospace" }}>x-api-key</code> — jamais dans le corps de la requête ni dans l'URL.
            </span>
          </div>
        </div>
      </div>

      {/* Tabs + contenu */}
      <div style={{ display:'flex', gap:18, alignItems:'flex-start' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="doc-tab" style={{ display:'flex', gap:4, overflowX:'auto', WebkitOverflowScrolling:'touch', background:'#F3F4F6', borderRadius:14, padding:4, marginBottom:20 }}>
            {TABS.map(t => {
              const on = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex:'0 0 auto', display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'none', background:on?'#fff':'transparent', color:on?'#111':'#888', fontWeight:on?700:500, fontSize:12, cursor:'pointer', transition:'all .18s', whiteSpace:'nowrap', boxShadow:on?'0 1px 6px rgba(0,0,0,.08)':'none', fontFamily:'inherit' }}>
                  <t.icon size={13} color={on?t.color:'#CCC'}/>
                  {t.label}
                </button>
              );
            })}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18, animation:'fadeUp .3s ease' }}>
            <div style={{ width:42, height:42, borderRadius:12, flexShrink:0, background:`${activeTabMeta?.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {activeTabMeta && <activeTabMeta.icon size={18} color={activeTabMeta.color}/>}
            </div>
            <div>
              <div style={{ fontSize:17, fontWeight:900, color:'#0A0A0A', letterSpacing:'-.015em' }}>{active.title}</div>
              <div style={{ fontSize:12, color:'#AAA', marginTop:2 }}>{active.sub}</div>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:14, animation:'fadeUp .35s ease' }}>
            {active.items.map((item, idx) => <ItemCard key={idx} item={item}/>)}
          </div>
        </div>
      </div>

      {/* Providers */}
      <div style={{ marginTop:28, background:'#fff', border:'1px solid #EBEBEB', borderRadius:20, padding:'24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:'#FFF3EA', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Globe size={16} color="#FF6B00"/>
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'#111' }}>Providers supportés</div>
            <div style={{ fontSize:12, color:'#AAA', marginTop:1 }}>{PROVIDERS.length} intégrations disponibles</div>
          </div>
        </div>
        {PROVIDER_SECTIONS.map(section => {
          const list = PROVIDERS.filter(p => p.section === section);
          if (!list.length) return null;
          return (
            <div key={section}>
              <div className="provider-section-title">{SECTION_LABELS[section]}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, marginBottom:4 }}>
                {list.map(p => (
                  <div key={p.name} className="provider-card" style={{ '--hc':p.color, '--hb':`${p.color}0D`, border:'1.5px solid #EBEBEB', borderRadius:12, padding:'10px 12px', transition:'all .2s', cursor:'default' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#222', marginBottom:2 }}>{p.name}</div>
                    <div style={{ fontSize:10, color:'#AAA', fontWeight:500 }}>{p.zone}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Support */}
      <div style={{ marginTop:20, background:'linear-gradient(135deg,#FF6B00,#FFAA00)', borderRadius:20, padding:'24px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:900, color:'#fff', marginBottom:4 }}>Besoin d'aide pour intégrer ?</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.75)' }}>Notre équipe technique est disponible 24/7.</div>
        </div>
        <a href="mailto:support@paymentgateway.com" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#fff', color:'#FF6B00', padding:'11px 22px', borderRadius:12, fontSize:13, fontWeight:800, textDecoration:'none', boxShadow:'0 4px 16px rgba(0,0,0,.12)', flexShrink:0 }}>
          <Mail size={15}/> Contacter le support
        </a>
      </div>
    </div>
  );
}