import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, ArrowLeft, LogOut } from 'lucide-react';
import { useState } from 'react';

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Initiales de secours
  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'A').toUpperCase();

  // Photo Firebase : photoURL (Google, GitHub, etc.)
  const photoURL = user?.photoURL;

  return (
    <header className="h-16 bg-gray-900 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white"/>
          </div>
          <span className="text-sm font-semibold text-white hidden sm:block">Administration</span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/dashboard"
          className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={14}/> Retour au site
        </Link>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-800 rounded-lg transition-all">

            {/* Avatar : photo réelle ou initiales */}
            {photoURL && !imgError ? (
              <img
                src={photoURL}
                alt={user?.displayName || 'Admin'}
                onError={() => setImgError(true)}
                className="w-7 h-7 rounded-lg object-cover ring-2 ring-orange-500/40"
              />
            ) : (
              <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
            )}

            <span className="hidden sm:block text-sm text-gray-300">
              {user?.displayName?.split(' ')[0] || 'Admin'}
            </span>
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}/>
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden">

                {/* Infos utilisateur */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                  {photoURL && !imgError ? (
                    <img
                      src={photoURL}
                      alt={user?.displayName || 'Admin'}
                      onError={() => setImgError(true)}
                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white">{initials}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user?.displayName || 'Admin'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                </div>

                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full transition-colors">
                  <LogOut size={16}/> Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}