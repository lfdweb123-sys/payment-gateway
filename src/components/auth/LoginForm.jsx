import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, Globe, Zap, Shield, TrendingUp } from 'lucide-react';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-ring {
    0%   { transform: scale(1);   opacity: .6; }
    100% { transform: scale(1.6); opacity: 0;  }
  }

  .lg-root * { box-sizing: border-box; margin: 0; padding: 0; }

  .lg-root {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    font-family: 'DM Sans', sans-serif;
    background: #FAFAF8;
  }

  /* ── LEFT PANEL ── */
  .lg-left {
    position: relative;
    background: #0C0C0C;
    padding: 48px 52px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }
  .lg-left-bg {
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 60% 50% at 20% 20%, rgba(249,115,22,.18) 0%, transparent 70%),
      radial-gradient(ellipse 50% 40% at 80% 80%, rgba(249,115,22,.10) 0%, transparent 70%);
  }
  .lg-grid-lines {
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  .lg-logo {
    position: relative;
    display: flex; align-items: center; gap: 10px;
    text-decoration: none;
  }
  .lg-logo-icon {
    width: 38px; height: 38px; border-radius: 11px;
    background: #F97316;
    display: flex; align-items: center; justify-content: center;
  }
  .lg-logo-text {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 17px; font-weight: 800;
    color: #fff; letter-spacing: -.02em;
  }

  .lg-hero {
    position: relative; flex: 1;
    display: flex; flex-direction: column;
    justify-content: center; padding: 40px 0;
  }

  .lg-headline {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: clamp(34px, 3.5vw, 48px);
    font-weight: 900; line-height: 1.08;
    letter-spacing: -.03em; color: #fff;
    margin-bottom: 16px;
    animation: fadeUp .5s .1s ease both;
  }
  .lg-headline-accent { color: #F97316; }

  .lg-sub {
    font-size: 15px; color: rgba(255,255,255,.45);
    line-height: 1.65; max-width: 360px;
    margin-bottom: 40px;
    animation: fadeUp .5s .2s ease both;
  }

  .lg-features { display: flex; flex-direction: column; gap: 12px; animation: fadeUp .5s .3s ease both; margin-bottom: 24px; }
  .lg-feature {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 12px;
    transition: background .2s;
  }
  .lg-feature:hover { background: rgba(255,255,255,.07); }
  .lg-feature-icon {
    width: 34px; height: 34px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .lg-feature-text { flex: 1; }
  .lg-feature-title { font-size: 13px; font-weight: 700; color: #fff; }
  .lg-feature-sub { font-size: 11px; color: rgba(255,255,255,.35); margin-top: 1px; }

  /* Badge en bas */
  .lg-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(249,115,22,.12); border: 1px solid rgba(249,115,22,.25);
    color: #F97316; border-radius: 50px;
    padding: 5px 14px; font-size: 12px; font-weight: 700;
    letter-spacing: .04em; text-transform: uppercase;
    width: fit-content;
    animation: fadeUp .5s .4s ease both;
  }
  .lg-badge-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #F97316; position: relative;
  }
  .lg-badge-dot::after {
    content: '';
    position: absolute; inset: -3px;
    border-radius: 50%; border: 1.5px solid #F97316;
    animation: pulse-ring 1.5s ease infinite;
  }

  /* ── RIGHT PANEL ── */
  .lg-right {
    background: #FAFAF8;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 40px 48px;
    overflow-y: auto;
  }

  .lg-form-wrap {
    width: 100%; max-width: 380px;
    animation: fadeUp .5s .1s ease both;
  }

  .lg-form-header { margin-bottom: 28px; }
  .lg-form-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 26px; font-weight: 900; color: #0C0C0C;
    letter-spacing: -.02em; margin-bottom: 6px;
  }
  .lg-form-sub { font-size: 13px; color: #999; }

  .lg-google-btn {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
    background: #fff; border: 1.5px solid #E8E8E8;
    border-radius: 12px; padding: 13px 16px;
    font-size: 14px; font-weight: 600; color: #333;
    cursor: pointer; transition: all .2s;
    font-family: 'DM Sans', sans-serif;
    margin-bottom: 20px;
  }
  .lg-google-btn:hover { border-color: #D0D0D0; background: #F9F9F9; box-shadow: 0 2px 8px rgba(0,0,0,.06); }

  .lg-divider {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 20px;
  }
  .lg-divider-line { flex: 1; height: 1px; background: #EBEBEB; }
  .lg-divider-text { font-size: 12px; color: #BBB; font-weight: 600; }

  .lg-field { margin-bottom: 14px; }
  .lg-field-label {
    display: block; font-size: 10px; font-weight: 700;
    color: #AAA; text-transform: uppercase; letter-spacing: .08em;
    margin-bottom: 6px;
  }
  .lg-input-wrap { position: relative; }
  .lg-input-icon {
    position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
    color: #CCC; pointer-events: none; display: flex;
  }
  .lg-input {
    width: 100%; padding: 12px 14px 12px 40px;
    background: #fff; border: 1.5px solid #E8E8E8;
    border-radius: 11px; font-size: 13px; color: #111;
    outline: none; transition: all .2s;
    font-family: 'DM Sans', sans-serif;
  }
  .lg-input:focus { border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,.1); }
  .lg-input::placeholder { color: #CCC; }

  .lg-forgot {
    display: block; text-align: right;
    font-size: 11px; color: #F97316; font-weight: 600;
    text-decoration: none; margin-top: -8px; margin-bottom: 18px;
  }
  .lg-forgot:hover { text-decoration: underline; }

  .lg-submit {
    width: 100%; padding: 14px;
    background: #F97316; color: #fff;
    border: none; border-radius: 12px;
    font-size: 14px; font-weight: 800;
    cursor: pointer; transition: all .25s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: 'Bricolage Grotesque', sans-serif;
    letter-spacing: -.01em;
    box-shadow: 0 4px 20px rgba(249,115,22,.35);
  }
  .lg-submit:hover:not(:disabled) { background: #EA6C0A; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(249,115,22,.45); }
  .lg-submit:disabled { opacity: .6; cursor: not-allowed; }

  .lg-register-link {
    text-align: center; margin-top: 18px;
    font-size: 13px; color: #999;
  }
  .lg-register-link a { color: #F97316; font-weight: 700; text-decoration: none; }
  .lg-register-link a:hover { text-decoration: underline; }

  .lg-spin { animation: spin .7s linear infinite; }

  @media (max-width: 900px) {
    .lg-root { grid-template-columns: 1fr; }
    .lg-left  { display: none; }
    .lg-right { padding: 32px 24px; min-height: 100vh; }
  }

  @media (max-width: 480px) {
    .lg-right { padding: 24px 16px; }
    .lg-form-wrap { max-width: 100%; }
  }
`;

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    await login(email, password);
    toast.success('Connexion réussie !');
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      navigate('/dashboard');
    }
  } catch {
    toast.error('Email ou mot de passe incorrect');
  } finally {
    setLoading(false);
  }
};

const handleGoogleLogin = async () => {
  try {
    await loginWithGoogle();
    toast.success('Connexion réussie !');
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      navigate('/dashboard');
    }
  } catch {
    toast.error('Erreur lors de la connexion avec Google');
  }
};

  return (
    <div className="lg-root">
      <style>{css}</style>

      {/* ── LEFT ── */}
      <div className="lg-left">
        <div className="lg-left-bg" />
        <div className="lg-grid-lines" />

        <Link to="/" className="lg-logo">
          <div className="lg-logo-icon"><Globe size={20} color="#fff" /></div>
          <span className="lg-logo-text">Payment Gateway</span>
        </Link>

        <div className="lg-hero">
          <h1 className="lg-headline">
            Bon retour<br />
            sur votre<br />
            <span className="lg-headline-accent">espace marchand.</span>
          </h1>

          <p className="lg-sub">
            Gérez vos paiements, suivez vos transactions et encaissez partout en Afrique et dans le monde.
          </p>

          <div className="lg-features">
            {[
              { icon: Zap,        bg: 'rgba(249,115,22,.15)', color: '#F97316', title: 'Paiements instantanés',  sub: 'Mobile Money, cartes, PayPal' },
              { icon: Shield,     bg: 'rgba(16,185,129,.15)', color: '#10B981', title: 'Sécurité PCI DSS',       sub: 'Chiffrement SSL bout-en-bout' },
              { icon: TrendingUp, bg: 'rgba(99,102,241,.15)', color: '#6366F1', title: 'Dashboard temps réel',   sub: 'Analytics et rapports détaillés' },
            ].map(({ icon: Icon, bg, color, title, sub }) => (
              <div key={title} className="lg-feature">
                <div className="lg-feature-icon" style={{ background: bg }}>
                  <Icon size={16} color={color} />
                </div>
                <div className="lg-feature-text">
                  <div className="lg-feature-title">{title}</div>
                  <div className="lg-feature-sub">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg-badge">
            <div className="lg-badge-dot" />
            40+ pays · 30 providers
          </div>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="lg-right">
        <div className="lg-form-wrap">
          <div className="lg-form-header">
            <h2 className="lg-form-title">Connexion</h2>
            <p className="lg-form-sub">Accédez à votre espace marchand</p>
          </div>

          <button onClick={handleGoogleLogin} className="lg-google-btn">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>

          <div className="lg-divider">
            <div className="lg-divider-line" />
            <span className="lg-divider-text">ou par email</span>
            <div className="lg-divider-line" />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="lg-field">
              <label className="lg-field-label">Email</label>
              <div className="lg-input-wrap">
                <span className="lg-input-icon"><Mail size={15} /></span>
                <input
                  className="lg-input"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="lg-field">
              <label className="lg-field-label">Mot de passe</label>
              <div className="lg-input-wrap">
                <span className="lg-input-icon"><Lock size={15} /></span>
                <input
                  className="lg-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Link to="/forgot-password" className="lg-forgot">Mot de passe oublié ?</Link>

            <button type="submit" disabled={loading} className="lg-submit">
              {loading
                ? <svg className="lg-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                : <><LogIn size={16} /> Se connecter</>
              }
            </button>
          </form>

          <p className="lg-register-link">
            Pas encore de compte ? <Link to="/register">S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  );
}