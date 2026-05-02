import { useState, useCallback, useEffect } from 'react';

const BASE_URL = 'https://paymentgateway.lfdweb.com';

const LANG_COLORS = {
  html:       { bg: '#fff3ea', color: '#c2410c', darkBg: '#3b1a0a', darkColor: '#fb923c', label: 'HTML'  },
  javascript: { bg: '#fffbeb', color: '#b45309', darkBg: '#2d2006', darkColor: '#fbbf24', label: 'JS'    },
  jsx:        { bg: '#eff6ff', color: '#1d4ed8', darkBg: '#0f1f4a', darkColor: '#60a5fa', label: 'JSX'   },
  php:        { bg: '#faf5ff', color: '#7c3aed', darkBg: '#1e0f3a', darkColor: '#a78bfa', label: 'PHP'   },
  python:     { bg: '#f0fdf4', color: '#166534', darkBg: '#0a2a14', darkColor: '#4ade80', label: 'PY'    },
  bash:       { bg: '#f1f5f9', color: '#475569', darkBg: '#1a2030', darkColor: '#94a3b8', label: 'cURL'  },
  dart:       { bg: '#ecfeff', color: '#0e7490', darkBg: '#082830', darkColor: '#22d3ee', label: 'Dart'  },
  text:       { bg: '#f8fafc', color: '#64748b', darkBg: '#1a2030', darkColor: '#94a3b8', label: 'TEXT'  },
};

const NAV = [
  { group: 'Getting started', items: [{ id: 'quickstart', label: 'Démarrage rapide' }] },
  {
    group: 'Intégration',
    items: [
      { id: 'html',       label: 'HTML'              },
      { id: 'javascript', label: 'JavaScript / Node' },
      { id: 'php',        label: 'PHP'               },
      { id: 'python',     label: 'Python'            },
      { id: 'wordpress',  label: 'WordPress'         },
      { id: 'mobile',     label: 'Mobile'            },
      { id: 'qrcode',     label: 'QR Code'           },
    ],
  },
  {
    group: 'API Reference',
    items: [
      { id: 'api',       label: 'REST API'       },
      { id: 'webhooks',  label: 'Webhooks'       },
      { id: 'providers', label: 'Providers (30)' },
    ],
  },
];

