import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Lock, CheckCircle, ArrowLeft, Smartphone, CreditCard } from 'lucide-react';
import { getMethodsForCountry, getAllCountries, detectCountry } from '../../services/countryMethods';
import { initGatewayPayment } from '../../services/gatewayApi';
import PaymentMethods from './PaymentMethods';
import PaymentStatus from './PaymentStatus';
import toast from 'react-hot-toast';

export default function PaymentForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const amountParam = searchParams.get('amount');
  const description = searchParams.get('desc') || 'Paiement en ligne';

  const [step, setStep] = useState(1);
  const [country, setCountry] = useState(null);
  const [countryData, setCountryData] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [merchantInfo, setMerchantInfo] = useState(null);
  const [transactionRef, setTransactionRef] = useState(null);
  const [amount, setAmount] = useState(amountParam || '5000');
  const [customAmount, setCustomAmount] = useState(!amountParam);

  useEffect(() => {
    if (token) {
      fetch(`/api/gateway/merchant/${token}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) setMerchantInfo(data);
        })
        .catch(() => setMerchantInfo({ name: 'Paiement en ligne' }));
    }
  }, [token]);

  const handleSelectCountry = (code) => {
    setCountry(code);
    const data = getMethodsForCountry(code);
    setCountryData(data);
    setStep(2);
  };

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error('Montant invalide'); return; }
    if (!phoneNumber.trim() && selectedMethod?.id !== 'paypal') { toast.error('Numéro de téléphone requis'); return; }

    setLoading(true);
    try {
      const result = await initGatewayPayment({
        token,
        amount: parseFloat(amount),
        country,
        method: selectedMethod.id,
        phone: phoneNumber,
        email,
        description,
        provider: selectedMethod.providers[0]
      });

      if (result.success) {
        setTransactionRef(result.reference);
        setStep(4);
      } else {
        toast.error(result.error || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (methodId) => {
    if (methodId?.includes('card') || methodId === 'paypal') return <CreditCard size={20} />;
    return <Smartphone size={20} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 max-w-lg w-full overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gray-900 text-white p-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} />
            <span className="text-sm font-bold">Paiement sécurisé</span>
          </div>
          {merchantInfo && (
            <p className="text-xs text-gray-400">{merchantInfo.name || 'Passerelle de paiement'}</p>
          )}
        </div>

        <div className="p-5 space-y-4">
          {step < 4 && (
            <>
              {/* Montant */}
              <div className="bg-gray-50 rounded-xl p-4">
                {customAmount ? (
                  <div>
                    <label className="text-xs text-gray-500 uppercase mb-1.5 block">Montant à payer ({countryData?.currency || 'XOF'})</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:ring-1 focus:ring-gray-900 outline-none text-center"
                      placeholder="5000" min="100" />
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase">Montant à payer</p>
                    <p className="text-3xl font-bold text-gray-900">{parseFloat(amount).toLocaleString()} {countryData?.currency || 'XOF'}</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 text-center mt-2">{description}</p>
              </div>

              {/* Étapes */}
              {step === 1 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-3">Sélectionnez votre pays</p>
                  <PaymentMethods onSelectCountry={handleSelectCountry} onSelectMethod={() => {}} />
                </div>
              )}

              {step === 2 && (
                <div>
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 mb-3">
                    <ArrowLeft size={12} /> Retour
                  </button>
                  <PaymentMethods onSelectCountry={() => {}} onSelectMethod={handleSelectMethod} selectedCountry={country} />
                </div>
              )}

              {step === 3 && selectedMethod && (
                <div>
                  <button onClick={() => setStep(2)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 mb-3">
                    <ArrowLeft size={12} /> Retour
                  </button>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                      {getMethodIcon(selectedMethod.id)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedMethod.name}</p>
                      <p className="text-xs text-gray-500">{countryData?.flag} {countryData?.name}</p>
                    </div>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {selectedMethod.id !== 'paypal' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Numéro de téléphone</label>
                        <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-gray-900 outline-none"
                          placeholder="Ex: 229 97 00 00 00" required />
                      </div>
                    )}
                    {selectedMethod.id === 'paypal' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Email PayPal</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-gray-900 outline-none"
                          placeholder="votre@email.com" required />
                      </div>
                    )}
                    <button type="submit" disabled={loading}
                      className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50">
                      {loading ? 'Traitement...' : `Payer ${parseFloat(amount).toLocaleString()} ${countryData?.currency || 'XOF'}`}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {step === 4 && transactionRef && (
            <PaymentStatus reference={transactionRef} onClose={() => setStep(1)} />
          )}

          {step < 4 && (
            <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
              <Lock size={11} /> Paiement sécurisé
            </p>
          )}
        </div>
      </div>
    </div>
  );
}