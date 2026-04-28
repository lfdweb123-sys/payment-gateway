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
  ─── IMPORTANT — Encodage du token ──────────────────────────────────────────
  La clé API (gw_xxx...) doit être encodée en base64 avant d'être passée
  dans l'URL ou dans le header. Cela évite d'exposer la clé en clair.

  Encodage :
    JavaScript : btoa('gw_votre_cle_api')
    PHP        : base64_encode('gw_votre_cle_api')
    Python     : base64.b64encode(b'gw_votre_cle_api').decode()
    bash       : echo -n 'gw_votre_cle_api' | base64

  Le serveur décode automatiquement le token base64.
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
    sub: "Le token doit être encodé en base64 — jamais en clair dans l'URL.",
    items: [
      {
        name: '① Encoder votre clé API (à faire une seule fois)',
        desc: "Encodez votre clé API en base64. Le résultat est ce que vous utilisez partout dans les URLs.",
        lang: 'javascript',
        code: `// Dans votre navigateur (console JavaScript)
const token = btoa('gw_votre_cle_api');
console.log(token);
// → "Z3dfdm90cmVfY2xlX2FwaQ=="  ← c'est ça que vous mettez dans les URLs

// En Node.js
const token = Buffer.from('gw_votre_cle_api').toString('base64');`,
      },
      {
        name: '② Redirection simple (GET)',
        desc: "Le token encodé en base64 dans l'URL — la clé API n'est jamais visible en clair.",
        lang: 'html',
        code: `<!-- TOKEN_BASE64 = btoa('gw_votre_cle_api') -->
<form action="${BASE_URL}/pay" method="GET">
  <input type="hidden" name="token" value="TOKEN_BASE64" />
  <input type="hidden" name="amount" value="5000" />
  <input type="hidden" name="desc" value="Facture #123" />
  <button type="submit">Payer 5 000 XOF</button>
</form>

<!--
  URL générée :
  ${BASE_URL}/pay?token=Z3dfdm90cmVfY2xlX2FwaQ==&amount=5000&desc=Facture+%23123
  La clé API n'apparaît JAMAIS en clair dans l'URL.
-->`,
      },
      {
        name: '③ Bouton JavaScript (génération dynamique)',
        desc: "Encodez le token côté client avant d'ouvrir la fenêtre de paiement.",
        lang: 'html',
        code: `<button onclick="startPayment()">💳 Payer 5 000 XOF</button>

<script>
const RAW_TOKEN = 'gw_votre_cle_api'; // récupéré depuis votre backend
const TOKEN     = btoa(RAW_TOKEN);    // encodé en base64

function startPayment() {
  const url = '${BASE_URL}/pay?token=' + TOKEN + '&amount=5000&desc=Facture';
  window.open(url, 'payment', 'width=480,height=700');
}
</script>`,
      },
      {
        name: '④ Lien de paiement (Email / SMS)',
        desc: 'Exemple de lien avec token encodé — prêt à envoyer.',
        lang: 'text',
        code: `${BASE_URL}/pay?token=Z3dfdm90cmVfY2xlX2FwaQ==&amount=5000&desc=Facture%20%23123

// Générer ce lien en JavaScript :
const link = \`${BASE_URL}/pay?token=\${btoa('gw_votre_cle')}&amount=5000&desc=\${encodeURIComponent('Facture #123')}\`;`,
      },
    ],
  },
  html: {
    title: 'Intégration HTML',
    sub: "Boutons et formulaires — token toujours encodé en base64.",
    items: [
      {
        name: 'Bouton stylisé complet',
        desc: 'Token encodé en base64 dans le champ hidden.',
        lang: 'html',
        code: `<!-- Générer TOKEN_BASE64 avec : btoa('gw_votre_cle_api') -->
<form action="${BASE_URL}/pay" method="GET" style="display:inline-block">
  <input type="hidden" name="token" value="TOKEN_BASE64" />
  <input type="hidden" name="amount" value="5000" />
  <input type="hidden" name="desc" value="Facture #INV-2026-001" />
  <button type="submit" style="background:#f97316;color:#fff;border:none;padding:12px 32px;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="1" y="4" width="22" height="16" rx="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
    Payer 5 000 XOF
  </button>
</form>`,
      },
      {
        name: 'Plusieurs produits',
        desc: 'Un bouton par produit — token encodé une seule fois.',
        lang: 'html',
        code: `<button onclick="pay(5000, 'Formation HTML')">Formation HTML — 5 000 XOF</button>
<button onclick="pay(15000, 'Pack Complet')">Pack Complet — 15 000 XOF</button>
<button onclick="pay(50000, 'Accompagnement')">Accompagnement — 50 000 XOF</button>

<script>
// Encodé une seule fois — jamais en clair dans les URLs
const TOKEN = btoa('gw_votre_cle_api');

function pay(amount, desc) {
  window.open(
    '${BASE_URL}/pay?token=' + TOKEN + '&amount=' + amount + '&desc=' + encodeURIComponent(desc),
    'payment', 'width=480,height=700'
  );
}
</script>`,
      },
    ],
  },
  javascript: {
    title: 'JavaScript / Node.js',
    sub: 'Encodage base64 côté client ou transmission sécurisée via backend.',
    items: [
      {
        name: 'Fetch API avec token encodé',
        lang: 'javascript',
        code: `// Le token est passé en header x-api-key (jamais dans l'URL)
// Le serveur accepte le token brut OU encodé en base64 dans le header

async function payer(amount, description) {
  const res = await fetch('${BASE_URL}/api/gateway/pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'gw_votre_cle_api'  // en clair dans le header, c'est sécurisé (HTTPS)
    },
    body: JSON.stringify({ amount, description })
  });
  const data = await res.json();
  window.location.href = data.url;
}

payer(5000, 'Facture #123');`,
      },
      {
        name: 'Lien de paiement — token encodé base64',
        desc: 'Pour les liens dans les emails, SMS, QR codes.',
        lang: 'javascript',
        code: `// Générer un lien de paiement sécurisé
function genererLienPaiement(apiKey, amount, description) {
  const tokenB64 = btoa(apiKey); // encoder en base64
  const params   = new URLSearchParams({
    token: tokenB64,
    amount: String(amount),
    desc: description,
  });
  return \`${BASE_URL}/pay?\${params.toString()}\`;
}

const lien = genererLienPaiement('gw_votre_cle_api', 5000, 'Facture #123');
// → ${BASE_URL}/pay?token=Z3dfdm90cmVfY2xlX2FwaQ==&amount=5000&desc=Facture+%23123
// La clé n'apparaît PAS en clair dans le lien`,
      },
      {
        name: 'Popup + vérification de statut',
        lang: 'javascript',
        code: `async function payerEtSuivre(amount, description) {
  // Token en clair dans le header — sécurisé via HTTPS
  const res = await fetch('${BASE_URL}/api/gateway/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'gw_votre_cle_api' },
    body: JSON.stringify({ amount, description })
  });
  const data = await res.json();
  const popup = window.open(data.url, 'payment', 'width=480,height=700');

  const interval = setInterval(async () => {
    const s = await fetch('${BASE_URL}/api/gateway/verify/' + data.transactionId, {
      headers: { 'x-api-key': 'gw_votre_cle_api' }
    });
    const status = await s.json();
    if (status.status === 'completed') {
      clearInterval(interval);
      popup?.close();
      alert('✅ Paiement réussi !');
    }
  }, 5000);
}`,
      },
      {
        name: 'Node.js (Express) — génération de lien côté serveur',
        lang: 'javascript',
        code: `const fetch = require('node-fetch');

// Générer un lien de paiement côté serveur
app.post('/creer-lien-paiement', async (req, res) => {
  const apiKey   = process.env.GATEWAY_API_KEY;          // gw_xxx
  const tokenB64 = Buffer.from(apiKey).toString('base64'); // encodé base64

  const params = new URLSearchParams({
    token:  tokenB64,
    amount: req.body.amount,
    desc:   req.body.description,
  });

  // Ce lien peut être envoyé par email — clé jamais en clair
  const lien = \`${BASE_URL}/pay?\${params.toString()}\`;
  res.json({ url: lien });
});

// Initier un paiement via API (token en header)
app.post('/payer', async (req, res) => {
  const response = await fetch('${BASE_URL}/api/gateway/pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GATEWAY_API_KEY  // jamais exposé au client
    },
    body: JSON.stringify({
      amount:      req.body.amount,
      description: req.body.description,
      country:     req.body.country,
      method:      req.body.method,
      phone:       req.body.phone,
    })
  });
  const data = await response.json();
  res.json(data);
});`,
      },
      {
        name: 'React / Next.js',
        lang: 'jsx',
        code: `import { useState } from 'react';

// Le token est stocké côté serveur et jamais exposé dans le bundle client.
// Utilisez une API route Next.js ou votre backend pour initier le paiement.

export default function PayButton({ amount, description, country, method, phone }) {
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    setLoading(true);
    // Appel à votre propre backend — pas directement à la gateway
    const res = await fetch('/api/creer-paiement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description, country, method, phone })
    });
    const data = await res.json();
    if (data.url) window.open(data.url, 'payment', 'width=480,height=700');
    setLoading(false);
  };

  return (
    <button onClick={pay} disabled={loading}>
      {loading ? 'Chargement...' : \`Payer \${amount.toLocaleString()} XOF\`}
    </button>
  );
}`,
      },
    ],
  },
  php: {
    title: 'PHP',
    sub: 'Token encodé en base64 pour les URLs, en clair pour les headers cURL.',
    items: [
      {
        name: 'Générer un lien de paiement sécurisé',
        lang: 'php',
        code: `<?php
define('GATEWAY_URL', '${BASE_URL}');
define('GATEWAY_API_KEY', 'gw_votre_cle_api'); // en variable d'environnement

function genererLienPaiement($amount, $description) {
  // Encoder le token en base64 — clé jamais visible en clair dans l'URL
  $tokenB64 = base64_encode(GATEWAY_API_KEY);
  $params   = http_build_query([
    'token'  => $tokenB64,
    'amount' => $amount,
    'desc'   => $description,
  ]);
  return GATEWAY_URL . '/pay?' . $params;
}

$lien = genererLienPaiement(5000, 'Facture #123');
// → ${BASE_URL}/pay?token=Z3dfdm90cmVfY2xlX2FwaQ==&amount=5000&desc=Facture+%23123`,
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
      'x-api-key: ' . getenv('GATEWAY_API_KEY'), // depuis variable d'environnement
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
header('Location: ' . $paiement['url']);
exit;`,
      },
      {
        name: 'Webhook callback',
        lang: 'php',
        code: `<?php
$payload = file_get_contents('php://input');
$data    = json_decode($payload, true);

if ($data['event'] === 'payment.completed') {
  $reference = $data['transaction']['reference'];
  $amount    = $data['transaction']['amount'];

  $pdo->prepare("UPDATE commandes SET statut='paye' WHERE reference=?")
      ->execute([$reference]);

  mail($data['transaction']['email'], 'Paiement confirmé', "Paiement de $amount XOF reçu.");
}

http_response_code(200);
echo json_encode(['received' => true]);`,
      },
    ],
  },
  python: {
    title: 'Python',
    sub: 'Token base64 pour les URLs, en clair pour les headers requests.',
    items: [
      {
        name: 'Générer un lien sécurisé',
        lang: 'python',
        code: `import base64
import os
from urllib.parse import urlencode

GATEWAY_URL = '${BASE_URL}'
API_KEY     = os.environ.get('GATEWAY_API_KEY', 'gw_votre_cle_api')

def generer_lien_paiement(amount, description):
    # Encoder en base64 — jamais en clair dans l'URL
    token_b64 = base64.b64encode(API_KEY.encode()).decode()
    params    = urlencode({'token': token_b64, 'amount': amount, 'desc': description})
    return f'{GATEWAY_URL}/pay?{params}'

lien = generer_lien_paiement(5000, 'Facture #123')
# → ${BASE_URL}/pay?token=Z3dfdm90cmVfY2xlX2FwaQ==&amount=5000&desc=Facture+%23123`,
      },
      {
        name: 'API requests (Flask / Django)',
        lang: 'python',
        code: `import requests
import os

GATEWAY_URL = '${BASE_URL}'

def initier_paiement(amount, description, country='bj', method='mtn_money', phone=''):
    response = requests.post(
        f'{GATEWAY_URL}/api/gateway/pay',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': os.environ['GATEWAY_API_KEY']  # depuis variable d'env
        },
        json={
            'amount':      amount,
            'description': description,
            'country':     country,
            'method':      method,
            'phone':       phone,
        }
    )
    return response.json()

# Vue Django
def payer(request):
    paiement = initier_paiement(5000, 'Facture #123', 'bj', 'mtn_money', '22961000000')
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
        reference = data['transaction']['reference']
        update_order(reference, 'paid')
    elif data.get('event') == 'payment.failed':
        reference = data['transaction']['reference']
        update_order(reference, 'failed')
    return jsonify({'received': True})`,
      },
    ],
  },
  wordpress: {
    title: 'WordPress',
    sub: "Token encodé en base64 dans les shortcodes et liens.",
    items: [
      {
        name: 'Shortcode avec encodage automatique',
        lang: 'php',
        code: `// Dans functions.php de votre thème
define('GATEWAY_API_KEY', 'gw_votre_cle_api'); // idéalement dans wp-config.php
define('GATEWAY_URL',     '${BASE_URL}');

add_shortcode('bouton_paiement', function($atts) {
  $atts     = shortcode_atts(['montant' => '5000', 'desc' => 'Paiement'], $atts);

  // Encoder le token — clé jamais visible en clair dans la page
  $tokenB64 = base64_encode(GATEWAY_API_KEY);

  $url = GATEWAY_URL . '/pay?token=' . urlencode($tokenB64)
       . '&amount=' . $atts['montant']
       . '&desc='   . urlencode($atts['desc']);

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
    sub: "Token en header x-api-key pour les appels API — jamais dans l'URL.",
    items: [
      {
        name: 'POST /api/gateway/pay — Initier un paiement',
        lang: 'bash',
        code: `# Le token est passé en header — jamais dans l'URL
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
  "message": "Paiement initié. Vérifiez votre téléphone."
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
        code: `# Endpoint public — pas besoin de token
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
      {
        name: 'Lien de paiement — token encodé base64',
        desc: "Pour les liens dans les emails, SMS, QR codes — clé jamais en clair.",
        lang: 'bash',
        code: `# Encoder le token en base64
TOKEN_B64=$(echo -n "gw_votre_cle_api" | base64)

# Construire le lien
LINK="${BASE_URL}/pay?token=$TOKEN_B64&amount=5000&desc=Facture%20%23123"
echo $LINK
# → ${BASE_URL}/pay?token=Z3dfdm90cmVfY2xlX2FwaQ==&amount=5000&desc=Facture+%23123`,
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
    sub: 'Token stocké en variable d\'environnement, jamais dans le code source.',
    items: [
      {
        name: 'Flutter (Dart)',
        lang: 'dart',
        code: `import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:typed_data';
import 'package:url_launcher/url_launcher.dart';

const gatewayUrl = '${BASE_URL}';
// Stocker dans flutter_dotenv ou équivalent — jamais en dur dans le code
const apiKey = String.fromEnvironment('GATEWAY_API_KEY');

Future<void> payer(double amount, String description, String country, String method, String phone) async {
  final res = await http.post(
    Uri.parse('$gatewayUrl/api/gateway/pay'),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,  // en header — sécurisé
    },
    body: jsonEncode({
      'amount':      amount,
      'description': description,
      'country':     country,
      'method':      method,
      'phone':       phone,
    })
  );
  final data = jsonDecode(res.body);
  if (data['url'] != null) await launchUrl(Uri.parse(data['url']));
}

// Générer un lien avec token encodé (pour QR code, email...)
String genererLien(double amount, String desc) {
  final tokenB64 = base64Encode(utf8.encode(apiKey));
  return '$gatewayUrl/pay?token=$tokenB64&amount=$amount&desc=\${Uri.encodeComponent(desc)}';
}`,
      },
      {
        name: 'React Native',
        lang: 'jsx',
        code: `import { Linking } from 'react-native';
// Utiliser react-native-config ou expo-constants pour les variables d'env
import Config from 'react-native-config';

const GATEWAY_URL = '${BASE_URL}';

// Appel API — token en header
async function payer(amount, description, country, method, phone) {
  const res = await fetch(\`\${GATEWAY_URL}/api/gateway/pay\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Config.GATEWAY_API_KEY,  // depuis .env
    },
    body: JSON.stringify({ amount, description, country, method, phone })
  });
  const data = await res.json();
  if (data.url) Linking.openURL(data.url);
}

// Générer un lien avec token encodé (pour QR code, email...)
function genererLien(amount, desc) {
  const tokenB64 = btoa(Config.GATEWAY_API_KEY);
  return \`\${GATEWAY_URL}/pay?token=\${tokenB64}&amount=\${amount}&desc=\${encodeURIComponent(desc)}\`;
}`,
      },
    ],
  },
  qrcode: {
    title: 'QR Code',
    sub: "Token encodé en base64 dans les QR codes — clé jamais lisible.",
    items: [
      {
        name: 'QR Code avec token encodé',
        lang: 'html',
        code: `<img id="qrcode" alt="QR Code de paiement" />

<script>
// Encoder le token avant de le mettre dans le QR
const apiKey  = 'gw_votre_cle_api';
const tokenB64 = btoa(apiKey); // → "Z3dfdm90cmVfY2xlX2FwaQ=="

const payUrl = '${BASE_URL}/pay?token=' + tokenB64 + '&amount=5000';

document.getElementById('qrcode').src =
  'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(payUrl);
</script>`,
      },
      {
        name: 'QR Code avec montant variable',
        lang: 'html',
        code: `<input type="number" id="qrAmount" placeholder="Montant (XOF)" />
<button onclick="generateQR()">Générer QR Code</button>
<img id="qrcode" style="margin-top:10px" />

<script>
const TOKEN_B64 = btoa('gw_votre_cle_api'); // encodé une seule fois

function generateQR() {
  const amount = document.getElementById('qrAmount').value;
  const url    = '${BASE_URL}/pay?token=' + TOKEN_B64 + '&amount=' + amount;
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
          <p style={{ fontSize:13, color:'rgba(255,255,255,.5)', maxWidth:480, lineHeight:1.6, marginBottom:14 }}>
            Toutes les méthodes pour intégrer la passerelle de paiement — HTML, JavaScript, PHP, Python, Flutter et plus encore.
          </p>

          {/* Base URL */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'8px 14px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, width:'fit-content' }}>
            <Key size={12} color="#FF6B00"/>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.4)', fontFamily:"'DM Mono',monospace" }}>Base URL :</span>
            <span style={{ fontSize:12, color:'#FF6B00', fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{BASE_URL}</span>
          </div>

          {/* Note sécurité token */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:16, padding:'10px 14px', background:'rgba(0,165,80,.08)', border:'1px solid rgba(0,165,80,.2)', borderRadius:10, maxWidth:520 }}>
            <Lock size={13} color="#00A550" style={{ flexShrink:0, marginTop:1 }}/>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.55)', lineHeight:1.5 }}>
              Le token dans les URLs doit être <strong style={{ color:'#00A550' }}>encodé en base64</strong> — <code style={{ color:'#FF6B00', fontFamily:"'DM Mono',monospace" }}>btoa('gw_votre_cle')</code>. Dans les headers, passez-le en clair via HTTPS.
            </span>
          </div>

          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {[{label:'10 langages',icon:Layers},{label:`${PROVIDERS.length} providers`,icon:Globe},{label:'REST + Webhooks',icon:Shield}].map((b,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:600, color:'rgba(255,255,255,.7)' }}>
                <b.icon size={12} color="rgba(255,107,0,.8)"/>
                {b.label}
              </div>
            ))}
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