import { useState } from 'react';
import {
  Code, Key, Shield, Zap, Server, Copy, CheckCircle, Globe,
  Smartphone, Terminal, Monitor, QrCode, Mail, ExternalLink,
  ChevronRight, BookOpen, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

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
    sub: 'Le moyen le plus simple pour accepter vos premiers paiements.',
    items: [
      {
        name: 'Redirection simple (GET)',
        desc: 'Un formulaire HTML basique. Idéal pour commencer en 2 minutes.',
        lang: 'html',
        code: `<form action="https://payment-gateway.vercel.app/pay" method="GET">
  <input type="hidden" name="token" value="VOTRE_CLE_API" />
  <input type="hidden" name="amount" value="5000" />
  <input type="hidden" name="desc" value="Facture #123" />
  <button type="submit">Payer 5 000 XOF</button>
</form>`,
      },
      {
        name: 'Bouton avec popup',
        desc: 'Ouvre une fenêtre de paiement sans quitter votre site.',
        lang: 'html',
        code: `<button onclick="startPayment()" style="background:#f97316;color:#fff;padding:14px 28px;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer">
  💳 Payer 5 000 XOF
</button>
<script>
function startPayment() {
  window.open(
    'https://payment-gateway.vercel.app/pay?token=VOTRE_CLE_API&amount=5000&desc=Facture',
    'payment', 'width=480,height=700'
  );
}
</script>`,
      },
      {
        name: 'Montant variable',
        desc: 'Laissez le client saisir lui-même le montant.',
        lang: 'html',
        code: `<input type="number" id="amount" placeholder="Montant (XOF)" />
<button onclick="pay()">Payer</button>
<script>
function pay() {
  const amount = document.getElementById('amount').value;
  window.open('https://payment-gateway.vercel.app/pay?token=VOTRE_CLE_API&amount='+amount, 'payment', 'width=480,height=700');
}
</script>`,
      },
      {
        name: 'Lien de paiement (Email / SMS)',
        desc: 'Envoyez ce lien directement par email ou SMS à votre client.',
        lang: 'text',
        code: `https://payment-gateway.vercel.app/pay?token=VOTRE_CLE_API&amount=5000&desc=Facture%20%23123`,
      },
    ],
  },
  html: {
    title: 'Intégration HTML',
    sub: 'Boutons et formulaires prêts à coller dans n\'importe quelle page.',
    items: [
      {
        name: 'Bouton stylisé complet',
        desc: 'Bouton professionnel avec icône SVG incluse.',
        lang: 'html',
        code: `<form action="https://payment-gateway.vercel.app/pay" method="GET" style="display:inline-block">
  <input type="hidden" name="token" value="VOTRE_CLE_API" />
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
        desc: 'Un bouton par produit avec montant et description différents.',
        lang: 'html',
        code: `<button onclick="pay(5000, 'Formation HTML')">Formation HTML — 5 000 XOF</button>
<button onclick="pay(15000, 'Pack Complet')">Pack Complet — 15 000 XOF</button>
<button onclick="pay(50000, 'Accompagnement')">Accompagnement — 50 000 XOF</button>

<script>
function pay(amount, desc) {
  window.open(
    'https://payment-gateway.vercel.app/pay?token=VOTRE_CLE_API&amount='+amount+'&desc='+encodeURIComponent(desc),
    'payment', 'width=480,height=700'
  );
}
</script>`,
      },
    ],
  },
  javascript: {
    title: 'JavaScript / Node.js',
    sub: 'Intégration via fetch API, React, Next.js ou Node.js côté serveur.',
    items: [
      {
        name: 'Fetch API (navigateur)',
        lang: 'javascript',
        code: `async function payer(amount, description) {
  const res = await fetch('https://payment-gateway.vercel.app/api/pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'VOTRE_CLE_API'
    },
    body: JSON.stringify({ amount, description })
  });
  const data = await res.json();
  window.location.href = data.paymentUrl;
}

payer(5000, 'Facture #123');`,
      },
      {
        name: 'Popup + vérification de statut',
        lang: 'javascript',
        code: `async function payerEtSuivre(amount, description) {
  const res = await fetch('https://payment-gateway.vercel.app/api/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'VOTRE_CLE_API' },
    body: JSON.stringify({ amount, description })
  });
  const data = await res.json();
  const popup = window.open(data.paymentUrl, 'payment', 'width=480,height=700');

  const interval = setInterval(async () => {
    const s = await fetch('https://payment-gateway.vercel.app/api/verify/' + data.reference);
    const status = await s.json();
    if (status.status === 'SUCCESSFUL') {
      clearInterval(interval);
      popup.close();
      alert('✅ Paiement réussi !');
    }
  }, 5000);
}`,
      },
      {
        name: 'Node.js (Express)',
        lang: 'javascript',
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
});`,
      },
      {
        name: 'React / Next.js',
        lang: 'jsx',
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
    <button onClick={pay} disabled={loading}>
      {loading ? 'Chargement...' : \`Payer \${amount} XOF\`}
    </button>
  );
}`,
      },
    ],
  },
  php: {
    title: 'PHP',
    sub: 'Intégration côté serveur en PHP natif ou avec Composer.',
    items: [
      {
        name: 'cURL simple',
        lang: 'php',
        code: `<?php
function initierPaiement($amount, $description) {
  $ch = curl_init('https://payment-gateway.vercel.app/api/pay');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
      'Content-Type: application/json',
      'x-api-key: VOTRE_CLE_API'
    ],
    CURLOPT_POSTFIELDS => json_encode([
      'amount' => $amount,
      'description' => $description
    ]),
    CURLOPT_RETURNTRANSFER => true
  ]);
  $response = curl_exec($ch);
  curl_close($ch);
  return json_decode($response, true);
}

$paiement = initierPaiement(5000, 'Facture #123');
header('Location: ' . $paiement['paymentUrl']);
exit;`,
      },
      {
        name: 'Webhook callback',
        lang: 'php',
        code: `<?php
// callback.php — À configurer dans votre dashboard
$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

if ($data['event'] === 'payment.completed') {
  $reference = $data['transaction']['reference'];
  $amount    = $data['transaction']['amount'];

  // Mettre à jour la commande en base
  $db->query("UPDATE commandes SET statut='paye' WHERE reference='$reference'");

  // Envoyer un email de confirmation
  mail($data['transaction']['email'], 'Paiement confirmé', "Paiement de $amount XOF reçu.");
}

http_response_code(200);
echo json_encode(['received' => true]);`,
      },
    ],
  },
  python: {
    title: 'Python',
    sub: 'Compatible Flask, Django ou tout projet Python avec requests.',
    items: [
      {
        name: 'Requests (Flask / Django)',
        lang: 'python',
        code: `import requests

def initier_paiement(amount, description):
    response = requests.post(
        'https://payment-gateway.vercel.app/api/pay',
        headers={
            'Content-Type': 'application/json',
            'x-api-key': 'VOTRE_CLE_API'
        },
        json={'amount': amount, 'description': description}
    )
    return response.json()

# Vue Django
def payer(request):
    paiement = initier_paiement(5000, 'Facture #123')
    return redirect(paiement['paymentUrl'])`,
      },
      {
        name: 'Webhook receiver (Flask)',
        lang: 'python',
        code: `from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    if data['event'] == 'payment.completed':
        reference = data['transaction']['reference']
        update_order(reference, 'paid')
    return jsonify({'received': True})`,
      },
    ],
  },
  wordpress: {
    title: 'WordPress',
    sub: 'Shortcodes et intégration WooCommerce.',
    items: [
      {
        name: 'Shortcode',
        lang: 'php',
        code: `// Dans functions.php de votre thème
define('GATEWAY_API_KEY', 'VOTRE_CLE_API');

add_shortcode('bouton_paiement', function($atts) {
  $atts = shortcode_atts(['montant' => '5000', 'desc' => 'Paiement'], $atts);
  $url  = 'https://payment-gateway.vercel.app/pay?token=' . GATEWAY_API_KEY
        . '&amount=' . $atts['montant']
        . '&desc='   . urlencode($atts['desc']);
  return '<a href="' . esc_url($url) . '" target="_blank" class="btn-paiement">'
       . 'Payer ' . number_format($atts['montant']) . ' XOF</a>';
});

// Usage dans une page WordPress :
// [bouton_paiement montant="10000" desc="Formation"]`,
      },
      {
        name: 'WooCommerce Gateway',
        lang: 'php',
        code: `// Plugin WooCommerce personnalisé
add_filter('woocommerce_payment_gateways', 'ajouter_gateway_personnalisee');
function ajouter_gateway_personnalisee($gateways) {
  $gateways[] = 'WC_Gateway_Personnalisee';
  return $gateways;
}
// Voir la documentation complète pour le code complet du gateway.`,
      },
    ],
  },
  api: {
    title: 'API REST',
    sub: 'Référence complète des endpoints disponibles.',
    items: [
      {
        name: 'POST /api/pay — Initier un paiement',
        lang: 'bash',
        code: `curl -X POST https://payment-gateway.vercel.app/api/pay \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: VOTRE_CLE_API" \\
  -d '{"amount":5000,"description":"Facture #123"}'

# Réponse
{
  "success": true,
  "reference": "GW-abc123",
  "paymentUrl": "https://payment-gateway.vercel.app/pay?token=...",
  "status": "pending"
}`,
      },
      {
        name: 'GET /api/verify/:reference — Vérifier un paiement',
        lang: 'bash',
        code: `curl https://payment-gateway.vercel.app/api/verify/GW-abc123 \\
  -H "x-api-key: VOTRE_CLE_API"

# Réponse
{
  "success": true,
  "status": "SUCCESSFUL",
  "reference": "GW-abc123",
  "amount": 5000
}`,
      },
      {
        name: 'GET /api/methods/:country — Méthodes par pays',
        lang: 'bash',
        code: `curl https://payment-gateway.vercel.app/api/methods/bj

# Réponse
{
  "country": "bj",
  "name": "Bénin",
  "currency": "XOF",
  "methods": [
    {"id":"mtn_money","name":"MTN Mobile Money","icon":"📱"},
    {"id":"moov_money","name":"Moov Money","icon":"📱"}
  ]
}`,
      },
      {
        name: 'GET /api/balance — Solde du compte',
        lang: 'bash',
        code: `curl https://payment-gateway.vercel.app/api/balance \\
  -H "x-api-key: VOTRE_CLE_API"

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
        code: `payment.completed   → Paiement réussi
payment.failed      → Paiement échoué
payment.pending     → Paiement en attente
payment.refunded    → Paiement remboursé`,
      },
      {
        name: 'Récepteur Node.js',
        lang: 'javascript',
        code: `app.post('/webhook', express.json(), (req, res) => {
  const { event, transaction } = req.body;

  switch (event) {
    case 'payment.completed':
      updateOrder(transaction.metadata.orderId, 'paid');
      sendConfirmationEmail(transaction.email);
      break;
    case 'payment.failed':
      updateOrder(transaction.metadata.orderId, 'failed');
      break;
  }

  res.json({ received: true });
});`,
      },
    ],
  },
  mobile: {
    title: 'Mobile — Flutter & React Native',
    sub: 'Intégration native pour iOS et Android.',
    items: [
      {
        name: 'Flutter (Dart)',
        lang: 'dart',
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
    body: jsonEncode({'amount': amount, 'description': description})
  );
  final data = jsonDecode(res.body);
  await launchUrl(Uri.parse(data['paymentUrl']));
}`,
      },
      {
        name: 'React Native',
        lang: 'jsx',
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
}`,
      },
    ],
  },
  qrcode: {
    title: 'QR Code',
    sub: 'Générez des QR codes de paiement dynamiques.',
    items: [
      {
        name: 'QR Code statique',
        lang: 'html',
        code: `<img id="qrcode" />
<script>
const url = 'https://payment-gateway.vercel.app/pay?token=VOTRE_CLE_API&amount=5000';
document.getElementById('qrcode').src =
  'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(url);
</script>`,
      },
      {
        name: 'QR Code avec montant variable',
        lang: 'html',
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
</script>`,
      },
    ],
  },
};

