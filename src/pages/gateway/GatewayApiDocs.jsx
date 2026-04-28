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
  ─── GÉNÉRATION DU TOKEN SIGNÉ ──────────────────────────────────────────────
  Le token contient amount + description + timestamp + signature HMAC.
  Il est généré côté BACKEND avec la clé secrète GATEWAY_SECRET.
  
  La signature empêche toute modification du montant par le client.
  
  ⚠️ Le GATEWAY_SECRET doit être stocké en variable d'environnement.
  ⚠️ Le token expire après 15 minutes (timestamp vérifié côté serveur).
  
  ─── DEUX MÉTHODES D'INTÉGRATION ────────────────────────────────────────────
  
  Méthode A — Signature côté marchand (recommandé) :
    Le marchand possède le GATEWAY_SECRET et signe lui-même le token.
    → Voir onglets JavaScript, PHP, Python.
  
  Méthode B — Délégation à la gateway :
    Le marchand ne peut pas stocker le GATEWAY_SECRET (site externe).
    Il appelle POST /api/gateway/generate-link avec sa clé API.
    → Voir onglet API REST ou section "Intégration externe" ci-dessous.
  ─────────────────────────────────────────────────────────────────────────────
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
    sub: "Générez un token signé côté backend — amount et description ne sont plus dans l'URL.",
    items: [
      {
        name: '① Générer le token signé (backend) — Méthode A',
        desc: "Cette étape se fait côté serveur. Le token contient le montant, la description et une signature HMAC.",
        lang: 'javascript',
        code: `// ⚠️ Ce code s'exécute côté BACKEND (Node.js)
// JAMAIS côté client — le GATEWAY_SECRET ne doit pas être exposé !

const crypto = require('crypto');

function genererToken(amount, description, country, method) {
  const payload = {
    amount: amount,
    description: description,
    timestamp: Date.now()
  };
  if (country) payload.country = country;
  if (method) payload.method = method;

  const signature = crypto
    .createHmac('sha256', process.env.GATEWAY_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  const tokenData = { ...payload, sig: signature };
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}

// Exemple d'utilisation dans une route Express
app.get('/lien-paiement', (req, res) => {
  const token = genererToken(5000, 'Facture #123', 'bj', 'mtn_money');
  const link = \`${BASE_URL}/pay?token=\${encodeURIComponent(token)}\`;
  res.json({ url: link });
});`,
      },
      {
        name: '② Lien de paiement (Email / SMS)',
        desc: "L'URL ne contient que le token — pas de amount ni desc visibles.",
        lang: 'text',
        code: `// URL générée — seul le token est présent
${BASE_URL}/pay?token=eyJhbW91bnQiOjUwMDAsImRlc2NyaXB0aW9uIjoiRmFjdHVyZSAjMTIzIiwidGltZXN0YW1wIjoxNzE0MzI1Njc4OTAwLCJzaWciOiJhYmMxMjNkZWY0NTYifQ==

// Le client ne peut PAS modifier le montant — la signature empêche toute falsification.`,
      },
      {
        name: '③ Redirection serveur',
        desc: "Redirigez l'utilisateur vers la page de paiement avec le token signé.",
        lang: 'javascript',
        code: `// Route Express — le token est généré à la volée
app.post('/payer', (req, res) => {
  const { amount, description } = req.body;
  const token = genererToken(amount, description);
  res.redirect(\`${BASE_URL}/pay?token=\${encodeURIComponent(token)}\`);
});`,
      },
      {
        name: '④ Intégration externe — Méthode B (sans GATEWAY_SECRET)',
        desc: "Si vous ne pouvez pas stocker le GATEWAY_SECRET (site déployé ailleurs), appelez l'endpoint de génération de la gateway.",
        lang: 'javascript',
        code: `// ⚠️ Cette méthode est pour les marchands qui ne peuvent PAS
// stocker le GATEWAY_SECRET dans leurs variables d'environnement.
// La gateway génère le token signé pour vous.

const GATEWAY_URL = '${BASE_URL}';
const API_KEY = process.env.GATEWAY_API_KEY; // votre clé API marchand

async function creerPaiement(amount, description, country, method) {
  // Appeler l'endpoint de génération de la gateway
  const res = await fetch(\`\${GATEWAY_URL}/api/gateway/generate-link\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({ amount, description, country, method })
  });
  
  const data = await res.json();
  
  if (data.success) {
    // data.url contient l'URL complète avec le token signé
    return data.url;
  }
}

// Exemple d'utilisation dans une API route Next.js
export default async function handler(req, res) {
  const { amount, credits } = req.body;
  
  const response = await fetch(\`\${GATEWAY_URL}/api/gateway/generate-link\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GATEWAY_API_KEY
    },
    body: JSON.stringify({
      amount,
      description: \`Déblocage — \${credits} crédits\`
    })
  });
  
  const data = await response.json();
  res.json({ url: data.url });
}`,
      },
    ],
  },
  html: {
    title: 'Intégration HTML',
    sub: "Le token signé est généré par votre backend et injecté dans la page.",
    items: [
      {
        name: 'Formulaire avec token signé',
        desc: "Le token est généré côté serveur et passé au formulaire.",
        lang: 'html',
        code: `<!-- Le token est généré par votre backend (PHP/Node.js/Python) -->
<!-- et injecté dans la page. L'utilisateur ne voit qu'un token opaque. -->

<form action="${BASE_URL}/pay" method="GET">
  <input type="hidden" name="token" value="<?php echo $token; ?>" />
  <button type="submit" style="background:#f97316;color:#fff;border:none;padding:12px 32px;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">
    💳 Payer
  </button>
</form>

<!-- URL générée : ${BASE_URL}/pay?token=eyJhbW91bnQiOjUwMDAs... -->`,
      },
      {
        name: 'Bouton de paiement dynamique',
        desc: 'Le token est généré par votre API avant affichage.',
        lang: 'html',
        code: `<!-- La page appelle votre backend pour obtenir le token -->
<button id="payBtn" onclick="startPayment()">Payer 5 000 XOF</button>

<script>
async function startPayment() {
  // Appel à VOTRE backend pour générer le token
  const res = await fetch('/api/generer-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 5000, description: 'Facture #123' })
  });
  const { token } = await res.json();
  
  // Redirection vers la gateway avec le token signé
  window.location.href = '${BASE_URL}/pay?token=' + encodeURIComponent(token);
}
</script>`,
      },
    ],
  },
  javascript: {
    title: 'JavaScript / Node.js',
    sub: 'Token signé côté backend — sécurisé et infalsifiable.',
    items: [
      {
        name: 'Génération du token (Node.js) — Méthode A',
        lang: 'javascript',
        code: `const crypto = require('crypto');

function genererToken(amount, description, country, method) {
  const payload = { amount, description, timestamp: Date.now() };
  if (country) payload.country = country;
  if (method) payload.method = method;
  
  const sig = crypto.createHmac('sha256', process.env.GATEWAY_SECRET)
                    .update(JSON.stringify(payload)).digest('hex');
  return Buffer.from(JSON.stringify({...payload, sig})).toString('base64');
}`,
      },
      {
        name: 'Route Express — lien de paiement (Méthode A)',
        lang: 'javascript',
        code: `app.post('/creer-paiement', async (req, res) => {
  const { amount, description } = req.body;
  
  // Générer le token signé
  const crypto = require('crypto');
  const payload = { amount, description, timestamp: Date.now() };
  const sig = crypto.createHmac('sha256', process.env.GATEWAY_SECRET)
                    .update(JSON.stringify(payload)).digest('hex');
  const token = Buffer.from(JSON.stringify({...payload, sig})).toString('base64');
  
  // Retourner l'URL complète
  const url = \`${BASE_URL}/pay?token=\${encodeURIComponent(token)}\`;
  res.json({ url });
});`,
      },
      {
        name: 'Délégation à la gateway (Méthode B)',
        desc: 'Pour les sites qui ne peuvent pas stocker le GATEWAY_SECRET.',
        lang: 'javascript',
        code: `// Appeler l'endpoint de la gateway pour obtenir un token signé
app.post('/creer-paiement', async (req, res) => {
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
  res.json({ url: data.url });
});`,
      },
      {
        name: 'Initier un paiement via API (POST)',
        desc: 'Alternative : appel direct à l\'API avec la clé API en header.',
        lang: 'javascript',
        code: `// Pour les paiements directs sans page intermédiaire
async function payer(amount, description, country, method, phone) {
  const res = await fetch('${BASE_URL}/api/gateway/pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GATEWAY_API_KEY
    },
    body: JSON.stringify({ amount, description, country, method, phone })
  });
  const data = await res.json();
  if (data.url) window.open(data.url, 'payment', 'width=480,height=700');
}`,
      },
    ],
  },
  php: {
    title: 'PHP',
    sub: 'Token signé avec hash_hmac — sécurisé côté serveur.',
    items: [
      {
        name: 'Générer un token signé (Méthode A)',
        lang: 'php',
        code: `<?php
function genererToken($amount, $description, $country = null, $method = null) {
  $payload = [
    'amount' => $amount,
    'description' => $description,
    'timestamp' => round(microtime(true) * 1000)
  ];
  if ($country) $payload['country'] = $country;
  if ($method) $payload['method'] = $method;
  
  $signature = hash_hmac('sha256', json_encode($payload), getenv('GATEWAY_SECRET'));
  $tokenData = array_merge($payload, ['sig' => $signature]);
  
  return base64_encode(json_encode($tokenData));
}

// Utilisation
$token = genererToken(5000, 'Facture #123', 'bj', 'mtn_money');
$url   = '${BASE_URL}/pay?token=' . urlencode($token);
// → ${BASE_URL}/pay?token=eyJhbW91bnQiOjUwMDAs...`,
      },
      {
        name: 'Délégation à la gateway (Méthode B)',
        lang: 'php',
        code: `<?php
function creerLienPaiement($amount, $description, $country = null, $method = null) {
  $ch = curl_init('${BASE_URL}/api/gateway/generate-link');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'x-api-key: ' . getenv('GATEWAY_API_KEY')
    ],
    CURLOPT_POSTFIELDS => json_encode([
      'amount' => $amount,
      'description' => $description,
      'country' => $country,
      'method' => $method
    ]),
    CURLOPT_RETURNTRANSFER => true
  ]);
  $response = curl_exec($ch);
  curl_close($ch);
  $data = json_decode($response, true);
  return $data['url'] ?? null;
}

$url = creerLienPaiement(5000, 'Facture #123', 'bj', 'mtn_money');
header('Location: ' . $url);
exit;`,
      },
      {
        name: 'cURL — initier un paiement via API',
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
      'phone'       => $phone
    ]),
    CURLOPT_RETURNTRANSFER => true
  ]);
  $response = curl_exec($ch);
  curl_close($ch);
  return json_decode($response, true);
}

