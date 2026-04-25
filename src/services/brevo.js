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

// Templates
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