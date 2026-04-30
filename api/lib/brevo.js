// api/lib/brevo.js
export async function sendBrevoEmail({ to, toName, subject, htmlContent }) {
  const apiKey = process.env.VITE_BREVO_API_KEY;
  if (!apiKey) {
    console.warn('VITE_BREVO_API_KEY manquant');
    return false;
  }
  if (!to) {
    console.warn('Email destinataire manquant');
    return false;
  }
  
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'Passerelle de Paiement',
          email: process.env.BREVO_SENDER_EMAIL || 'noreply@payment-gateway.com',
        },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent,
      }),
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Brevo erreur:', err.message || res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Brevo exception:', e.message);
    return false;
  }
}

export function getPaymentReceivedTemplate(name, amount, reference) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:white;border-radius:8px;">
  <tr><td style="background:#0F1117;padding:30px 20px;">
    <span style="font-size:20px;font-weight:900;color:white;">Passerelle de Paiement</span>
   </tr>
  <tr><td style="padding:30px 20px;">
    <p style="margin:0 0 16px;color:#374151;">Bonjour ${name},</p>
    <p style="margin:0 0 24px;color:#374151;">Un paiement de <strong>${amount.toLocaleString('fr-FR')} XOF</strong> a bien été reçu sur votre compte.</p>
    <p style="margin:0;color:#6B7280;font-size:13px;">Référence: <strong>${reference}</strong></p>
   </tr>
  <tr><td style="background:#F9FAFB;padding:20px;text-align:center;">
    <p style="margin:0;color:#9CA3AF;font-size:11px;">Passerelle de Paiement Sécurisée</p>
   </tr>
</table>
</body>
</html>`;
}