const TABS = {
  quickstart: {
    title: 'Démarrage rapide',
    sub:   "Appelez generate-link avec votre clé API — pid UUID sécurisé retourné.",
    alerts: [
      { type: 'info', text: `URL sécurisée : les liens générés contiennent un <code>?pid=UUID</code> opaque — la clé API n'est jamais dans l'URL. Le pid expire après 15 minutes.` },
      { type: 'warn', text: `Clé API : toujours dans le header <code>x-api-key</code> — jamais dans le corps de la requête ni dans l'URL.` },
    ],
    items: [
      {
        name: '① Générer un lien de paiement',
        desc: "Appelez POST /api/gateway/generate-link. La gateway crée un pid (UUID opaque) expirant après 15 minutes.",
        lang: 'javascript',
        code: `const response = await fetch('${BASE_URL}/api/gateway/generate-link', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'gw_votre_cle_api'
  },
  body: JSON.stringify({
    amount: 5000,
    description: 'Facture #123',
    country: 'bj',
    method: 'mtn_money'
  })
});

const data = await response.json();
console.log(data.url);
// → ${BASE_URL}/pay?pid=a1b2c3d4-e5f6-4abc-8def-ef1234567890`,
      },
      {
        name: '② Envoyer le lien (Email / SMS)',
        desc: "Le pid est opaque — aucune donnée sensible lisible dans l'URL.",
        lang: 'text',
        code: `// Lien sécurisé à envoyer par email ou SMS
${BASE_URL}/pay?pid=a1b2c3d4-e5f6-4abc-8def-ef1234567890

// Ce pid :
// ✅ Ne contient aucune donnée — c'est une référence Firestore
// ✅ Expire après 15 minutes
// ✅ La clé API reste côté serveur
// ✅ Impossible à deviner (UUID v4 = 2^122 combinaisons)`,
      },
      {
        name: '③ Rediriger après génération',
        lang: 'javascript',
        code: `app.post('/payer', async (req, res) => {
  const { amount, description } = req.body;
  const response = await fetch('${BASE_URL}/api/gateway/generate-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GATEWAY_API_KEY
    },
    body: JSON.stringify({ amount, description })
  });
  const data = await response.json();
  if (data.success) {
    res.redirect(data.url);
  } else {
    res.status(400).json({ error: data.error });
  }
});`,
      },
      {
        name: '④ Paiement direct via API',
        desc: "Alternative au lien — initier directement un paiement mobile money.",
        lang: 'javascript',
        code: `const res = await fetch('${BASE_URL}/api/gateway/pay', {
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
    sub:   "Le lien est généré côté serveur — le bouton HTML redirige vers l'URL avec pid.",
    items: [
      {
        name: 'Bouton de paiement (lien pré-généré)',
        desc: "Générez l'URL côté serveur et injectez-la dans le bouton HTML.",
        lang: 'html',
        code: `<!-- L'URL avec ?pid= est générée côté serveur et injectée dans la page -->
<a href="<?php echo $paymentUrl; ?>" class="btn-payer">
  Payer 5 000 XOF
</a>

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
        name: 'Génération dynamique (JavaScript)',
        lang: 'html',
        code: `<button onclick="startPayment()">Payer 5 000 XOF</button>

<script>
async function startPayment() {
  const res = await fetch('/api/creer-lien', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 5000, description: 'Facture #123' })
  });
  const { url } = await res.json();
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
    sub:   "Appelez generate-link depuis votre backend — la clé API reste côté serveur.",
    items: [
      {
        name: 'Express — générer un lien',
        lang: 'javascript',
        code: `const express = require('express');
const fetch   = require('node-fetch');
const app     = express();
app.use(express.json());

app.post('/creer-lien', async (req, res) => {
  const { amount, description, country, method } = req.body;
  const response = await fetch('${BASE_URL}/api/gateway/generate-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GATEWAY_API_KEY
    },
    body: JSON.stringify({ amount, description, country, method })
  });
  const data = await response.json();
  if (data.success) {
    res.json({ url: data.url });
  } else {
    res.status(400).json({ error: data.error });
  }
});`,
      },
      {
        name: 'Popup + vérification de statut',
        lang: 'javascript',
        code: `async function payerEtSuivre(amount, description) {
  const linkRes = await fetch('/creer-lien', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, description })
  });
  const { url, transactionId } = await linkRes.json();
  const popup = window.open(url, 'payment', 'width=480,height=700');

  const interval = setInterval(async () => {
    const statusRes = await fetch('/verifier-paiement/' + transactionId);
    const { status } = await statusRes.json();
    if (status === 'completed') {
      clearInterval(interval);
      popup?.close();
      alert('Paiement réussi !');
    } else if (status === 'failed') {
      clearInterval(interval);
      popup?.close();
      alert('Paiement échoué');
    }
  }, 5000);
}`,
      },
      {
        name: 'Route de vérification',
        lang: 'javascript',
        code: `app.get('/verifier-paiement/:id', async (req, res) => {
  const response = await fetch(
    '${BASE_URL}/api/gateway/verify/' + req.params.id,
    { headers: { 'x-api-key': process.env.GATEWAY_API_KEY } }
  );
  const data = await response.json();
  res.json(data);
});`,
      },
      {
        name: 'Next.js API Route',
        lang: 'jsx',
        code: `// pages/api/creer-lien.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { amount, description } = req.body;
  const response = await fetch('${BASE_URL}/api/gateway/generate-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GATEWAY_API_KEY
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
    sub:   "Appelez generate-link côté serveur — clé API dans les variables d'environnement.",
    items: [
      {
        name: 'Générer un lien de paiement',
        lang: 'php',
        code: `<?php
function creerLienPaiement($amount, $description, $country = null, $method = null) {
  $ch = curl_init('${BASE_URL}/api/gateway/generate-link');
  curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
      'Content-Type: application/json',
      'x-api-key: ' . getenv('GATEWAY_API_KEY')
    ],
    CURLOPT_POSTFIELDS     => json_encode(array_filter([
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
}

$url = creerLienPaiement(5000, 'Facture #123', 'bj', 'mtn_money');
if ($url) { header('Location: ' . $url); exit; }`,
      },
      {
        name: 'Paiement direct',
        lang: 'php',
        code: `<?php
function initierPaiement($amount, $description, $country = 'bj', $method = 'mtn_money', $phone = '') {
  $ch = curl_init('${BASE_URL}/api/gateway/pay');
  curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
      'Content-Type: application/json',
      'x-api-key: ' . getenv('GATEWAY_API_KEY')
    ],
    CURLOPT_POSTFIELDS     => json_encode([
      'amount'      => $amount,
      'description' => $description,
      'country'     => $country,
      'method'      => $method,
      'phone'       => $phone,
    ]),
    CURLOPT_RETURNTRANSFER => true,
  ]);
  $response = curl_exec($ch);
  curl_close($ch);
  return json_decode($response, true);
}

$p = initierPaiement(5000, 'Facture #123', 'bj', 'mtn_money', '22961000000');
if ($p['success']) { header('Location: ' . $p['url']); exit; }`,
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
  mail($tx['email'] ?? '', 'Paiement confirmé',
    "Paiement de {$tx['amount']} XOF reçu.");
}

http_response_code(200);
echo json_encode(['received' => true]);`,
      },
    ],
  },
  python: {
    title: 'Python',
    sub:   "generate-link depuis Flask/Django — clé API dans os.environ.",
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
            'x-api-key': os.environ['GATEWAY_API_KEY']
        },
        json=payload,
        timeout=10
    )
    data = response.json()
    return data.get('url') if data.get('success') else None

# Vue Django
def payer(request):
    url = creer_lien_paiement(5000, 'Facture #123', 'bj', 'mtn_money')
    if url:
        return redirect(url)
    return HttpResponse('Erreur', status=400)`,
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
    sub:   "Shortcode qui appelle generate-link côté serveur PHP.",
    items: [
      {
        name: 'Shortcode bouton de paiement',
        lang: 'php',
        code: `// Dans functions.php — stocker la clé dans wp-config.php :
// define('GATEWAY_API_KEY', 'gw_votre_cle_api');

function creer_lien_gateway($amount, $description) {
  $ch = curl_init('${BASE_URL}/api/gateway/generate-link');
  curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
      'Content-Type: application/json',
      'x-api-key: ' . GATEWAY_API_KEY
    ],
    CURLOPT_POSTFIELDS     => json_encode([
      'amount'      => (int) $amount,
      'description' => $description,
    ]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
  ]);
  $data = json_decode(curl_exec($ch), true);
  curl_close($ch);
  return $data['url'] ?? '#';
}

add_shortcode('bouton_paiement', function($atts) {
  $atts = shortcode_atts(['montant' => '5000', 'desc' => 'Paiement'], $atts);
  $url  = creer_lien_gateway($atts['montant'], $atts['desc']);
  return '<a href="' . esc_url($url) . '" target="_blank" class="btn-paiement">'
       . 'Payer ' . number_format($atts['montant']) . ' XOF</a>';
});

// Usage : [bouton_paiement montant="10000" desc="Formation"]`,
      },
    ],
  },
  mobile: {
    title: 'Mobile — Flutter & React Native',
    sub:   "Le lien est généré par votre backend — jamais côté application mobile.",
    alerts: [
      { type: 'warn', text: "La clé API ne doit <strong>jamais</strong> être dans le code mobile. Appelez votre propre backend qui appelle <code>generate-link</code>." },
    ],
    items: [
      {
        name: 'Flutter (Dart)',
        lang: 'dart',
        code: `import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';

Future<String?> creerLien(double amount, String description) async {
  final res = await http.post(
    Uri.parse('https://votre-api.com/creer-lien'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'amount': amount, 'description': description})
  );
  final data = jsonDecode(res.body);
  return data['url'];
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

async function creerLien(amount, description) {
  const res = await fetch('https://votre-api.com/creer-lien', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, description })
  });
  const data = await res.json();
  return data.url;
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
    sub:   "Le pid dans le QR code — opaque et expirant en 15 minutes.",
    items: [
      {
        name: 'QR Code avec pid (lien sécurisé)',
        lang: 'html',
        code: `<img id="qrcode" alt="QR Code de paiement" />

<script>
async function loadQR() {
  const res = await fetch('/api/creer-lien', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 5000, description: 'Facture #123' })
  });
  const { url } = await res.json();
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
  document.getElementById('qrcode').src =
    'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data='
    + encodeURIComponent(url);
}
</script>`,
      },
    ],
  },
  api: {
    title: 'REST API',
    sub:   "Référence complète — clé API en header x-api-key pour tous les appels.",
    items: [
      {
        name: 'POST /api/gateway/generate-link',
        desc: "Crée un pid UUID opaque et retourne l'URL de paiement. Expire dans 15 min.",
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
}`,
      },
      {
        name: 'POST /api/gateway/pay',
        desc: "Initier un paiement direct sans page intermédiaire.",
        lang: 'bash',
        code: `curl -X POST ${BASE_URL}/api/gateway/pay \\
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
  "provider": "feexpay"
}`,
      },
      {
        name: 'GET /api/gateway/verify/:id',
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
        name: 'GET /api/gateway/methods/:country',
        desc: "Endpoint public — pas de clé API requise.",
        lang: 'bash',
        code: `curl ${BASE_URL}/api/gateway/methods/bj

# Réponse
{
  "country": "bj",
  "name": "Bénin",
  "currency": "XOF",
  "methods": [
    {"id": "mtn_money",     "name": "MTN Mobile Money"},
    {"id": "moov_money",    "name": "Moov Money"},
    {"id": "celtiis_money", "name": "CELTIIS Money"},
    {"id": "card",          "name": "Carte Bancaire"}
  ]
}`,
      },
      {
        name: 'GET /api/gateway/balance',
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
    sub:   'Recevez des événements en temps réel sur votre serveur.',
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
  providers: { title: 'Providers supportés', sub: '30 intégrations disponibles.', items: [] },
};

