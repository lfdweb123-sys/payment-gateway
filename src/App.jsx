import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import GatewayLayout from './pages/gateway/GatewayLayout';
import GatewayHome from './pages/gateway/GatewayHome';
import GatewayPay from './pages/gateway/GatewayPay';
import GatewayDashboard from './pages/gateway/GatewayDashboard';
import GatewayMerchants from './pages/gateway/GatewayMerchants';
import GatewayProviders from './pages/gateway/GatewayProviders';
import GatewaySettings from './pages/gateway/GatewaySettings';
import GatewayTransactions from './pages/gateway/GatewayTransactions';
import GatewayApiDocs from './pages/gateway/GatewayApiDocs';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" />;
  return children;
}

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const isGatewayDashboard = location.pathname.startsWith('/gateway') || 
                              location.pathname.startsWith('/dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Page d'accueil publique */}
        <Route path="/" element={<GatewayHome />} />
        
        {/* Page de paiement publique (pour les clients) */}
        <Route path="/pay" element={<GatewayPay />} />
        
        {/* Auth */}
        <Route path="/login" element={<PublicRoute><LoginForm /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterForm /></PublicRoute>} />
        
        {/* Dashboard marchand */}
        <Route path="/dashboard" element={<ProtectedRoute><GatewayDashboard /></ProtectedRoute>} />
        
        {/* Admin passerelle */}
        <Route path="/gateway" element={<AdminRoute><GatewayLayout /></AdminRoute>}>
          <Route index element={<GatewayDashboard />} />
          <Route path="merchants" element={<GatewayMerchants />} />
          <Route path="providers" element={<GatewayProviders />} />
          <Route path="settings" element={<GatewaySettings />} />
          <Route path="transactions" element={<GatewayTransactions />} />
          <Route path="api-docs" element={<GatewayApiDocs />} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}