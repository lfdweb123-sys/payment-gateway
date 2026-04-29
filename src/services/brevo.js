const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY;
const SENDER_EMAIL = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'noreply@payment-gateway.com';
const SENDER_NAME = 'Passerelle de Paiement';

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

// Templates existants
export function getVerificationApprovedTemplate(name) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#f9fafb;">
      <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:12px;">✅</div>
        <h2 style="color:#111827;margin:0 0 8px;">Compte vérifié</h2>
        <p style="color:#6b7280;font-size:14px;">Bonjour ${name},</p>
        <p style="color:#6b7280;font-size:14px;">Votre compte a été vérifié. Toutes les fonctionnalités sont accessibles.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Passerelle de Paiement</p>
      </div>
    </div>`;
}

export function getVerificationRejectedTemplate(name) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#f9fafb;">
      <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:12px;">❌</div>
        <h2 style="color:#111827;margin:0 0 8px;">Vérification refusée</h2>
        <p style="color:#6b7280;font-size:14px;">Bonjour ${name},</p>
        <p style="color:#6b7280;font-size:14px;">Vos documents n'ont pas été acceptés. Veuillez soumettre à nouveau.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Passerelle de Paiement</p>
      </div>
    </div>`;
}

export function getPaymentReceivedTemplate(name, amount, reference) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#f9fafb;">
      <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:12px;">💰</div>
        <h2 style="color:#111827;margin:0 0 8px;">Paiement reçu</h2>
        <p style="color:#6b7280;font-size:14px;">Bonjour ${name},</p>
        <p style="color:#6b7280;font-size:14px;">Paiement de <strong>${amount.toLocaleString()} XOF</strong> reçu.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:8px;">Réf: ${reference}</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Passerelle de Paiement</p>
      </div>
    </div>`;
}

export function getPayoutSentTemplate(name, amount, reference) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#f9fafb;">
      <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:12px;">📤</div>
        <h2 style="color:#111827;margin:0 0 8px;">Retrait envoyé</h2>
        <p style="color:#6b7280;font-size:14px;">Bonjour ${name},</p>
        <p style="color:#6b7280;font-size:14px;">Retrait de <strong>${amount.toLocaleString()} XOF</strong> envoyé sur votre numéro.</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:8px;">Réf: ${reference}</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Passerelle de Paiement</p>
      </div>
    </div>`;
}