$paiement = initierPaiement(5000, 'Facture #123', 'bj', 'mtn_money', '22961000000');
header('Location: ' . $paiement['url']);
exit;`,
      },
      {
        name: 'Webhook callback',
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
  python: {
    title: 'Python',
    sub: 'Token signé avec hmac — généré côté serveur.',
    items: [
      {
        name: 'Générer un token signé (Méthode A)',
        lang: 'python',
        code: `import json, hmac, hashlib, base64, os, time

def generer_token(amount, description, country=None, method=None):
    payload = {
        'amount': amount,
        'description': description,
        'timestamp': int(time.time() * 1000)
    }
    if country:
        payload['country'] = country
    if method:
        payload['method'] = method
    
    secret = os.environ.get('GATEWAY_SECRET')
    payload_json = json.dumps(payload, separators=(',', ':'))
    signature = hmac.new(
        secret.encode(),
        payload_json.encode(),
        hashlib.sha256
    ).hexdigest()
    
    token_data = {**payload, 'sig': signature}
    token_json = json.dumps(token_data, separators=(',', ':'))
    return base64.b64encode(token_json.encode()).decode()

# Utilisation
token = generer_token(5000, 'Facture #123', 'bj', 'mtn_money')
url   = f'${BASE_URL}/pay?token={token}'`,
      },
      {
        name: 'Délégation à la gateway (Méthode B)',
        lang: 'python',
        code: `import requests, os