const LANG_COLORS = {
  html: { bg: '#FFF3EA', color: '#FF6B00', label: 'HTML' },
  javascript: { bg: '#FFFBEB', color: '#D97706', label: 'JS' },
  jsx: { bg: '#EBF0FF', color: '#0057FF', label: 'JSX' },
  php: { bg: '#F4EBFF', color: '#9B00E8', label: 'PHP' },
  python: { bg: '#EDFAF3', color: '#00A550', label: 'PY' },
  bash: { bg: '#F7F8FC', color: '#555', label: 'cURL' },
  dart: { bg: '#E0F7FA', color: '#0097A7', label: 'Dart' },
  text: { bg: '#F7F8FC', color: '#888', label: 'TEXT' },
};

const PROVIDERS = [
  { name: 'FeexPay',      zone: 'BJ · CI · TG · SN', color: '#FF6B00' },
  { name: 'Stripe',       zone: 'Europe · US · CA',   color: '#0057FF' },
  { name: 'Paystack',     zone: 'NG · GH · KE · ZA',  color: '#00A550' },
  { name: 'Flutterwave',  zone: '15 pays Afrique',    color: '#F59E0B' },
  { name: 'KKiaPay',      zone: 'UEMOA + CEMAC',      color: '#6366F1' },
  { name: 'FedaPay',      zone: '10 pays Afrique',    color: '#EF4444' },
  { name: 'PayDunya',     zone: 'UEMOA',              color: '#0EA5E9' },
  { name: 'CinetPay',     zone: '11 pays Afrique',    color: '#14B8A6' },
  { name: 'Lygos',        zone: '13 pays Afrique',    color: '#EC4899' },
  { name: 'PayPal',       zone: '200+ pays',          color: '#0057FF' },
  { name: 'MbiyoPay',     zone: '11 pays Afrique',    color: '#FF6B00' },
  { name: 'Qosic',        zone: '13 pays Afrique',    color: '#9B00E8' },
  { name: 'Bizao',        zone: '11 pays Afrique',    color: '#00A550' },
  { name: 'Hub2',         zone: '10 pays Afrique',    color: '#F59E0B' },
  { name: 'Chipper Cash', zone: 'Afrique · US · UK',  color: '#6366F1' },
];

