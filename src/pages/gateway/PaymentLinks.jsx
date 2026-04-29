import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Link, Copy, CheckCircle2, Zap, Send, Loader,
  Banknote, FileText, Globe, Mail, MessageCircle,
  ChevronDown, ExternalLink, Clock, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Constantes ───────────────────────────────────────── */
const METHODS_BY_COUNTRY = {
  bj: [
    { id: 'mtn_money',     name: 'MTN Mobile Money', icon: '📱', color: '#FFB800' },
    { id: 'moov_money',    name: 'Moov Money',        icon: '📱', color: '#00A0DC' },
    { id: 'celtiis_money', name: 'CELTIIS Money',     icon: '📱', color: '#E30613' },
    { id: 'card',          name: 'Carte Bancaire',    icon: '💳', color: '#1A1A2E' },
  ],
  ci: [
    { id: 'mtn_money',    name: 'MTN Mobile Money', icon: '📱', color: '#FFB800' },
    { id: 'moov_money',   name: 'Moov Money',        icon: '📱', color: '#00A0DC' },
    { id: 'orange_money', name: 'Orange Money',      icon: '📱', color: '#FF6600' },
    { id: 'wave_money',   name: 'Wave',              icon: '🌊', color: '#00A550' },
    { id: 'card',         name: 'Carte Bancaire',    icon: '💳', color: '#1A1A2E' },
  ],
  sn: [
    { id: 'orange_money', name: 'Orange Money', icon: '📱', color: '#FF6600' },
    { id: 'wave_money',   name: 'Wave',         icon: '🌊', color: '#00A550' },
    { id: 'free_money',   name: 'Free Money',   icon: '📱', color: '#E30613' },
    { id: 'card',         name: 'Carte Bancaire', icon: '💳', color: '#1A1A2E' },
  ],
  tg: [
    { id: 'togocom_money', name: 'Togocom Money', icon: '📱', color: '#0057FF' },
    { id: 'moov_money',    name: 'Moov Money',    icon: '📱', color: '#00A0DC' },
    { id: 'card',          name: 'Carte Bancaire', icon: '💳', color: '#1A1A2E' },
  ],
  cm: [
    { id: 'mtn_money',    name: 'MTN Mobile Money', icon: '📱', color: '#FFB800' },
    { id: 'orange_money', name: 'Orange Money',     icon: '📱', color: '#FF6600' },
    { id: 'card',         name: 'Carte Bancaire',   icon: '💳', color: '#1A1A2E' },
  ],
  bf: [
    { id: 'moov_money',   name: 'Moov Money',    icon: '📱', color: '#00A0DC' },
    { id: 'orange_money', name: 'Orange Money',  icon: '📱', color: '#FF6600' },
    { id: 'card',         name: 'Carte Bancaire', icon: '💳', color: '#1A1A2E' },
  ],
  ml: [
    { id: 'orange_money', name: 'Orange Money',  icon: '📱', color: '#FF6600' },
    { id: 'moov_money',   name: 'Moov Money',    icon: '📱', color: '#00A0DC' },
    { id: 'card',         name: 'Carte Bancaire', icon: '💳', color: '#1A1A2E' },
  ],
  gn: [
    { id: 'orange_money', name: 'Orange Money',     icon: '📱', color: '#FF6600' },
    { id: 'mtn_money',    name: 'MTN Mobile Money', icon: '📱', color: '#FFB800' },
    { id: 'card',         name: 'Carte Bancaire',   icon: '💳', color: '#1A1A2E' },
  ],
  ne: [
    { id: 'orange_money', name: 'Orange Money',  icon: '📱', color: '#FF6600' },
    { id: 'moov_money',   name: 'Moov Money',    icon: '📱', color: '#00A0DC' },
    { id: 'card',         name: 'Carte Bancaire', icon: '💳', color: '#1A1A2E' },
  ],
  cd: [
    { id: 'mpesa',        name: 'M-Pesa',        icon: '📱', color: '#00A550' },
    { id: 'airtel_money', name: 'Airtel Money',  icon: '📱', color: '#E30613' },
    { id: 'orange_money', name: 'Orange Money',  icon: '📱', color: '#FF6600' },
    { id: 'card',         name: 'Carte Bancaire', icon: '💳', color: '#1A1A2E' },
  ],
  ng: [
    { id: 'card',          name: 'Carte Bancaire',   icon: '💳', color: '#1A1A2E' },
    { id: 'bank_transfer', name: 'Virement Bancaire', icon: '🏦', color: '#0057FF' },
  ],
  gh: [
    { id: 'mtn_money', name: 'MTN Mobile Money', icon: '📱', color: '#FFB800' },
    { id: 'card',      name: 'Carte Bancaire',   icon: '💳', color: '#1A1A2E' },
  ],
  ke: [
    { id: 'mpesa',        name: 'M-Pesa',       icon: '📱', color: '#00A550' },
    { id: 'airtel_money', name: 'Airtel Money', icon: '📱', color: '#E30613' },
    { id: 'card',         name: 'Carte Bancaire', icon: '💳', color: '#1A1A2E' },
  ],
  za: [
    { id: 'card', name: 'Carte Bancaire', icon: '💳', color: '#1A1A2E' },
  ],
  fr: [
    { id: 'card',   name: 'Carte Bancaire', icon: '💳', color: '#1A1A2E' },
    { id: 'paypal', name: 'PayPal',         icon: '🅿️', color: '#0057FF' },
  ],
  gb: [
    { id: 'card',   name: 'Carte Bancaire', icon: '💳', color: '#1A1A2E' },
    { id: 'paypal', name: 'PayPal',         icon: '🅿️', color: '#0057FF' },
  ],
  us: [
    { id: 'card',   name: 'Carte Bancaire', icon: '💳', color: '#1A1A2E' },
    { id: 'paypal', name: 'PayPal',         icon: '🅿️', color: '#0057FF' },
  ],
};

