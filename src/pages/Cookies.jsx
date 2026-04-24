export default function Cookies() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Politique de Cookies</h1>
        <p className="text-xs text-gray-500 mt-0.5">Dernière mise à jour : 24 Avril 2026</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 prose prose-sm max-w-none text-gray-600 space-y-4">
        <h3 className="text-gray-900 font-semibold">1. Qu'est-ce qu'un cookie ?</h3>
        <p>Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d'un site web.</p>
        
        <h3 className="text-gray-900 font-semibold">2. Cookies utilisés</h3>
        <p>Nous utilisons uniquement des cookies strictement nécessaires à l'authentification (Firebase Auth). Aucun cookie publicitaire ou de tracking n'est utilisé.</p>
        
        <h3 className="text-gray-900 font-semibold">3. Durée de conservation</h3>
        <p>Les cookies de session sont supprimés à la fermeture du navigateur. Les cookies d'authentification persistent 30 jours maximum.</p>
        
        <h3 className="text-gray-900 font-semibold">4. Gestion des cookies</h3>
        <p>Vous pouvez désactiver les cookies dans les paramètres de votre navigateur. Cela peut affecter le fonctionnement de la plateforme.</p>
      </div>
    </div>
  );
}