import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Shield, CheckCircle, Clock, AlertCircle, FileText, Camera, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Verification() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    documentType: '',
    documentNumber: '',
    firstName: user?.displayName?.split(' ')[0] || '',
    lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
    birthDate: '',
    documentFrontBase64: '',
    documentBackBase64: '',
    companyName: '',
    companyRegNumber: '',
    companyDocBase64: ''
  });

  const documentTypes = [
    { value: 'cip', label: 'CIP (Carte d\'Identité Professionnelle)', icon: '🪪' },
    { value: 'national_id', label: 'Carte Nationale d\'Identité', icon: '🆔' },
    { value: 'passport', label: 'Passeport', icon: '🌍' },
    { value: 'driving_license', label: 'Permis de conduire', icon: '🚗' },
    { value: 'business_reg', label: 'Registre de Commerce (RCCM)', icon: '🏢' }
  ];

  const isBusiness = formData.documentType === 'business_reg';

  useEffect(() => {
    loadMerchant();
  }, []);

  const loadMerchant = async () => {
    const snap = await getDoc(doc(db, 'gateway_merchants', user.uid));
    if (snap.exists()) {
      const data = snap.data();
      setMerchant(data);
      setSubmitted(data.verificationStatus === 'pending');
      if (data.verificationData) setFormData(prev => ({ ...prev, ...data.verificationData }));
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 5 Mo)'); return; }
    try {
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, [field]: base64 });
    } catch { toast.error('Erreur lecture fichier'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.documentType) { toast.error('Type de document requis'); return; }
    if (!formData.documentNumber) { toast.error('Numéro de document requis'); return; }
    if (!formData.documentFrontBase64) { toast.error('Photo recto requise'); return; }
    if (isBusiness && !formData.companyName) { toast.error('Nom entreprise requis'); return; }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'gateway_merchants', user.uid), {
        verificationStatus: 'pending',
        verificationData: formData,
        updatedAt: new Date().toISOString()
      });
      toast.success('Documents soumis ! En attente de validation.');
      // Recharger les données
      await loadMerchant();
      setSubmitted(true);
    } catch { toast.error('Erreur lors de la soumission'); }
    finally { setLoading(false); }
  };

  const handleRetry = () => {
    setSubmitted(false);
    setFormData({
      documentType: '', documentNumber: '',
      firstName: user?.displayName?.split(' ')[0] || '',
      lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
      birthDate: '', documentFrontBase64: '', documentBackBase64: '',
      companyName: '', companyRegNumber: '', companyDocBase64: ''
    });
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none transition-all";
  const labelClass = "block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5";

  if (merchant?.verificationStatus === 'approved') {
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-emerald-600"/>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Compte vérifié ✅</h2>
          <p className="text-sm text-gray-500">Votre compte est activé. Toutes les fonctionnalités sont accessibles.</p>
        </div>
      </div>
    );
  }

  if (submitted && merchant?.verificationStatus === 'pending') {
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-amber-600"/>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Vérification en cours ⏳</h2>
          <p className="text-sm text-gray-500">Vos documents sont en cours d'examen. Délai : 24 à 48h.</p>
          <button onClick={handleRetry} className="mt-4 text-sm text-gray-500 hover:text-gray-900 underline">
            Soumettre à nouveau
          </button>
        </div>
      </div>
    );
  }

  if (merchant?.verificationStatus === 'rejected') {
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-red-600"/>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Vérification refusée ❌</h2>
          <p className="text-sm text-gray-500 mb-4">Vos documents n'ont pas été acceptés.</p>
          <button onClick={handleRetry} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600">
            Soumettre à nouveau
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <Shield size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
        <div>
          <p className="text-sm font-medium text-amber-900">Vérification requise</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Pour activer votre compte et accepter les paiements, vous devez faire vérifier votre identité.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Vérification d'identité</h2>
        <p className="text-sm text-gray-500 mb-6">Soumettez vos documents pour activer votre compte</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>Type de document *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {documentTypes.map(doc => (
                <button key={doc.value} type="button" onClick={() => setFormData({...formData, documentType: doc.value})}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-all ${
                    formData.documentType === doc.value ? 'border-orange-500 bg-orange-50 text-gray-900 font-medium' : 'border-gray-200 text-gray-600'
                  }`}>
                  <span>{doc.icon}</span><span>{doc.label}</span>
                </button>
              ))}
            </div>
          </div>

          {isBusiness && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-blue-900">Informations entreprise</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className={labelClass}>Nom entreprise *</label><input type="text" value={formData.companyName} onChange={e=>setFormData({...formData, companyName: e.target.value})} className={inputClass} required/></div>
                <div><label className={labelClass}>N° RCCM *</label><input type="text" value={formData.companyRegNumber} onChange={e=>setFormData({...formData, companyRegNumber: e.target.value})} className={inputClass} required/></div>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={labelClass}>Nom *</label><input type="text" value={formData.lastName} onChange={e=>setFormData({...formData, lastName: e.target.value})} className={inputClass} required/></div>
            <div><label className={labelClass}>Prénom(s) *</label><input type="text" value={formData.firstName} onChange={e=>setFormData({...formData, firstName: e.target.value})} className={inputClass} required/></div>
            <div><label className={labelClass}>N° document *</label><input type="text" value={formData.documentNumber} onChange={e=>setFormData({...formData, documentNumber: e.target.value})} className={inputClass} required/></div>
            <div><label className={labelClass}>Date de naissance</label><input type="date" value={formData.birthDate} onChange={e=>setFormData({...formData, birthDate: e.target.value})} className={inputClass}/></div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Photo recto *</label>
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 bg-gray-50">
                {formData.documentFrontBase64 ? <img src={formData.documentFrontBase64} alt="Recto" className="h-full max-h-24 object-contain rounded"/> : <div className="text-center"><Camera size={22} className="text-gray-400"/><p className="text-xs text-gray-500">Cliquez pour ajouter</p></div>}
                <input type="file" accept="image/*" onChange={e=>handleFileChange(e,'documentFrontBase64')} className="hidden"/>
              </label>
            </div>
            <div>
              <label className={labelClass}>Photo verso (optionnel)</label>
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 bg-gray-50">
                {formData.documentBackBase64 ? <img src={formData.documentBackBase64} alt="Verso" className="h-full max-h-24 object-contain rounded"/> : <div className="text-center"><Upload size={22} className="text-gray-400"/><p className="text-xs text-gray-500">Optionnel</p></div>}
                <input type="file" accept="image/*" onChange={e=>handleFileChange(e,'documentBackBase64')} className="hidden"/>
              </label>
            </div>
          </div>

          {isBusiness && (
            <div>
              <label className={labelClass}>Registre de Commerce *</label>
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-blue-200 rounded-xl cursor-pointer hover:border-blue-300 bg-blue-50">
                {formData.companyDocBase64 ? <img src={formData.companyDocBase64} alt="RCCM" className="h-full max-h-24 object-contain rounded"/> : <div className="text-center"><FileText size={22} className="text-blue-400"/><p className="text-xs text-blue-600">Scanner RCCM</p></div>}
                <input type="file" accept=".pdf,image/*" onChange={e=>handleFileChange(e,'companyDocBase64')} className="hidden"/>
              </label>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 flex gap-3">
            <Shield size={18} className="text-gray-500 flex-shrink-0"/>
            <p className="text-xs text-gray-500">Documents chiffrés et stockés de manière sécurisée.</p>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-orange-500 text-white font-medium py-3 rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50">
            {loading ? 'Envoi...' : 'Soumettre pour vérification'}
          </button>
        </form>
      </div>
    </div>
  );
}