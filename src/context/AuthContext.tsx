'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

export interface UserData {
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
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: () => void;
    let unsubscribeAuth: () => void;

    const initFirebase = async () => {
      try {
        const { auth } = await import('@/lib/firebase/client');
        const { onAuthStateChanged, setPersistence, browserLocalPersistence } = await import('firebase/auth');
        const { doc, setDoc, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/client');

        setPersistence(auth, browserLocalPersistence).catch(console.error);

        unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
          setUser(currentUser);
          
          if (currentUser) {
            const userRef = doc(db, 'users', currentUser.uid);
            
            unsubscribeSnapshot = onSnapshot(userRef, async (userSnap) => {
              if (userSnap.exists()) {
                setUserData(userSnap.data() as UserData);
              } else {
                const newUserData: UserData = {
                  role: 'student',
                  totalPoints: 0,
                  email: currentUser.email,
                  displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
                  photoURL: currentUser.photoURL || null,
                  createdAt: new Date().toISOString(),
                  profileCompleted: false,
                };
                await setDoc(userRef, newUserData, { merge: true });
              }
              setLoading(false);
            });
          } else {
            setUserData(null);
            setLoading(false);
            if (unsubscribeSnapshot) {
              unsubscribeSnapshot();
            }
          }
        });
      } catch (err) {
        console.error("Firebase Auth Init Error", err);
        setLoading(false);
      }
    };

    // We delay the Firebase initialization very slightly so it doesn't block the initial main thread paint
    if (typeof window !== 'undefined') {
      setTimeout(initFirebase, 100);
    }

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const login = async () => {
    try {
      const { auth, googleProvider } = await import('@/lib/firebase/client');
      const { signInWithPopup } = await import('firebase/auth');
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
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
    <AuthContext.Provider value={{ user, userData, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
