import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Globe, Building2, Phone, CheckCircle } from 'lucide-react';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    website: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const generateApiKey = () => 'gw_' + Array.from({ length: 48 }, () => Math.random().toString(36)[2]).join('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const result = await register(formData.email, formData.password, {
        displayName: formData.name,
        phone: formData.phone,
        company: formData.company
      });

      const apiKey = generateApiKey();
      await setDoc(doc(db, 'gateway_merchants', result.user.uid), {
        name: formData.company || formData.name,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        apiKey,
        balance: 0,
        totalTransactions: 0,
        active: true, // Activé par défaut
        verificationStatus: 'pending', // En attente de vérification
        commission: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast.success('Compte créé avec succès !');
      setStep(2);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Cet email est déjà utilisé');
      } else {
        toast.error('Erreur lors de l\'inscription');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const result = await loginWithGoogle();

      const apiKey = generateApiKey();
      await setDoc(doc(db, 'gateway_merchants', result.user.uid), {
        name: result.user.displayName || '',
        email: result.user.email,
        apiKey,
        balance: 0,
        totalTransactions: 0,
        active: true,
        verificationStatus: 'pending',
        commission: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast.success('Compte créé avec succès !');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Erreur lors de l\'inscription avec Google');
    }
  };

  // Étape 2 : Confirmation
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <Globe size={22} className="text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Paiement Pro</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-emerald-600"/>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Compte créé !</h1>
            <p className="text-sm text-gray-500 mb-6">
              Votre compte a été créé avec succès. Vous devez maintenant faire vérifier votre identité pour activer toutes les fonctionnalités.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-medium text-amber-900 mb-2">⚠️ Vérification requise</p>
              <p className="text-xs text-amber-700">
                Vous pouvez accéder à votre dashboard, mais les fonctionnalités de paiement seront limitées tant que votre compte n'est pas vérifié.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link to="/verification" className="bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-orange-600 text-center">
                Vérifier mon compte maintenant
              </Link>
              <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
                Accéder au dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Globe size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Paiement Pro</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Inscription</h1>
            <p className="text-gray-500 text-sm mt-1">Créez votre compte marchand</p>
          </div>

          <button onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all mb-4">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15" fill="#EA4335"/>
            </svg>
            Inscription avec Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-400">ou</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none" placeholder="John Doe" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none" placeholder="email@exemple.com" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none" placeholder="+229..." />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Entreprise</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none" placeholder="Nom entreprise" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Site web</label>
                <input type="url" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none" placeholder="https://..." />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none" placeholder="6 caractères minimum" required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-orange-500 outline-none" placeholder="••••••••" required />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-orange-500 text-white font-semibold py-3 px-4 rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50">
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-gray-600 hover:text-orange-500 font-medium">
              Déjà un compte ? Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}