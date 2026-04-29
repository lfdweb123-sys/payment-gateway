// src/pages/gateway/Team.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Clock,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Key,
  Calendar,
  Activity,
  Crown,
  UserMinus,
  RefreshCw,
  Settings,
  Eye,
  Edit2
} from 'lucide-react';

const ROLES = [
  { id: 'admin', name: 'Administrateur', description: 'Accès complet, peut gérer l\'équipe et les paramètres', permissions: ['all'] },
  { id: 'manager', name: 'Gestionnaire', description: 'Gère les transactions, les paiements et les providers', permissions: ['transactions', 'payments', 'providers'] },
  { id: 'viewer', name: 'Consultant', description: 'Consultation uniquement (dashboard, transactions, rapports)', permissions: ['view'] },
  { id: 'support', name: 'Support', description: 'Gère les litiges et le support client', permissions: ['disputes', 'support'] }
];

function PermissionBadge({ permission }) {
  const labels = {
    all: 'Accès complet',
    transactions: 'Transactions',
    payments: 'Paiements',
    providers: 'Providers',
    view: 'Consultation',
    disputes: 'Litiges',
    support: 'Support'
  };
  
  return (
    <span style={{
      fontSize: 9,
      padding: '2px 8px',
      borderRadius: 20,
      background: '#f1f5f9',
      color: '#475569',
      fontWeight: 500
    }}>
      {labels[permission] || permission}
    </span>
  );
}

function RoleBadge({ roleId }) {
  const config = {
    admin: { bg: '#fef3c7', color: '#d97706', icon: Crown },
    manager: { bg: '#eff6ff', color: '#2563eb', icon: Settings },
    viewer: { bg: '#f0fdf4', color: '#16a34a', icon: Eye },
    support: { bg: '#fdf4ff', color: '#a855f7', icon: Activity }
  };
  
  const cfg = config[roleId] || config.viewer;
  const Icon = cfg.icon;
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 10px',
      borderRadius: 20,
      background: cfg.bg,
      color: cfg.color,
      fontSize: 11,
      fontWeight: 600
    }}>
      <Icon size={12} />
      {ROLES.find(r => r.id === roleId)?.name || roleId}
    </span>
  );
}