/* ── Code Block ── */
function CodeBlock({ code, lang, id }) {
  const [copied, setCopied] = useState(false);
  const lc = LANG_COLORS[lang] || LANG_COLORS.text;

  const copy = () => {
    navigator.clipboard.writeText(code);
    toast.success('Copié !');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #1E2433' }}>
      {/* toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#161B27', padding: '10px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#FF5F56','#FFBD2E','#27C93F'].map((c,i) => (
              <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '.06em',
            background: lc.bg, color: lc.color,
            padding: '2px 8px', borderRadius: 5,
          }}>{lc.label}</span>
        </div>
        <button onClick={copy} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: copied ? 'rgba(0,165,80,.15)' : 'rgba(255,255,255,.06)',
          border: `1px solid ${copied ? 'rgba(0,165,80,.3)' : 'rgba(255,255,255,.08)'}`,
          borderRadius: 7, padding: '5px 11px',
          fontSize: 11, fontWeight: 600,
          color: copied ? '#00A550' : '#8899AA',
          cursor: 'pointer', transition: 'all .2s',
        }}>
          {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
      {/* code */}
      <div style={{
        background: '#0D1117', padding: '16px 20px',
        overflowX: 'auto', maxHeight: 320, overflowY: 'auto',
      }}>
        <pre style={{
          fontFamily: "'Fira Code','Cascadia Code','Courier New',monospace",
          fontSize: 12, lineHeight: 1.8, color: '#E6EDF3',
          margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>{code}</pre>
      </div>
    </div>
  );
}

/* ── Item card ── */
function ItemCard({ item, tabId, idx }) {
  return (
    <div style={{
      border: '1px solid #EBEBEB', borderRadius: 18, overflow: 'hidden',
      background: '#fff',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 10, padding: '16px 20px',
        background: '#FAFAFA', borderBottom: '1px solid #F0F0F0',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{item.name}</div>
          {item.desc && <div style={{ fontSize: 12, color: '#AAA', marginTop: 3, lineHeight: 1.5 }}>{item.desc}</div>}
        </div>
      </div>
      <div style={{ padding: '14px' }}>
        <CodeBlock code={item.code} lang={item.lang} id={`${tabId}-${idx}`} />
      </div>
    </div>
  );
}

/* ── MAIN ── */
export default function GatewayApiDocs() {
  const [activeTab, setActiveTab] = useState('quickstart');
  const active = METHODS[activeTab];
  const activeTabMeta = TABS.find(t => t.id === activeTab);

  return (
    <div style={{
      maxWidth: 900, margin: '0 auto',
      padding: '20px 16px 48px',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
    }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .doc-tab::-webkit-scrollbar { display: none; }
        .doc-tab { scrollbar-width: none; }
        .provider-card:hover { border-color: var(--hc) !important; background: var(--hb) !important; }
      `}</style>

      {/* ── Hero header ── */}
      <div style={{
        background: 'linear-gradient(135deg,#0A0A0F 0%,#1A1A2E 100%)',
        borderRadius: 22, padding: '32px 28px', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* déco cercles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,107,0,.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 80, width: 140, height: 140, borderRadius: '50%', background: 'rgba(0,87,255,.07)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg,#FF6B00,#FFAA00)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(255,107,0,.4)',
            }}>
              <BookOpen size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                Référence
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1 }}>
                Documentation API
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', maxWidth: 480, lineHeight: 1.6, marginBottom: 20 }}>
            Toutes les méthodes pour intégrer la passerelle de paiement — HTML, JavaScript, PHP, Python, Flutter et plus encore.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: '10 langages', icon: Layers },
              { label: '15+ providers', icon: Globe },
              { label: 'REST + Webhooks', icon: Shield },
            ].map((b, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 8, padding: '6px 12px',
                fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.7)',
              }}>
                <b.icon size={12} color="rgba(255,107,0,.8)" />
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Layout : sidebar + contenu ── */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>

        {/* Sidebar tabs — desktop */}
        <div style={{
          width: 176, flexShrink: 0,
          display: 'none', /* hidden by default, shown via media query workaround below */
        }} className="doc-sidebar">
          {TABS.map(t => {
            const on = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '10px 12px', borderRadius: 11, border: 'none',
                background: on ? '#FFF3EA' : 'transparent',
                color: on ? '#FF6B00' : '#666',
                fontWeight: on ? 700 : 500, fontSize: 13,
                cursor: 'pointer', transition: 'all .18s',
                fontFamily: 'inherit', marginBottom: 2,
                textAlign: 'left',
              }}>
                <t.icon size={14} color={on ? '#FF6B00' : '#BBB'} />
                {t.label}
                {on && <ChevronRight size={12} color="#FF6B00" style={{ marginLeft: 'auto' }} />}
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Tabs scroll horizontal (mobile + desktop sans sidebar) */}
          <div className="doc-tab" style={{
            display: 'flex', gap: 4, overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            background: '#F3F4F6', borderRadius: 14, padding: 4,
            marginBottom: 20,
          }}>
            {TABS.map(t => {
              const on = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  flex: '0 0 auto',
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10, border: 'none',
                  background: on ? '#fff' : 'transparent',
                  color: on ? '#111' : '#888',
                  fontWeight: on ? 700 : 500, fontSize: 12,
                  cursor: 'pointer', transition: 'all .18s', whiteSpace: 'nowrap',
                  boxShadow: on ? '0 1px 6px rgba(0,0,0,.08)' : 'none',
                  fontFamily: 'inherit',
                }}>
                  <t.icon size={13} color={on ? t.color : '#CCC'} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Section header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 18, animation: 'fadeUp .3s ease',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: `${activeTabMeta?.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {activeTabMeta && <activeTabMeta.icon size={18} color={activeTabMeta.color} />}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#0A0A0A', letterSpacing: '-.015em' }}>
                {active.title}
              </div>
              <div style={{ fontSize: 12, color: '#AAA', marginTop: 2 }}>{active.sub}</div>
            </div>
          </div>

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp .35s ease' }}>
            {active.items.map((item, idx) => (
              <ItemCard key={idx} item={item} tabId={activeTab} idx={idx} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Providers ── */}
      <div style={{
        marginTop: 28,
        background: '#fff', border: '1px solid #EBEBEB',
        borderRadius: 20, padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: '#FFF3EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={16} color="#FF6B00" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111' }}>Providers supportés</div>
            <div style={{ fontSize: 12, color: '#AAA', marginTop: 1 }}>15 intégrations disponibles</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
          {PROVIDERS.map(p => (
            <div
              key={p.name}
              className="provider-card"
              style={{
                '--hc': p.color,
                '--hb': `${p.color}0D`,
                border: '1.5px solid #EBEBEB',
                borderRadius: 12, padding: '10px 12px',
                transition: 'all .2s', cursor: 'default',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: '#AAA', fontWeight: 500 }}>{p.zone}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Support ── */}
      <div style={{
        marginTop: 20,
        background: 'linear-gradient(135deg,#FF6B00,#FFAA00)',
        borderRadius: 20, padding: '24px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
            Besoin d'aide pour intégrer ?
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
            Notre équipe technique est disponible 24/7.
          </div>
        </div>
        <a
          href="mailto:support@payment-gateway.vercel.app"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff', color: '#FF6B00',
            padding: '11px 22px', borderRadius: 12,
            fontSize: 13, fontWeight: 800, textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            flexShrink: 0,
          }}
        >
          <Mail size={15} /> Contacter le support
        </a>
      </div>
    </div>
  );
}