const PROVIDERS = [
  { name: 'FeexPay',       zone: 'BJ · CI · TG · SN · BF',      section: 'Agrégateurs'    },
  { name: 'KKiaPay',       zone: 'UEMOA + CEMAC · 11 pays',      section: 'Agrégateurs'    },
  { name: 'CinetPay',      zone: '11 pays Afrique',              section: 'Agrégateurs'    },
  { name: 'Hub2',          zone: '10 pays Afrique',              section: 'Agrégateurs'    },
  { name: 'FedaPay',       zone: '10 pays Afrique',              section: 'Agrégateurs'    },
  { name: 'Qosic',         zone: '12 pays Afrique',              section: 'Agrégateurs'    },
  { name: 'Lygos',         zone: '12 pays Afrique',              section: 'Agrégateurs'    },
  { name: 'Bizao',         zone: '11 pays Afrique',              section: 'Agrégateurs'    },
  { name: 'PayDunya',      zone: 'UEMOA · 8 pays',               section: 'Agrégateurs'    },
  { name: 'MbiyoPay',      zone: '11 pays Afrique',              section: 'Agrégateurs'    },
  { name: 'GeniusPay',     zone: 'CI · SN · BJ · CM · 12 pays', section: 'Agrégateurs'    },
  { name: 'Wave',          zone: 'SN · CI · ML · UG · CM',       section: 'Mobile Money'   },
  { name: 'MTN MoMo',      zone: '12 pays africains',            section: 'Mobile Money'   },
  { name: 'M-Pesa Daraja', zone: 'KE · TZ · MZ',                section: 'Mobile Money'   },
  { name: 'Orange Money',  zone: 'CI · SN · ML · CM · GN',       section: 'Mobile Money'   },
  { name: 'Airtel Money',  zone: '14 pays Afrique',              section: 'Mobile Money'   },
  { name: 'Paystack',      zone: 'NG · GH · KE · ZA',            section: 'Anglophone'     },
  { name: 'Flutterwave',   zone: '11 pays africains',            section: 'Anglophone'     },
  { name: 'Flouci',        zone: 'Tunisie',                      section: 'Tunisie'        },
  { name: 'Paymee',        zone: 'Tunisie',                      section: 'Tunisie'        },
  { name: 'Yoco',          zone: 'Afrique du Sud · ZAR',          section: 'Afrique du Sud' },
  { name: 'PayPal',        zone: '200+ pays',                    section: 'International'  },
  { name: 'Stripe',        zone: 'Europe · USA · Canada',         section: 'International'  },
  { name: 'Mollie',        zone: 'Europe · 15 pays',             section: 'International'  },
  { name: 'Adyen',         zone: 'Mondial · 50+ pays',           section: 'International'  },
  { name: 'Checkout.com',  zone: 'Mondial · 60+ pays',           section: 'International'  },
  { name: 'Braintree',     zone: 'USA · Europe · AU',            section: 'International'  },
  { name: 'Razorpay',      zone: 'Inde',                         section: 'Inde'           },
  { name: 'Square',        zone: 'USA · CA · UK · AU',            section: 'USA / Canada'   },
  { name: 'Authorize.net', zone: 'USA · Canada',                 section: 'USA / Canada'   },
];

