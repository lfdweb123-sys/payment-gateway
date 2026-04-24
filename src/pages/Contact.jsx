import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    toast.success('Message envoyé ! Nous vous répondrons sous 24h.');
  };

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Message envoyé !</h2>
          <p className="text-gray-500">Nous vous répondrons dans les plus brefs délais.</p>
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
          { icon: Mail, title: 'Email', value: 'support@payment-gateway.vercel.app', link: 'mailto:support@payment-gateway.vercel.app' },
          { icon: Phone, title: 'Téléphone', value: '+229 97 00 00 00', link: 'tel:+22997000000' },
          { icon: MapPin, title: 'Adresse', value: 'Cotonou, Littoral, Bénin', link: '#' }
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
          <button type="submit" className="bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-orange-600 flex items-center gap-2">
            <Send size={14} /> Envoyer le message
          </button>
        </form>
      </div>
    </div>
  );
}