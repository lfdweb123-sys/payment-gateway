import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, Globe, CheckCircle, Zap, Shield, TrendingUp } from 'lucide-react';

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
  @keyframes checkPop {
    0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
    60%  { transform: scale(1.15) rotate(3deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg);   opacity: 1; }
  }
  @keyframes progressFill {
    from { width: 0%; }
    to   { width: 100%; }
  }

  .fp-root * { box-sizing: border-box; margin: 0; padding: 0; }

  .fp-root {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    font-family: 'DM Sans', sans-serif;
    background: #FAFAF8;
  }

  /* ── LEFT PANEL ── */
  .fp-left {
    position: relative;
    background: #0C0C0C;
    padding: 48px 52px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }
  .fp-left-bg {
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 60% 50% at 20% 20%, rgba(249,115,22,.18) 0%, transparent 70%),
      radial-gradient(ellipse 50% 40% at 80% 80%, rgba(249,115,22,.10) 0%, transparent 70%);
  }
  .fp-grid-lines {
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  .fp-logo {
    position: relative;
    display: flex; align-items: center; gap: 10px;
    text-decoration: none;
  }
  .fp-logo-icon {
    width: 38px; height: 38px; border-radius: 11px;
    background: #F97316;
    display: flex; align-items: center; justify-content: center;
  }
  .fp-logo-text {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 17px; font-weight: 800;
    color: #fff; letter-spacing: -.02em;
  }

  .fp-hero {
    position: relative; flex: 1;
    display: flex; flex-direction: column;
    justify-content: center; padding: 40px 0;
  }

  .fp-headline {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: clamp(32px, 3.2vw, 46px);
    font-weight: 900; line-height: 1.08;
    letter-spacing: -.03em; color: #fff;
    margin-bottom: 16px;
    animation: fadeUp .5s .1s ease both;
  }
  .fp-headline-accent { color: #F97316; }

  .fp-sub {
    font-size: 15px; color: rgba(255,255,255,.45);
    line-height: 1.65; max-width: 360px;
    margin-bottom: 40px;
    animation: fadeUp .5s .2s ease both;
  }

  /* Steps indicator */
  .fp-steps {
    display: flex; flex-direction: column; gap: 0;
    animation: fadeUp .5s .25s ease both;
    margin-bottom: 28px;
  }
  .fp-step {
    display: flex; align-items: flex-start; gap: 14px;
    position: relative;
  }
  .fp-step:not(:last-child) .fp-step-line {
    position: absolute; left: 15px; top: 32px;
    width: 2px; height: 28px;
    background: rgba(255,255,255,.08);
  }
  .fp-step-num {
    width: 30px; height: 30px; border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: rgba(255,255,255,.4);
    flex-shrink: 0; margin-top: 10px;
    transition: all .3s;
  }
  .fp-step-num.active {
    border-color: #F97316; color: #F97316;
    background: rgba(249,115,22,.1);
    box-shadow: 0 0 12px rgba(249,115,22,.2);
  }
  .fp-step-num.done {
    border-color: #10B981; background: rgba(16,185,129,.1);
    color: #10B981;
  }
  .fp-step-content { padding: 10px 0 22px; }
  .fp-step-title { font-size: 13px; font-weight: 700; color: rgba(255,255,255,.5); }
  .fp-step-title.active { color: #fff; }
  .fp-step-title.done { color: #10B981; }
  .fp-step-desc { font-size: 11px; color: rgba(255,255,255,.25); margin-top: 2px; }

  .fp-features { display: flex; flex-direction: column; gap: 12px; animation: fadeUp .5s .3s ease both; margin-bottom: 24px; }
  .fp-feature {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 12px;
    transition: background .2s;
  }
  .fp-feature:hover { background: rgba(255,255,255,.07); }
  .fp-feature-icon {
    width: 34px; height: 34px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .fp-feature-text { flex: 1; }
  .fp-feature-title { font-size: 13px; font-weight: 700; color: #fff; }
  .fp-feature-sub { font-size: 11px; color: rgba(255,255,255,.35); margin-top: 1px; }

  .fp-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(249,115,22,.12); border: 1px solid rgba(249,115,22,.25);
    color: #F97316; border-radius: 50px;
    padding: 5px 14px; font-size: 12px; font-weight: 700;
    letter-spacing: .04em; text-transform: uppercase;
    width: fit-content;
    animation: fadeUp .5s .4s ease both;
  }
  .fp-badge-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #F97316; position: relative;
  }
  .fp-badge-dot::after {
    content: '';
    position: absolute; inset: -3px;
    border-radius: 50%; border: 1.5px solid #F97316;
    animation: pulse-ring 1.5s ease infinite;
  }

  /* ── RIGHT PANEL ── */
  .fp-right {
    background: #FAFAF8;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 40px 48px;
    overflow-y: auto;
  }

  .fp-form-wrap {
    width: 100%; max-width: 380px;
    animation: fadeUp .5s .1s ease both;
  }

  /* Back link */
  .fp-back {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600; color: #AAA;
    text-decoration: none; margin-bottom: 28px;
    transition: color .2s;
  }
  .fp-back:hover { color: #333; }

  /* Icon header */
  .fp-icon-wrap {
    width: 52px; height: 52px; border-radius: 16px;
    background: rgba(249,115,22,.08);
    border: 1.5px solid rgba(249,115,22,.18);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
  }

  .fp-form-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 26px; font-weight: 900; color: #0C0C0C;
    letter-spacing: -.02em; margin-bottom: 8px;
  }
  .fp-form-sub { font-size: 13px; color: #999; line-height: 1.6; margin-bottom: 28px; }

  .fp-field { margin-bottom: 14px; }
  .fp-field-label {
    display: block; font-size: 10px; font-weight: 700;
    color: #AAA; text-transform: uppercase; letter-spacing: .08em;
    margin-bottom: 6px;
  }
  .fp-input-wrap { position: relative; }
  .fp-input-icon {
    position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
    color: #CCC; pointer-events: none; display: flex;
  }
  .fp-input {
    width: 100%; padding: 12px 14px 12px 40px;
    background: #fff; border: 1.5px solid #E8E8E8;
    border-radius: 11px; font-size: 13px; color: #111;
    outline: none; transition: all .2s;
    font-family: 'DM Sans', sans-serif;
  }
  .fp-input:focus { border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,.1); }
  .fp-input::placeholder { color: #CCC; }

  .fp-submit {
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
  .fp-submit:hover:not(:disabled) { background: #EA6C0A; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(249,115,22,.45); }
  .fp-submit:disabled { opacity: .6; cursor: not-allowed; }

  .fp-login-link {
    text-align: center; margin-top: 18px;
    font-size: 13px; color: #999;
  }
  .fp-login-link a { color: #F97316; font-weight: 700; text-decoration: none; }
  .fp-login-link a:hover { text-decoration: underline; }

  /* ── SUCCESS STATE ── */
  .fp-success-wrap { animation: fadeUp .4s ease both; }

  .fp-success-icon-wrap {
    width: 64px; height: 64px; border-radius: 20px;
    background: #ECFDF5; border: 1px solid rgba(16,185,129,.2);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
    animation: checkPop .5s ease both;
  }

  .fp-success-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 26px; font-weight: 900; color: #0C0C0C;
    letter-spacing: -.02em; margin-bottom: 8px;
  }
  .fp-success-sub { font-size: 13px; color: #999; line-height: 1.65; margin-bottom: 24px; }

  .fp-email-preview {
    background: #fff; border: 1.5px solid #E8E8E8;
    border-radius: 12px; padding: 14px 16px;
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 24px;
  }
  .fp-email-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(249,115,22,.08); border: 1px solid rgba(249,115,22,.15);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .fp-email-addr { font-size: 13px; font-weight: 600; color: #111; }
  .fp-email-hint { font-size: 11px; color: #AAA; margin-top: 1px; }

  .fp-progress-bar {
    height: 3px; background: #EBEBEB; border-radius: 99px;
    margin-bottom: 24px; overflow: hidden;
  }
  .fp-progress-fill {
    height: 100%; background: #F97316; border-radius: 99px;
    animation: progressFill 30s linear forwards;
  }

  .fp-resend-btn {
    background: none; border: none; cursor: pointer;
    font-size: 13px; color: #F97316; font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    padding: 0; text-decoration: underline;
    transition: opacity .2s;
  }
  .fp-resend-btn:hover { opacity: .7; }
  .fp-resend-btn:disabled { color: #CCC; text-decoration: none; cursor: not-allowed; }

  .fp-hint-row {
    display: flex; align-items: center; justify-content: space-between;
    font-size: 12px; color: #AAA; margin-top: 8px;
  }

  .fp-spin { animation: spin .7s linear infinite; }

  @media (max-width: 900px) {
    .fp-root { grid-template-columns: 1fr; }
    .fp-left  { display: none; }
    .fp-right { padding: 32px 24px; min-height: 100vh; }
  }

  @media (max-width: 480px) {
    .fp-right { padding: 24px 16px; }
    .fp-form-wrap { max-width: 100%; }
  }
`;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      startCooldown();
    } catch (error) {
      const msg = error.code === 'auth/user-not-found'
        ? 'Aucun compte associé à cet email'
        : 'Erreur lors de l\'envoi. Réessayez.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await resetPassword(email);
      toast.success('Email renvoyé !');
      startCooldown();
    } catch {
      toast.error('Erreur lors du renvoi.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap,        bg: 'rgba(249,115,22,.15)', color: '#F97316', title: 'Paiements instantanés',  sub: 'Mobile Money, cartes, PayPal' },
    { icon: Shield,     bg: 'rgba(16,185,129,.15)', color: '#10B981', title: 'Sécurité PCI DSS',       sub: 'Chiffrement SSL bout-en-bout' },
    { icon: TrendingUp, bg: 'rgba(99,102,241,.15)', color: '#6366F1', title: 'Dashboard temps réel',   sub: 'Analytics et rapports détaillés' },
  ];

  return (
    <div className="fp-root">
      <style>{css}</style>

      {/* ── LEFT ── */}
      <div className="fp-left">
        <div className="fp-left-bg" />
        <div className="fp-grid-lines" />

        <Link to="/" className="fp-logo">
          <div className="fp-logo-icon"><Globe size={20} color="#fff" /></div>
          <span className="fp-logo-text">Payment Gateway</span>
        </Link>

        <div className="fp-hero">
          <h1 className="fp-headline">
            Récupérez<br />
            l'accès à votre<br />
            <span className="fp-headline-accent">compte marchand.</span>
          </h1>

          <p className="fp-sub">
            Un simple email suffit. Nous vous envoyons un lien sécurisé pour réinitialiser votre mot de passe.
          </p>

          {/* Steps */}
          <div className="fp-steps">
            {[
              { num: '1', label: 'Saisissez votre email',       desc: 'L\'adresse liée à votre compte', active: !sent, done: sent },
              { num: '2', label: 'Consultez votre boîte mail',  desc: 'Lien valable 24 heures',         active: sent,  done: false },
              { num: '3', label: 'Créez un nouveau mot de passe', desc: 'Sécurisé et unique',            active: false, done: false },
            ].map(({ num, label, desc, active, done }) => (
              <div key={num} className="fp-step">
                <div className="fp-step-line" />
                <div className={`fp-step-num ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                  {done ? '✓' : num}
                </div>
                <div className="fp-step-content">
                  <div className={`fp-step-title ${active ? 'active' : ''} ${done ? 'done' : ''}`}>{label}</div>
                  <div className="fp-step-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="fp-features">
            {features.map(({ icon: Icon, bg, color, title, sub }) => (
              <div key={title} className="fp-feature">
                <div className="fp-feature-icon" style={{ background: bg }}>
                  <Icon size={16} color={color} />
                </div>
                <div className="fp-feature-text">
                  <div className="fp-feature-title">{title}</div>
                  <div className="fp-feature-sub">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="fp-badge">
            <div className="fp-badge-dot" />
            40+ pays · 30 providers
          </div>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="fp-right">
        <div className="fp-form-wrap">

          <Link to="/login" className="fp-back">
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>

          {!sent ? (
            <>
              <div className="fp-icon-wrap">
                <Mail size={22} color="#F97316" />
              </div>
              <h2 className="fp-form-title">Mot de passe oublié ?</h2>
              <p className="fp-form-sub">
                Entrez l'adresse email de votre compte. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="fp-field">
                  <label className="fp-field-label">Adresse email</label>
                  <div className="fp-input-wrap">
                    <span className="fp-input-icon"><Mail size={15} /></span>
                    <input
                      className="fp-input"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="fp-submit">
                  {loading
                    ? <svg className="fp-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    : 'Envoyer le lien de réinitialisation'
                  }
                </button>
              </form>

              <p className="fp-login-link">
                Vous vous souvenez ? <Link to="/login">Se connecter</Link>
              </p>
            </>
          ) : (
            <div className="fp-success-wrap">
              <div className="fp-success-icon-wrap">
                <CheckCircle size={30} color="#10B981" />
              </div>
              <h2 className="fp-success-title">Email envoyé !</h2>
              <p className="fp-success-sub">
                Nous avons envoyé un lien de réinitialisation à votre adresse. Vérifiez aussi vos spams.
              </p>

              <div className="fp-email-preview">
                <div className="fp-email-icon">
                  <Mail size={16} color="#F97316" />
                </div>
                <div>
                  <div className="fp-email-addr">{email}</div>
                  <div className="fp-email-hint">Lien valable pendant 24 heures</div>
                </div>
              </div>

              <div className="fp-progress-bar">
                <div className="fp-progress-fill" />
              </div>

              <div className="fp-hint-row">
                <span>Pas reçu l'email ?</span>
                <button
                  className="fp-resend-btn"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                >
                  {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer'}
                </button>
              </div>

              <p className="fp-login-link" style={{ marginTop: 24 }}>
                <Link to="/login">← Retour à la connexion</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}