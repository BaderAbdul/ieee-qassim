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
  const [authTimedOut, setAuthTimedOut] = useState(false);
  useEffect(() => {
    if (userLoaded) return;
    const timer = window.setTimeout(() => setAuthTimedOut(true), 12000);
    return () => window.clearTimeout(timer);
  }, [userLoaded]);

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
    if (!userLoaded) {
      setAuthTimedOut(true);
      return;
    }
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
      {!userLoaded && authTimedOut && (
        <div role="status" dir="auto" className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg">
          تعذر تحميل تسجيل الدخول. يمكنك تصفح الموقع وإعادة تحميل الصفحة للمحاولة مجددًا.
          <br />Sign-in could not load. You can keep browsing and reload to retry.
          <button type="button" className="ms-3 underline" onClick={() => window.location.reload()}>إعادة المحاولة / Retry</button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

