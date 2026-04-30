// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db, googleProvider } from '../services/firebase';

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Données utilisateur
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : { role: 'user' };

          // 2. Compte marchand propre
          const merchantDoc  = await getDoc(doc(db, 'gateway_merchants', firebaseUser.uid));
          const merchantData = merchantDoc.exists() ? merchantDoc.data() : null;

          // 3. Détection membre d'équipe
          // Si l'utilisateur n'est pas propriétaire d'un compte marchand,
          // on cherche s'il est membre d'une équipe (status = active).
          let teamMembership = null;
          if (!merchantDoc.exists()) {
            try {
              const teamQuery = query(
                collection(db, 'gateway_merchant_teams'),
                where('userId', '==', firebaseUser.uid),
                where('status',  '==', 'active')
              );
              const teamSnap = await getDocs(teamQuery);
              if (!teamSnap.empty) {
                const teamData = teamSnap.docs[0].data();
                // Charger le document du marchand propriétaire
                const ownerMerchantDoc = await getDoc(doc(db, 'gateway_merchants', teamData.merchantId));
                teamMembership = {
                  teamId:             teamSnap.docs[0].id,
                  merchantId:         teamData.merchantId,
                  role:               teamData.role,
                  merchantData:       ownerMerchantDoc.exists() ? ownerMerchantDoc.data() : {}
                };
              }
            } catch (e) {
              // Erreur de permissions possible si les règles ne couvrent pas ce cas
              console.warn('Impossible de charger le membership équipe :', e.message);
            }
          }

          setUser({
            ...firebaseUser,
            ...userData,
            // Compte marchand propre (null si membre invité)
            merchant: merchantData,
            // Membership équipe (null si propriétaire ou pas de compte)
            teamMembership,
            // Raccourcis pratiques
            isTeamMember:      !!teamMembership && !merchantDoc.exists(),
            // merchantId effectif : le sien ou celui du propriétaire
            effectiveMerchantId: merchantDoc.exists()
              ? firebaseUser.uid
              : teamMembership?.merchantId || null,
            // merchantData effectif : le sien ou celui du propriétaire
            effectiveMerchantData: merchantDoc.exists()
              ? merchantData
              : teamMembership?.merchantData || null,
            // Rôle dans l'équipe (null si propriétaire)
            teamRole: teamMembership?.role || null,
          });
        } catch (error) {
          console.error('Erreur chargement user :', error);
          setUser({ ...firebaseUser, role: 'user', merchant: null, teamMembership: null, isTeamMember: false, effectiveMerchantId: null, effectiveMerchantData: null, teamRole: null });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    try {
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', result.user.uid), {
          displayName: result.user.displayName,
          email:       result.user.email,
          photoURL:    result.user.photoURL,
          createdAt:   new Date().toISOString(),
          role:        'user'
        });
      }
    } catch (error) {
      console.error('Erreur création user Google :', error);
    }
    return result;
  };

  const register = async (email, password, userData) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', result.user.uid), {
      ...userData,
      email,
      createdAt: new Date().toISOString(),
      role: 'user'
    });
    return result;
  };

  const logout       = () => signOut(auth);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  const value = {
    user,
    login,
    loginWithGoogle,
    register,
    logout,
    resetPassword,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}