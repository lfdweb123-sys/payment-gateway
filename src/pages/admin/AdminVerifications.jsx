import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { sendEmail, getVerificationApprovedTemplate, getVerificationRejectedTemplate } from '../../services/brevo';
import { CheckCircle, XCircle, Eye, ArrowLeft, X, Shield, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function AdminVerifications() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      const snap = await getDocs(collection(db, 'gateway_merchants'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMerchants(all.filter(m => m.verificationStatus === 'pending'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleVerify = async (merchantId, status) => {
    try {
      const updateData = {
        verificationStatus: status,
        active: status === 'approved',
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'gateway_merchants', merchantId), updateData);
      
      const merchant = merchants.find(m => m.id === merchantId);
      
      // Envoyer email de notification
      if (merchant?.email) {
        const template = status === 'approved' 
          ? getVerificationApprovedTemplate(merchant.name || merchant.email)
          : getVerificationRejectedTemplate(merchant.name || merchant.email);
        
        sendEmail({
          to: merchant.email,
          toName: merchant.name || merchant.email,
          subject: status === 'approved' ? '✅ Compte vérifié - Passerelle de Paiement' : '❌ Vérification refusée - Passerelle de Paiement',
          htmlContent: template
        });
      }

      setMerchants(prev => prev.filter(m => m.id !== merchantId));
      setSelected(null);
      toast.success(status === 'approved' ? '✅ Compte approuvé et activé' : '❌ Compte rejeté');
    } catch { toast.error('Erreur'); }
  };

  const filtered = merchants.filter(m =>
    (m.name || m.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      {previewImage && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"><X size={20}/></button>
            <img src={previewImage} alt="Document" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
          </div>
        </div>
      )}

      {selected ? (
        <div className="space-y-5">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft size={16}/> Retour à la liste
          </button>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selected.name || selected.email}</h2>
                <p className="text-sm text-gray-500">{selected.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Soumis le {selected.verificationData?.submittedAt ? format(new Date(selected.verificationData.submittedAt), 'dd MMMM yyyy à HH:mm', {locale: fr}) : '—'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleVerify(selected.id, 'approved')}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center gap-1.5">
                  <CheckCircle size={14}/> Approuver
                </button>
                <button onClick={() => handleVerify(selected.id, 'rejected')}
                  className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 flex items-center gap-1.5">
                  <XCircle size={14}/> Rejeter
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
              <div><p className="text-xs text-gray-500 uppercase">Type</p><p className="text-sm font-medium">{selected.verificationData?.documentType}</p></div>
              <div><p className="text-xs text-gray-500 uppercase">N°</p><p className="text-sm font-medium">{selected.verificationData?.documentNumber}</p></div>
              <div><p className="text-xs text-gray-500 uppercase">Nom</p><p className="text-sm font-medium">{selected.verificationData?.lastName} {selected.verificationData?.firstName}</p></div>
              <div><p className="text-xs text-gray-500 uppercase">Né(e) le</p><p className="text-sm font-medium">{selected.verificationData?.birthDate ? format(new Date(selected.verificationData.birthDate), 'dd/MM/yyyy') : '—'}</p></div>
              {selected.verificationData?.companyName && <div><p className="text-xs text-gray-500 uppercase">Entreprise</p><p className="text-sm font-medium">{selected.verificationData.companyName}</p></div>}
              {selected.verificationData?.companyRegNumber && <div><p className="text-xs text-gray-500 uppercase">RCCM</p><p className="text-sm font-medium">{selected.verificationData.companyRegNumber}</p></div>}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Documents soumis</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="border rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase mb-3">Photo recto</p>
                  {selected.verificationData?.documentFrontBase64 ? (
                    <img src={selected.verificationData.documentFrontBase64} alt="Recto" className="w-full h-48 object-contain rounded-lg cursor-pointer bg-gray-50" onClick={() => setPreviewImage(selected.verificationData.documentFrontBase64)} />
                  ) : <p className="text-xs text-gray-400 py-12">Non fourni</p>}
                </div>
                <div className="border rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase mb-3">Photo verso</p>
                  {selected.verificationData?.documentBackBase64 ? (
                    <img src={selected.verificationData.documentBackBase64} alt="Verso" className="w-full h-48 object-contain rounded-lg cursor-pointer bg-gray-50" onClick={() => setPreviewImage(selected.verificationData.documentBackBase64)} />
                  ) : <p className="text-xs text-gray-400 py-12">Non fourni</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div><h1 className="text-xl font-bold text-gray-900">Vérifications en attente</h1><p className="text-xs text-gray-500">{merchants.length} demande{merchants.length > 1 ? 's' : ''}</p></div>
            <div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-40"/></div>
          </div>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><CheckCircle size={48} className="text-emerald-300 mx-auto mb-3"/><p className="text-gray-500">Aucune vérification en attente</p></div>
          ) : (
            <div className="space-y-2">
              {filtered.map(m => (
                <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold">{m.name?.charAt(0) || m.email?.charAt(0) || '?'}</div>
                    <div><p className="text-sm font-semibold text-gray-900">{m.name || m.email}</p><p className="text-xs text-gray-500">{m.verificationData?.documentType || 'Document'} {m.verificationData?.submittedAt ? ` • ${format(new Date(m.verificationData.submittedAt), 'dd/MM/yy', {locale: fr})}` : ''}</p></div>
                  </div>
                  <button onClick={() => setSelected(m)} className="text-sm bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-1.5"><Eye size={14}/> Examiner</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}