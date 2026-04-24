export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Conditions Générales d'Utilisation</h1>
        <p className="text-xs text-gray-500 mt-0.5">Dernière mise à jour : 24 Avril 2026</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 prose prose-sm max-w-none text-gray-600 space-y-4">
        <h3 className="text-gray-900 font-semibold">1. Objet</h3>
        <p>Les présentes CGU régissent l'utilisation de la passerelle de paiement Paiement Pro.</p>
        
        <h3 className="text-gray-900 font-semibold">2. Services</h3>
        <p>Paiement Pro fournit une passerelle de paiement unifiée permettant d'accepter des paiements via Mobile Money, cartes bancaires et autres moyens de paiement.</p>
        
        <h3 className="text-gray-900 font-semibold">3. Commission</h3>
        <p>Une commission de 1% est prélevée sur chaque transaction réussie. Ce taux peut être modifié avec un préavis de 30 jours.</p>
        
        <h3 className="text-gray-900 font-semibold">4. Obligations du marchand</h3>
        <p>Le marchand est responsable de la configuration de ses providers de paiement et de la sécurisation de ses clés API.</p>
        
        <h3 className="text-gray-900 font-semibold">5. Responsabilité</h3>
        <p>Paiement Pro agit en tant qu'intermédiaire technique. Nous ne sommes pas responsables des litiges entre marchands et clients finaux.</p>
        
        <h3 className="text-gray-900 font-semibold">6. Résiliation</h3>
        <p>Le marchand peut fermer son compte à tout moment. Les fonds disponibles seront reversés sous 30 jours.</p>
      </div>
    </div>
  );
}