const PROVIDER_SECTIONS = ['Agrégateurs','Mobile Money','Anglophone','Tunisie','Afrique du Sud','International','Inde','USA / Canada'];
const SECTION_LABELS = {
  'Agrégateurs':    "Agrégateurs Afrique de l'Ouest",
  'Mobile Money':   'Mobile Money (opérateurs)',
  'Anglophone':     'Afrique anglophone',
  'Tunisie':        'Tunisie',
  'Afrique du Sud': 'Afrique du Sud',
  'International':  'International',
  'Inde':           'Inde',
  'USA / Canada':   'USA / Canada',
};

/* ─── THEME ─────────────────────────────────────────────────────────────── */
const themes = {
  light: {
    bg: '#f9fafb',
    sidebar: '#ffffff',
    sidebarBorder: '#e5e7eb',
    topbar: '#ffffff',
    topbarBorder: '#e5e7eb',
    card: '#ffffff',
    cardBorder: '#e5e7eb',
    cardHeader: '#f9fafb',
    cardHeaderBorder: '#f3f4f6',
    text: '#111111',
    textMuted: '#6b7280',
    textFaint: '#9ca3af',
    navGroup: '#9ca3af',
    navActive: '#ea580c',
    navActiveBg: '#fff7ed',
    navInactive: '#6b7280',
    navDot: '#d1d5db',
    accent: '#ea580c',
    accentBg: '#fff7ed',
    accentBorder: '#fdba74',
    accentText: '#9a3412',
    accentSub: '#c2410c',
    codeBar: '#1e2430',
    codeBg: '#0d1117',
    codeText: '#e2e8f0',
    toggleBg: '#f3f4f6',
    toggleBorder: '#e5e7eb',
    toggleIcon: '#6b7280',
    urlBg: '#f9fafb',
    urlText: '#6b7280',
    infoBg: '#f0fdf4', infoBorder: '#86efac', infoText: '#166534',
    warnBg: '#fff7ed', warnBorder: '#fdba74', warnText: '#9a3412',
    providerCard: '#ffffff', providerBorder: '#e5e7eb',
  },
  dark: {
    bg: '#0f1117',
    sidebar: '#161b27',
    sidebarBorder: '#232b3a',
    topbar: '#161b27',
    topbarBorder: '#232b3a',
    card: '#1a2233',
    cardBorder: '#232b3a',
    cardHeader: '#161b27',
    cardHeaderBorder: '#232b3a',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    textFaint: '#64748b',
    navGroup: '#64748b',
    navActive: '#fb923c',
    navActiveBg: 'rgba(251,146,60,0.12)',
    navInactive: '#94a3b8',
    navDot: '#334155',
    accent: '#fb923c',
    accentBg: 'rgba(251,146,60,0.1)',
    accentBorder: 'rgba(251,146,60,0.3)',
    accentText: '#fb923c',
    accentSub: '#fdba74',
    codeBar: '#1e2d3d',
    codeBg: '#0a0f1a',
    codeText: '#e2e8f0',
    toggleBg: '#1a2233',
    toggleBorder: '#232b3a',
    toggleIcon: '#94a3b8',
    urlBg: '#0f1117',
    urlText: '#64748b',
    infoBg: 'rgba(74,222,128,0.08)', infoBorder: 'rgba(74,222,128,0.25)', infoText: '#4ade80',
    warnBg: 'rgba(251,191,36,0.08)', warnBorder: 'rgba(251,191,36,0.25)', warnText: '#fbbf24',
    providerCard: '#1a2233', providerBorder: '#232b3a',
  },
};

