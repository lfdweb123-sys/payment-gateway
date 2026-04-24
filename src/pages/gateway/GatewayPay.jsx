import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';
import { getMethodsForCountry } from '../../services/countryMethods';
import { initPayment } from '../../services/providers/index';
import PaymentMethods from '../../components/gateway/PaymentMethods';
import PaymentStatus from '../../components/gateway/PaymentStatus';
import toast from 'react-hot-toast';

export default function GatewayPay() {
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
  const [amount, setAmount] = useState(amountParam || '');
  const [loading, setLoading] = useState(false);
  const [transactionRef, setTransactionRef] = useState(null);
  const [merchantName, setMerchantName] = useState('');

  useEffect(() => {
    if (token) {
      fetch(`/api/gateway/merchant/${token}`)
        .then(r => r.json())
        .then(data => { if (data.success) setMerchantName(data.name); })
        .catch(() => {});
    }
  }, [token]);

  const handleSelectCountry = (code) => {
    setCountry(code);
    setCountryData(getMethodsForCountry(code));
    setStep(2);
  };

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error('Montant invalide'); return; }

    setLoading(true);
    try {
      const result = await initPayment({
        amount: parseFloat(amount),
        phone: phoneNumber,
        email,
        country,
        method: selectedMethod.id,
        description
      });

      if (result.success) {
        // Enregistrer transaction via API
        const txResponse = await fetch('/api/gateway/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': token },
          body: JSON.stringify({
            token, amount: parseFloat(amount), country, method: selectedMethod.id,
            phone: phoneNumber, email, description, provider: result.provider
          })
        });
        const txData = await txResponse.json();
        setTransactionRef(txData.reference || result.reference);
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 max-w-lg w-full overflow-hidden">
        <div className="bg-gray-900 text-white p-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} />
            <span className="text-sm font-bold">Paiement sécurisé</span>
          </div>
          {merchantName && <p className="text-xs text-gray-400">{merchantName}</p>}
        </div>

        <div className="p-5 space-y-4">
          {step < 4 && (
            <>
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs text-gray-500 uppercase mb-1.5 block">Montant ({countryData?.currency || 'XOF'})</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-lg font-bold text-center focus:ring-1 focus:ring-gray-900 outline-none"
                  placeholder="5000" min="100" />
                <p className="text-xs text-gray-400 text-center mt-2">{description}</p>
              </div>

              {step === 1 && <PaymentMethods onSelectCountry={handleSelectCountry} onSelectMethod={() => {}} />}
              {step === 2 && <PaymentMethods onSelectCountry={() => {}} onSelectMethod={handleSelectMethod} selectedCountry={country} />}
              
              {step === 3 && selectedMethod && (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="text-lg">{countryData?.flag}</span>
                    <div>
                      <p className="text-sm font-semibold">{selectedMethod.name}</p>
                      <p className="text-xs text-gray-500">{countryData?.name}</p>
                    </div>
                  </div>
                  <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-gray-900 outline-none"
                    placeholder="Numéro de téléphone" required />
                  <button type="submit" disabled={loading}
                    className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50">
                    {loading ? 'Traitement...' : `Payer ${parseFloat(amount || 0).toLocaleString()} ${countryData?.currency || 'XOF'}`}
                  </button>
                </form>
              )}
            </>
          )}

          {step === 4 && transactionRef && <PaymentStatus reference={transactionRef} />}

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