def creer_lien_paiement(amount, description, country=None, method=None):
    response = requests.post(
        f'${BASE_URL}/api/gateway/generate-link',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': os.environ.get('GATEWAY_API_KEY')
        },
        json={
            'amount': amount,
            'description': description,
            'country': country,
            'method': method
        }
    )
    data = response.json()
    return data.get('url') if data.get('success') else None

# Utilisation
url = creer_lien_paiement(5000, 'Facture #123', 'bj', 'mtn_money')`,
      },
    ],
  },
  wordpress: {
    title: 'WordPress',
    sub: "Token signé — amount et description ne sont plus dans l'URL.",
    items: [
      {
        name: 'Shortcode avec token signé (Méthode A)',
        lang: 'php',
        code: `// Dans functions.php de votre thème
define('GATEWAY_URL', '${BASE_URL}');

function generer_token_gateway($amount, $description) {
  $payload = [
    'amount' => $amount,
    'description' => $description,
    'timestamp' => round(microtime(true) * 1000)
  ];
  $sig = hash_hmac('sha256', json_encode($payload), getenv('GATEWAY_SECRET'));
  $tokenData = array_merge($payload, ['sig' => $sig]);
  return base64_encode(json_encode($tokenData));
}

add_shortcode('bouton_paiement', function($atts) {
  $atts = shortcode_atts(['montant' => '5000', 'desc' => 'Paiement'], $atts);
  $token = generer_token_gateway($atts['montant'], $atts['desc']);
  $url = GATEWAY_URL . '/pay?token=' . urlencode($token);
  
  return '<a href="' . esc_url($url) . '" target="_blank" class="btn-paiement">'
       . 'Payer ' . number_format($atts['montant']) . ' XOF</a>';
});`,
      },
      {
        name: 'Shortcode avec délégation (Méthode B)',
        lang: 'php',
        code: `// Pour les sites WordPress qui ne peuvent pas stocker GATEWAY_SECRET
