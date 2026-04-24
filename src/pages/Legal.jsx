export default function Legal() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mentions Légales</h1>
        <p className="text-xs text-gray-500 mt-0.5">Informations légales</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 prose prose-sm max-w-none text-gray-600 space-y-4">
        <h3 className="text-gray-900 font-semibold">Éditeur</h3>
        <p>Paiement Pro est éditée par la société Paiement Pro SARL, au capital de 1 000 000 XOF.</p>
        <p>RCCM : RB/COT/24-B-12345 | IFU : 3202412345678</p>
        <p>Siège social : Cotonou, Littoral, Bénin</p>
        
        <h3 className="text-gray-900 font-semibold">Contact</h3>
        <p>Email : contact@payment-gateway.vercel.app</p>
        <p>Téléphone : +229 97 00 00 00</p>
        
        <h3 className="text-gray-900 font-semibold">Directeur de publication</h3>
        <p>Gérard Sononkpon, Gérant de Paiement Pro SARL</p>
        
        <h3 className="text-gray-900 font-semibold">Hébergement</h3>
        <p>Vercel Inc. - 340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
        <p>Firebase (Google Cloud) - Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
        
        <h3 className="text-gray-900 font-semibold">Propriété intellectuelle</h3>
        <p>Le nom "Paiement Pro", le logo et l'ensemble des contenus sont la propriété exclusive de Paiement Pro SARL.</p>
      </div>
    </div>
  );
}