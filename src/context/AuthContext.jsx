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

  const loadUserData = async (firebaseUser) => {
    const userDoc  = await getDoc(doc(db, 'users', firebaseUser.uid));
    const userData = userDoc.exists() ? userDoc.data() : { role: 'user' };

    const merchantDoc  = await getDoc(doc(db, 'gateway_merchants', firebaseUser.uid));
    const merchantData = merchantDoc.exists() ? merchantDoc.data() : null;

    let teamMembership = null;

    if (!merchantDoc.exists()) {
      try {
        let teamSnap = null;

        // 1. Cherche d'abord par userId (cas normal après acceptation)
        const queryByUid = query(
          collection(db, 'gateway_merchant_teams'),
          where('userId', '==', firebaseUser.uid),
          where('status', '==', 'active')
        );
        const snapByUid = await getDocs(queryByUid);

        if (!snapByUid.empty) {
          teamSnap = snapByUid;
        } else {
          // 2. Fallback par email (cas où updateDoc vient juste de tourner
          //    et refreshUser est appelé dans la foulée)
          const queryByEmail = query(
            collection(db, 'gateway_merchant_teams'),
            where('email', '==', firebaseUser.email.toLowerCase()),
            where('status', '==', 'active')
          );
          const snapByEmail = await getDocs(queryByEmail);
          if (!snapByEmail.empty) teamSnap = snapByEmail;
        }

        if (teamSnap && !teamSnap.empty) {
          const teamData = teamSnap.docs[0].data();
          const ownerMerchantDoc = await getDoc(
            doc(db, 'gateway_merchants', teamData.merchantId)
          );
          teamMembership = {
            teamId:       teamSnap.docs[0].id,
            merchantId:   teamData.merchantId,
            role:         teamData.role,
            merchantData: ownerMerchantDoc.exists() ? ownerMerchantDoc.data() : {}
          };
        }
      } catch (e) {
        console.error('TEAM QUERY ERROR:', e.code, e.message);
      }
    }

    return {
      ...firebaseUser,
      ...userData,
      merchant:              merchantData,
      teamMembership,
      isTeamMember:          !!teamMembership && !merchantDoc.exists(),
      effectiveMerchantId:   merchantDoc.exists()
        ? firebaseUser.uid
        : teamMembership?.merchantId || null,
      effectiveMerchantData: merchantDoc.exists()
        ? merchantData
        : teamMembership?.merchantData || null,
      teamRole:              teamMembership?.role || null,
    };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const enrichedUser = await loadUserData(firebaseUser);
          setUser(enrichedUser);
        } catch (error) {
          console.error('Erreur chargement user :', error);
          setUser({
            ...firebaseUser,
            role:                  'user',
            merchant:              null,
            teamMembership:        null,
            isTeamMember:          false,
            effectiveMerchantId:   null,
            effectiveMerchantData: null,
            teamRole:              null,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshUser = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    try {
      const enrichedUser = await loadUserData(firebaseUser);
      setUser(enrichedUser);
    } catch (error) {
      console.error('Erreur refreshUser :', error);
    }
  };

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

  const logout        = () => signOut(auth);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  const value = {
    user,
    login,
    loginWithGoogle,
    register,
    logout,
    resetPassword,
    loading,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}