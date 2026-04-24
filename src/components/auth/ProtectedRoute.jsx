import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useState, useEffect } from 'react';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const [merchant, setMerchant] = useState(null);
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    getDoc(doc(db, 'gateway_merchants', user.uid)).then(snap => {
      setMerchant(snap.exists() ? snap.data() : {});
      setChecking(false);
    });
  }, [user]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const isVerified = merchant?.verificationStatus === 'approved';
  const publicPaths = ['/dashboard', '/verification', '/settings', '/help'];
  const isPublicPath = publicPaths.some(p => location.pathname === p);

  if (!isVerified && !isPublicPath) {
    return <Navigate to="/verification" replace />;
  }

  return children;
}