// Nouveau template pour l'invitation d'équipe
export function getTeamInvitationTemplate(invitedByName, merchantName, role, inviteLink) {
  const roleLabels = {
    admin: 'Administrateur',
    manager: 'Gestionnaire',
    viewer: 'Consultant',
    support: 'Support'
  };
  
  const roleDescriptions = {
    admin: 'Accès complet à toutes les fonctionnalités et gestion de l\'équipe',
    manager: 'Gestion des transactions, paiements et configuration des providers',
    viewer: 'Consultation uniquement (dashboard, transactions, rapports)',
    support: 'Gestion des litiges et du support client'
  };
  
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:linear-gradient(135deg,#f9fafb 0%,#ffffff 100%);">
      <div style="background:#ffffff;border-radius:24px;border:1px solid #e5e7eb;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
        <!-- Logo / Header -->
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:#f97316;border-radius:50px;padding:12px;margin-bottom:16px;">
            <span style="font-size:28px;">👥</span>
          </div>
          <h2 style="color:#111827;margin:0 0 8px;font-size:24px;font-weight:700;">Invitation à rejoindre l'équipe</h2>
          <p style="color:#6b7280;margin:0;font-size:14px;border-bottom:1px solid #e5e7eb;padding-bottom:20px;">
            ${invitedByName} vous invite à collaborer sur <strong>${merchantName}</strong>
          </p>
        </div>
        
        <!-- Message -->
        <div style="margin-bottom:28px;">
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">Bonjour,</p>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
            Vous avez été invité à rejoindre l'équipe en tant que <strong style="color:#f97316;">${roleLabels[role]}</strong>.
          </p>
          <div style="background:#fef3c7;border-left:4px solid #f97316;border-radius:12px;padding:16px;margin:20px 0;">
            <div style="font-size:13px;color:#92400e;margin-bottom:4px;">📋 Rôle attribué</div>
            <div style="font-weight:700;color:#78350f;margin-bottom:6px;">${roleLabels[role]}</div>
            <div style="font-size:13px;color:#92400e;">${roleDescriptions[role]}</div>
          </div>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">
            Cliquez sur le bouton ci-dessous pour accepter l'invitation et accéder au tableau de bord.
          </p>
        </div>
        
        <!-- Button -->
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${inviteLink}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:40px;font-weight:600;font-size:15px;transition:all 0.3s;box-shadow:0 2px 8px rgba(249,115,22,0.3);">
            ✨ Accepter l'invitation
          </a>
        </div>
        
        <!-- Alternative link -->
        <div style="background:#f9fafb;border-radius:12px;padding:14px;margin-bottom:24px;text-align:center;">
          <p style="font-size:12px;color:#6b7280;margin:0 0 8px;">Si le bouton ne fonctionne pas, copiez ce lien :</p>
          <code style="font-size:11px;color:#374151;background:#fff;padding:6px 12px;border-radius:8px;word-break:break-all;">${inviteLink}</code>
        </div>
        
        <!-- Footer -->
        <div style="text-align:center;border-top:1px solid #e5e7eb;padding-top:20px;margin-top:8px;">
          <p style="color:#9ca3af;font-size:12px;margin:0 0 8px;">
            Passerelle de Paiement - Plateforme de paiement sécurisée
          </p>
          <p style="color:#9ca3af;font-size:11px;margin:0;">
            Cette invitation expirera dans 7 jours.
          </p>
        </div>
      </div>
    </div>`;
}

// Nouveau template pour la confirmation d'ajout à l'équipe (pour le propriétaire)
export function getTeamMemberAddedTemplate(ownerName, memberEmail, role, memberName) {
  const roleLabels = {
    admin: 'Administrateur',
    manager: 'Gestionnaire',
    viewer: 'Consultant',
    support: 'Support'
  };
  
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;">
      <div style="background:#ffffff;border-radius:24px;border:1px solid #e5e7eb;padding:32px;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;background:#f0fdf4;border-radius:50px;padding:12px;margin-bottom:16px;">
            <span style="font-size:28px;">✅</span>
          </div>
          <h2 style="color:#111827;margin:0;font-size:22px;font-weight:700;">Nouveau membre dans l'équipe</h2>
        </div>
        
        <p style="color:#374151;font-size:15px;margin:0 0 20px;">Bonjour ${ownerName},</p>
        
        <div style="background:#f8fafc;border-radius:16px;padding:20px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:48px;height:48px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:22px;">👤</span>
            </div>
            <div>
              <div style="font-weight:700;color:#0f172a;font-size:16px;">${memberName || memberEmail}</div>
              <div style="font-size:13px;color:#64748b;">${memberEmail}</div>
            </div>
          </div>
          <div style="background:#fff7ed;border-radius:12px;padding:12px;">
            <span style="font-size:13px;color:#92400e;">🎯 Rôle : <strong>${roleLabels[role]}</strong></span>
          </div>
        </div>
        
        <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;border-top:1px solid #e5e7eb;padding-top:20px;">
          Passerelle de Paiement
        </p>
      </div>
    </div>`;
}

// Fonction utilitaire pour envoyer une invitation d'équipe
export async function sendTeamInvitation(email, name, invitedByName, merchantName, role, inviteLink) {
  const subject = `Invitation à rejoindre l'équipe ${merchantName}`;
  const htmlContent = getTeamInvitationTemplate(invitedByName, merchantName, role, inviteLink);
  
  return await sendEmail({
    to: email,
    toName: name || email,
    subject,
    htmlContent
  });
}

// Fonction pour notifier le propriétaire qu'un membre a rejoint
export async function sendTeamMemberAddedNotification(ownerEmail, ownerName, memberEmail, role, memberName) {
  const subject = `Nouveau membre dans votre équipe`;
  const htmlContent = getTeamMemberAddedTemplate(ownerName, memberEmail, role, memberName);
  
  return await sendEmail({
    to: ownerEmail,
    toName: ownerName,
    subject,
    htmlContent
  });
}