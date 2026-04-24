import { HelpCircle, MessageCircle, Book, FileText, Mail, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Help() {
  const sections = [
    { icon: Book, title: 'Guide de démarrage', desc: 'Apprenez à créer votre compte et configurer vos premiers paiements.', link: '/api-documentation' },
    { icon: FileText, title: 'Documentation API', desc: 'Documentation complète pour intégrer la passerelle à votre site.', link: '/api-documentation' },
    { icon: MessageCircle, title: 'FAQ', desc: 'Les réponses aux questions les plus fréquentes.', link: '#faq' },
    { icon: Mail, title: 'Support', desc: 'Notre équipe est disponible pour vous aider.', link: 'mailto:support@payment-gateway.vercel.app' }
  ];

  const faq = [
    { q: 'Comment créer un compte ?', a: 'Cliquez sur "Inscription gratuite" et remplissez le formulaire. Vous recevrez votre clé API immédiatement.' },
    { q: 'Quels sont les frais ?', a: '1% de commission par transaction réussie. Aucun frais caché.' },
    { q: 'Quels moyens de paiement sont acceptés ?', a: 'Mobile Money (MTN, Moov, Orange, Wave), cartes bancaires, PayPal et plus selon le pays.' },
    { q: 'Combien de temps pour recevoir les fonds ?', a: 'Les fonds sont crédités sur votre solde instantanément après chaque paiement réussi.' },
    { q: 'Comment intégrer la passerelle ?', a: 'Utilisez notre lien de paiement direct ou notre API REST. Voir la documentation API.' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Aide & Support</h1>
        <p className="text-xs text-gray-500 mt-0.5">Tout ce dont vous avez besoin pour utiliser la passerelle</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {sections.map((s, i) => (
          <Link key={i} to={s.link} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-orange-200 hover:shadow-sm transition-all flex gap-4">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <s.icon size={20} className="text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{s.title}</h3>
              <p className="text-xs text-gray-500">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div id="faq" className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Questions fréquentes</h2>
        <div className="space-y-4">
          {faq.map((item, i) => (
            <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{item.q}</h3>
              <p className="text-sm text-gray-600">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
        <HelpCircle size={32} className="text-orange-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-orange-900 mb-2">Vous ne trouvez pas votre réponse ?</h3>
        <p className="text-sm text-orange-700 mb-4">Notre équipe support vous répond sous 24h</p>
        <a href="mailto:support@payment-gateway.vercel.app" className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-orange-600 transition-all">
          <MessageCircle size={16} /> support@payment-gateway.vercel.app
        </a>
      </div>
    </div>
  );
}