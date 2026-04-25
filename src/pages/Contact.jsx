import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, Loader } from 'lucide-react';
import { sendEmail } from '../services/brevo';
import toast from 'react-hot-toast';

const SUPPORT_EMAIL = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'support@payment-gateway.com';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Email vers le support
      const result = await sendEmail({
        to: SUPPORT_EMAIL,
        toName: 'Support Payment Gateway',
        subject: `[Contact] ${form.subject}`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">
            <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:28px;">
              <h2 style="color:#111827;margin:0 0 20px;font-size:18px;">Nouveau message de contact</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:100px;vertical-align:top;"><strong>Nom</strong></td><td style="padding:8px 0;color:#111827;font-size:13px;">${form.name}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;"><strong>Email</strong></td><td style="padding:8px 0;color:#111827;font-size:13px;">${form.email}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;"><strong>Sujet</strong></td><td style="padding:8px 0;color:#111827;font-size:13px;">${form.subject}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;"><strong>Message</strong></td><td style="padding:8px 0;color:#111827;font-size:13px;white-space:pre-wrap;">${form.message}</td></tr>
              </table>
              <p style="color:#9ca3af;font-size:11px;margin-top:20px;border-top:1px solid #f3f4f6;padding-top:12px;">Reçu le ${new Date().toLocaleString('fr-FR')} • Payment Gateway</p>
            </div>
          </div>
        `,
      });

      if (!result.success) throw new Error(result.error);

      // Email de confirmation à l'expéditeur
      await sendEmail({
        to: form.email,
        toName: form.name,
        subject: 'Votre message a bien été reçu',
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#f9fafb;">
            <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:28px;text-align:center;">
              <div style="font-size:36px;margin-bottom:14px;">✅</div>
              <h2 style="color:#111827;margin:0 0 10px;font-size:17px;">Message bien reçu !</h2>
              <p style="color:#6b7280;font-size:14px;margin-bottom:6px;">Bonjour ${form.name},</p>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;">Nous avons bien reçu votre message concernant <strong>${form.subject}</strong>. Notre équipe vous répondra dans les plus brefs délais (généralement sous 24h).</p>
              <p style="color:#9ca3af;font-size:12px;margin-top:20px;border-top:1px solid #f3f4f6;padding-top:14px;">Payment Gateway — Passerelle de paiement unifiée</p>
            </div>
          </div>
        `,
      });

      setSent(true);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Message envoyé !</h2>
          <p className="text-gray-500 text-sm">Nous vous répondrons dans les plus brefs délais. Un email de confirmation vous a été envoyé.</p>
          <button
            onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
            className="mt-6 text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            Envoyer un autre message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Contact</h1>
        <p className="text-xs text-gray-500 mt-0.5">Une question ? Nous sommes là pour vous aider.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Mail,   title: 'Email',    value: SUPPORT_EMAIL,            link: `mailto:${SUPPORT_EMAIL}` },
          { icon: Phone,  title: 'Téléphone', value: '+229 97 00 00 00',        link: 'tel:+22997000000' },
          { icon: MapPin, title: 'Adresse',  value: 'Cotonou, Littoral, Bénin', link: '#' },
        ].map((c, i) => (
          <a key={i} href={c.link} className="bg-white rounded-2xl border border-gray-100 p-5 text-center hover:border-orange-200 transition-all">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <c.icon size={20} className="text-orange-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{c.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{c.value}</p>
          </a>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Envoyez-nous un message</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Nom</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Sujet</label>
            <input type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Message</label>
            <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} required rows="4"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-orange-600 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading
              ? <><Loader size={14} className="animate-spin" /> Envoi en cours…</>
              : <><Send size={14} /> Envoyer le message</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}