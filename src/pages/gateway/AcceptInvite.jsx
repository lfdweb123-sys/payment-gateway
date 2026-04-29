// src/pages/gateway/AcceptInvite.jsx
// Route : /accept-invite?email=...&team=...&role=...
//
// Comportement :
//  1. L'utilisateur n'est pas connecté  → on lui propose de se connecter ou de créer un compte
//  2. L'utilisateur est connecté        → on accepte automatiquement l'invitation
//  3. L'invitation est déjà acceptée / introuvable → message d'erreur clair
//
// IMPORTANT : merchantName et inviterName sont lus directement depuis le document
// d'invitation (gateway_merchant_teams), évitant toute lecture sur gateway_merchants
// ou users sans être connecté (permission refusée par Firestore).

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { CheckCircle, XCircle, Loader, Users, LogIn, UserPlus, ArrowRight } from 'lucide-react';

const ROLE_LABELS = {
  admin:   'Administrateur',
  manager: 'Gestionnaire',
  viewer:  'Consultant',
  support: 'Support'
};

const STATE = {
  LOADING:      'loading',
  NEED_AUTH:    'need_auth',
  ACCEPTING:    'accepting',
  SUCCESS:      'success',
  ALREADY_DONE: 'already_done',
  ERROR:        'error'
};

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const email  = searchParams.get('email') || '';
  const teamId = searchParams.get('team')  || '';
  const role   = searchParams.get('role')  || '';

  const [state,        setState]        = useState(STATE.LOADING);
  const [errorMessage, setErrorMessage] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [inviterName,  setInviterName]  = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!teamId || !email) {
      setState(STATE.ERROR);
      setErrorMessage("Le lien d'invitation est invalide ou incomplet.");
      return;
    }
    verifyAndAccept();
  }, [authLoading, user, teamId, email]);

  const verifyAndAccept = async () => {
    setState(STATE.LOADING);
    try {
      const teamDocRef = doc(db, 'gateway_merchant_teams', teamId);
      const teamSnap   = await getDoc(teamDocRef);

      if (!teamSnap.exists()) {
        setState(STATE.ERROR);
        setErrorMessage("Cette invitation est introuvable. Elle a peut-être été annulée.");
        return;
      }

      const invite = teamSnap.data();

      // Vérification de l'email
      if (invite.email !== email.toLowerCase()) {
        setState(STATE.ERROR);
        setErrorMessage("Ce lien d'invitation ne correspond pas à votre adresse email.");
        return;
      }

      // Noms stockés dans l'invitation au moment de la création (voir Team.jsx handleInvite)
      setMerchantName(invite.merchantName || 'le compte');
      setInviterName(invite.inviterName   || 'Un administrateur');

      // Déjà acceptée ?
      if (invite.status === 'active' && !invite.userId?.startsWith('pending_')) {
        setState(STATE.ALREADY_DONE);
        return;
      }

      // Non connecté
      if (!user) {
        setState(STATE.NEED_AUTH);
        return;
      }

      // Email connecté ≠ email invité
      if (user.email?.toLowerCase() !== email.toLowerCase()) {
        setState(STATE.ERROR);
        setErrorMessage(
          `Vous êtes connecté avec ${user.email}, mais l'invitation est pour ${email}. ` +
          `Connectez-vous avec le bon compte pour accepter.`
        );
        return;
      }

      await acceptInvitation(teamDocRef);

    } catch (err) {
      console.error('Erreur accept-invite :', err);
      // permission-denied = utilisateur non connecté tentant de lire un doc protégé
      if (err.code === 'permission-denied') {
        setState(STATE.NEED_AUTH);
      } else {
        setState(STATE.ERROR);
        setErrorMessage("Une erreur est survenue. Veuillez réessayer ou contacter le support.");
      }
    }
  };

  const acceptInvitation = async (teamDocRef) => {
    setState(STATE.ACCEPTING);
    try {
      await updateDoc(teamDocRef, {
        userId:     user.uid,
        status:     'active',
        acceptedAt: serverTimestamp()
      });
      setState(STATE.SUCCESS);
    } catch (err) {
      console.error('Erreur mise à jour invitation :', err);
      setState(STATE.ERROR);
      setErrorMessage("Impossible d'accepter l'invitation. Veuillez réessayer.");
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f4f4f5',
      padding: '24px 16px',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .fade-up { animation: fadeUp .35s ease both; }
        .spin    { animation: spin .8s linear infinite; }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 24px; background: #f97316; color: #fff;
          border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
          cursor: pointer; text-decoration: none; transition: background .15s;
        }
        .btn-primary:hover { background: #ea580c; }
        .btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 24px; background: #fff; color: #3f3f46;
          border: 1px solid #e4e4e7; border-radius: 10px; font-size: 14px; font-weight: 600;
          cursor: pointer; text-decoration: none; transition: border-color .15s;
        }
        .btn-secondary:hover { border-color: #a1a1aa; }
      `}</style>

      <div className="fade-up" style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e4e4e7',
        width: '100%', maxWidth: 460, overflow: 'hidden'
      }}>
        {/* Marque */}
        <div style={{ padding: '20px 32px', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f97316', letterSpacing: '.05em', textTransform: 'uppercase' }}>
            Passerelle de Paiement
          </span>
        </div>

        <div style={{ padding: '36px 32px 32px' }}>

          {/* Chargement */}
          {(state === STATE.LOADING || state === STATE.ACCEPTING) && (
            <div style={{ textAlign: 'center' }}>
              <Loader size={32} className="spin" color="#f97316" style={{ marginBottom: 20 }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#18181b', margin: '0 0 8px' }}>
                {state === STATE.ACCEPTING ? 'Acceptation en cours…' : 'Vérification du lien…'}
              </h2>
              <p style={{ fontSize: 14, color: '#71717a', margin: 0 }}>
                Quelques secondes, s'il vous plaît.
              </p>
            </div>
          )}

          {/* Non connecté */}
          {state === STATE.NEED_AUTH && (
            <div>
              <div style={{
                width: 52, height: 52, borderRadius: 14, background: '#fff7ed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
              }}>
                <Users size={24} color="#f97316" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#18181b', margin: '0 0 10px' }}>
                Invitation à rejoindre une équipe
              </h2>
              {inviterName && merchantName && (
                <p style={{ fontSize: 14, color: '#52525b', margin: '0 0 6px', lineHeight: 1.6 }}>
                  <strong>{inviterName}</strong> vous invite à rejoindre <strong>{merchantName}</strong>.
                </p>
              )}
              <p style={{ fontSize: 14, color: '#52525b', margin: '0 0 24px', lineHeight: 1.6 }}>
                Rôle attribué :{' '}
                <span style={{
                  display: 'inline-block', padding: '2px 10px',
                  background: '#fff7ed', color: '#c2410c',
                  borderRadius: 4, fontSize: 13, fontWeight: 600, border: '1px solid #fed7aa'
                }}>
                  {ROLE_LABELS[role] || role}
                </span>
              </p>
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
                <p style={{ fontSize: 13, color: '#71717a', margin: '0 0 16px' }}>
                  Connectez-vous ou créez un compte avec <strong>{email}</strong> pour accepter.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Link
                    to={`/login?redirect=${encodeURIComponent(window.location.href)}`}
                    className="btn-primary"
                    style={{ justifyContent: 'center' }}
                  >
                    <LogIn size={16} />
                    Se connecter
                  </Link>
                  <Link
                    to={`/register?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(window.location.href)}`}
                    className="btn-secondary"
                    style={{ justifyContent: 'center' }}
                  >
                    <UserPlus size={16} />
                    Créer un compte
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Succès */}
          {state === STATE.SUCCESS && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', background: '#f0fdf4',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
              }}>
                <CheckCircle size={30} color="#16a34a" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#18181b', margin: '0 0 10px' }}>
                Invitation acceptée !
              </h2>
              <p style={{ fontSize: 14, color: '#52525b', margin: '0 0 28px', lineHeight: 1.6 }}>
                Vous faites maintenant partie de l'équipe <strong>{merchantName}</strong> en tant que{' '}
                <strong>{ROLE_LABELS[role] || role}</strong>.
              </p>
              <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ margin: '0 auto' }}>
                Accéder au tableau de bord
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Déjà membre */}
          {state === STATE.ALREADY_DONE && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', background: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
              }}>
                <CheckCircle size={30} color="#2563eb" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#18181b', margin: '0 0 10px' }}>
                Vous êtes déjà membre
              </h2>
              <p style={{ fontSize: 14, color: '#52525b', margin: '0 0 28px', lineHeight: 1.6 }}>
                Cette invitation a déjà été acceptée. Votre accès à <strong>{merchantName}</strong> est actif.
              </p>
              <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ margin: '0 auto' }}>
                Accéder au tableau de bord
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Erreur */}
          {state === STATE.ERROR && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', background: '#fef2f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
              }}>
                <XCircle size={30} color="#dc2626" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#18181b', margin: '0 0 10px' }}>
                Lien invalide
              </h2>
              <p style={{ fontSize: 14, color: '#52525b', margin: '0 0 28px', lineHeight: 1.6 }}>
                {errorMessage || "Ce lien d'invitation est invalide ou a expiré."}
              </p>
              <Link to="/" className="btn-secondary" style={{ margin: '0 auto', justifyContent: 'center' }}>
                Retour à l'accueil
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}