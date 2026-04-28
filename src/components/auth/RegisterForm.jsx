import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Globe, Building2, Phone, CheckCircle, ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes float {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-8px); }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(1);   opacity: .6; }
    100% { transform: scale(1.6); opacity: 0;  }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }

  .rg-root * { box-sizing: border-box; margin: 0; padding: 0; }

  .rg-root {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    font-family: 'DM Sans', sans-serif;
    background: #FAFAF8;
  }

  /* ── LEFT PANEL ── */
  .rg-left {
    position: relative;
    background: #0C0C0C;
    padding: 48px 52px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }
  .rg-left-bg {
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 60% 50% at 20% 20%, rgba(249,115,22,.18) 0%, transparent 70%),
      radial-gradient(ellipse 50% 40% at 80% 80%, rgba(249,115,22,.10) 0%, transparent 70%);
  }
  .rg-grid-lines {
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  .rg-logo {
    position: relative;
    display: flex; align-items: center; gap: 10px;
    text-decoration: none;
  }
  .rg-logo-icon {
    width: 38px; height: 38px; border-radius: 11px;
    background: #F97316;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 0 0 rgba(249,115,22,.5);
    animation: none;
  }
  .rg-logo-text {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 17px; font-weight: 800;
    color: #fff; letter-spacing: -.02em;
  }

  .rg-hero { position: relative; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 40px 0; }

  .rg-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(249,115,22,.12); border: 1px solid rgba(249,115,22,.25);
    color: #F97316; border-radius: 50px;
    padding: 5px 14px; font-size: 12px; font-weight: 700;
    letter-spacing: .04em; text-transform: uppercase;
    margin-bottom: 24px; width: fit-content;
    animation: fadeUp .5s ease both;
  }
  .rg-badge-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #F97316; position: relative;
  }
  .rg-badge-dot::after {
    content: '';
    position: absolute; inset: -3px;
    border-radius: 50%; border: 1.5px solid #F97316;
    animation: pulse-ring 1.5s ease infinite;
  }

  .rg-headline {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: clamp(36px, 4vw, 52px);
    font-weight: 900; line-height: 1.08;
    letter-spacing: -.03em; color: #fff;
    margin-bottom: 20px;
    animation: fadeUp .5s .1s ease both;
  }
  .rg-headline-accent { color: #F97316; }

  .rg-sub {
    font-size: 15px; color: rgba(255,255,255,.5);
    line-height: 1.65; max-width: 380px;
    margin-bottom: 36px;
    animation: fadeUp .5s .2s ease both;
  }

  .rg-stats {
    display: flex; gap: 28px;
    animation: fadeUp .5s .3s ease both;
    margin-bottom: 40px;
  }
  .rg-stat { display: flex; flex-direction: column; gap: 3px; }
  .rg-stat-val {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 22px; font-weight: 900; color: #fff; letter-spacing: -.02em;
  }
  .rg-stat-val span { color: #F97316; }
  .rg-stat-lbl { font-size: 11px; color: rgba(255,255,255,.35); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
  .rg-stat-divider { width: 1px; background: rgba(255,255,255,.08); align-self: stretch; }

  .rg-features { display: flex; flex-direction: column; gap: 12px; animation: fadeUp .5s .35s ease both; }
  .rg-feature {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 12px;
    transition: background .2s;
  }
  .rg-feature:hover { background: rgba(255,255,255,.07); }
  .rg-feature-icon {
    width: 34px; height: 34px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .rg-feature-text { flex: 1; }
  .rg-feature-title { font-size: 13px; font-weight: 700; color: #fff; }
  .rg-feature-sub { font-size: 11px; color: rgba(255,255,255,.35); margin-top: 1px; }

  /* Floating card */
  .rg-float-card {
    position: relative;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 16px; padding: 16px 20px;
    display: flex; align-items: center; gap: 14px;
    animation: float 4s ease-in-out infinite;
    backdrop-filter: blur(8px);
  }
  .rg-float-avatar {
    width: 40px; height: 40px; border-radius: 12px;
    background: linear-gradient(135deg, #F97316, #FBBF24);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
  }
  .rg-float-name { font-size: 13px; font-weight: 700; color: #fff; }
  .rg-float-sub  { font-size: 11px; color: rgba(255,255,255,.4); margin-top: 2px; }
  .rg-float-badge {
    margin-left: auto;
    background: rgba(16,185,129,.15); border: 1px solid rgba(16,185,129,.3);
    color: #10B981; border-radius: 8px;
    padding: 4px 10px; font-size: 11px; font-weight: 700;
  }

  /* ── RIGHT PANEL ── */
  .rg-right {
    background: #FAFAF8;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 40px 48px;
    overflow-y: auto;
  }

  .rg-form-wrap {
    width: 100%; max-width: 420px;
    animation: fadeUp .5s .1s ease both;
  }

  .rg-form-header { margin-bottom: 28px; }
  .rg-form-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 26px; font-weight: 900; color: #0C0C0C;
    letter-spacing: -.02em; margin-bottom: 6px;
  }
  .rg-form-sub { font-size: 13px; color: #999; }

  .rg-google-btn {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
    background: #fff; border: 1.5px solid #E8E8E8;
    border-radius: 12px; padding: 13px 16px;
    font-size: 14px; font-weight: 600; color: #333;
    cursor: pointer; transition: all .2s;
    font-family: 'DM Sans', sans-serif;
    margin-bottom: 20px;
  }
  .rg-google-btn:hover { border-color: #D0D0D0; background: #F9F9F9; box-shadow: 0 2px 8px rgba(0,0,0,.06); }

  .rg-divider {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 20px;
  }
  .rg-divider-line { flex: 1; height: 1px; background: #EBEBEB; }
  .rg-divider-text { font-size: 12px; color: #BBB; font-weight: 600; }

  .rg-field { margin-bottom: 14px; }
  .rg-field-label {
    display: block; font-size: 10px; font-weight: 700;
    color: #AAA; text-transform: uppercase; letter-spacing: .08em;
    margin-bottom: 6px;
  }
  .rg-input-wrap { position: relative; }
  .rg-input-icon {
    position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
    color: #CCC; pointer-events: none; display: flex;
  }
  .rg-input {
    width: 100%; padding: 12px 14px 12px 40px;
    background: #fff; border: 1.5px solid #E8E8E8;
    border-radius: 11px; font-size: 13px; color: #111;
    outline: none; transition: all .2s;
    font-family: 'DM Sans', sans-serif;
  }
  .rg-input:focus { border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,.1); }
  .rg-input::placeholder { color: #CCC; }
  .rg-input-no-icon { padding-left: 14px; }

  .rg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  .rg-submit {
    width: 100%; padding: 14px;
    background: #F97316; color: #fff;
    border: none; border-radius: 12px;
    font-size: 14px; font-weight: 800;
    cursor: pointer; transition: all .25s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: 'Bricolage Grotesque', sans-serif;
    letter-spacing: -.01em;
    box-shadow: 0 4px 20px rgba(249,115,22,.35);
    margin-top: 6px;
  }
  .rg-submit:hover:not(:disabled) { background: #EA6C0A; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(249,115,22,.45); }
  .rg-submit:disabled { opacity: .6; cursor: not-allowed; }

  .rg-login-link {
    text-align: center; margin-top: 18px;
    font-size: 13px; color: #999;
  }
  .rg-login-link a { color: #F97316; font-weight: 700; text-decoration: none; }
  .rg-login-link a:hover { text-decoration: underline; }

  /* ── SUCCESS ── */
  .rg-success {
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    background: #FAFAF8; padding: 24px;
    font-family: 'DM Sans', sans-serif;
  }
  .rg-success-card {
    width: 100%; max-width: 460px;
    background: #fff; border: 1px solid #EBEBEB;
    border-radius: 24px; padding: 48px 40px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0,0,0,.04), 0 20px 60px rgba(0,0,0,.08);
    animation: fadeUp .5s ease both;
  }
  .rg-success-icon {
    width: 64px; height: 64px; border-radius: 20px;
    background: #ECFDF5; border: 1px solid rgba(16,185,129,.2);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px;
  }
  .rg-success-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 24px; font-weight: 900; color: #0C0C0C;
    letter-spacing: -.02em; margin-bottom: 8px;
  }
  .rg-success-sub { font-size: 14px; color: #999; line-height: 1.6; margin-bottom: 24px; }
  .rg-warning-box {
    background: #FFFBEB; border: 1px solid #FDE68A;
    border-radius: 14px; padding: 16px;
    text-align: left; margin-bottom: 24px;
  }
  .rg-warning-title { font-size: 13px; font-weight: 700; color: #92400E; margin-bottom: 5px; }
  .rg-warning-text  { font-size: 12px; color: #A16207; line-height: 1.55; }
  .rg-btn-primary {
    display: block; width: 100%; padding: 14px;
    background: #F97316; color: #fff; border-radius: 12px;
    font-size: 14px; font-weight: 800; text-decoration: none;
    font-family: 'Bricolage Grotesque', sans-serif;
    transition: all .2s; margin-bottom: 10px;
    box-shadow: 0 4px 16px rgba(249,115,22,.3);
  }
  .rg-btn-primary:hover { background: #EA6C0A; }
  .rg-btn-ghost {
    display: block; font-size: 13px; color: #999;
    text-decoration: none; transition: color .2s;
    padding: 6px;
  }
  .rg-btn-ghost:hover { color: #333; }

  .rg-spin { animation: spin .7s linear infinite; }

  @media (max-width: 900px) {
    .rg-root { grid-template-columns: 1fr; }
    .rg-left  { display: none; }
    .rg-right { padding: 32px 24px; }
  }
`;

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: '',
    website: '', password: '', confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const set = (key, val) => setFormData(p => ({ ...p, [key]: val }));
  const generateApiKey = () => 'gw_' + Array.from({ length: 48 }, () => Math.random().toString(36)[2]).join('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (formData.password.length < 6) { toast.error('Minimum 6 caractères'); return; }
    setLoading(true);
    try {
      const result = await register(formData.email, formData.password, {
        displayName: formData.name, phone: formData.phone, company: formData.company
      });
      const apiKey = generateApiKey();
      await setDoc(doc(db, 'gateway_merchants', result.user.uid), {
        name: formData.company || formData.name,
        email: formData.email, phone: formData.phone, website: formData.website,
        apiKey, balance: 0, totalTransactions: 0, active: true,
        verificationStatus: 'pending', commission: 1,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
      toast.success('Compte créé avec succès !');
      setStep(2);
    } catch (error) {
      toast.error(error.code === 'auth/email-already-in-use' ? 'Email déjà utilisé' : "Erreur lors de l'inscription");
    } finally { setLoading(false); }
  };

  const handleGoogleSignup = async () => {
    try {
      const result = await loginWithGoogle();
      const apiKey = generateApiKey();
      await setDoc(doc(db, 'gateway_merchants', result.user.uid), {
        name: result.user.displayName || '', email: result.user.email,
        apiKey, balance: 0, totalTransactions: 0, active: true,
        verificationStatus: 'pending', commission: 1,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
      toast.success('Compte créé avec succès !');
      navigate('/dashboard');
    } catch { toast.error('Erreur avec Google'); }
  };

  if (step === 2) return (
    <div className="rg-success">
      <style>{css}</style>
      <div className="rg-success-card">
        <div className="rg-success-icon"><CheckCircle size={30} color="#10B981" /></div>
        <h1 className="rg-success-title">Compte créé !</h1>
        <p className="rg-success-sub">Bienvenue sur Payment Gateway. Vérifiez votre identité pour débloquer toutes les fonctionnalités.</p>
        <div className="rg-warning-box">
          <p className="rg-warning-title">⚠️ Vérification requise</p>
          <p className="rg-warning-text">Les paiements sont limités tant que votre compte n'est pas vérifié. La vérification prend moins de 5 minutes.</p>
        </div>
        <Link to="/verification" className="rg-btn-primary">Vérifier mon compte maintenant</Link>
        <Link to="/dashboard" className="rg-btn-ghost">Accéder au dashboard →</Link>
      </div>
    </div>
  );

  return (
    <div className="rg-root">
      <style>{css}</style>

      {/* ── LEFT ── */}
      <div className="rg-left">
        <div className="rg-left-bg" />
        <div className="rg-grid-lines" />

        <Link to="/" className="rg-logo">
          <div className="rg-logo-icon"><Globe size={20} color="#fff" /></div>
          <span className="rg-logo-text">Payment Gateway</span>
        </Link>

        <div className="rg-hero">
          <div className="rg-badge">
            <div className="rg-badge-dot" />
            40+ pays · 30 providers
          </div>

          <h1 className="rg-headline">
            Acceptez les<br />
            paiements<br />
            <span className="rg-headline-accent">partout en Afrique</span><br />
            & dans le monde.
          </h1>

          <p className="rg-sub">
            Une seule intégration pour Mobile Money, cartes bancaires, PayPal et bien plus. Déployez en moins de 10 minutes.
          </p>

          <div className="rg-stats">
            <div className="rg-stat">
              <div className="rg-stat-val">40<span>+</span></div>
              <div className="rg-stat-lbl">Pays</div>
            </div>
            <div className="rg-stat-divider" />
            <div className="rg-stat">
              <div className="rg-stat-val">1<span>%</span></div>
              <div className="rg-stat-lbl">Commission</div>
            </div>
            <div className="rg-stat-divider" />
            <div className="rg-stat">
              <div className="rg-stat-val">99.9<span>%</span></div>
              <div className="rg-stat-lbl">Uptime</div>
            </div>
          </div>

          <div className="rg-features">
            {[
              { icon: Zap, bg: 'rgba(249,115,22,.15)', color: '#F97316', title: 'Paiements instantanés', sub: 'Mobile Money, cartes, PayPal' },
              { icon: Shield, bg: 'rgba(16,185,129,.15)', color: '#10B981', title: 'Sécurité PCI DSS', sub: 'Chiffrement SSL bout-en-bout' },
              { icon: TrendingUp, bg: 'rgba(99,102,241,.15)', color: '#6366F1', title: 'Dashboard temps réel', sub: 'Analytics et rapports détaillés' },
            ].map(({ icon: Icon, bg, color, title, sub }) => (
              <div key={title} className="rg-feature">
                <div className="rg-feature-icon" style={{ background: bg }}>
                  <Icon size={16} color={color} />
                </div>
                <div className="rg-feature-text">
                  <div className="rg-feature-title">{title}</div>
                  <div className="rg-feature-sub">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating testimonial card */}
        <div className="rg-float-card">
          <div className="rg-float-avatar">🏪</div>
          <div>
            <div className="rg-float-name">Marie K. — Abidjan</div>
            <div className="rg-float-sub">+125 000 XOF ce mois</div>
          </div>
          <div className="rg-float-badge">+18% ↑</div>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="rg-right">
        <div className="rg-form-wrap">
          <div className="rg-form-header">
            <h2 className="rg-form-title">Créer un compte</h2>
            <p className="rg-form-sub">Rejoignez des milliers de marchands · Gratuit, sans engagement</p>
          </div>

          <button onClick={handleGoogleSignup} className="rg-google-btn">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            S'inscrire avec Google
          </button>

          <div className="rg-divider">
            <div className="rg-divider-line" />
            <span className="rg-divider-text">ou par email</span>
            <div className="rg-divider-line" />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="rg-field">
              <label className="rg-field-label">Nom complet</label>
              <div className="rg-input-wrap">
                <span className="rg-input-icon"><User size={15} /></span>
                <input className="rg-input" type="text" placeholder="John Doe" value={formData.name} onChange={e => set('name', e.target.value)} required />
              </div>
            </div>

            <div className="rg-grid-2">
              <div className="rg-field">
                <label className="rg-field-label">Email</label>
                <div className="rg-input-wrap">
                  <span className="rg-input-icon"><Mail size={15} /></span>
                  <input className="rg-input" type="email" placeholder="email@exemple.com" value={formData.email} onChange={e => set('email', e.target.value)} required />
                </div>
              </div>
              <div className="rg-field">
                <label className="rg-field-label">Téléphone</label>
                <div className="rg-input-wrap">
                  <span className="rg-input-icon"><Phone size={15} /></span>
                  <input className="rg-input" type="tel" placeholder="+229…" value={formData.phone} onChange={e => set('phone', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rg-grid-2">
              <div className="rg-field">
                <label className="rg-field-label">Entreprise</label>
                <div className="rg-input-wrap">
                  <span className="rg-input-icon"><Building2 size={15} /></span>
                  <input className="rg-input" type="text" placeholder="Nom entreprise" value={formData.company} onChange={e => set('company', e.target.value)} />
                </div>
              </div>
              <div className="rg-field">
                <label className="rg-field-label">Site web</label>
                <div className="rg-input-wrap">
                  <span className="rg-input-icon"><Globe size={15} /></span>
                  <input className="rg-input" type="url" placeholder="https://…" value={formData.website} onChange={e => set('website', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rg-grid-2">
              <div className="rg-field">
                <label className="rg-field-label">Mot de passe</label>
                <div className="rg-input-wrap">
                  <span className="rg-input-icon"><Lock size={15} /></span>
                  <input className="rg-input" type="password" placeholder="6 caractères min." value={formData.password} onChange={e => set('password', e.target.value)} required />
                </div>
              </div>
              <div className="rg-field">
                <label className="rg-field-label">Confirmer</label>
                <div className="rg-input-wrap">
                  <span className="rg-input-icon"><Lock size={15} /></span>
                  <input className="rg-input" type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} required />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="rg-submit">
              {loading
                ? <><svg className="rg-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Création…</>
                : <>Créer mon compte <ArrowRight size={16} /></>
              }
            </button>
          </form>

          <p className="rg-login-link">
            Déjà un compte ? <Link to="/login">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}