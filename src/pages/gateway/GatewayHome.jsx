import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowRight, CheckCircle, Globe, Shield, CreditCard,
  Smartphone, Zap, TrendingUp, Menu, X, ChevronRight,
  ArrowUp, Code2, Webhook, BarChart3, Lock
} from 'lucide-react';
import { useState, useEffect } from 'react';

const SLIDE_WORDS = [
  { word: 'Afrique',  color: '#FF6B00' },
  { word: 'Europe',   color: '#0057FF' },
  { word: 'Amérique', color: '#00A550' },
  { word: 'le Monde', color: '#9B00E8' },
];

function WordSlider() {
  const [index, setIndex] = useState(0);
  const [out, setOut] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setOut(true);
      setTimeout(() => { setIndex(i => (i + 1) % SLIDE_WORDS.length); setOut(false); }, 320);
    }, 2400);
    return () => clearInterval(t);
  }, []);
  const { word, color } = SLIDE_WORDS[index];
  return (
    <span style={{ color, display: 'inline-block', transition: 'opacity .28s ease, transform .28s ease', opacity: out ? 0 : 1, transform: out ? 'translateY(14px)' : 'translateY(0)' }}>
      {word}
    </span>
  );
}

/* ── Dashboard mock for hero right side ── */
function DashboardMock() {
  return (
    <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 28px 90px rgba(0,0,0,0.14)', padding: '24px', width: 320, border: '1px solid #F0F0F0', fontFamily: 'inherit' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 2 }}>Revenus du jour</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#111', letterSpacing: '-.02em' }}>2 450 000 XOF</div>
        </div>
        <span style={{ background: '#ECFDF5', color: '#00A550', fontSize: 11, fontWeight: 700, padding: '5px 11px', borderRadius: 100 }}>+18% ↑</span>
      </div>
      {/* mini bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48, marginBottom: 18 }}>
        {[30, 55, 40, 70, 50, 90, 65, 85, 60, 100, 75, 88].map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: i === 10 ? '#FF6B00' : '#F0F0F0', transition: 'height .3s' }} />
        ))}
      </div>
      {/* transactions */}
      {[
        { label: 'MTN Mobile Money', country: '🇧🇯', amount: '+125 000', color: '#FFAA00' },
        { label: 'Stripe · Visa', country: '🇫🇷', amount: '+89 500', color: '#0057FF' },
        { label: 'Wave', country: '🇸🇳', amount: '+45 000', color: '#00A550' },
      ].map((tx, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < 2 ? '1px solid #F5F5F5' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${tx.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{tx.country}</div>
            <span style={{ fontSize: 12, color: '#555', fontWeight: 500 }}>{tx.label}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#00A550' }}>{tx.amount}</span>
        </div>
      ))}
      <div style={{ marginTop: 16, background: 'linear-gradient(135deg,#FF6B00,#FFAA00)', color: '#fff', textAlign: 'center', borderRadius: 11, padding: '10px 0', fontSize: 13, fontWeight: 700 }}>
        Voir le tableau de bord →
      </div>
    </div>
  );
}

function FloatingBadge({ style, iconColor, icon: Icon, children }) {
  return (
    <div style={{ position: 'absolute', background: '#fff', borderRadius: 12, padding: '8px 14px', boxShadow: '0 8px 28px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#333', whiteSpace: 'nowrap', border: '1px solid #F0F0F0', ...style }}>
      {Icon && <Icon size={13} style={{ color: iconColor }} />}
      {children}
    </div>
  );
}

const PROVIDERS = [
  { name: 'FeexPay', region: 'Afrique' },
  { name: 'Stripe', region: 'Global' },
  { name: 'Paystack', region: 'Afrique' },
  { name: 'Flutterwave', region: 'Afrique' },
  { name: 'KKiaPay', region: 'Afrique' },
  { name: 'FedaPay', region: 'Afrique' },
  { name: 'PayDunya', region: 'Afrique' },
  { name: 'CinetPay', region: 'Afrique' },
  { name: 'Lygos', region: 'Afrique' },
  { name: 'PayPal', region: 'Global' },
  { name: 'MbiyoPay', region: 'Afrique' },
  { name: 'Qosic', region: 'Afrique' },
  { name: 'Bizao', region: 'Afrique' },
  { name: 'Hub2', region: 'Afrique' },
  { name: 'Chipper Cash', region: 'Afrique' },
];

const REGION_COLORS = {
  'Afrique': { bg: '#FFF3EA', color: '#FF6B00' },
  'Global':  { bg: '#EBF0FF', color: '#0057FF' },
};

export default function Home() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const fn = () => { setScrolled(window.scrollY > 20); setShowTop(window.scrollY > 500); };
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FC', fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", color: '#111' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .pp-ani { animation: fadeUp .65s ease both; }
        .pp-float { animation: floatY 4s ease-in-out infinite; }
        .pp-nav-link:hover { color:#FF6B00 !important; }
        .pp-card:hover { box-shadow:0 14px 48px rgba(0,0,0,.09)!important; transform:translateY(-3px); border-color:#E0E0E0!important; }
        .pp-provider:hover { border-color:#FF6B00!important; background:#FFF8F3!important; }
        .pp-plan:hover { border-color:#CCC!important; }
        .pp-cta-primary:hover { transform:translateY(-2px); box-shadow:0 12px 38px rgba(255,107,0,.45)!important; }
        .pp-cta-secondary:hover { border-color:#CCC!important; background:#F0F0F0!important; }
        .pp-btn-outline:hover { border-color:#999!important; color:#111!important; }
        .pp-btn-gold:hover { box-shadow:0 10px 36px rgba(255,107,0,.45)!important; transform:translateY(-1px); }
        @media(max-width:960px){
          .pp-hero-grid { grid-template-columns:1fr!important; }
          .pp-hero-visual { display:none!important; }
          .pp-stats-inner { grid-template-columns:1fr 1fr!important; }
          .pp-stat-2 { border-right:none!important; }
          .pp-feat-grid { grid-template-columns:1fr 1fr!important; }
          .pp-pricing-grid { grid-template-columns:1fr!important; max-width:400px; margin-left:auto; margin-right:auto; }
          .pp-api-grid { grid-template-columns:1fr!important; }
          .pp-footer-grid { grid-template-columns:1fr 1fr!important; gap:32px!important; }
          .pp-desktop-nav { display:none!important; }
          .pp-mobile-toggle { display:flex!important; }
        }
        @media(max-width:600px){
          .pp-feat-grid { grid-template-columns:1fr!important; }
          .pp-footer-grid { grid-template-columns:1fr!important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999, background: scrolled ? 'rgba(255,255,255,0.93)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottom: scrolled ? '1px solid rgba(0,0,0,0.07)' : '1px solid transparent', transition: 'all .3s' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#FF6B00,#FFAA00)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(255,107,0,.3)' }}>
              <Globe size={18} style={{ color: '#fff' }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>Paiement Pro</span>
          </a>

          <div className="pp-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {[['#features','Fonctionnalités'],['#providers','Providers'],['#api','API'],['#pricing','Tarifs']].map(([href, label]) => (
              <a key={href} href={href} className="pp-nav-link" style={{ fontSize: 14, color: '#555', textDecoration: 'none', fontWeight: 500, transition: 'color .2s' }}>{label}</a>
            ))}
          </div>

          <div className="pp-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user ? (
              <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg,#FF6B00,#FFAA00)', color: '#fff', textDecoration: 'none', padding: '9px 20px', borderRadius: 12, boxShadow: '0 4px 16px rgba(255,107,0,.3)' }}>
                Dashboard <ChevronRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="pp-nav-link" style={{ fontSize: 14, color: '#555', textDecoration: 'none', fontWeight: 500, padding: '8px 14px', borderRadius: 10 }}>Connexion</Link>
                <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg,#FF6B00,#FFAA00)', color: '#fff', textDecoration: 'none', padding: '9px 20px', borderRadius: 12, boxShadow: '0 4px 16px rgba(255,107,0,.3)' }}>
                  Inscription gratuite <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>

          <button className="pp-mobile-toggle" onClick={() => setMobileMenuOpen(v => !v)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: '#333', padding: 6, alignItems: 'center' }}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div style={{ background: '#fff', borderTop: '1px solid #EEE', padding: '16px 28px 24px' }}>
            {[['#features','Fonctionnalités'],['#providers','Providers'],['#api','API'],['#pricing','Tarifs']].map(([href, label], i, arr) => (
              <a key={href} href={href} style={{ display: 'block', padding: '12px 0', fontSize: 15, color: '#444', borderBottom: i < arr.length-1 ? '1px solid #F3F3F3' : 'none', textDecoration: 'none' }} onClick={() => setMobileMenuOpen(false)}>{label}</a>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              <Link to="/login" style={{ textAlign: 'center', border: '1.5px solid #DDD', color: '#444', padding: '12px', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Connexion</Link>
              <Link to="/register" style={{ textAlign: 'center', background: 'linear-gradient(135deg,#FF6B00,#FFAA00)', color: '#fff', padding: '12px', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>Inscription gratuite</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: 'linear-gradient(155deg,#FFFAF5 0%,#F7F8FC 65%)', borderBottom: '1px solid #EBEBEB' }}>
        <div className="pp-hero-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '118px 32px 90px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>

          {/* LEFT */}
          <div className="pp-ani">
            <h1 style={{ fontSize: 'clamp(38px,4.8vw,64px)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-.03em', marginBottom: 22, color: '#0A0A0A' }}>
              Acceptez les paiements<br />
              <span style={{ color: '#222' }}>en </span><WordSlider /><br />
              <span style={{ color: '#222' }}>en un instant.</span>
            </h1>
            <p style={{ fontSize: 17, color: '#666', lineHeight: 1.7, maxWidth: 460, marginBottom: 34 }}>
              Une seule intégration pour Mobile Money, cartes bancaires, PayPal et bien plus. Disponible dans 40+ pays sur tous les continents.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
              <Link to="/register" className="pp-cta-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#FF6B00,#FFAA00)', color: '#fff', fontSize: 15, fontWeight: 700, padding: '15px 30px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 6px 26px rgba(255,107,0,.35)', transition: 'all .25s' }}>
                Commencer gratuitement <ArrowRight size={17} />
              </Link>
              <a href="#providers" className="pp-cta-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #E5E5E5', color: '#333', fontSize: 15, fontWeight: 600, padding: '15px 26px', borderRadius: 14, textDecoration: 'none', transition: 'all .25s' }}>
                Voir les providers
              </a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {['Sans engagement', 'Commission 1% seulement', 'Paiements instantanés'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#888' }}>
                  <CheckCircle size={13} style={{ color: '#00A550' }} /> {t}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="pp-hero-visual" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', height: 460 }}>
            <FloatingBadge style={{ top: 28, right: 0 }} icon={CheckCircle} iconColor="#00A550">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00A550', display: 'inline-block' }} />
              Paiement reçu · +125 000 XOF
            </FloatingBadge>
            <FloatingBadge style={{ top: 190, left: -20 }} icon={Globe} iconColor="#0057FF">
              40+ pays supportés 🌍
            </FloatingBadge>
            <FloatingBadge style={{ bottom: 60, right: -10 }} icon={Shield} iconColor="#9B00E8">
              Sécurisé PCI DSS ✓
            </FloatingBadge>
            <div className="pp-float"><DashboardMock /></div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EBEBEB' }}>
        <div className="pp-stats-inner" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[
            { icon: Globe, val: '40+', lbl: 'Pays supportés' },
            { icon: Zap, val: '15+', lbl: 'Providers intégrés' },
            { icon: TrendingUp, val: '99.9%', lbl: 'Disponibilité' },
            { icon: CreditCard, val: '1%', lbl: 'Commission seulement' },
          ].map((s, i, arr) => (
            <div key={i} className={i === 1 ? 'pp-stat-2' : ''} style={{ padding: '30px 24px', borderRight: i < arr.length-1 ? '1px solid #EBEBEB' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#FFF3EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.icon size={19} style={{ color: '#FF6B00' }} />
              </div>
              <div>
                <div style={{ fontSize: 23, fontWeight: 900, color: '#111', lineHeight: 1, marginBottom: 3 }}>{s.val}</div>
                <div style={{ fontSize: 12, color: '#999', fontWeight: 500 }}>{s.lbl}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '90px 32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#FF6B00', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
            <Zap size={11} /> Fonctionnalités
          </div>
          <h2 style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 900, color: '#0A0A0A', letterSpacing: '-.025em', lineHeight: 1.1, marginBottom: 14 }}>
            Tout ce dont votre<br />passerelle a besoin
          </h2>
          <p style={{ fontSize: 16, color: '#777', lineHeight: 1.65, maxWidth: 460, marginBottom: 50 }}>
            Une infrastructure complète pour accepter les paiements partout dans le monde.
          </p>
          <div className="pp-feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 18 }}>
            {[
              { icon: Globe, title: 'Couverture Mondiale', desc: "40+ pays en Afrique, Europe, Amérique et Asie. Détection automatique du pays et de la devise avec conversion en temps réel.", pill: '40+ pays · Multi-devises', pillBg: '#FFF3EA', pillColor: '#FF6B00', iconBg: '#FFF3EA', iconColor: '#FF6B00' },
              { icon: Smartphone, title: 'Mobile Money', desc: "MTN, Moov, Orange, Wave, M-Pesa et tous les opérateurs majeurs d'Afrique. Paiement en 10 secondes depuis un téléphone.", pill: 'MTN · Wave · Orange · Moov', pillBg: '#EBF0FF', pillColor: '#0057FF', iconBg: '#EBF0FF', iconColor: '#0057FF' },
              { icon: CreditCard, title: 'Cartes & PayPal', desc: "Visa, Mastercard, American Express, PayPal et toutes les cartes internationales. Acceptez vos clients européens et américains sans friction.", pill: 'Visa · Mastercard · PayPal', pillBg: '#EDFAF3', pillColor: '#00A550', iconBg: '#EDFAF3', iconColor: '#00A550' },
              { icon: Shield, title: 'Sécurité Maximale', desc: "Certification PCI DSS, chiffrement TLS, authentification 3D Secure et détection anti-fraude en temps réel sur chaque transaction.", pill: 'PCI DSS · 3DS · Anti-fraude', pillBg: '#F4EBFF', pillColor: '#9B00E8', iconBg: '#F4EBFF', iconColor: '#9B00E8' },
            ].map((f, i) => (
              <div key={i} className="pp-card" style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 20, padding: '32px', transition: 'all .3s' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: f.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <f.icon size={22} style={{ color: f.iconColor }} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: 10 }}>{f.title}</div>
                <p style={{ fontSize: 14, color: '#777', lineHeight: 1.7 }}>{f.desc}</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '5px 12px', marginTop: 18, background: f.pillBg, color: f.pillColor }}>
                  <CheckCircle size={10} /> {f.pill}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROVIDERS ── */}
      <section id="providers" style={{ background: '#fff', borderTop: '1px solid #EBEBEB', borderBottom: '1px solid #EBEBEB' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '90px 32px' }}>
          <div style={{ marginBottom: 52 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#FF6B00', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
              <CreditCard size={11} /> Providers
            </div>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 900, color: '#0A0A0A', letterSpacing: '-.025em', lineHeight: 1.1, marginBottom: 14 }}>
              Une intégration,<br />tous les moyens de paiement
            </h2>
            <p style={{ fontSize: 16, color: '#777', lineHeight: 1.65, maxWidth: 500 }}>
              15 providers déjà intégrés, des dizaines de méthodes supplémentaires disponibles via notre documentation. Africains, européens, américains et bien plus.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {PROVIDERS.map((p) => {
              const rc = REGION_COLORS[p.region] || REGION_COLORS['Global'];
              return (
                <div key={p.name} className="pp-provider" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FAFAFA', border: '1.5px solid #EBEBEB', borderRadius: 12, padding: '10px 18px', transition: 'all .2s', cursor: 'default' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>{p.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: rc.bg, color: rc.color, padding: '2px 8px', borderRadius: 100 }}>{p.region}</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0F0F0', border: '1.5px dashed #DDD', borderRadius: 12, padding: '10px 18px' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#999' }}>+ et bien d'autres…</span>
            </div>
          </div>

          {/* Methods pills */}
          <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['MTN Mobile Money','Orange Money','Moov Money','Wave','M-Pesa','Visa','Mastercard','American Express','PayPal','Virement SEPA','Apple Pay','Google Pay','USSD'].map((m) => (
              <span key={m} style={{ fontSize: 12, fontWeight: 500, color: '#666', background: '#fff', border: '1px solid #E8E8E8', padding: '5px 12px', borderRadius: 100 }}>{m}</span>
            ))}
            <span style={{ fontSize: 12, fontWeight: 500, color: '#aaa', background: '#F8F8F8', border: '1px dashed #E0E0E0', padding: '5px 12px', borderRadius: 100 }}>+ dizaines de méthodes</span>
          </div>
        </div>
      </section>

      {/* ── API ── */}
      <section id="api">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '90px 32px' }}>
          <div className="pp-api-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
            {/* Left — code */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#FF6B00', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
                <Code2 size={11} /> API
              </div>
              <h2 style={{ fontSize: 'clamp(24px,3vw,38px)', fontWeight: 900, color: '#0A0A0A', letterSpacing: '-.025em', lineHeight: 1.1, marginBottom: 14 }}>
                Intégrez en<br />quelques lignes
              </h2>
              <p style={{ fontSize: 15, color: '#777', lineHeight: 1.7, marginBottom: 28, maxWidth: 400 }}>
                Notre API REST simple et documentée. Clé unique, webhooks, dashboard temps réel.
              </p>
              <div style={{ background: '#0A0A0F', borderRadius: 18, padding: '24px', overflow: 'auto' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {['#FF5F56','#FFBD2E','#27C93F'].map((c,i) => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
                </div>
                <pre style={{ fontFamily: "'Fira Code','Courier New',monospace", fontSize: 12, lineHeight: 1.75, color: '#cdd6f4', margin: 0 }}>{`<form action="https://api.paiement.pro/pay"
      method="POST">
  <input name="token"
         value="YOUR_API_KEY" />
  <input name="amount"
         value="5000" />
  <input name="currency"
         value="XOF" />
  <input name="provider"
         value="auto" />
  <button type="submit">
    Payer 5 000 XOF
  </button>
</form>`}</pre>
              </div>
            </div>
            {/* Right — features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: Code2, title: 'Clé API unique', desc: 'Une seule clé pour tous les providers. Pas de configuration par provider.', color: '#FF6B00', bg: '#FFF3EA' },
                { icon: Webhook, title: 'Webhooks temps réel', desc: "Recevez les événements de paiement instantanément sur votre endpoint.", color: '#0057FF', bg: '#EBF0FF' },
                { icon: BarChart3, title: 'Dashboard complet', desc: 'Statistiques, transactions, exports CSV. Tout en un seul endroit.', color: '#00A550', bg: '#EDFAF3' },
                { icon: Lock, title: 'Support 24/7', desc: 'Équipe technique disponible à tout moment pour vous accompagner.', color: '#9B00E8', bg: '#F4EBFF' },
              ].map((f, i) => (
                <div key={i} className="pp-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#fff', border: '1px solid #EBEBEB', borderRadius: 16, padding: '18px 20px', transition: 'all .3s' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <f.icon size={18} style={{ color: f.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#111', marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: '#777', lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ background: '#fff', borderTop: '1px solid #EBEBEB', padding: '90px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#FF6B00', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12, justifyContent: 'center' }}>
              <TrendingUp size={11} /> Tarification
            </div>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 900, color: '#0A0A0A', letterSpacing: '-.025em', lineHeight: 1.1, marginBottom: 14 }}>
              Simple. Transparent.<br />Pas d'abonnement.
            </h2>
            <p style={{ fontSize: 16, color: '#777', maxWidth: 440, margin: '0 auto' }}>
              Aucun frais fixe, aucun abonnement. Vous ne payez que lorsque vous encaissez.
            </p>
          </div>

          {/* Big commission card */}
          <div style={{ maxWidth: 680, margin: '0 auto 40px', background: 'linear-gradient(135deg,#FFF8F2,#FFF3EA)', border: '2px solid #FFDAB8', borderRadius: 28, padding: '52px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* decorative circle */}
            <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,107,0,.06)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,170,0,.08)', pointerEvents: 'none' }} />

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #FFDAB8', color: '#FF6B00', fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 100, marginBottom: 28 }}>
              <Zap size={12} /> Modèle unique
            </div>

            <div style={{ fontSize: 'clamp(72px,12vw,110px)', fontWeight: 900, color: '#FF6B00', lineHeight: 1, letterSpacing: '-.04em', marginBottom: 8 }}>
              1<span style={{ fontSize: '0.55em', verticalAlign: 'super' }}>%</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#333', marginBottom: 10 }}>par transaction</div>
            <div style={{ fontSize: 15, color: '#888', lineHeight: 1.65, maxWidth: 360, margin: '0 auto 36px' }}>
              C'est tout. Pas d'abonnement, pas de frais cachés, pas de frais d'installation. Payez uniquement quand vos clients paient.
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
              {[
                { label: 'Inscription', value: 'Gratuite' },
                { label: 'Frais mensuels', value: '0 XOF' },
                { label: 'Commission', value: '1% / tx' },
                { label: 'Retrait', value: 'Inclus' },
              ].map((item, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 14, padding: '14px 22px', textAlign: 'center', minWidth: 110 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#111', letterSpacing: '-.02em' }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 3, fontWeight: 500 }}>{item.label}</div>
                </div>
              ))}
            </div>

            <Link to="/register" className="pp-btn-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', fontSize: 15, fontWeight: 700, padding: '15px 36px', borderRadius: 14, background: 'linear-gradient(135deg,#FF6B00,#FFAA00)', color: '#fff', boxShadow: '0 6px 24px rgba(255,107,0,.35)', transition: 'all .25s' }}>
              Commencer gratuitement <ArrowRight size={17} />
            </Link>
          </div>

          {/* Reassurance row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {[
              { icon: CheckCircle, color: '#00A550', text: 'Sans engagement' },
              { icon: Shield, color: '#0057FF', text: 'Transactions sécurisées PCI DSS' },
              { icon: Zap, color: '#FF6B00', text: 'Activation instantanée' },
              { icon: Globe, color: '#9B00E8', text: '40+ pays supportés' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#666', background: '#FAFAFA', border: '1px solid #EBEBEB', padding: '9px 16px', borderRadius: 100 }}>
                <item.icon size={13} style={{ color: item.color }} /> {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <div style={{ background: 'linear-gradient(135deg,#FF6B00 0%,#FFAA00 100%)', padding: '72px 32px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 900, color: '#fff', letterSpacing: '-.025em', marginBottom: 14 }}>
          Prêt à accepter des paiements partout ?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,.85)', maxWidth: 420, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Inscription gratuite en 2 minutes. Aucune carte requise.
        </p>
        <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', color: '#FF6B00', fontSize: 15, fontWeight: 800, padding: '16px 36px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 8px 32px rgba(0,0,0,.15)', transition: 'all .25s' }}>
          Commencer gratuitement <ArrowRight size={18} />
        </Link>
        <p style={{ marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,.65)' }}>Sans engagement · Commission 1% seulement · Support 24/7</p>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0A0A0F', padding: '64px 32px 36px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="pp-footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#FF6B00,#FFAA00)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={16} style={{ color: '#fff' }} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Paiement Pro</span>
              </div>
              <p style={{ fontSize: 13, color: '#fff', lineHeight: 1.75, marginBottom: 18 }}>
                Passerelle de paiement unifiée. Mobile Money, cartes bancaires, PayPal et plus encore — en Afrique, en Europe, en Amérique et dans le monde entier.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['🌍 Afrique', '🌎 Amériques', '🌏 Asie-Pacifique', '🇪🇺 Europe'].map((c, i) => (
                  <span key={i} style={{ fontSize: 11, color: '#fff', background: 'rgba(255,255,255,.07)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,.1)' }}>{c}</span>
                ))}
              </div>
            </div>

            {[
              { title: 'Produit', links: [['/#features','Fonctionnalités'],['/#pricing','Tarifs'],['/#api','API'],['/#providers','Providers']] },
              { title: 'Ressources', links: [['/api-documentation','Documentation API'],['a/help','Aide & Support'],['a/contact','Contact']] },
              { title: 'Légal', links: [['/privacy','Confidentialité'],['/terms','CGU'],['/cookies','Cookies'],['/legal','Mentions légales']] },
            ].map((col, ci) => (
              <div key={ci}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 18 }}>{col.title}</div>
                {col.links.map(([href, label], li) => (
                  <a key={li} href={href} style={{ display: 'block', fontSize: 13, color: '#fff', textDecoration: 'none', marginBottom: 11 }}
                    onMouseEnter={e => e.target.style.opacity = '.6'}
                    onMouseLeave={e => e.target.style.opacity = '1'}
                  >{label}</a>
                ))}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#fff' }}>© {new Date().getFullYear()} Paiement Pro. Tous droits réservés.</span>
            <span style={{ fontSize: 12, color: '#fff' }}>Développé avec ❤️ depuis le Bénin</span>
          </div>
        </div>
      </footer>

      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Retour en haut"
          style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 999, width: 42, height: 42, borderRadius: 12, background: '#fff', border: '1.5px solid #EEE', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 18px rgba(0,0,0,.12)', transition: 'all .25s' }}>
          <ArrowUp size={17} />
        </button>
      )}
    </div>
  );
}