const COUNTRIES = [
  { code: 'bj', name: 'Bénin',          flag: '🇧🇯', currency: 'XOF' },
  { code: 'ci', name: "Côte d'Ivoire",  flag: '🇨🇮', currency: 'XOF' },
  { code: 'sn', name: 'Sénégal',        flag: '🇸🇳', currency: 'XOF' },
  { code: 'tg', name: 'Togo',           flag: '🇹🇬', currency: 'XOF' },
  { code: 'cm', name: 'Cameroun',       flag: '🇨🇲', currency: 'XAF' },
  { code: 'bf', name: 'Burkina Faso',   flag: '🇧🇫', currency: 'XOF' },
  { code: 'ml', name: 'Mali',           flag: '🇲🇱', currency: 'XOF' },
  { code: 'gn', name: 'Guinée',         flag: '🇬🇳', currency: 'GNF' },
  { code: 'ne', name: 'Niger',          flag: '🇳🇪', currency: 'XOF' },
  { code: 'cd', name: 'RDC',            flag: '🇨🇩', currency: 'CDF' },
  { code: 'ng', name: 'Nigéria',        flag: '🇳🇬', currency: 'NGN' },
  { code: 'gh', name: 'Ghana',          flag: '🇬🇭', currency: 'GHS' },
  { code: 'ke', name: 'Kenya',          flag: '🇰🇪', currency: 'KES' },
  { code: 'za', name: 'Afrique du Sud', flag: '🇿🇦', currency: 'ZAR' },
  { code: 'fr', name: 'France',         flag: '🇫🇷', currency: 'EUR' },
  { code: 'gb', name: 'Royaume-Uni',    flag: '🇬🇧', currency: 'GBP' },
  { code: 'us', name: 'États-Unis',     flag: '🇺🇸', currency: 'USD' },
];

/* ─── Styles ─── */
const inputStyle = {
  width: '100%', padding: '12px 16px',
  border: '1px solid #E8E8E8', borderRadius: 12,
  fontSize: 14, color: '#333', outline: 'none',
  background: '#FAFAFA', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color .2s',
};

const card = {
  background: '#fff', border: '1px solid #F0F0F0',
  borderRadius: 18, padding: '22px',
};

