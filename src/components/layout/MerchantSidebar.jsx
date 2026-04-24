import { Link, useLocation } from 'react-router-dom';
import { Layout, CreditCard, Settings, Key, LogOut, HelpCircle, FileText, Code } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function MerchantSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { title: 'Dashboard', icon: Layout, path: '/dashboard' },
    { title: 'Providers', icon: Key, path: '/providers' },
    { title: 'Transactions', icon: CreditCard, path: '/transactions' },
    { title: 'Développeur', icon: Code, path: '/developer' },
    { title: 'Paramètres', icon: Settings, path: '/settings' }
  ];

  return (
    <>
      <aside className={`hidden lg:flex flex-col fixed left-0 top-16 bottom-0 bg-white border-r border-gray-200 z-30 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
        <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all z-10">
          {collapsed ? <span className="text-gray-600 text-xs">→</span> : <span className="text-gray-600 text-xs">←</span>}
        </button>
        
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 mt-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'} ${collapsed ? 'justify-center' : ''}`}>
                <Icon size={20} />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
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
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all w-full mt-1">
            <LogOut size={20} />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="flex items-center justify-around h-16">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
                <Icon size={20} />
                <span className="truncate max-w-[60px]">{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}