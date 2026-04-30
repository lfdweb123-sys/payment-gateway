import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Les membres d'équipe sont toujours vérifiés via le marchand propriétaire
  if (user.isTeamMember) return children;

  const isVerified = user.merchant?.verificationStatus === 'approved';
  const publicPaths = ['/dashboard', '/verification', '/settings', '/help'];
  const isPublicPath = publicPaths.some(p => location.pathname === p);

  if (!isVerified && !isPublicPath) {
    return <Navigate to="/verification" replace />;
  }

  return children;
}