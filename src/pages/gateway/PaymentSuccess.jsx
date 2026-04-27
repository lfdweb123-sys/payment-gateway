/**
 * pages/gateway/PaymentSuccess.jsx
 *
 * Page /success — point de retour pour TOUS les providers carte.
 * - Stripe, PayPal, Adyen, Checkout.com, Square, Mollie, etc.
 *   redirigent tous vers ${VITE_APP_URL}/success après paiement.
 * - On lit le token depuis l'URL pour identifier le marchand,
 *   on charge son redirectUrl depuis Firestore, et on redirige.
 * - Si pas de redirectUrl configuré → affichage succès simple.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { CheckCircle2, ExternalLink, Home, Loader2 } from 'lucide-react';

/* ── Spinner ── */
function Spinner({ color = '#f97316' }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      border: `3px solid ${color}22`,
      borderTopColor: color,
      animation: 'sc-spin .7s linear infinite',
      margin: '0 auto',
    }}/>
  );
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();

  /* Les providers injectent des paramètres différents dans l'URL :
     - Stripe      : ?session_id=cs_xxx
     - PayPal      : ?token=xxx&PayerID=xxx
     - Adyen       : ?sessionId=xxx&sessionResult=xxx
     - Checkout    : ?cko-session-id=xxx
     - Mollie      : (pas de params spécifiques)
     - Square      : ?transactionId=xxx
     - Authorize   : ?RESPONSE_CODE=1
     Notre token marchand peut être passé via ?t= ou ?token=
  */

  const rawToken = searchParams.get('t') || searchParams.get('token');
  const token = (() => {
    if (!rawToken) return null;
    // Si c'est un token Stripe session (cs_...) ou PayPal, ignorer
    if (rawToken.startsWith('cs_') || rawToken.startsWith('EC-')) return null;
    if (rawToken.startsWith('gw_')) return rawToken;
    try { return atob(rawToken); } catch { return rawToken; }
  })();

  const [phase, setPhase]           = useState('loading'); // loading | redirecting | success
  const [merchantSettings, setMerchantSettings] = useState(null);
  const [countdown, setCountdown]   = useState(4);
  const [redirectUrl, setRedirectUrl] = useState(null);

  /* ── Charger les settings du marchand ── */
  useEffect(() => {
    const load = async () => {
      try {
        /* 1. Essayer via le token */
        if (token) {
          const merchantSnap = await getDocs(
            query(collection(db, 'gateway_merchants'), where('apiKey', '==', token), limit(1))
          );
          if (!merchantSnap.empty) {
            const merchant = merchantSnap.docs[0].data();
            const redirect = merchant.redirectUrl || merchant.settings?.redirectUrl || null;
            setRedirectUrl(redirect);
            setMerchantSettings({
              logo:        merchant.logo || merchant.settings?.logo || null,
              companyName: merchant.name || merchant.settings?.companyName || '',
              primaryColor: merchant.settings?.primaryColor || merchant.primaryColor || '#f97316',
            });
            if (redirect) { setPhase('redirecting'); return; }
          }
        }

        /* 2. Fallback : lire gateway_settings/config (paramètres globaux) */
        const configSnap = await getDoc(doc(db, 'gateway_settings', 'config'));
        if (configSnap.exists()) {
          const cfg = configSnap.data();
          const redirect = cfg.redirectUrl || null;
          setRedirectUrl(redirect);
          setMerchantSettings({
            logo:         cfg.logo || null,
            companyName:  cfg.companyName || '',
            primaryColor: cfg.primaryColor || '#f97316',
          });
          if (redirect) { setPhase('redirecting'); return; }
        }
      } catch (e) {
        console.error('PaymentSuccess load error:', e);
      }
      setPhase('success');
    };
    load();
  }, [token]);

  /* ── Compte à rebours avant redirection ── */
  useEffect(() => {
    if (phase !== 'redirecting' || !redirectUrl) return;
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(iv);
          window.location.href = redirectUrl;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, redirectUrl]);

  const color = merchantSettings?.primaryColor || '#f97316';

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
    @keyframes sc-spin    { to { transform: rotate(360deg); } }
    @keyframes sc-fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; } }
    @keyframes sc-scaleIn { from { opacity:0; transform:scale(.88); } to { opacity:1; transform:scale(1); } }
    @keyframes sc-bounce  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
    * { box-sizing: border-box; }
    body { margin: 0; }
    .sc-page {
      min-height: 100vh;
      background: #F0EBE3;
      display: flex; align-items: center; justify-content: center;
      padding: 24px 16px;
      font-family: 'DM Sans', sans-serif;
    }
    .sc-card {
      width: 100%; max-width: 420px;
      background: #fff;
      border-radius: 24px;
      padding: 48px 36px 40px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,.04), 0 12px 40px rgba(0,0,0,.10), 0 40px 80px rgba(0,0,0,.08);
      animation: sc-scaleIn .45s cubic-bezier(.34,1.3,.64,1) both;
    }
    .sc-icon-wrap {
      width: 80px; height: 80px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
      animation: sc-bounce .6s ease .3s both;
    }
    .sc-title {
      font-size: 24px; font-weight: 900; color: #0f172a;
      letter-spacing: -.02em; margin: 0 0 8px;
    }
    .sc-sub {
      font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 28px;
    }
    .sc-countdown {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; border-radius: 12px;
      background: #f8fafc; border: 1px solid #e2e8f0;
      font-size: 13px; color: #64748b; font-weight: 600;
      margin-bottom: 20px;
    }
    .sc-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: ${color}; animation: sc-bounce .8s ease-in-out infinite;
    }
    .sc-btn-primary {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 14px;
      background: ${color}; color: #fff;
      border: none; border-radius: 13px; cursor: pointer;
      font-size: 14px; font-weight: 700; font-family: 'DM Sans', sans-serif;
      text-decoration: none;
      box-shadow: 0 4px 16px ${color}44;
      transition: transform .2s, box-shadow .2s;
    }
    .sc-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px ${color}55; }
    .sc-btn-secondary {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      width: 100%; padding: 12px;
      background: transparent; color: #64748b;
      border: 1.5px solid #e2e8f0; border-radius: 13px; cursor: pointer;
      font-size: 13px; font-weight: 600; font-family: 'DM Sans', sans-serif;
      text-decoration: none; margin-top: 10px;
      transition: border-color .15s, color .15s;
    }
    .sc-btn-secondary:hover { border-color: ${color}; color: ${color}; }
    .sc-progress {
      height: 3px; border-radius: 999px; background: #f1f5f9;
      margin-bottom: 20px; overflow: hidden;
    }
    .sc-progress-bar {
      height: 100%; border-radius: 999px;
      background: ${color};
      transition: width 1s linear;
    }
  `;

  /* ─── PHASE: loading ─── */
  if (phase === 'loading') return (
    <div className="sc-page">
      <style>{css}</style>
      <div className="sc-card">
        <Spinner color={color}/>
        <p style={{ marginTop: 20, fontSize: 14, color: '#94a3b8', fontFamily: 'DM Sans, sans-serif' }}>
          Vérification du paiement…
        </p>
      </div>
    </div>
  );

  /* ─── PHASE: redirecting ─── */
  if (phase === 'redirecting') return (
    <div className="sc-page">
      <style>{css}</style>
      <div className="sc-card">

        {/* Logo marchand */}
        {merchantSettings?.logo && (
          <img src={merchantSettings.logo} alt="" style={{ height: 28, margin: '0 auto 20px', display: 'block', objectFit: 'contain' }}/>
        )}

        {/* Icône succès */}
        <div className="sc-icon-wrap" style={{ background: '#ECFDF5', border: '2px solid rgba(16,185,129,.2)' }}>
          <CheckCircle2 size={36} color="#10B981"/>
        </div>

        <h1 className="sc-title">Paiement réussi !</h1>
        <p className="sc-sub">
          Votre transaction a été confirmée avec succès.
          {merchantSettings?.companyName && (
            <><br/>Merci pour votre achat chez <strong style={{ color: '#0f172a' }}>{merchantSettings.companyName}</strong>.</>
          )}
        </p>

        {/* Barre de progression */}
        <div className="sc-progress">
          <div className="sc-progress-bar" style={{ width: `${((4 - countdown) / 4) * 100}%` }}/>
        </div>

        {/* Compte à rebours */}
        <div className="sc-countdown">
          <div className="sc-dot"/>
          Redirection dans <strong style={{ color: '#0f172a' }}>{countdown}s</strong>
        </div>

        {/* Bouton redirection immédiate */}
        <a href={redirectUrl} className="sc-btn-primary">
          <ExternalLink size={15}/>
          Retourner sur le site maintenant
        </a>

      </div>
    </div>
  );

  /* ─── PHASE: success (pas de redirectUrl) ─── */
  return (
    <div className="sc-page">
      <style>{css}</style>
      <div className="sc-card" style={{ animation: 'sc-fadeUp .45s ease both' }}>

        {/* Logo marchand */}
        {merchantSettings?.logo && (
          <img src={merchantSettings.logo} alt="" style={{ height: 28, margin: '0 auto 20px', display: 'block', objectFit: 'contain' }}/>
        )}

        {/* Icône succès */}
        <div className="sc-icon-wrap" style={{ background: '#ECFDF5', border: '2px solid rgba(16,185,129,.2)' }}>
          <CheckCircle2 size={36} color="#10B981"/>
        </div>

        <h1 className="sc-title">Paiement réussi !</h1>
        <p className="sc-sub">
          Votre transaction a été confirmée et traitée avec succès.
          {merchantSettings?.companyName && (
            <><br/>Merci pour votre achat chez <strong style={{ color: '#0f172a' }}>{merchantSettings.companyName}</strong>.</>
          )}
        </p>

        {/* Infos paramètres URL reçus du provider */}
        {(searchParams.get('session_id') || searchParams.get('token') || searchParams.get('sessionId')) && (
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 12, padding: '12px 16px', marginBottom: 24,
            textAlign: 'left',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
              Référence de paiement
            </p>
            <p style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: '#0f172a', margin: 0, wordBreak: 'break-all' }}>
              {searchParams.get('session_id') || searchParams.get('token') || searchParams.get('sessionId') || '—'}
            </p>
          </div>
        )}

        {/* Bouton retour accueil */}
        <Link to="/" className="sc-btn-primary">
          <Home size={15}/>
          Retour à l'accueil
        </Link>

        <p style={{ marginTop: 20, fontSize: 11, color: '#cbd5e1' }}>
          Vous pouvez fermer cette page en toute sécurité.
        </p>
      </div>
    </div>
  );
}