function creer_lien_via_gateway($amount, $description) {
  $ch = curl_init('${BASE_URL}/api/gateway/generate-link');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'x-api-key: ' . getenv('GATEWAY_API_KEY')
    ],
    CURLOPT_POSTFIELDS => json_encode([
      'amount' => $amount,
      'description' => $description
    ]),
    CURLOPT_RETURNTRANSFER => true
  ]);
  $data = json_decode(curl_exec($ch), true);
  curl_close($ch);
  return $data['url'] ?? '';
}

add_shortcode('bouton_paiement', function($atts) {
  $atts = shortcode_atts(['montant' => '5000', 'desc' => 'Paiement'], $atts);
  $url = creer_lien_via_gateway($atts['montant'], $atts['desc']);
  return '<a href="' . esc_url($url) . '" target="_blank">Payer ' . number_format($atts['montant']) . ' XOF</a>';
});`,
      },
    ],
  },
  api: {
    title: 'API REST',
    sub: "Token signé pour les URLs, clé API en header pour les appels directs.",
    items: [
      {
        name: 'POST /api/gateway/generate-link — Générer un lien signé',
        desc: "Pour les marchands qui ne peuvent pas signer eux-mêmes le token (pas d'accès au GATEWAY_SECRET).",
        lang: 'bash',
        code: `# Appelez cet endpoint avec votre clé API pour obtenir un lien signé
curl -X POST ${BASE_URL}/api/gateway/generate-link \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: gw_live_votre_cle_api" \\
  -d '{
    "amount": 5000,
    "description": "Facture #123",
    "country": "bj",
    "method": "mtn_money"
  }'

# Réponse
{
  "success": true,
  "url": "${BASE_URL}/pay?token=eyJhbW91bnQiOjUwMDAs...",
  "token": "eyJhbW91bnQiOjUwMDAs..."
}`,
      },
      {
        name: 'POST /api/gateway/pay — Initier un paiement direct',
        lang: 'bash',
        code: `# Appel direct avec clé API en header
curl -X POST ${BASE_URL}/api/gateway/pay \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: gw_live_votre_cle_api" \\
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
  -H "x-api-key: gw_live_votre_cle_api"

# Réponse
{
  "success": true,
  "status": "completed",
  "reference": "GW-1714000000000",
  "amount": 5000
}`,
      },
      {
        name: 'GET /api/gateway/methods/:country — Méthodes par pays',
        lang: 'bash',
        code: `# Endpoint public — pas besoin de token
curl ${BASE_URL}/api/gateway/methods/bj

