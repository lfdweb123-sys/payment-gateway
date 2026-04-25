import { Link, useLocation } from 'react-router-dom';
import { Layout, Users, Shield, DollarSign, ArrowLeft, LogOut, FileText } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { title: 'Dashboard', icon: Layout, path: '/admin' },
    { title: 'Marchands', icon: Users, path: '/admin/merchants' },
    { title: 'Vérifications', icon: Shield, path: '/admin/verifications' },
    { title: 'Transactions', icon: FileText, path: '/admin/transactions' },
    { title: 'Commissions', icon: DollarSign, path: '/admin/commissions' }
  ];

  return (
    <aside className={`hidden lg:flex flex-col fixed left-0 top-16 bottom-0 bg-gray-900 text-white z-30 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm z-10">
        {collapsed ? <span className="text-gray-600 text-xs">→</span> : <span className="text-gray-600 text-xs">←</span>}
      </button>

      <div className={`p-5 border-b border-gray-800 ${collapsed ? 'text-center' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0"><Shield size={16} className="text-white"/></div>
          {!collapsed && <div><p className="text-sm font-bold">Admin</p><p className="text-xs text-gray-400">Paiement Pro</p></div>}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'} ${collapsed ? 'justify-center' : ''}`}>
              <Icon size={20} /> {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all">
          <ArrowLeft size={16}/> {!collapsed && <span>Retour au site</span>}
        </Link>
        {!collapsed && (
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all w-full mt-1">
            <LogOut size={18} /> Déconnexion
          </button>
        )}
      </div>
    </aside>
  );
}