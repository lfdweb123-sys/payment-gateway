import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}
const db = admin.firestore();

// Templates email
function getPaymentReceivedTemplate(name, amount, reference) {
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

async function sendBrevoEmail({ to, toName, subject, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return;
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        sender: { name: 'Passerelle de Paiement', email: process.env.BREVO_SENDER_EMAIL || 'noreply@payment-gateway.com' },
        to: [{ email: to, name: toName || to }],
        subject, htmlContent
      })
    });
  } catch (e) { console.error('Erreur Brevo:', e); }
}

export default async function handler(req, res) {
  const { provider } = req.query;
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  try {
    let reference, status;

    switch (provider) {
      case 'feexpay':
        reference = req.body.reference;
        status = req.body.status;
        break;
      case 'stripe':
        if (req.body.type === 'checkout.session.completed') {
          reference = req.body.data?.object?.id;
          status = 'SUCCESSFUL';
        }
        break;
      case 'paystack':
        if (req.body.event === 'charge.success') {
          reference = req.body.data?.reference;
          status = 'SUCCESSFUL';
        }
        break;
      case 'flutterwave':
        if (req.body.status === 'successful') {
          reference = req.body.tx_ref;
          status = 'SUCCESSFUL';
        }
        break;
      case 'paypal':
        if (req.body.event_type === 'CHECKOUT.ORDER.APPROVED') {
          reference = req.body.resource?.id;
          status = 'SUCCESSFUL';
        }
        break;
      case 'kkiapay':
        reference = req.body.transaction_id;
        status = req.body.status === 'SUCCESS' ? 'SUCCESSFUL' : req.body.status;
        break;
      case 'fedapay':
        reference = req.body.id?.toString();
        status = req.body.status === 'approved' ? 'SUCCESSFUL' : req.body.status;
        break;
      case 'paydunya':
        reference = req.body.invoice?.token;
        status = req.body.status === 'completed' ? 'SUCCESSFUL' : req.body.status;
        break;
      case 'cinetpay':
        reference = req.body.transaction_id;
        status = req.body.status === 'ACCEPTED' ? 'SUCCESSFUL' : req.body.status;
        break;
      case 'lygos':
      case 'mbiyopay':
      case 'qosic':
      case 'bizao':
      case 'hub2':
        reference = req.body.reference || req.body.id;
        status = (req.body.status === 'completed' || req.body.status === 'success') ? 'SUCCESSFUL' : req.body.status;
        break;
      case 'chipper':
        reference = req.body.id;
        status = req.body.status === 'completed' ? 'SUCCESSFUL' : req.body.status;
        break;
      default:
        reference = req.body.reference || req.body.transaction_id || req.body.id;
        status = req.body.status === 'SUCCESSFUL' || req.body.status === 'success' || req.body.status === 'completed' ? 'SUCCESSFUL' : req.body.status;
    }

    if (reference && status === 'SUCCESSFUL') {
      const txSnap = await db.collection('gateway_transactions')
        .where('providerRef', '==', reference)
        .limit(1)
        .get();

      if (!txSnap.empty) {
        const txDoc = txSnap.docs[0];
        const tx = txDoc.data();

        if (tx.status !== 'completed') {
          await db.collection('gateway_transactions').doc(txDoc.id).update({
            status: 'completed',
            webhookData: req.body,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          if (tx.merchantId) {
            const netAmount = tx.netAmount || tx.amount || 0;
            await db.collection('gateway_merchants').doc(tx.merchantId).update({
              balance: admin.firestore.FieldValue.increment(netAmount),
              totalTransactions: admin.firestore.FieldValue.increment(1),
              updatedAt: new Date().toISOString()
            });

            // Envoyer email au marchand
            const merchantSnap = await db.collection('gateway_merchants').doc(tx.merchantId).get();
            if (merchantSnap.exists) {
              const merchant = merchantSnap.data();
              await sendBrevoEmail({
                to: merchant.email,
                toName: merchant.name || merchant.email,
                subject: `💰 Paiement reçu - ${netAmount.toLocaleString()} XOF`,
                htmlContent: getPaymentReceivedTemplate(merchant.name || merchant.email, netAmount, reference)
              });
            }
          }
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook reçu' });
  } catch (error) {
    console.error('Erreur webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}