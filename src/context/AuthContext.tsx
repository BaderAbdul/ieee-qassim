'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/nextjs';
import { apiGet } from '@/lib/backend';

export interface UserData {
  id: string;
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
  feedbackPending?: boolean;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  metadata: { creationTime?: string };
  getIdToken: () => Promise<string>;
}

interface AuthContextType {
  user: AuthUser | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  error: null,
  login: async () => {},
  logout: async () => {},
  retry: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const clerk = useClerk();
  const { isLoaded: userLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useClerkAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userLoaded) return;
    if (!isSignedIn || !clerkUser) { setUserData(null); loadedFor.current = null; return; }
    if (loadedFor.current === clerkUser.id) return;
    let alive = true;
    setFetching(true);
    setError(null);
    (async () => {
      try {
        const me = await apiGet<UserData>('/api/me');
        if (!alive) return;
        loadedFor.current = clerkUser.id;
        setUserData(me);
      } catch (reason) {
        if (!alive) return;
        setError(reason instanceof Error ? reason.message : 'تعذر تحميل ملفك. أعد المحاولة. / Could not load your profile. Please retry.');
      } finally {
        if (alive) setFetching(false);
      }
    })();
    return () => { alive = false; };
  }, [userLoaded, isSignedIn, clerkUser, attempt]);

  const user: AuthUser | null = isSignedIn && clerkUser ? {
    uid: userData?.id || clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    displayName: clerkUser.fullName ?? null,
    photoURL: clerkUser.imageUrl ?? null,
    metadata: { creationTime: userData?.createdAt ?? clerkUser.createdAt?.toISOString() },
    getIdToken: async () => {
      const token = await getToken();
      if (!token) throw new Error('Sign in first. / سجّل دخولك أولًا.');
      return token;
    },
  } : null;

  const login = async () => {
    await clerk.openSignIn({});
  };

  const logout = async () => {
    if (typeof window !== 'undefined' && !window.confirm('هل أنت متأكد من تسجيل الخروج؟ / Are you sure you want to log out?')) {
      return;
    }
    await clerk.signOut();
  };

  const retry = () => {
    loadedFor.current = null;
    setError(null);
    setAttempt(value => value + 1);
  };

  const loading = !userLoaded || (isSignedIn && fetching && !userData);

  return (
    <AuthContext.Provider value={{ user, userData, loading, error, login, logout, retry }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
