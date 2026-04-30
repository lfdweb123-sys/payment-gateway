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

  // Définition des rôles et permissions par page
  const getRequiredRolesForPath = (path) => {
    const roleMap = {
      '/dashboard': ['Administrateur', 'Gestionnaire', 'Consultant', 'Support', 'admin', 'manager', 'consultant', 'support'],
      '/payment-links': ['Administrateur', 'Gestionnaire', 'admin', 'manager'],
      '/providers': ['Administrateur', 'Gestionnaire', 'admin', 'manager'],
      '/transactions': ['Administrateur', 'Gestionnaire', 'Consultant', 'admin', 'manager', 'consultant'],
      '/payouts': ['Administrateur', 'admin'],
      '/team': ['Administrateur', 'admin'],
      '/developer': ['Administrateur', 'admin'],
      '/settings': ['Administrateur', 'admin'],
      '/verification': [], // accessible à tous
      '/help': [], // accessible à tous
    };
    return roleMap[path] || null;
  };

  // Vérifier si l'utilisateur a accès à la page selon son rôle
  const hasAccessToPath = () => {
    const currentPath = location.pathname;
    const requiredRoles = getRequiredRolesForPath(currentPath);
    
    // Si pas de restriction, accès autorisé
    if (!requiredRoles || requiredRoles.length === 0) return true;
    
    // Propriétaire (non membre d'équipe) - vérifié ou pas ?
    if (!user.isTeamMember) {
      // Si le propriétaire n'est pas vérifié, seul dashboard est accessible
      if (user.merchant?.verificationStatus !== 'approved') {
        return currentPath === '/dashboard' || currentPath === '/verification' || currentPath === '/settings' || currentPath === '/help';
      }
      // Propriétaire vérifié = admin complet
      return true;
    }
    
    // Membre d'équipe - vérifier son rôle
    const teamRole = user.teamRole;
    if (!teamRole) return false;
    
    return requiredRoles.includes(teamRole);
  };

  // Vérification KYC pour le propriétaire
  const isVerified = user.merchant?.verificationStatus === 'approved';
  const publicPaths = ['/dashboard', '/verification', '/settings', '/help'];
  const isPublicPath = publicPaths.some(p => location.pathname === p);

  // Propriétaire non vérifié - restreindre l'accès
  if (!user.isTeamMember && !isVerified && !isPublicPath) {
    return <Navigate to="/verification" replace />;
  }

  // Vérification des permissions par rôle
  if (!hasAccessToPath()) {
    // Rediriger vers dashboard si pas accès
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}