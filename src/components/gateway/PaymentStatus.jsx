import { useState, useEffect } from 'react';
import { verifyGatewayPayment } from '../../services/gatewayApi';
import { CheckCircle, XCircle, Clock, Loader, RefreshCw } from 'lucide-react';

export default function PaymentStatus({ reference, onClose }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (reference) checkStatus();
  }, [reference]);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const result = await verifyGatewayPayment(reference);
      if (result.success) {
        setStatus(result.status);
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError('Erreur de vérification');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <Loader className="animate-spin text-orange-500 mx-auto mb-3" size={32} />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Vérification en cours</h3>
        <p className="text-sm text-gray-500">Nous vérifions le statut de votre paiement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <XCircle size={48} className="text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Erreur</h3>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button onClick={checkStatus} className="text-sm text-gray-900 font-medium hover:underline flex items-center gap-1.5 mx-auto">
          <RefreshCw size={14} /> Réessayer
        </button>
      </div>
    );
  }

  const statusConfig = {
    SUCCESSFUL: {
      icon: CheckCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      title: 'Paiement réussi !',
      description: 'Votre paiement a été traité avec succès.',
      reference: true
    },
    PENDING: {
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      title: 'Paiement en cours',
      description: 'Votre paiement est en cours de traitement. Veuillez patienter.',
      reference: true
    },
    FAILED: {
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-50',
      title: 'Paiement échoué',
      description: 'Le paiement n\'a pas pu aboutir. Veuillez réessayer.',
      reference: false
    }
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
      <div className={`w-16 h-16 ${config.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
        <Icon size={32} className={config.color} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{config.title}</h3>
      <p className="text-sm text-gray-500 mb-4">{config.description}</p>
      
      {config.reference && reference && (
        <div className="bg-gray-50 rounded-xl p-4 inline-block">
          <p className="text-xs text-gray-500 uppercase mb-1">Référence</p>
          <p className="text-sm font-mono font-medium text-gray-900">{reference}</p>
        </div>
      )}

      <div className="mt-6 flex gap-3 justify-center">
        <button onClick={checkStatus} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5">
          <RefreshCw size={14} /> Actualiser
        </button>
        {onClose && (
          <button onClick={onClose} className="text-sm text-gray-900 font-medium hover:underline">
            Fermer
          </button>
        )}
      </div>
    </div>
  );
}