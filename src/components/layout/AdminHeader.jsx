import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, ArrowLeft, LogOut, Bell, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const prevCountRef = useRef(0);

  // Initiales de secours
  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'A').toUpperCase();

  // Photo Firebase
  const photoURL = user?.photoURL;

  // ── Écoute temps réel des logs récents pour les notifications ──
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'gateway_logs'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(logs);

      // Compter les non-lues
      const lastSeen = parseInt(localStorage.getItem(`admin_notif_seen_${user.uid}`) || '0');
      const newOnes = logs.filter(log => {
        const ts = log.timestamp;
        return new Date(ts).getTime() > lastSeen;
      });
      setUnreadCount(newOnes.length);

      // Son discret si nouveau
      if (newOnes.length > prevCountRef.current) {
        try { new Audio('/notification.mp3').play().catch(() => {}); } catch {}
      }
      prevCountRef.current = newOnes.length;
    });

    return () => unsub();
  }, [user?.uid]);

  // ── Fermer le panel notifs en cliquant ailleurs ──
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleNotifOpen = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    setDropdownOpen(false);
    if (opening) {
      localStorage.setItem(`admin_notif_seen_${user.uid}`, Date.now().toString());
      setUnreadCount(0);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  // ── Helpers pour les notifications ──
  function LevelIcon({ level }) {
    if (level === 'ERROR') return <XCircle size={13} style={{ color: '#dc2626', flexShrink: 0 }} />;
    if (level === 'WARN') return <Clock size={13} style={{ color: '#d97706', flexShrink: 0 }} />;
    if (level === 'INFO') return <CheckCircle size={13} style={{ color: '#16a34a', flexShrink: 0 }} />;
    return <Activity size={13} style={{ color: '#7c3aed', flexShrink: 0 }} />;
  }

  function levelStyle(level) {
    if (level === 'ERROR') return { label: 'ERREUR', bg: '#fef2f2', color: '#dc2626' };
    if (level === 'WARN') return { label: 'AVERTISSEMENT', bg: '#fffbeb', color: '#d97706' };
    if (level === 'INFO') return { label: 'INFO', bg: '#eff6ff', color: '#2563eb' };
    return { label: 'DEBUG', bg: '#f5f3ff', color: '#7c3aed' };
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'À l\'instant';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}j`;
  }

  return (
    <header className="h-16 bg-gray-900 flex items-center justify-between px-4 sm:px-6 fixed top-0 left-0 right-0 z-50 shadow-lg">
      
      {/* Logo */}
      <div className="flex items-center gap-4">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white"/>
          </div>
          <span className="text-sm font-semibold text-white hidden sm:block">Administration</span>
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">

        {/* ── Bouton notifications ── */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={handleNotifOpen}
            style={{
              position: 'relative', padding: 8, borderRadius: 10,
              border: 'none', cursor: 'pointer',
              background: notifOpen ? 'rgba(255,107,0,0.1)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s',
            }}
          >
            <Bell size={18} color={notifOpen ? '#FF6B00' : '#9ca3af'} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                minWidth: 16, height: 16, borderRadius: 999,
                background: '#EF4444', color: '#fff',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', border: '2px solid #1f2937',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* ── Panel notifications ── */}
          {notifOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 360, background: '#fff',
              border: '1px solid #e5e7eb', borderRadius: 16,
              boxShadow: '0 16px 48px rgba(0,0,0,.12)',
              zIndex: 50, overflow: 'hidden',
            }}>
              {/* Header panel */}
              <div style={{
                padding: '14px 16px 12px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  Logs récents
                </span>
                {notifications.length > 0 && (
                  <Link to="/admin/logs" onClick={() => setNotifOpen(false)} style={{ fontSize: 11, color: '#f97316', textDecoration: 'none' }}>
                    Voir tous →
                  </Link>
                )}
              </div>

              {/* Liste */}
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <Bell size={24} color="#e2e8f0" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>
                      Aucun log récent
                    </span>
                  </div>
                ) : (
                  notifications.map(log => {
                    const s = levelStyle(log.level);
                    return (
                      <Link
                        key={log.id}
                        to="/admin/logs"
                        onClick={() => setNotifOpen(false)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f8fafc',
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          cursor: 'pointer', transition: 'background .1s',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Icône */}
                        <div style={{
                          width: 32, height: 32, borderRadius: 9,
                          background: s.bg, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <LevelIcon level={log.level} />
                        </div>

                        {/* Contenu */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', gap: 8,
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>
                              {s.label}
                            </span>
                            <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                              {timeAgo(log.timestamp)}
                            </span>
                          </div>
                          <div style={{ marginTop: 3 }}>
                            <span style={{ fontSize: 12, color: '#475569' }}>
                              {log.message?.substring(0, 60) || '—'}
                              {log.message?.length > 60 ? '…' : ''}
                            </span>
                          </div>
                          {log.source && (
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                              Source: {log.source}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bouton retour au site */}
        <Link to="/dashboard"
          className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-800">
          <ArrowLeft size={14}/> Retour
        </Link>

        {/* ── Avatar + dropdown ── */}
        <div className="relative">
          <button
            onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-800 rounded-lg transition-all"
          >
            {/* Avatar */}
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