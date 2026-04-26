/**
 * api/webhook/[provider].js
 *
 * Reçoit les callbacks de tous les providers de paiement.
 * Utilise l'API Brevo directement (pas d'import de src/) car ce fichier
 * tourne côté Node.js/Vercel et non dans le contexte Vite.
 */

import { log, logError } from '../logs/logger.js';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

/* ─── Brevo email (appel direct API — pas d'import src/) ─────────────────── */
async function sendBrevoEmail({ to, toName, subject, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) { console.warn('BREVO_API_KEY manquant'); return; }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
        'api-key':      apiKey,
      },
      body: JSON.stringify({
        sender: {
          name:  'Passerelle de Paiement',
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
    }
  } catch (e) {
    console.error('Brevo exception:', e.message);
  }
}

/* ─── Templates email ────────────────────────────────────────────────────── */
function tplPaymentReceived(name, amount, currency, reference, provider) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;background:#f9fafb;">
      <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:28px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">💰</div>
        <h2 style="color:#111827;margin:0 0 8px;">Paiement reçu !</h2>
        <p style="color:#6b7280;font-size:14px;margin:4px 0;">Bonjour <strong>${name}</strong>,</p>
        <p style="color:#6b7280;font-size:14px;margin:12px 0;">
          Un paiement de <strong style="color:#111827;">${Number(amount).toLocaleString('fr-FR')} ${currency || 'XOF'}</strong>
          a été reçu et crédité sur votre compte.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 16px;margin:16px 0;text-align:left;">
          <p style="margin:0;font-size:13px;color:#166534;"><strong>Référence :</strong> ${reference}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;"><strong>Provider :</strong> ${provider || '—'}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;"><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
        </div>
        <p style="color:#9ca3af;font-size:11px;margin-top:20px;">Passerelle de Paiement</p>
      </div>
    </div>`;
}

function tplPaymentFailed(name, amount, currency, reference, reason) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;background:#f9fafb;">
      <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:28px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">❌</div>
        <h2 style="color:#111827;margin:0 0 8px;">Paiement échoué</h2>
        <p style="color:#6b7280;font-size:14px;">Bonjour <strong>${name}</strong>,</p>
        <p style="color:#6b7280;font-size:14px;margin:12px 0;">
          Le paiement de <strong>${Number(amount).toLocaleString('fr-FR')} ${currency || 'XOF'}</strong> n'a pas abouti.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;margin:16px 0;text-align:left;">
          <p style="margin:0;font-size:13px;color:#991b1b;"><strong>Référence :</strong> ${reference}</p>
          ${reason ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;"><strong>Raison :</strong> ${reason}</p>` : ''}
        </div>
        <p style="color:#9ca3af;font-size:11px;margin-top:20px;">Passerelle de Paiement</p>
      </div>
    </div>`;
}

/* ─── Normalisation des webhooks par provider ────────────────────────────── */
function parseWebhook(provider, body) {
  // Retourne { reference, status } ou null si non reconnu
  // status : 'SUCCESSFUL' | 'FAILED' | 'PENDING' | null (ignorer)

  switch (provider) {

    // ── Agrégateurs Afrique de l'Ouest ──────────────────────────────────
    case 'feexpay':
      return {
        reference: body.reference,
        status:    body.status === 'SUCCESSFUL' ? 'SUCCESSFUL'
                 : body.status === 'FAILED'     ? 'FAILED'
                 : null,
      };

    case 'kkiapay':
      return {
        reference: body.transaction_id || body.transactionId,
        status:    body.status === 'SUCCESS' ? 'SUCCESSFUL'
                 : body.status === 'FAILED'  ? 'FAILED'
                 : null,
      };

    case 'cinetpay':
      return {
        reference: body.transaction_id || body.payment_token,
        status:    body.status === 'ACCEPTED'  ? 'SUCCESSFUL'
                 : body.status === 'REFUSED'   ? 'FAILED'
                 : body.status === 'WAITING_FOR_CUSTOMER' ? null // pas encore terminé
                 : null,
      };

    case 'fedapay':
      return {
        reference: String(body.id || body.transaction?.id || ''),
        status:    body.name === 'transaction.approved' || body.status === 'approved' ? 'SUCCESSFUL'
                 : body.name === 'transaction.declined' || body.status === 'declined' ? 'FAILED'
                 : null,
      };

    case 'paydunya':
      return {
        reference: body.invoice?.token || body.token,
        status:    body.status === 'completed' ? 'SUCCESSFUL'
                 : body.status === 'cancelled' ? 'FAILED'
                 : null,
      };

    case 'hub2':
      return {
        reference: body.paymentIntentId || body.id,
        status:    body.status === 'successful' ? 'SUCCESSFUL'
                 : body.status === 'failed'     ? 'FAILED'
                 : null,
      };

    case 'qosic':
      // Qosic envoie responsecode === "00" pour succès
      return {
        reference: body.transref || body.reference,
        status:    body.responsecode === '00' || body.status === 'success' ? 'SUCCESSFUL'
                 : body.responsecode !== '00' && body.responsecode ? 'FAILED'
                 : null,
      };

    case 'lygos':
      return {
        reference: body.order_id || body.reference,
        status:    body.status === 'success' || body.status === 'successful' ? 'SUCCESSFUL'
                 : body.status === 'failed'  || body.status === 'failure'   ? 'FAILED'
                 : null,
      };

    case 'bizao':
      return {
        reference: body.order_id || body.reference,
        status:    body.status === 'Successful' ? 'SUCCESSFUL'
                 : body.status === 'Failed'     ? 'FAILED'
                 : null,
      };

    case 'mbiyopay':
      return {
        reference: body.data?.transaction_id || body.transaction_id || body.reference,
        status:    body.data?.status === 'successful' || body.status === 'successful' ? 'SUCCESSFUL'
                 : body.data?.status === 'failed'     || body.status === 'failed'     ? 'FAILED'
                 : null,
      };

    // ── Mobile Money direct ──────────────────────────────────────────────
    case 'wave':
      return {
        reference: body.client_reference || body.id,
        status:    body.payment_status === 'succeeded' && body.checkout_status === 'complete' ? 'SUCCESSFUL'
                 : body.checkout_status === 'failed'   || body.payment_status === 'failed'   ? 'FAILED'
                 : null,
      };

    case 'mtn':
      return {
        reference: body.externalId || body.financialTransactionId,
        status:    body.status === 'SUCCESSFUL' ? 'SUCCESSFUL'
                 : body.status === 'FAILED'     ? 'FAILED'
                 : null,
      };

    case 'mpesa':
      // Daraja STK callback
      return {
        reference: body.Body?.stkCallback?.CheckoutRequestID,
        status:    body.Body?.stkCallback?.ResultCode === 0 ? 'SUCCESSFUL'
                 : body.Body?.stkCallback?.ResultCode !== undefined ? 'FAILED'
                 : null,
      };

    case 'orange':
      return {
        reference: body.order_id || body.reference,
        status:    body.status === 'SUCCESS'    ? 'SUCCESSFUL'
                 : body.status === 'FAILED'     ? 'FAILED'
                 : body.status === 'CANCELLED'  ? 'FAILED'
                 : null,
      };

    case 'airtel':
      return {
        reference: body.transaction?.id || body.id,
        status:    body.transaction?.status === 'TS' ? 'SUCCESSFUL'
                 : body.transaction?.status === 'TF' ? 'FAILED'
                 : null,
      };

    // ── Afrique anglophone ───────────────────────────────────────────────
    case 'stripe':
      if (body.type === 'checkout.session.completed') {
        return { reference: body.data?.object?.id, status: 'SUCCESSFUL' };
      }
      if (body.type === 'checkout.session.expired') {
        return { reference: body.data?.object?.id, status: 'FAILED' };
      }
      return { reference: null, status: null };

    case 'paystack':
      return {
        reference: body.data?.reference,
        status:    body.event === 'charge.success'   ? 'SUCCESSFUL'
                 : body.event === 'charge.failed'    ? 'FAILED'
                 : null,
      };

    case 'flutterwave':
      return {
        reference: body.data?.tx_ref || body.txRef,
        status:    body.event === 'charge.completed' && body.data?.status === 'successful' ? 'SUCCESSFUL'
                 : body.data?.status === 'failed'   ? 'FAILED'
                 : null,
      };

    // ── Tunisie ───────────────────────────────────────────────────────────
    case 'flouci':
      return {
        reference: body.payment_id || body.developer_tracking_id,
        status:    body.result?.status === 'SUCCESS' ? 'SUCCESSFUL'
                 : body.result?.status === 'FAIL'    ? 'FAILED'
                 : null,
      };

    case 'paymee':
      return {
        reference: body.token,
        status:    body.payment_status === true ? 'SUCCESSFUL' : null,
      };

    // ── Afrique du Sud ────────────────────────────────────────────────────
    case 'yoco':
      return {
        reference: body.payload?.id || body.id,
        status:    body.type === 'payment.succeeded' ? 'SUCCESSFUL'
                 : body.type === 'payment.failed'    ? 'FAILED'
                 : null,
      };

    // ── International ─────────────────────────────────────────────────────
    case 'paypal':
      return {
        reference: body.resource?.id,
        status:    body.event_type === 'CHECKOUT.ORDER.APPROVED'  ? 'SUCCESSFUL'
                 : body.event_type === 'CHECKOUT.ORDER.COMPLETED' ? 'SUCCESSFUL'
                 : body.event_type === 'CHECKOUT.ORDER.VOIDED'    ? 'FAILED'
                 : null,
      };

    case 'mollie':
      return {
        reference: body.id,
        // Mollie envoie juste l'ID — on ira vérifier le statut
        status:    'CHECK', // statut à vérifier via l'API
      };

    case 'adyen':
      return {
        reference: body.merchantReference || body.pspReference,
        status:    body.success === 'true' || body.eventCode === 'AUTHORISATION' ? 'SUCCESSFUL'
                 : body.eventCode === 'CANCELLATION' ? 'FAILED'
                 : null,
      };

    case 'checkout':
      return {
        reference: body.data?.id,
        status:    body.type === 'payment_captured'   ? 'SUCCESSFUL'
                 : body.type === 'payment_declined'   ? 'FAILED'
                 : body.type === 'payment_expired'    ? 'FAILED'
                 : null,
      };

    case 'braintree':
      return {
        reference: body.id || body.subject?.transaction?.id,
        status:    body.kind === 'transaction_settled' || body.kind === 'transaction_submitted_for_settlement' ? 'SUCCESSFUL'
                 : body.kind === 'transaction_voided'  || body.kind === 'transaction_failed' ? 'FAILED'
                 : null,
      };

    // ── Inde ──────────────────────────────────────────────────────────────
    case 'razorpay':
      return {
        reference: body.payload?.payment?.entity?.order_id || body.payload?.order?.entity?.id,
        status:    body.event === 'payment.captured' ? 'SUCCESSFUL'
                 : body.event === 'payment.failed'   ? 'FAILED'
                 : null,
      };

    // ── USA / Canada ──────────────────────────────────────────────────────
    case 'square':
      return {
        reference: body.data?.object?.payment_link?.id || body.data?.id,
        status:    body.type === 'payment.completed'   ? 'SUCCESSFUL'
                 : body.type === 'payment.failed'      ? 'FAILED'
                 : null,
      };

    case 'authnet':
      // Authorize.net envoie un XML converti en JSON via leur Silent Post
      return {
        reference: body.x_trans_id || body.transId,
        status:    body.x_response_code === '1' || body.responseCode === '1' ? 'SUCCESSFUL'
                 : body.x_response_code === '2' || body.x_response_code === '3' ? 'FAILED'
                 : null,
      };

    default:
      // Fallback générique
      return {
        reference: body.reference || body.transaction_id || body.id || body.order_id,
        status:
          body.status === 'SUCCESSFUL' || body.status === 'success' ||
          body.status === 'successful' || body.status === 'completed' ||
          body.status === 'paid'
            ? 'SUCCESSFUL'
          : body.status === 'FAILED' || body.status === 'failed' ||
            body.status === 'failure' || body.status === 'declined'
            ? 'FAILED'
          : null,
      };
  }
}

/* ─── Handler principal ──────────────────────────────────────────────────── */
export default async function handler(req, res) {
  const { provider } = req.query;

  await log('webhook', 'INFO', `Webhook reçu : ${provider}`, { provider, body: req.body });

  // Heartbeat GET
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requis' });

  try {
    const { reference, status } = parseWebhook(provider, req.body);

    // ── Cas Mollie : vérifier le statut via l'API ──────────────────────
    if (provider === 'mollie' && status === 'CHECK' && reference) {
      // On laisse passer — la mise à jour se fera via polling ou vérification manuelle
      // car Mollie envoie juste l'ID sans le statut dans le webhook
      console.info(`Mollie webhook reçu pour ${reference} — vérification manuelle requise`);
      return res.status(200).json({ success: true, message: 'Webhook Mollie reçu' });
    }

    if (!reference || !status || status === null) {
      // Webhook ignoré (event non pertinent ou incomplet)
      return res.status(200).json({ success: true, message: 'Webhook ignoré' });
    }

    // ── Chercher la transaction dans Firestore ─────────────────────────
    const txSnap = await db.collection('gateway_transactions')
      .where('providerRef', '==', reference)
      .limit(1)
      .get();

    if (txSnap.empty) {
      console.warn(`Webhook ${provider}: transaction ${reference} introuvable`);
      return res.status(200).json({ success: true, message: 'Transaction introuvable' });
    }

    const txDoc = txSnap.docs[0];
    const tx    = txDoc.data();

    // ── Éviter les doublons ────────────────────────────────────────────
    if (tx.status === 'completed' || tx.status === 'failed') {
      return res.status(200).json({ success: true, message: 'Transaction déjà traitée' });
    }

    const newStatus    = status === 'SUCCESSFUL' ? 'completed' : 'failed';
    const isSuccessful = status === 'SUCCESSFUL';

    // ── Mettre à jour la transaction ───────────────────────────────────
    await db.collection('gateway_transactions').doc(txDoc.id).update({
      status:      newStatus,
      webhookData: req.body,
      completedAt: isSuccessful ? new Date().toISOString() : null,
      failedAt:    !isSuccessful ? new Date().toISOString() : null,
      updatedAt:   new Date().toISOString(),
    });

    await log('webhook', 'INFO', `Transaction ${newStatus}`, { provider, reference, transactionId: txDoc.id, newStatus });

    // ── Mettre à jour le solde marchand (si succès) ────────────────────
    if (isSuccessful && tx.merchantId) {
      const netAmount = tx.netAmount || tx.amount || 0;
      await db.collection('gateway_merchants').doc(tx.merchantId).update({
        balance:           admin.firestore.FieldValue.increment(netAmount),
        totalTransactions: admin.firestore.FieldValue.increment(1),
        updatedAt:         new Date().toISOString(),
      });
    }

    // ── Récupérer les infos du marchand pour l'email ──────────────────
    if (tx.merchantId) {
      const merchantSnap = await db.collection('gateway_merchants').doc(tx.merchantId).get();
      if (merchantSnap.exists) {
        const merchant  = merchantSnap.data();
        const netAmount = tx.netAmount || tx.amount || 0;
        const currency  = tx.currency || 'XOF';

        if (isSuccessful) {
          await sendBrevoEmail({
            to:          merchant.email,
            toName:      merchant.name || merchant.email,
            subject:     `💰 Paiement reçu — ${Number(netAmount).toLocaleString('fr-FR')} ${currency}`,
            htmlContent: tplPaymentReceived(
              merchant.name || merchant.email,
              netAmount,
              currency,
              reference,
              provider,
            ),
          });
        } else {
          await sendBrevoEmail({
            to:          merchant.email,
            toName:      merchant.name || merchant.email,
            subject:     `❌ Paiement échoué — ${Number(netAmount).toLocaleString('fr-FR')} ${currency}`,
            htmlContent: tplPaymentFailed(
              merchant.name || merchant.email,
              netAmount,
              currency,
              reference,
              req.body.message || req.body.error || '',
            ),
          });
        }
      }
    }

    return res.status(200).json({ success: true, message: `Transaction ${newStatus}` });

  } catch (error) {
    console.error('Erreur webhook:', error);
    await logError('webhook', error, { provider, body: req.body });
    return res.status(500).json({ error: error.message });
  }
}