function InviteModal({ isOpen, onClose, onInvite, loading }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Email requis');
      return;
    }
    if (!email.includes('@')) {
      setError('Email invalide');
      return;
    }
    setError('');
    await onInvite(email, role);
    setEmail('');
    setRole('viewer');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        background: '#fff',
        borderRadius: 24,
        width: '90%',
        maxWidth: 450,
        padding: 24,
        animation: 'fadeUp 0.2s ease'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserPlus size={18} color="#16a34a" />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>Inviter un membre</h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Ajoutez un collaborateur à votre équipe</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            color: '#94a3b8'
          }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 6, display: 'block' }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="collaborateur@exemple.com"
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 36px',
                  border: error ? '1px solid #ef4444' : '1px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border-color 0.15s'
                }}
                onFocus={e => e.target.style.borderColor = '#f97316'}
              />
            </div>
            {error && <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>{error}</p>}
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', marginBottom: 6, display: 'block' }}>
              Rôle
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROLES.map(r => (
                <label key={r.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  border: role === r.id ? '2px solid #f97316' : '1px solid #e2e8f0',
                  borderRadius: 12,
                  cursor: 'pointer',
                  background: role === r.id ? '#fff7ed' : '#fff',
                  transition: 'all 0.15s'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value={r.id}
                    checked={role === r.id}
                    onChange={() => setRole(r.id)}
                    style={{ marginRight: 12 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{r.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#f97316',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {loading ? <RefreshCw size={16} className="spin" /> : <UserPlus size={16} />}
            {loading ? 'Invitation en cours...' : 'Envoyer l\'invitation'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditRoleModal({ isOpen, onClose, member, onUpdateRole, loading }) {
  const [role, setRole] = useState(member?.role || 'viewer');

  useEffect(() => {
    if (member) setRole(member.role);
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onUpdateRole(member.id, role);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        background: '#fff',
        borderRadius: 24,
        width: '90%',
        maxWidth: 400,
        padding: 24,
        animation: 'fadeUp 0.2s ease'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>Modifier le rôle</h3>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{member.email}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
            <X size={18} color="#94a3b8" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            {ROLES.map(r => (
              <label key={r.id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: role === r.id ? '2px solid #f97316' : '1px solid #e2e8f0',
                borderRadius: 12,
                cursor: 'pointer',
                background: role === r.id ? '#fff7ed' : '#fff',
                marginBottom: 8
              }}>
                <input
                  type="radio"
                  name="editRole"
                  value={r.id}
                  checked={role === r.id}
                  onChange={() => setRole(r.id)}
                  style={{ marginRight: 12 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{r.description}</div>
                </div>
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || role === member.role}
            style={{
              width: '100%',
              padding: '12px',
              background: '#f97316',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: (loading || role === member.role) ? 'not-allowed' : 'pointer',
              opacity: (loading || role === member.role) ? 0.6 : 1
            }}
          >
            {loading ? <RefreshCw size={16} className="spin" /> : 'Mettre à jour'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, memberName, loading }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        background: '#fff',
        borderRadius: 24,
        width: '90%',
        maxWidth: 380,
        padding: 24,
        textAlign: 'center',
        animation: 'fadeUp 0.2s ease'
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          background: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <UserMinus size={22} color="#dc2626" />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
          Retirer {memberName} ?
        </h3>
        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>
          Cette action est irréversible. Le membre perdra immédiatement l'accès à votre compte.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px',
              background: '#dc2626',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#fff',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? <RefreshCw size={14} className="spin" /> : 'Retirer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    if (user) loadTeamMembers();
  }, [user]);

  const loadTeamMembers = async () => {
    setLoading(true);
    try {
      const teamRef = collection(db, 'gateway_merchant_teams');
      const q = query(teamRef, where('merchantId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const members = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        // Récupérer les infos de l'utilisateur invité
        let userInfo = { email: data.email, displayName: data.email.split('@')[0] };
        try {
          const userDoc = await getDoc(doc(db, 'users', data.userId));
          if (userDoc.exists()) {
            userInfo = { ...userInfo, ...userDoc.data() };
          }
        } catch (e) { console.error(e); }
        
        members.push({
          id: docSnap.id,
          userId: data.userId,
          email: data.email,
          role: data.role,
          invitedBy: data.invitedBy,
          invitedAt: data.invitedAt?.toDate(),
          status: data.status,
          ...userInfo
        });
      }
      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (email, role) => {
    setInviteLoading(true);
    try {
      // Vérifier si l'utilisateur existe dans la plateforme
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      
      let userId = null;
      if (!snapshot.empty) {
        userId = snapshot.docs[0].id;
      } else {
        // Créer un compte utilisateur invité
        userId = `pending_${Date.now()}`;
      }

      const teamRef = doc(collection(db, 'gateway_merchant_teams'));
      await setDoc(teamRef, {
        merchantId: user.uid,
        userId: userId,
        email: email,
        role: role,
        invitedBy: user.uid,
        invitedAt: new Date(),
        status: userId.startsWith('pending_') ? 'pending' : 'active'
      });

      // Envoyer l'invitation par email (à implémenter avec votre service d'email)
      console.log(`Invitation envoyée à ${email} avec le rôle ${role}`);
      
      await loadTeamMembers();
    } catch (error) {
      console.error('Error inviting member:', error);
      alert('Erreur lors de l\'invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    setUpdateLoading(true);
    try {
      const memberRef = doc(db, 'gateway_merchant_teams', memberId);
      await updateDoc(memberRef, { role: newRole });
      await loadTeamMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Erreur lors de la mise à jour du rôle');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    setRemoveLoading(true);
    try {
      const memberRef = doc(db, 'gateway_merchant_teams', selectedMember.id);
      await deleteDoc(memberRef);
      await loadTeamMembers();
      setConfirmModalOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Erreur lors du retrait du membre');
    } finally {
      setRemoveLoading(false);
    }
  };

  const owner = {
    name: user?.displayName?.split(' ')[0] || user?.email?.split('@')[0],
    email: user?.email,
    role: 'admin'
  };

  const activeMembers = teamMembers.filter(m => m.status !== 'pending');
  const pendingMembers = teamMembers.filter(m => m.status === 'pending');

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px 80px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>
        {`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          .spin { animation: spin 0.7s linear infinite; }
          .team-row:hover { background: #fafafa !important; }
          @media (max-width: 640px) {
            .team-header { display: none !important; }
            .team-card { display: block !important; }
            .team-desktop { display: none !important; }
          }
          .team-card { display: none; }
          .team-desktop { display: block; }
        `}
      </style>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
        flexWrap: 'wrap',
        gap: 12,
        animation: 'fadeUp 0.3s ease'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Users size={24} color="#f97316" />
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-.02em' }}>
              Équipe
            </h1>
          </div>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
            Gérez les accès et permissions de votre équipe
          </p>
        </div>
        <button
          onClick={() => setInviteModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            background: '#f97316',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#ea580c'}
          onMouseLeave={e => e.currentTarget.style.background = '#f97316'}
        >
          <UserPlus size={16} />
          Inviter un membre
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
        marginBottom: 28,
        animation: 'fadeUp 0.3s ease 0.05s both'
      }}>
        <div style={{
          background: '#fff',
          border: '1px solid #f0f0f0',
          borderRadius: 16,
          padding: '16px 20px'
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
            Propriétaire
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>1</div>
        </div>
        <div style={{
          background: '#fff',
          border: '1px solid #f0f0f0',
          borderRadius: 16,
          padding: '16px 20px'
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
            Membres actifs
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{activeMembers.length}</div>
        </div>
        <div style={{
          background: '#fff',
          border: '1px solid #f0f0f0',
          borderRadius: 16,
          padding: '16px 20px'
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>
            Invitations en attente
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{pendingMembers.length}</div>
        </div>
      </div>

      {/* Team list */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        border: '1px solid #f0f0f0',
        overflow: 'hidden',
        animation: 'fadeUp 0.3s ease 0.1s both'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f8fafc' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Membres de l'équipe
          </h3>
        </div>

        {/* Header Desktop */}
        <div className="team-header" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 160px 120px 100px',
          padding: '8px 24px',
          gap: 12,
          fontSize: 10,
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          borderBottom: '1px solid #f8fafc',
          background: '#fafafa'
        }}>
          <span>Membre</span>
          <span>Rôle</span>
          <span>Invitation</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <RefreshCw size={24} className="spin" color="#f97316" />
          </div>
        ) : (
          <>
            {/* Propriétaire */}
            <div className="team-desktop team-row" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 160px 120px 100px',
              padding: '14px 24px',
              gap: 12,
              alignItems: 'center',
              borderBottom: '1px solid #f8fafc',
              background: '#fffaf5'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Crown size={16} color="#d97706" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{owner.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{owner.email}</div>
                </div>
              </div>
              <div>
                <RoleBadge roleId="admin" />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Propriétaire</div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>
              </div>
            </div>

            {/* Version mobile propriétaire */}
            <div className="team-card" style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f8fafc',
              background: '#fffaf5'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Crown size={18} color="#d97706" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{owner.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{owner.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 52 }}>
                <RoleBadge roleId="admin" />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Propriétaire</span>
              </div>
            </div>

            {/* Membres */}
            {activeMembers.map((member, idx) => (
              <div key={member.id}>
                <div className="team-desktop team-row" style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px 120px 100px',
                  padding: '14px 24px',
                  gap: 12,
                  alignItems: 'center',
                  borderBottom: idx === activeMembers.length - 1 ? 'none' : '1px solid #f8fafc'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Mail size={16} color="#64748b" />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {member.displayName || member.email.split('@')[0]}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{member.email}</div>
                    </div>
                  </div>
                  <div>
                    <RoleBadge roleId={member.role} />
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {member.invitedAt ? new Date(member.invitedAt).toLocaleDateString('fr-FR') : '-'}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setEditModalOpen(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 6,
                        borderRadius: 6,
                        color: '#64748b'
                      }}
                      title="Modifier le rôle"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setConfirmModalOpen(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 6,
                        borderRadius: 6,
                        color: '#ef4444'
                      }}
                      title="Retirer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Version mobile membre */}
                <div className="team-card" style={{
                  padding: '14px 16px',
                  borderBottom: idx === activeMembers.length - 1 ? 'none' : '1px solid #f8fafc'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Mail size={18} color="#64748b" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        {member.displayName || member.email.split('@')[0]}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{member.email}</div>
                    </div>
                  </div>
                  <div style={{ paddingLeft: 52, marginBottom: 8 }}>
                    <RoleBadge roleId={member.role} />
                  </div>
                  <div style={{ paddingLeft: 52, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      Invité le {member.invitedAt ? new Date(member.invitedAt).toLocaleDateString('fr-FR') : '-'}
                    </span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setEditModalOpen(true);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setConfirmModalOpen(true);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Invitations en attente */}
            {pendingMembers.length > 0 && (
              <>
                <div style={{ padding: '16px 24px', background: '#fafafa', borderTop: '1px solid #f8fafc', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={14} color="#d97706" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#d97706' }}>Invitations en attente</span>
                  </div>
                </div>
                {pendingMembers.map(member => (
                  <div key={member.id} className="team-desktop" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 160px 120px 100px',
                    padding: '14px 24px',
                    gap: 12,
                    alignItems: 'center',
                    borderBottom: '1px solid #f8fafc',
                    opacity: 0.7
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Clock size={16} color="#d97706" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{member.email}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Invitation envoyée</div>
                      </div>
                    </div>
                    <div>
                      <RoleBadge roleId={member.role} />
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {member.invitedAt ? new Date(member.invitedAt).toLocaleDateString('fr-FR') : '-'}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setConfirmModalOpen(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 6,
                          color: '#ef4444'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {!loading && activeMembers.length === 0 && pendingMembers.length === 0 && (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Users size={28} color="#cbd5e1" />
            </div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              Aucun membre dans votre équipe
            </p>
            <button
              onClick={() => setInviteModalOpen(true)}
              style={{
                background: '#f97316',
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Inviter un premier membre
            </button>
          </div>
        )}
      </div>

      {/* Modales */}
      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvite={handleInvite}
        loading={inviteLoading}
      />
      
      <EditRoleModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onUpdateRole={handleUpdateRole}
        loading={updateLoading}
      />
      
      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setSelectedMember(null);
        }}
        onConfirm={handleRemoveMember}
        memberName={selectedMember?.email?.split('@')[0] || ''}
        loading={removeLoading}
      />
    </div>
  );
}