# Réponse
{
  "country": "bj",
  "name": "Bénin",
  "currency": "XOF",
  "methods": [
    {"id": "mtn_money", "name": "MTN Mobile Money"},
    {"id": "moov_money", "name": "Moov Money"},
    {"id": "card", "name": "Carte Bancaire"}
  ]
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
    sub: 'Token signé généré par votre backend, jamais exposé dans le code source.',
    items: [
      {
        name: 'Flutter (Dart)',
        lang: 'dart',
        code: `import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';

const gatewayUrl = '${BASE_URL}';

// Le token est généré par VOTRE backend
Future<String> getPaymentToken(double amount, String desc) async {
  final res = await http.post(
    Uri.parse('https://votre-api.com/generer-token'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'amount': amount, 'description': desc})
  );
  return jsonDecode(res.body)['token'];
}

Future<void> payer(double amount, String description) async {
  final token = await getPaymentToken(amount, description);
  final url = '$gatewayUrl/pay?token=\${Uri.encodeComponent(token)}';
  await launchUrl(Uri.parse(url));
}`,
      },
      {
        name: 'React Native',
        lang: 'jsx',
        code: `import { Linking } from 'react-native';

const GATEWAY_URL = '${BASE_URL}';

// Le token est généré par votre backend
async function getToken(amount, description) {
  const res = await fetch('https://votre-api.com/generer-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, description })
  });
  const data = await res.json();
  return data.token;
}

async function payer(amount, description) {
  const token = await getToken(amount, description);
  const url = \`\${GATEWAY_URL}/pay?token=\${encodeURIComponent(token)}\`;
  Linking.openURL(url);
}`,
      },
    ],
  },
  qrcode: {
    title: 'QR Code',
    sub: "Token signé dans le QR code — montant infalsifiable.",
    items: [
      {
        name: 'QR Code avec token signé',
        lang: 'html',
        code: `<!-- Le token est généré par votre backend -->
<img id="qrcode" alt="QR Code de paiement" />

<script>
// Appel à votre backend pour obtenir le token
async function loadQR() {
  const res = await fetch('/api/generer-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 5000, description: 'Facture #123' })
  });
  const { token } = await res.json();
  
  const payUrl = '${BASE_URL}/pay?token=' + encodeURIComponent(token);
  document.getElementById('qrcode').src =
    'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(payUrl);
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
  
  // Token généré par votre backend
  const res = await fetch('/api/generer-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: parseInt(amount), description: 'Paiement QR' })
  });
  const { token } = await res.json();
  
  const url = '${BASE_URL}/pay?token=' + encodeURIComponent(token);
  document.getElementById('qrcode').src =
    'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(url);
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
            Intégrez la passerelle de paiement avec un token signé HMAC-SHA256. Deux méthodes : signature directe ou délégation à la gateway.
          </p>

          {/* Base URL */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'8px 14px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, width:'fit-content' }}>
            <Key size={12} color="#FF6B00"/>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.4)', fontFamily:"'DM Mono',monospace" }}>Base URL :</span>
            <span style={{ fontSize:12, color:'#FF6B00', fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{BASE_URL}</span>
          </div>

          {/* Note sécurité token */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8, padding:'10px 14px', background:'rgba(0,165,80,.08)', border:'1px solid rgba(0,165,80,.2)', borderRadius:10, maxWidth:600 }}>
            <Lock size={13} color="#00A550" style={{ flexShrink:0, marginTop:1 }}/>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.55)', lineHeight:1.5 }}>
              <strong style={{ color:'#00A550' }}>Méthode A — Signature directe :</strong> Stockez <code style={{ color:'#FF6B00', fontFamily:"'DM Mono',monospace" }}>GATEWAY_SECRET</code> et signez vos tokens avec HMAC-SHA256.
            </span>
          </div>

          <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 14px', background:'rgba(255,107,0,.08)', border:'1px solid rgba(255,107,0,.2)', borderRadius:10, maxWidth:600 }}>
            <Shield size={13} color="#FF6B00" style={{ flexShrink:0, marginTop:1 }}/>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.55)', lineHeight:1.5 }}>
              <strong style={{ color:'#FF6B00' }}>Méthode B — Délégation :</strong> Appelez <code style={{ color:'#FF6B00', fontFamily:"'DM Mono',monospace" }}>POST /api/gateway/generate-link</code> avec votre clé API. La gateway signe le token pour vous.
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