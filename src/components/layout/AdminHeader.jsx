import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, ArrowLeft, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-gray-900 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center"><Shield size={16} className="text-white"/></div>
          <span className="text-sm font-semibold text-white hidden sm:block">Administration</span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"><ArrowLeft size={14}/> Retour au site</Link>

        <div className="relative">
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 p-1.5 hover:bg-gray-800 rounded-lg">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center"><span className="text-xs font-bold text-white">{user?.displayName?.charAt(0)||'A'}</span></div>
            <span className="hidden sm:block text-sm text-gray-300">{user?.displayName?.split(' ')[0]||'Admin'}</span>
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}></div>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                <div className="px-4 py-3 border-b border-gray-100"><p className="text-sm font-medium">{user?.displayName||'Admin'}</p></div>
                <button onClick={logout} className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"><LogOut size={16}/> Déconnexion</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}