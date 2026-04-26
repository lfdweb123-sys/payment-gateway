import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Globe, Bell, LogOut, Settings, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function MerchantHeader() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [imgError, setImgError]           = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const notifRef                          = useRef(null);
  const prevCountRef                      = useRef(0);

  // ── Écoute temps réel des 15 dernières transactions ───────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'gateway_transactions'),
      where('merchantId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(15)
    );

    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(txs);

      // Compter les non-lues depuis la dernière ouverture
      const lastSeen = parseInt(localStorage.getItem(`notif_seen_${user.uid}`) || '0');
      const newOnes  = txs.filter(tx => {
        const ts = tx.completedAt || tx.failedAt || tx.createdAt;
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

  // ── Fermer le panel notifs en cliquant ailleurs ───────────────────────────
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
      // Marquer comme lues
      localStorage.setItem(`notif_seen_${user.uid}`, Date.now().toString());
      setUnreadCount(0);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function StatusIcon({ status }) {
    if (status === 'completed') return <CheckCircle size={13} style={{ color: '#16a34a', flexShrink: 0 }} />;
    if (status === 'failed')    return <XCircle     size={13} style={{ color: '#dc2626', flexShrink: 0 }} />;
    return                             <Clock       size={13} style={{ color: '#d97706', flexShrink: 0 }} />;
  }

  function statusStyle(status) {
    if (status === 'completed') return { label: 'Réussi',   bg: '#f0fdf4', color: '#16a34a' };
    if (status === 'failed')    return { label: 'Échoué',   bg: '#fef2f2', color: '#dc2626' };
    return                             { label: 'En cours', bg: '#fffbeb', color: '#d97706' };
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'À l\'instant';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}j`;
  }

  // ── Avatar ────────────────────────────────────────────────────────────────
  const Avatar = ({ size = 'w-7 h-7', textSize = 'text-xs' }) => {
    if (user?.photoURL && !imgError) {
      return (
        <img
          src={user.photoURL}
          alt={user.displayName || 'avatar'}
          onError={() => setImgError(true)}
          className={`${size} rounded-lg object-cover`}
        />
      );
    }
    return (
      <div className={`${size} bg-orange-500 rounded-lg flex items-center justify-center`}>
        <span className={`${textSize} font-bold text-white`}>
          {user?.displayName?.charAt(0)?.toUpperCase() || 'M'}
        </span>
      </div>
    );
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">

      {/* Logo */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Globe size={16} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Payment Gateway</span>
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">

        {/* ── Bouton notifications ─────────────────────────────────────────── */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={handleNotifOpen}
            style={{
              position: 'relative', padding: 8, borderRadius: 10,
              border: 'none', cursor: 'pointer',
              background: notifOpen ? '#FFF3EA' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .15s',
            }}
          >
            <Bell size={18} color={notifOpen ? '#FF6B00' : '#6b7280'} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                minWidth: 16, height: 16, borderRadius: 999,
                background: '#EF4444', color: '#fff',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', border: '2px solid #fff',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* ── Panel notifications ── */}
          {notifOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              width: 320, background: '#fff',
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
                  Notifications
                </span>
                {notifications.length > 0 && (
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>
                    {notifications.length} transaction{notifications.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Liste */}
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <Bell size={24} color="#e2e8f0" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>
                      Aucune transaction pour l'instant
                    </span>
                  </div>
                ) : (
                  notifications.map(tx => {
                    const s  = statusStyle(tx.status);
                    const ts = tx.completedAt || tx.failedAt || tx.createdAt;
                    return (
                      <div
                        key={tx.id}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f8fafc',
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          cursor: 'default', transition: 'background .1s',
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
                          <StatusIcon status={tx.status} />
                        </div>

                        {/* Contenu */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', gap: 8,
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                              {Number(tx.amount || 0).toLocaleString('fr-FR')} {tx.currency || 'XOF'}
                            </span>
                            <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                              {timeAgo(ts)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              color: s.color, background: s.bg,
                              padding: '1px 6px', borderRadius: 4,
                            }}>
                              {s.label}
                            </span>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                              {tx.method?.replace(/_/g, ' ')} · {tx.country?.toUpperCase()}
                            </span>
                          </div>
                          {tx.providerRef && (
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>
                              Réf: {tx.providerRef}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid #f1f5f9', padding: '10px 16px' }}>
                <Link
                  to="/transactions"
                  onClick={() => setNotifOpen(false)}
                  style={{
                    fontSize: 12, fontWeight: 600, color: '#FF6B00',
                    textDecoration: 'none', display: 'block', textAlign: 'center',
                  }}
                >
                  Voir toutes les transactions →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Avatar + dropdown ─────────────────────────────────────────────── */}
        <div className="relative">
          <button
            onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false); }}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Avatar />
            <span className="hidden sm:block text-sm text-gray-700">
              {user?.displayName?.split(' ')[0] || 'Marchand'}
            </span>
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                  <Avatar size="w-9 h-9" textSize="text-sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.displayName || 'Marchand'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings size={16} /> Paramètres
                </Link>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                  >
                    <LogOut size={16} /> Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
}