/* ─── QR Code ─── */
function QRCodeImage({ url, size = 160 }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000`;
  return (
    <img
      src={qrUrl}
      alt="QR Code"
      style={{ width: size, height: size, borderRadius: 12, border: '1px solid #F0F0F0', display: 'block' }}
    />
  );
}

/* ─── Composant principal ─── */
export default function PaymentLinks() {
  const { user } = useAuth();

  const [apiKey, setApiKey]                   = useState('');
  const [loadingConfig, setLoadingConfig]     = useState(true);
  const [amount, setAmount]                   = useState('');
  const [description, setDescription]         = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedMethod, setSelectedMethod]   = useState('');
  const [generatedLink, setGeneratedLink]     = useState('');
  const [showQR, setShowQR]                   = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [copied, setCopied]                   = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const primaryColor = '#FF6B00';

  /* ─── Charger la clé API du marchand connecté ─── */
useEffect(() => {
  if (!user) return;
  // user.merchant est déjà chargé par AuthContext
  setApiKey(user.merchant?.apiKey || '');
  setLoadingConfig(false);
}, [user]);

  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry);
  const availableMethods    = selectedCountry ? (METHODS_BY_COUNTRY[selectedCountry] || []) : [];

  /* ─── Générer le lien via POST /api/gateway/generate-link ─── */
  const generateLink = async () => {
    if (!apiKey) {
      toast.error('Clé API manquante — configurez-la dans Espace Développeur');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }
    if (!description.trim()) {
      toast.error('Veuillez entrer une description');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/gateway/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: description.trim(),
          country: selectedCountry || undefined,
          method:  selectedMethod  || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setGeneratedLink(data.url);
        setShowQR(true);
        toast.success('Lien généré avec succès !');
      } else {
        toast.error(data.error || 'Erreur lors de la génération');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2500);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `💳 *Lien de paiement*\n\nMontant : *${parseFloat(amount).toLocaleString('fr-FR')} ${selectedCountryData?.currency || 'XOF'}*\nDescription : ${description}\n\n👉 ${generatedLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent('Lien de paiement');
    const body = encodeURIComponent(
      `Bonjour,\n\nVoici votre lien de paiement :\n\n${generatedLink}\n\nMontant : ${parseFloat(amount).toLocaleString('fr-FR')} ${selectedCountryData?.currency || 'XOF'}\nDescription : ${description}\n\nMerci !`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSelectedCountry('');
    setSelectedMethod('');
    setGeneratedLink('');
    setShowQR(false);
  };

  /* ─── Chargement config ─── */
  if (loadingConfig) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '2.5px solid #FF6B00', borderTopColor: 'transparent',
          animation: 'spin .7s linear infinite',
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 750, margin: '0 auto',
      padding: '24px 20px 48px',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
    }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to { transform: rotate(360deg); } }
        .pl-input:focus {
          border-color: ${primaryColor} !important;
          box-shadow: 0 0 0 3px ${primaryColor}18 !important;
          background: #fff !important;
        }
        .pl-method-card:hover {
          border-color: ${primaryColor} !important;
          background: ${primaryColor}08 !important;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: `linear-gradient(135deg,${primaryColor},${primaryColor}cc)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Link size={17} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#111', margin: 0, letterSpacing: '-.02em' }}>
              Liens de paiement
            </h1>
            <p style={{ fontSize: 12, color: '#AAA', margin: '2px 0 0' }}>
              Générez un lien sécurisé et partagez-le avec vos clients
            </p>
          </div>
        </div>
      </div>

      {/* Alerte clé API manquante */}
      {!apiKey && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 16px', marginBottom: 18,
          background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: 12, fontSize: 12, color: '#92400E',
        }}>
          <Lock size={14} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Clé API manquante.</strong> Rendez-vous dans{' '}
            <a href="/developer" style={{ color: '#FF6B00', fontWeight: 700 }}>Espace Développeur</a>
            {' '}pour générer et enregistrer votre clé API avant de créer des liens.
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gap: 18 }}>

        {/* Formulaire */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Banknote size={16} color={primaryColor} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>Détails du paiement</span>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>

            {/* Montant + Pays */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Montant */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
                  Montant
                </label>
                <input
                  type="number"
                  className="pl-input"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="5000"
                  min="100"
                  style={inputStyle}
                />
              </div>

              {/* Pays */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
                  Pays
                </label>
                <button
                  className="pl-input"
                  onClick={() => setShowCountryDropdown(v => !v)}
                  style={{
                    ...inputStyle, cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {selectedCountryData ? (
                    <>
                      <span style={{ fontSize: 18 }}>{selectedCountryData.flag}</span>
                      <span style={{ flex: 1, fontSize: 13, color: '#333' }}>{selectedCountryData.name}</span>
                      <span style={{ fontSize: 10, color: '#AAA', background: '#F0F0F0', padding: '2px 6px', borderRadius: 5 }}>
                        {selectedCountryData.currency}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: '#CCC', flex: 1 }}>Tous les pays</span>
                  )}
                  <ChevronDown size={13} color="#CCC" />
                </button>

                {showCountryDropdown && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                      onClick={() => setShowCountryDropdown(false)}
                    />
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: '#fff', border: '1px solid #EBEBEB', borderRadius: 12,
                      boxShadow: '0 8px 32px rgba(0,0,0,.1)', maxHeight: 220, overflowY: 'auto',
                      marginTop: 4, animation: 'fadeUp .15s ease',
                    }}>
                      <button
                        onClick={() => { setSelectedCountry(''); setSelectedMethod(''); setShowCountryDropdown(false); }}
                        style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#AAA', textAlign: 'left', borderBottom: '1px solid #F5F5F5' }}
                      >
                        🌍 Tous les pays
                      </button>
                      {COUNTRIES.filter(c => METHODS_BY_COUNTRY[c.code]?.length > 0).map(c => (
                        <button
                          key={c.code}
                          onClick={() => { setSelectedCountry(c.code); setSelectedMethod(''); setShowCountryDropdown(false); }}
                          style={{
                            width: '100%', padding: '10px 14px', border: 'none',
                            background: selectedCountry === c.code ? `${primaryColor}10` : 'transparent',
                            cursor: 'pointer', fontSize: 13, color: '#333',
                            display: 'flex', alignItems: 'center', gap: 8,
                            textAlign: 'left', borderBottom: '1px solid #F5F5F5', fontFamily: 'inherit',
                          }}
                        >
                          <span style={{ fontSize: 16 }}>{c.flag}</span>
                          <span style={{ flex: 1 }}>{c.name}</span>
                          <span style={{ fontSize: 10, color: '#AAA' }}>{c.currency}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
                Description
              </label>
              <input
                type="text"
                className="pl-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Facture #INV-2026-001"
                style={inputStyle}
              />
            </div>

            {/* Méthodes (si pays sélectionné) */}
            {selectedCountry && availableMethods.length > 0 && (
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 8 }}>
                  Méthode de paiement <span style={{ color: '#CCC', fontWeight: 500 }}>(optionnel)</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
                  <button
                    onClick={() => setSelectedMethod('')}
                    className="pl-method-card"
                    style={{
                      padding: '10px 12px', borderRadius: 11,
                      border: `1.5px solid ${!selectedMethod ? primaryColor : '#EBEBEB'}`,
                      background: !selectedMethod ? `${primaryColor}0D` : '#FAFAFA',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#555',
                      transition: 'all .15s', textAlign: 'center', fontFamily: 'inherit',
                    }}
                  >
                    Toutes
                  </button>
                  {availableMethods.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id)}
                      className="pl-method-card"
                      style={{
                        padding: '10px 12px', borderRadius: 11,
                        border: `1.5px solid ${selectedMethod === m.id ? primaryColor : '#EBEBEB'}`,
                        background: selectedMethod === m.id ? `${primaryColor}0D` : '#FAFAFA',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#555',
                        transition: 'all .15s', textAlign: 'center', fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: 16, display: 'block', marginBottom: 2 }}>{m.icon}</span>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bouton générer */}
          <button
            onClick={generateLink}
            disabled={loading || !amount || !description || !apiKey}
            style={{
              width: '100%', marginTop: 18, padding: '14px',
              background: (loading || !amount || !description || !apiKey)
                ? '#E0E0E0'
                : `linear-gradient(135deg,${primaryColor},${primaryColor}cc)`,
              color: (loading || !amount || !description || !apiKey) ? '#AAA' : '#fff',
              border: 'none', borderRadius: 12,
              fontSize: 14, fontWeight: 700,
              cursor: (loading || !amount || !description || !apiKey) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all .2s',
            }}
          >
            {loading
              ? <><Loader size={15} style={{ animation: 'spin .7s linear infinite' }} /> Génération en cours…</>
              : <><Zap size={16} /> Générer le lien de paiement</>
            }
          </button>
        </div>

        {/* Résultat */}
        {generatedLink && (
          <div style={{ ...card, animation: 'fadeUp .3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CheckCircle2 size={16} color="#00A550" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Lien généré avec succès</span>
            </div>

            {/* QR Code */}
            {showQR && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <QRCodeImage url={generatedLink} size={160} />
                  <p style={{ fontSize: 11, color: '#AAA', marginTop: 8, marginBottom: 0 }}>
                    Scannez pour payer
                  </p>
                </div>
              </div>
            )}

            {/* Lien */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#F9FAFB', border: '1px solid #EBEBEB',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <Link size={14} color={primaryColor} style={{ flexShrink: 0 }} />
              <span style={{
                flex: 1, fontSize: 12, fontFamily: "'DM Mono',monospace",
                color: '#555', wordBreak: 'break-all',
              }}>
                {generatedLink}
              </span>
              <button
                onClick={copyLink}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                  background: copied ? '#ECFDF5' : '#F0F0F0',
                  border: 'none', borderRadius: 7,
                  padding: '6px 11px', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  color: copied ? '#00A550' : '#777',
                  transition: 'all .15s',
                }}
              >
                {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>

            {/* Résumé */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, fontSize: 12, color: '#888' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Banknote size={12} />
                {parseFloat(amount).toLocaleString('fr-FR')} {selectedCountryData?.currency || 'XOF'}
              </span>
              {description && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FileText size={12} />
                  {description}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                Valide 15 minutes
              </span>
            </div>

            {/* Actions partage */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              <button
                onClick={shareViaWhatsApp}
                style={{
                  flex: 1, minWidth: 120,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 16px', background: '#25D366', color: '#fff',
                  border: 'none', borderRadius: 10, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                <MessageCircle size={14} /> WhatsApp
              </button>
              <button
                onClick={shareViaEmail}
                style={{
                  flex: 1, minWidth: 120,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 16px', background: '#0057FF', color: '#fff',
                  border: 'none', borderRadius: 10, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                <Mail size={14} /> Email
              </button>
              <button
                onClick={() => window.open(generatedLink, '_blank')}
                style={{
                  flex: 1, minWidth: 120,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 16px', background: '#fff', color: '#555',
                  border: '1px solid #E8E8E8', borderRadius: 10, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                <ExternalLink size={14} /> Ouvrir
              </button>
            </div>

            {/* Nouveau lien */}
            <button
              onClick={resetForm}
              style={{
                width: '100%', marginTop: 12,
                padding: '10px', background: 'transparent',
                border: '1px solid #EBEBEB', borderRadius: 10,
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: '#AAA', fontFamily: 'inherit',
              }}
            >
              Générer un nouveau lien
            </button>
          </div>
        )}

        {/* Note sécurité */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '12px 16px', background: '#FFF8F3',
          border: '1px solid rgba(255,107,0,.15)', borderRadius: 12,
          fontSize: 12, color: '#888', lineHeight: 1.6,
        }}>
          <Globe size={14} color={primaryColor} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong style={{ color: '#555' }}>Sécurisé :</strong>{' '}
            Le lien contient un pid UUID opaque généré par la gateway. La clé API reste côté serveur et n'apparaît jamais dans l'URL. Le lien expire après 15 minutes.
          </span>
        </div>

      </div>
    </div>
  );
}