/* ─── COPY BUTTON ───────────────────────────────────────────────────────── */
function CopyBtn({ code, t }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [code]);
  return (
    <button onClick={handleCopy} style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 5,
      border: `1px solid ${copied ? 'rgba(34,197,94,.35)' : 'rgba(255,255,255,.12)'}`,
      background: copied ? 'rgba(34,197,94,.14)' : 'rgba(255,255,255,.06)',
      color: copied ? '#4ade80' : 'rgba(255,255,255,.5)',
      fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all .15s',
    }}>
      {copied
        ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9l4 4 8-8"/></svg>
        : <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5"/></svg>
      }
      {copied ? 'Copié !' : 'Copier'}
    </button>
  );
}

/* ─── CODE BLOCK ────────────────────────────────────────────────────────── */
function CodeBlock({ code, lang, t, dark }) {
  const lc = LANG_COLORS[lang] || LANG_COLORS.text;
  const badgeBg = dark ? lc.darkBg : lc.bg;
  const badgeColor = dark ? lc.darkColor : lc.color;
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${dark ? '#1e2d3d' : '#1e2430'}` }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: t.codeBar, padding: '8px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#ff5f56','#ffbd2e','#27c93f'].map((c,i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
            background: badgeBg, color: badgeColor, letterSpacing: '.04em',
          }}>{lc.label}</span>
        </div>
        <CopyBtn code={code} t={t} />
      </div>
      <pre style={{
        background: t.codeBg, margin: 0,
        padding: '16px 18px',
        fontFamily: "'Fira Code','Cascadia Code','Courier New',monospace",
        fontSize: 12, lineHeight: 1.8, color: t.codeText,
        overflowX: 'auto', maxHeight: 340, overflowY: 'auto',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>{code}</pre>
    </div>
  );
}

/* ─── ITEM CARD ─────────────────────────────────────────────────────────── */
function ItemCard({ item, t, dark }) {
  return (
    <div style={{
      border: `1px solid ${t.cardBorder}`, borderRadius: 12, overflow: 'hidden',
      background: t.card, marginBottom: 16,
    }}>
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${t.cardHeaderBorder}`, background: t.cardHeader }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: item.desc ? 3 : 0 }}>{item.name}</div>
        {item.desc && <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>{item.desc}</div>}
      </div>
      <div style={{ padding: 14 }}>
        <CodeBlock code={item.code} lang={item.lang} t={t} dark={dark} />
      </div>
    </div>
  );
}

