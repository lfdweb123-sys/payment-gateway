import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowRight, CheckCircle, Globe, Shield, CreditCard, 
  Smartphone, Zap, Users, Star, Menu, X, TrendingUp,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Globe size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Paiement Pro</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">Fonctionnalités</a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">Tarifs</a>
              <a href="#api" className="text-sm text-gray-600 hover:text-gray-900">API</a>
              <a href="/api-docs" className="text-sm text-gray-600 hover:text-gray-900">Documentation</a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <Link to="/dashboard" className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 transition-all">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Connexion</Link>
                  <Link to="/register" className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 transition-all">
                    Inscription gratuite
                  </Link>
                </>
              )}
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-sm text-gray-600 py-2">Fonctionnalités</a>
              <a href="#pricing" className="block text-sm text-gray-600 py-2">Tarifs</a>
              <a href="#api" className="block text-sm text-gray-600 py-2">API</a>
              {user ? (
                <Link to="/dashboard" className="block w-full text-center bg-orange-500 text-white px-4 py-3 rounded-xl text-sm font-medium">Dashboard</Link>
              ) : (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <Link to="/login" className="block w-full text-center border border-gray-300 text-gray-700 px-4 py-3 rounded-xl text-sm">Connexion</Link>
                  <Link to="/register" className="block w-full text-center bg-orange-500 text-white px-4 py-3 rounded-xl text-sm">Inscription gratuite</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Zap size={14} />
            15+ providers de paiement intégrés
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Acceptez les paiements en{' '}
            <span className="text-orange-500">Afrique</span> et en{' '}
            <span className="text-orange-500">Europe</span>
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Une seule intégration pour accepter Mobile Money, cartes bancaires, PayPal et plus encore. 
            Disponible dans 40+ pays avec commission de 1% seulement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-orange-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-orange-600 transition-all inline-flex items-center justify-center gap-2">
              Commencer maintenant <ArrowRight size={18} />
            </Link>
            <a href="#features" className="border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:border-orange-300 transition-all inline-flex items-center justify-center">
              Découvrir
            </a>
          </div>
          <div className="flex items-center justify-center gap-4 mt-10 text-sm text-gray-500">
            <CheckCircle size={14} className="text-emerald-500" /> Sans engagement
            <CheckCircle size={14} className="text-emerald-500" /> Commission 1%
            <CheckCircle size={14} className="text-emerald-500" /> Paiements instantanés
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '40+', label: 'Pays supportés' },
              { value: '15+', label: 'Providers intégrés' },
              { value: '99.9%', label: 'Disponibilité' },
              { value: '1%', label: 'Commission' }
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6">
                <p className="text-3xl font-bold text-orange-500">{s.value}</p>
                <p className="text-sm text-gray-500 mt-2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Une passerelle complète pour accepter tous les moyens de paiement</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Globe, title: 'Multi-pays', desc: '40+ pays en Afrique et Europe. Détection automatique du pays.' },
              { icon: Smartphone, title: 'Mobile Money', desc: 'MTN, Moov, Orange, Wave, M-Pesa et plus.' },
              { icon: CreditCard, title: 'Cartes Bancaires', desc: 'Visa, Mastercard, American Express.' },
              { icon: Shield, title: 'Sécurisé', desc: 'PCI DSS, cryptage TLS, anti-fraude intégré.' }
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-orange-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Providers */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Providers supportés</h2>
          <p className="text-gray-600 mb-10">Intégrez une fois, acceptez tous les moyens de paiement</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 max-w-3xl mx-auto">
            {['FeexPay', 'Stripe', 'Paystack', 'Flutterwave', 'KKiaPay', 'FedaPay', 'PayDunya', 'CinetPay', 'PayPal', 'Chipper'].map(p => (
              <div key={p} className="bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-700 hover:border-orange-300 transition-all">{p}</div>
            ))}
          </div>
        </div>
      </section>

      {/* API Section */}
      <section id="api" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">API simple et puissante</h2>
              <p className="text-gray-600 mb-6">Intégrez les paiements en quelques lignes de code</p>
              <div className="bg-gray-900 text-gray-100 rounded-2xl p-6 font-mono text-sm overflow-x-auto">
                <pre>{`<form action="https://votre-passelle.com/pay">
  <input name="token" value="VOTRE_CLE_API" />
  <input name="amount" value="5000" />
  <button>Payer 5000 XOF</button>
</form>`}</pre>
              </div>
            </div>
            <div className="space-y-4">
              {['Clé API unique', 'Webhooks en temps réel', 'Dashboard complet', 'Support 24/7'].map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4">
                  <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-gray-700">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Tarification simple</h2>
            <p className="text-gray-600">Payez uniquement lorsque vous gagnez de l'argent</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 flex flex-col">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Starter</h3>
                <p className="text-gray-500 text-sm mb-6">Pour démarrer</p>
                <div className="text-4xl font-bold text-gray-900 mb-6">0 XOF<span className="text-base text-gray-400 font-normal">/mois</span></div>
                <ul className="space-y-3 mb-8">
                  {['1% par transaction', 'Jusqu\'à 1M XOF/mois', 'Support email', 'Dashboard basique'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle size={14} className="text-emerald-500 flex-shrink-0" /> {item}</li>
                  ))}
                </ul>
              </div>
              <Link to="/register" className="mt-auto w-full text-center border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:border-orange-300 transition-all">Commencer</Link>
            </div>

            <div className="bg-orange-500 rounded-2xl p-8 text-white flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-1 rounded-full text-xs font-bold">Populaire</div>
              <div className="mt-2">
                <h3 className="text-xl font-bold mb-2">Pro</h3>
                <p className="text-white/80 text-sm mb-6">Pour les entreprises</p>
                <div className="text-4xl font-bold mb-6">9 999 XOF<span className="text-base text-white/70 font-normal">/mois</span></div>
                <ul className="space-y-3 mb-8">
                  {['0.5% par transaction', 'Volume illimité', 'API avancée', 'Support prioritaire', 'Webhooks'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-white/90"><CheckCircle size={14} className="text-white flex-shrink-0" /> {item}</li>
                  ))}
                </ul>
              </div>
              <Link to="/register" className="mt-auto w-full text-center bg-white text-orange-500 py-3 rounded-xl font-medium hover:bg-gray-100 transition-all">Essai gratuit</Link>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 flex flex-col">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <p className="text-gray-500 text-sm mb-6">Sur mesure</p>
                <div className="text-4xl font-bold text-gray-900 mb-6">Contact<span className="text-base text-gray-400 font-normal">-nous</span></div>
                <ul className="space-y-3 mb-8">
                  {['Commission négociable', 'Multi-utilisateurs', 'SLA garanti', 'Formation', 'Support 24/7'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle size={14} className="text-emerald-500 flex-shrink-0" /> {item}</li>
                  ))}
                </ul>
              </div>
              <Link to="/register" className="mt-auto w-full text-center border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:border-orange-300 transition-all">Contactez-nous</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Globe size={16} className="text-white" />
                </div>
                <span className="text-white font-bold text-lg">Paiement Pro</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">Passerelle de paiement unifiée pour l'Afrique et l'Europe.</p>
              <div className="flex flex-wrap gap-2">
                {["🇧🇯 Bénin", "🇧🇫 Burkina Faso", "🇨🇲 Cameroun", "🇨🇮 Côte d'Ivoire", "🇸🇳 Sénégal", "🇹🇬 Togo"].map((c, i) => (
                  <span key={i} className="text-xs bg-white/10 px-2 py-1 rounded">{c}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="/api-docs" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Statut</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Ressources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/api-docs" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Confidentialité</a></li>
                <li><a href="#" className="hover:text-white transition-colors">CGU</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mentions légales</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2026 Paiement Pro. Tous droits réservés.</p>
            <p className="text-sm">Développé avec ❤️ depuis le Bénin</p>
          </div>
        </div>
      </footer>
    </div>
  );
}