import { Link, useLocation } from 'react-router-dom';
import { Layout, Users, Shield, DollarSign, ArrowLeft, LogOut, FileText, LayoutGrid, X, Wallet, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { title: 'Dashboard',     icon: Layout,    path: '/admin' },
    { title: 'Marchands',     icon: Users,     path: '/admin/merchants' },
    { title: 'Vérifications', icon: Shield,    path: '/admin/verifications' },
    { title: 'Transactions',  icon: FileText,  path: '/admin/transactions' },
    { title: 'Commissions',   icon: DollarSign,path: '/admin/commissions' },
    { title: 'Retraits',      icon: Wallet,    path: '/admin/payouts' },
    { title: 'Logs',          icon: Activity,  path: '/admin/logs' },
  ];

  const bottomItems = menuItems.slice(0, 4);

  const isActive = (path) =>
    path === '/admin' ? location.pathname === '/admin' : location.pathname === path;

  return (
    <>
      <aside className={`hidden lg:flex flex-col fixed left-0 top-16 bottom-0 bg-gray-900 text-white z-30 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm z-10">
          <span className="text-gray-600 text-xs">{collapsed ? '→' : '←'}</span>
        </button>

        <div className={`p-5 border-b border-gray-800 ${collapsed ? 'text-center' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={16} className="text-white"/>
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-bold">Admin</p>
                <p className="text-xs text-gray-400">Paiement Pro</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive(item.path) ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'} ${collapsed ? 'justify-center' : ''}`}>
                <Icon size={20}/>
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <Link to="/dashboard"
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all">
            <ArrowLeft size={16}/>
            {!collapsed && <span>Retour au site</span>}
          </Link>
          {!collapsed && (
            <button onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all w-full mt-1">
              <LogOut size={18}/> Déconnexion
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile bottom navigation ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-30">
        <div className="flex items-center justify-around h-16">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-all ${active ? 'text-orange-500' : 'text-gray-500'}`}>
                <Icon size={20}/>
                <span className="truncate max-w-[60px]">{item.title}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-all ${drawerOpen ? 'text-orange-500' : 'text-gray-500'}`}>
            <LayoutGrid size={20}/>
            <span className="truncate max-w-[60px]">Menu</span>
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}/>
      )}

      <div className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-gray-900 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white"/>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Admin</p>
              <p className="text-xs text-gray-400">Paiement Pro</p>
            </div>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 transition-all">
            <X size={16} className="text-gray-400"/>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path} onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                <Icon size={20}/>
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-1">
          <Link to="/dashboard" onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all">
            <ArrowLeft size={16}/>
            <span>Retour au site</span>
          </Link>
          <button onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all w-full">
            <LogOut size={18}/>
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </>
  );
}