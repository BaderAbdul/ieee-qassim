'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/client';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

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

    // Ensure persistence is set to LOCAL
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        
        // Listen to the document in real-time to sync profileCompleted, points, etc.
        unsubscribeSnapshot = onSnapshot(userRef, async (userSnap) => {
          if (userSnap.exists()) {
            setUserData(userSnap.data() as UserData);
          } else {
            const newUserData: UserData = {
              role: 'student', // Default role
              totalPoints: 0,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
              photoURL: currentUser.photoURL || null,
              createdAt: new Date().toISOString(),
              profileCompleted: false, // Onboarding required
            };
            await setDoc(userRef, newUserData);
            // onSnapshot will automatically fire again after setDoc creates the doc
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

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
