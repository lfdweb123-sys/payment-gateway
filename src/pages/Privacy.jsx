export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Politique de Confidentialité</h1>
        <p className="text-xs text-gray-500 mt-0.5">Dernière mise à jour : 24 Avril 2026</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 prose prose-sm max-w-none text-gray-600 space-y-4">
        <h3 className="text-gray-900 font-semibold">1. Collecte des données</h3>
        <p>Nous collectons les informations nécessaires à la fourniture de nos services de paiement : nom, email, téléphone, informations de transaction. Ces données sont stockées de manière sécurisée sur Firebase (Google Cloud).</p>
        
        <h3 className="text-gray-900 font-semibold">2. Utilisation des données</h3>
        <p>Vos données sont utilisées exclusivement pour le traitement des paiements, la gestion de votre compte, et l'amélioration de nos services.</p>
        
        <h3 className="text-gray-900 font-semibold">3. Données de paiement</h3>
        <p>Nous ne stockons pas les données de cartes bancaires. Les transactions sont traitées directement par nos providers (Stripe, FeexPay, etc.) certifiés PCI DSS.</p>
        
        <h3 className="text-gray-900 font-semibold">4. Partage des données</h3>
        <p>Nous ne vendons ni ne partageons vos données personnelles avec des tiers non liés au traitement des paiements.</p>
        
        <h3 className="text-gray-900 font-semibold">5. Sécurité</h3>
        <p>Toutes les données sont chiffrées en transit (TLS 1.3) et au repos (AES-256).</p>
        
        <h3 className="text-gray-900 font-semibold">6. Vos droits</h3>
        <p>Vous disposez d'un droit d'accès, de rectification et d'effacement de vos données. Contactez-nous à privacy@payment-gateway.vercel.app.</p>
        
        <h3 className="text-gray-900 font-semibold">7. Cookies</h3>
        <p>Nous utilisons des cookies strictement nécessaires à l'authentification. Aucun cookie publicitaire n'est utilisé.</p>
        
        <h3 className="text-gray-900 font-semibold">8. Contact</h3>
        <p>Pour toute question : privacy@payment-gateway.vercel.app</p>
      </div>
    </div>
  );
}