/* ─── ALERT ─────────────────────────────────────────────────────────────── */
function Alert({ type, text, t }) {
  const bg = type === 'info' ? t.infoBg : t.warnBg;
  const border = type === 'info' ? t.infoBorder : t.warnBorder;
  const color = type === 'info' ? t.infoText : t.warnText;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', borderRadius: 8,
      background: bg, border: `1px solid ${border}`,
      color, fontSize: 12, lineHeight: 1.6, marginBottom: 8,
    }}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 1 }}>
        {type === 'info'
          ? <><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.01"/></>
          : <><path d="M8 2L1.5 13.5h13L8 2z"/><path d="M8 7v3M8 11.5v.01"/></>}
      </svg>
      <span dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

/* ─── PROVIDERS PAGE ────────────────────────────────────────────────────── */
function ProvidersPage({ t }) {
  return (
    <div>
      {PROVIDER_SECTIONS.map(section => {
        const list = PROVIDERS.filter(p => p.section === section);
        if (!list.length) return null;
        return (
          <div key={section}>
            <div style={{
              fontSize: 10, fontWeight: 600, color: t.navGroup,
              textTransform: 'uppercase', letterSpacing: '.06em',
              margin: '20px 0 8px',
            }}>{SECTION_LABELS[section]}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {list.map(p => (
                <div key={p.name} style={{
                  padding: '10px 12px',
                  border: `1px solid ${t.providerBorder}`,
                  borderRadius: 8,
                  background: t.providerCard,
                  cursor: 'default',
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: t.textFaint }}>{p.zone}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── SUPPORT BAR ───────────────────────────────────────────────────────── */
function SupportBar({ t }) {
  return (
    <div style={{
      marginTop: 28, padding: '20px 24px',
      background: t.accentBg, border: `1px solid ${t.accentBorder}`,
      borderRadius: 12,
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.accentText, marginBottom: 2 }}>
          Besoin d'aide pour intégrer ?
        </div>
        <div style={{ fontSize: 12, color: t.accentSub }}>
          Notre équipe technique est disponible 24/7.
        </div>
      </div>
      <a href="mailto:support@paymentgateway.com" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 8,
        background: '#ea580c', color: '#fff',
        fontSize: 12, fontWeight: 600, textDecoration: 'none',
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="14" height="10" rx="1.5"/>
          <path d="M1 5l7 5 7-5"/>
        </svg>
        Contacter le support
      </a>
    </div>
  );
}

/* ─── SUN / MOON ICONS ──────────────────────────────────────────────────── */
function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11 6 6 0 007.5-3.5z"/>
    </svg>
  );
}

/* ─── HAMBURGER ─────────────────────────────────────────────────────────── */
function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 4h12M2 8h12M2 12h12"/>
    </svg>
  );
}

/* ─── MAIN ──────────────────────────────────────────────────────────────── */
export default function GatewayApiDocs() {
  const [activeTab, setActiveTab]   = useState('quickstart');
  const [dark, setDark]             = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = dark ? themes.dark : themes.light;
  const tab = TABS[activeTab];

  // close sidebar when clicking a link
  const handleTabClick = (id) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: t.bg, fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* ── Overlay mobile ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 40 }}
        />
      )}

      {/* ══════════════ SIDEBAR — fixed height, never scrolls ══════════════ */}
      <aside style={{
        width: 232, flexShrink: 0,
        background: t.sidebar,
        borderRight: `1px solid ${t.sidebarBorder}`,
        display: 'flex', flexDirection: 'column',
        height: '100vh',
        position: 'sticky', top: 0,
        zIndex: 50,
        transition: 'transform .2s ease, box-shadow .2s ease',
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${t.sidebarBorder}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: '#ea580c',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8h10M8 3l5 5-5 5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>Payment Gateway</div>
              <div style={{ fontSize: 10, color: t.textFaint }}>API Reference v1.0</div>
            </div>
          </div>
          <div style={{
            padding: '5px 9px',
            background: t.urlBg, border: `1px solid ${t.sidebarBorder}`,
            borderRadius: 6,
            fontFamily: "'Fira Code',monospace",
            fontSize: 10, color: t.urlText, wordBreak: 'break-all',
          }}>
            paymentgateway.lfdweb.com
          </div>
        </div>

        {/* Nav — scrollable independently */}
        <nav style={{ padding: '8px', flex: 1, overflowY: 'auto' }}>
          {NAV.map(group => (
            <div key={group.group} style={{ marginBottom: 4 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: t.navGroup,
                textTransform: 'uppercase', letterSpacing: '.06em',
                padding: '10px 10px 4px',
              }}>{group.group}</div>
              {group.items.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => handleTabClick(item.id)} style={{
                    display: 'flex', alignItems: 'center',
                    width: '100%', padding: '7px 10px',
                    borderRadius: 6, border: 'none',
                    background: isActive ? t.navActiveBg : 'transparent',
                    color: isActive ? t.navActive : t.navInactive,
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 12.5, cursor: 'pointer',
                    textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background .12s, color .12s',
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: isActive ? t.navActive : t.navDot,
                      marginRight: 9, flexShrink: 0,
                      transition: 'background .12s',
                    }} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: login link */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${t.sidebarBorder}`, flexShrink: 0 }}>
          <a
            href="https://paymentgateway.lfdweb.com/login"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              width: '100%', padding: '9px 0',
              borderRadius: 8,
              background: '#ea580c', color: '#fff',
              fontWeight: 600, fontSize: 12.5, textDecoration: 'none',
              transition: 'opacity .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="9" height="12" rx="1.5"/>
              <path d="M11 5.5l3 2.5-3 2.5M7 8h7"/>
            </svg>
            Se connecter · Obtenir ma clé
          </a>
        </div>
      </aside>

      {/* ══════════════ MAIN — scrollable ══════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{
          padding: '0 28px',
          height: 52,
          background: t.topbar, borderBottom: `1px solid ${t.topbarBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                display: 'none',
                alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34,
                borderRadius: 6, border: `1px solid ${t.toggleBorder}`,
                background: t.toggleBg, cursor: 'pointer', color: t.toggleIcon,
              }}
              className="menu-toggle"
            >
              <MenuIcon />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>
              {tab?.title || 'Documentation'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(!dark)}
              title={dark ? 'Mode clair' : 'Mode sombre'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 8,
                border: `1px solid ${t.toggleBorder}`,
                background: t.toggleBg, cursor: 'pointer', color: t.toggleIcon,
                transition: 'all .15s',
              }}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: t.accentBg, color: t.accent, fontWeight: 600,
            }}>
              v1.0 · REST API
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 32px 48px' }}>

            {/* Page header */}
            {tab && (
              <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${t.cardBorder}` }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 6, margin: '0 0 6px' }}>
                  {tab.title}
                </h1>
                <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.6, margin: 0 }}>
                  {tab.sub}
                </p>
              </div>
            )}

            {/* Alerts */}
            {tab?.alerts?.map((a,i) => <Alert key={i} {...a} t={t} />)}

            {/* Items */}
            {activeTab !== 'providers' && tab?.items.map((item,i) => (
              <ItemCard key={i} item={item} t={t} dark={dark} />
            ))}

            {/* Providers */}
            {activeTab === 'providers' && <ProvidersPage t={t} />}

            {/* Support */}
            <SupportBar t={t} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          aside {
            position: fixed !important;
            left: ${sidebarOpen ? '0' : '-260px'} !important;
            top: 0 !important;
            height: 100vh !important;
            box-shadow: ${sidebarOpen ? '4px 0 24px rgba(0,0,0,.18)' : 'none'} !important;
          }
          .menu-toggle { display: flex !important; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${dark ? '#334155' : '#d1d5db'}; border-radius: 4px; }
      `}</style>
    </div>
  );
}
