import { Link, useLocation } from 'react-router-dom';
import { Layout, CreditCard, Settings, Key, LogOut, HelpCircle, FileText, Code, Shield, Wallet, LayoutGrid, X, Link2, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function MerchantSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const [merchant, setMerchant] = useState(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'gateway_merchants', user.uid)).then(snap => {
      setMerchant(snap.exists() ? snap.data() : {});
    });
  }, [user]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const isVerified = merchant?.verificationStatus === 'approved';
  const isPending = merchant?.verificationStatus === 'pending';

  const menuItems = [
    { title: 'Dashboard',        icon: Layout,      path: '/dashboard',       requireVerification: false },
    { title: 'Liens de paiement',icon: Link2,       path: '/payment-links',   requireVerification: true },
    { title: 'Providers',        icon: Key,         path: '/providers',       requireVerification: true },
    { title: 'Transactions',     icon: CreditCard,  path: '/transactions',    requireVerification: true },
    { title: 'Retraits',         icon: Wallet,      path: '/payouts',         requireVerification: true },
    { title: 'Équipe',           icon: Users,       path: '/team',            requireVerification: true },
    { title: 'Développeur',      icon: Code,        path: '/developer',       requireVerification: true },
    { title: 'Paramètres',       icon: Settings,    path: '/settings',        requireVerification: false },
  ];

  // Bottom nav shows first 4 items + the grid button at the end
  const bottomItems = menuItems.slice(0, 4);

  const renderNavItem = (item, { compact = false, onClick } = {}) => {
    const isActive = location.pathname === item.path;
    const isDisabled = item.requireVerification && !isVerified;
    const Icon = item.icon;

    if (isDisabled) {
      return (
        <div key={item.path}
          className={`flex ${compact ? 'flex-col gap-0.5 px-3 py-2 text-xs' : 'items-center gap-3 px-3 py-2.5 text-sm'} font-medium text-gray-300 opacity-40 cursor-not-allowed select-none ${compact ? 'items-center' : ''}`}>
          <Icon size={compact ? 20 : 20} />
          <span className={compact ? 'truncate max-w-[60px]' : ''}>{item.title}</span>
          {!compact && <span className="ml-auto text-xs text-gray-400">🔒</span>}
        </div>
      );
    }

    return (
      <Link key={item.path} to={item.path} onClick={onClick}
        className={`flex ${compact ? 'flex-col gap-0.5 px-3 py-2 text-xs' : 'items-center gap-3 px-3 py-2.5 rounded-xl text-sm'} font-medium transition-all
          ${isActive
            ? compact ? 'text-orange-500' : 'bg-orange-500 text-white'
            : compact ? 'text-gray-400' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          } ${compact ? 'items-center' : ''}`}>
        <Icon size={20} />
        <span className={compact ? 'truncate max-w-[60px]' : ''}>{item.title}</span>
      </Link>
    );
  };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className={`hidden lg:flex flex-col fixed left-0 top-16 bottom-0 bg-white border-r border-gray-200 z-30 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all z-10">
          <span className="text-gray-600 text-xs">{collapsed ? '→' : '←'}</span>
        </button>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1 mt-2">
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            const isDisabled = item.requireVerification && !isVerified;
            const Icon = item.icon;

            if (isDisabled) {
              return (
                <div key={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium opacity-40 cursor-not-allowed select-none ${collapsed ? 'justify-center' : ''}`}>
                  <Icon size={20} className="text-gray-400" />
                  {!collapsed && <span className="text-gray-400">{item.title}</span>}
                  {!collapsed && <span className="ml-auto text-xs text-gray-400">🔒</span>}
                </div>
              );
            }

            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}
                  ${collapsed ? 'justify-center' : ''}`}>
                <Icon size={20} />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}

          {!isVerified && (
            <Link to="/verification"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${location.pathname === '/verification' ? 'bg-amber-50 text-amber-900' : 'text-amber-600 hover:bg-amber-50'}
                ${collapsed ? 'justify-center' : ''}`}>
              <Shield size={20} />
              {!collapsed && <span>Vérification</span>}
              {!collapsed && isPending && <span className="ml-auto w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <a href="/help" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <HelpCircle size={20} />
            {!collapsed && <span>Aide</span>}
          </a>
          <a href="/api-documentation" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <FileText size={20} />
            {!collapsed && <span>Documentation API</span>}
          </a>
          <button onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all w-full mt-1">
            <LogOut size={20} />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="flex items-center justify-around h-16">
          {/* 4 premiers items */}
          {bottomItems.map(item => renderNavItem(item, { compact: true }))}

          {/* Bouton grille — ouvre le drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-all ${drawerOpen ? 'text-orange-500' : 'text-gray-400'}`}>
            <LayoutGrid size={20} />
            <span className="truncate max-w-[60px]">Menu</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer (rideau depuis la gauche) ── */}
      {/* Overlay */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header du drawer */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <span className="font-bold text-gray-900 text-base">Navigation</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-all">
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Menu complet */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            const isDisabled = item.requireVerification && !isVerified;
            const Icon = item.icon;

            if (isDisabled) {
              return (
                <div key={item.path}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium opacity-40 cursor-not-allowed select-none">
                  <Icon size={20} className="text-gray-400" />
                  <span className="text-gray-400">{item.title}</span>
                  <span className="ml-auto text-xs text-gray-400">🔒</span>
                </div>
              );
            }

            return (
              <Link key={item.path} to={item.path}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                <Icon size={20} />
                <span>{item.title}</span>
              </Link>
            );
          })}

          {/* Vérification */}
          {!isVerified && (
            <Link to="/verification"
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${location.pathname === '/verification' ? 'bg-amber-50 text-amber-900' : 'text-amber-600 hover:bg-amber-50'}`}>
              <Shield size={20} />
              <span>Vérification</span>
              {isPending && <span className="ml-auto w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
            </Link>
          )}
        </nav>

        {/* Footer du drawer */}
        <div className="p-3 border-t border-gray-100 space-y-1">
          <a href="/help" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <HelpCircle size={20} />
            <span>Aide</span>
          </a>
          <a href="/api-documentation" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <FileText size={20} />
            <span>Documentation API</span>
          </a>
          <button onClick={() => { setDrawerOpen(false); logout(); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all w-full">
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </>
  );
}