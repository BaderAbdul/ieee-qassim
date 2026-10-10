'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

export interface UserData {
  isRestricted?: boolean;
  role: 'student' | 'event_organizer' | 'super_admin';
  totalPoints: number;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  createdAt?: string;
  isQassimStudent?: boolean;
  universityId?: string | null;
  firstName?: string | null;
  fatherName?: string | null;
  familyName?: string | null;
  arabicFullName?: string;
  college?: string | null;
  major?: string | null;
  academicLevel?: string | null;
  profileCompleted?: boolean;
  profileCompletedAt?: string | null;
  badges?: string[];
  publicProfile?: {
    avatar?: string;
    linkedin?: string;
    bio?: string;
  };
  cardPreferences?: {
    theme?: string;
    pattern?: string;
  };
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let unsubscribeSnapshot: (() => void) | undefined;
    let unsubscribeAuth: (() => void) | undefined;
    const initFirebase = async () => {
      try {
        const { auth, db } = await import('@/lib/firebase/client');
        const { onAuthStateChanged, setPersistence, browserLocalPersistence, getRedirectResult } = await import('firebase/auth');
        const { doc, runTransaction, onSnapshot } = await import('firebase/firestore');
        await setPersistence(auth, browserLocalPersistence);
        await getRedirectResult(auth);
        if (!alive) return;
        unsubscribeAuth = onAuthStateChanged(auth, currentUser => {
          unsubscribeSnapshot?.();
          if (!alive) return;
          setUser(currentUser);
          setUserData(null);
          setError(null);
          if (!currentUser) { setLoading(false); return; }
          setLoading(true);
          const userRef = doc(db, 'users', currentUser.uid);
          unsubscribeSnapshot = onSnapshot(userRef, userSnap => {
            if (!alive) return;
            if (userSnap.exists()) {
              setUserData(userSnap.data() as UserData);
              setLoading(false);
              // Spark has no Firestore projection trigger. Refresh the safe public copy.
              void import('@/lib/backend').then(({ httpsCallable }) => httpsCallable(null, 'syncPublicProfile')({})).catch(() => {
                console.warn('Public profile synchronization is pending.');
              });
              return;
            }
            // Do not overwrite a profile created or promoted during sign-in.
            void runTransaction(db, async tx => {
              const existing = await tx.get(userRef);
              if (!existing.exists()) tx.set(userRef, {
                role: 'student', totalPoints: 0,
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
                photoURL: currentUser.photoURL || null,
                createdAt: new Date().toISOString(), profileCompleted: false,
              });
            }).catch(reason => {
              console.error('Could not create profile', reason);
              if (alive) { setError('تعذر تحميل حسابك. أعد المحاولة. / Unable to load your account. Please retry.'); setLoading(false); }
            });
          }, reason => {
            console.error('Profile subscription failed', reason);
            if (alive) { setError('تعذر تحميل حسابك. أعد المحاولة. / Unable to load your account. Please retry.'); setLoading(false); }
          });
        });
      } catch (reason) {
        console.error('Authentication initialization failed', reason);
        if (alive) { setError('تعذر تسجيل الدخول. أعد المحاولة. / Sign-in is unavailable. Please retry.'); setLoading(false); }
      }
    };
    const timer = window.setTimeout(() => { void initFirebase(); }, 100);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      unsubscribeAuth?.();
      unsubscribeSnapshot?.();
    };
  }, []);

  const login = async () => {
    try {
      setError(null);
      const { auth, googleProvider } = await import('@/lib/firebase/client');
      const { signInWithPopup, signInWithRedirect } = await import('firebase/auth');
      try { await signInWithPopup(auth, googleProvider); }
      catch (reason) {
        const code = typeof reason === 'object' && reason && 'code' in reason ? reason.code : '';
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          await signInWithRedirect(auth, googleProvider);
        } else { throw reason; }
      }
    } catch (reason) {
      console.error('Login failed', reason);
      setError('تعذر تسجيل الدخول. أعد المحاولة. / Sign-in failed. Please retry.');
    }
  };

  const logout = async () => {
    if (typeof window !== 'undefined' && !window.confirm('هل أنت متأكد من تسجيل الخروج؟ / Are you sure you want to log out?')) {
      return;
    }
    try {
      const { auth } = await import('@/lib/firebase/client');
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
