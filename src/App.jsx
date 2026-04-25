import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import MerchantHeader from './components/layout/MerchantHeader';
import MerchantSidebar from './components/layout/MerchantSidebar';
import GatewayHome from './pages/gateway/GatewayHome';
import GatewayPay from './pages/gateway/GatewayPay';
import GatewayDashboard from './pages/gateway/GatewayDashboard';
import MerchantProviders from './pages/gateway/MerchantProviders';
import GatewayTransactions from './pages/gateway/GatewayTransactions';
import GatewaySettings from './pages/gateway/GatewaySettings';
import GatewayApiDocs from './pages/gateway/GatewayApiDocs';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Developer from './pages/gateway/Developer';
import Verification from './pages/gateway/Verification';
import MerchantPayouts from './pages/gateway/MerchantPayouts';

import Help from './pages/Help';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Cookies from './pages/Cookies';
import Legal from './pages/Legal';

// Admin
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMerchants from './pages/admin/AdminMerchants';
import AdminVerifications from './pages/admin/AdminVerifications';
import AdminCommissions from './pages/admin/AdminCommissions';
import AdminRoute from './components/auth/AdminRoute';
import AdminPayouts from './pages/admin/AdminPayouts';




function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" />;
  return children;
}

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isPublicPage = location.pathname === '/' || location.pathname === '/pay' || 
    location.pathname.startsWith('/api-documentation') ||
    location.pathname === '/help' || location.pathname === '/privacy' ||
    location.pathname === '/contact' || location.pathname === '/terms' || 
    location.pathname === '/cookies' || location.pathname === '/legal';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header marchand (pas sur admin, pas sur auth, pas sur public) */}
      {user && !isAuthPage && !isPublicPage && !isAdminRoute && <MerchantHeader />}
      
      <div className="flex flex-1">
        {/* Sidebar marchand (pas sur admin, pas sur auth, pas sur public) */}
        {user && !isAuthPage && !isPublicPage && !isAdminRoute && <MerchantSidebar />}
        
        <main className={`flex-1 min-w-0 overflow-x-hidden ${user && !isAuthPage && !isPublicPage && !isAdminRoute ? 'lg:ml-64' : ''} ${user && !isAuthPage && !isPublicPage && !isAdminRoute ? 'pt-16 pb-16 lg:pb-0' : ''}`}>
          <Routes>
            {/* Pages publiques */}
            <Route path="/" element={<GatewayHome />} />
            <Route path="/pay" element={<GatewayPay />} />
            <Route path="/login" element={<PublicRoute><LoginForm /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterForm /></PublicRoute>} />
            
            {/* Pages info publiques */}
            <Route path="/api-documentation" element={<GatewayApiDocs />} />
            <Route path="/help" element={<Help />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/legal" element={<Legal />} />
            
            {/* Pages protégées - Marchand */}
            <Route path="/dashboard" element={<ProtectedRoute><GatewayDashboard /></ProtectedRoute>} />
            <Route path="/providers" element={<ProtectedRoute><MerchantProviders /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><GatewayTransactions /></ProtectedRoute>} />
            <Route path="/payouts" element={<ProtectedRoute><MerchantPayouts /></ProtectedRoute>} />
            <Route path="/developer" element={<ProtectedRoute><Developer /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><GatewaySettings /></ProtectedRoute>} />
            <Route path="/verification" element={<ProtectedRoute><Verification /></ProtectedRoute>} />

            {/* Pages Admin */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="merchants" element={<AdminMerchants />} />
              <Route path="verifications" element={<AdminVerifications />} />
              <Route path="transactions" element={<GatewayTransactions />} />
              <Route path="commissions" element={<AdminCommissions />} />
              <Route path="payouts" element={<AdminPayouts />} />
            </Route>
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
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