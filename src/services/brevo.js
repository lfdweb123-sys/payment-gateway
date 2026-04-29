const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY;
const SENDER_EMAIL = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'noreply@payment-gateway.com';
const SENDER_NAME = 'Passerelle de Paiement';

// ─── Envoi générique ──────────────────────────────────────────────────────────
export async function sendEmail({ to, toName, subject, htmlContent }) {
  if (!BREVO_API_KEY) {
    console.warn('Brevo API key non configurée');
    return { success: false, error: 'API key manquante' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent
      })
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message };
    return { success: true, messageId: data.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── Base commune ─────────────────────────────────────────────────────────────
// Un wrapper minimaliste : fond blanc, texte foncé, une seule colonne.
// Pas de dégradés, pas d'emojis de décoration, pas d'ombres.
function layout(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:8px;border:1px solid #e4e4e7;">
        <!-- Header -->
        <tr>
          <td style="padding:28px 36px 20px;border-bottom:1px solid #e4e4e7;">
            <span style="font-size:13px;font-weight:600;color:#f97316;letter-spacing:.05em;text-transform:uppercase;">
              Passerelle de Paiement
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px 36px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #e4e4e7;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">
              Vous recevez cet email car une action a été effectuée sur votre compte.
              Si vous n'êtes pas concerné, ignorez ce message.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Styles partagés (inline pour compatibilité email)
const s = {
  h1:    'margin:0 0 16px;font-size:22px;font-weight:700;color:#18181b;line-height:1.3;',
  p:     'margin:0 0 14px;font-size:15px;color:#3f3f46;line-height:1.6;',
  small: 'margin:0;font-size:13px;color:#71717a;line-height:1.5;',
  btn:   'display:inline-block;margin-top:8px;padding:12px 28px;background:#f97316;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;',
  pill:  'display:inline-block;padding:4px 12px;background:#fff7ed;color:#c2410c;border-radius:4px;font-size:13px;font-weight:600;border:1px solid #fed7aa;',
  code:  'display:block;margin-top:16px;padding:12px 16px;background:#f4f4f5;border-radius:6px;font-size:12px;color:#52525b;word-break:break-all;font-family:monospace;',
  rule:  'margin:24px 0;border:none;border-top:1px solid #e4e4e7;'
};

// ─── Templates ────────────────────────────────────────────────────────────────

export function getVerificationApprovedTemplate(name) {
  return layout(`
    <h1 style="${s.h1}">Compte vérifié</h1>
    <p style="${s.p}">Bonjour ${name},</p>
    <p style="${s.p}">Votre compte a été vérifié avec succès. Vous avez désormais accès à l'ensemble des fonctionnalités de la plateforme.</p>
    <p style="${s.small}">Bienvenue sur la Passerelle de Paiement.</p>
  `);
}

export function getVerificationRejectedTemplate(name) {
  return layout(`
    <h1 style="${s.h1}">Vérification refusée</h1>
    <p style="${s.p}">Bonjour ${name},</p>
    <p style="${s.p}">Vos documents n'ont pas pu être acceptés. Veuillez les soumettre à nouveau en vous assurant qu'ils sont lisibles et conformes aux exigences.</p>
    <p style="${s.small}">En cas de difficulté, contactez notre support.</p>
  `);
}

export function getPaymentReceivedTemplate(name, amount, reference) {
  return layout(`
    <h1 style="${s.h1}">Paiement reçu</h1>
    <p style="${s.p}">Bonjour ${name},</p>
    <p style="${s.p}">Un paiement de <strong>${amount.toLocaleString('fr-FR')} XOF</strong> a bien été reçu sur votre compte.</p>
    <hr style="${s.rule}">
    <p style="${s.small}">Référence : <strong>${reference}</strong></p>
  `);
}

export function getPayoutSentTemplate(name, amount, reference) {
  return layout(`
    <h1 style="${s.h1}">Retrait envoyé</h1>
    <p style="${s.p}">Bonjour ${name},</p>
    <p style="${s.p}">Votre retrait de <strong>${amount.toLocaleString('fr-FR')} XOF</strong> a été traité et envoyé sur votre numéro enregistré.</p>
    <hr style="${s.rule}">
    <p style="${s.small}">Référence : <strong>${reference}</strong></p>
  `);
}

// ─── Invitation d'équipe ──────────────────────────────────────────────────────
export function getTeamInvitationTemplate(invitedByName, merchantName, role, inviteLink) {
  const roleLabels = {
    admin:   'Administrateur',
    manager: 'Gestionnaire',
    viewer:  'Consultant',
    support: 'Support'
  };

  const roleDescriptions = {
    admin:   'Accès complet à toutes les fonctionnalités et gestion de l\'équipe.',
    manager: 'Gestion des transactions, paiements et configuration des providers.',
    viewer:  'Consultation uniquement — dashboard, transactions et rapports.',
    support: 'Gestion des litiges et du support client.'
  };

  return layout(`
    <h1 style="${s.h1}">Vous avez été invité à rejoindre une équipe</h1>
    <p style="${s.p}"><strong>${invitedByName}</strong> vous invite à collaborer sur le compte <strong>${merchantName}</strong>.</p>

    <p style="margin:0 0 6px;font-size:13px;color:#71717a;font-weight:500;text-transform:uppercase;letter-spacing:.04em;">Rôle attribué</p>
    <span style="${s.pill}">${roleLabels[role] || role}</span>
    <p style="margin:10px 0 24px;font-size:14px;color:#52525b;">${roleDescriptions[role] || ''}</p>

    <a href="${inviteLink}" style="${s.btn}">Accepter l'invitation</a>

    <p style="${s.code}">${inviteLink}</p>

    <hr style="${s.rule}">
    <p style="${s.small}">Ce lien est valable 7 jours. Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.</p>
  `);
}

// ─── Notification propriétaire : nouveau membre ───────────────────────────────
export function getTeamMemberAddedTemplate(ownerName, memberEmail, role, memberName) {
  const roleLabels = {
    admin:   'Administrateur',
    manager: 'Gestionnaire',
    viewer:  'Consultant',
    support: 'Support'
  };

  return layout(`
    <h1 style="${s.h1}">Nouveau membre dans votre équipe</h1>
    <p style="${s.p}">Bonjour ${ownerName},</p>
    <p style="${s.p}"><strong>${memberName || memberEmail}</strong> a rejoint votre équipe.</p>

    <hr style="${s.rule}">
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="font-size:13px;color:#71717a;padding-bottom:6px;">Adresse email</td>
        <td style="font-size:13px;color:#18181b;font-weight:500;text-align:right;">${memberEmail}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#71717a;padding-top:6px;">Rôle</td>
        <td style="text-align:right;padding-top:6px;">
          <span style="${s.pill}">${roleLabels[role] || role}</span>
        </td>
      </tr>
    </table>
    <hr style="${s.rule}">

    <p style="${s.small}">Vous pouvez gérer les accès de votre équipe depuis les paramètres de votre compte.</p>
  `);
}

// ─── Fonctions utilitaires ────────────────────────────────────────────────────

export async function sendTeamInvitation(email, name, invitedByName, merchantName, role, inviteLink) {
  return await sendEmail({
    to: email,
    toName: name || email,
    subject: `Invitation à rejoindre l'équipe ${merchantName}`,
    htmlContent: getTeamInvitationTemplate(invitedByName, merchantName, role, inviteLink)
  });
}

export async function sendTeamMemberAddedNotification(ownerEmail, ownerName, memberEmail, role, memberName) {
  return await sendEmail({
    to: ownerEmail,
    toName: ownerName,
    subject: 'Nouveau membre dans votre équipe',
    htmlContent: getTeamMemberAddedTemplate(ownerName, memberEmail, role, memberName)
  });
}