'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/client';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

interface UserData {
  role: 'student' | 'event_organizer' | 'super_admin';
  totalPoints: number;
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Fetch or create user data in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUserData(userSnap.data() as UserData);
        } else {
          // Check if domain is allowed (for V1, we'll allow any for now if env is not set, 
          // or strictly enforce if process.env.NEXT_PUBLIC_ALLOWED_DOMAIN is set)
          const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN;
          const emailDomain = currentUser.email?.split('@')[1];
          
          if (allowedDomain && emailDomain !== allowedDomain) {
            await signOut(auth);
            setUser(null);
            setUserData(null);
            alert(`Only ${allowedDomain} emails are allowed.`);
            setLoading(false);
            return;
          }

          const newUserData = {
            role: 'student' as const, // Default role
            totalPoints: 0,
            email: currentUser.email,
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
            photoURL: currentUser.photoURL || null,
            createdAt: new Date().toISOString(),
          };
          await setDoc(userRef, newUserData);
          setUserData(newUserData);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN;
    if (allowedDomain) {
      googleProvider.setCustomParameters({ hd: allowedDomain });
    }
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
