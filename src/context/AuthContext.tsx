'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { User } from 'firebase/auth';
import { startSession, type SessionState } from '@/lib/auth/session';
import { authErrorCode, canRedirectAfterPopup, loginErrorMessage, readRedirectAttempt } from '@/lib/auth/loginFlow';
import { isInAppBrowser } from '@/lib/auth/inAppBrowser';
import InAppBrowserModal from '@/components/auth/InAppBrowserModal';

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

type AuthRuntime = Pick<typeof import('firebase/auth'), 'signInWithPopup' | 'signInWithRedirect'> & Pick<typeof import('@/lib/firebase/client'), 'auth' | 'googleProvider'>;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<SessionState<User, UserData>>({ user: null, profile: null, loading: true, error: null });
  const [signingIn, setSigningIn] = useState(false);
  const [showInAppBrowserModal, setShowInAppBrowserModal] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const runtime = useRef<AuthRuntime | null>(null);
  const controller = useRef<ReturnType<typeof startSession<User, UserData>> | null>(null);
  const loginInProgress = useRef(false);

  useEffect(() => {
    let alive = true;
    const startupTimer = window.setTimeout(() => {
      if (alive) setSession(current => ({ ...current, loading: false, error: 'تعذر تهيئة جلسة الدخول. تحقق من الاتصال وأعد المحاولة. / Session initialization timed out. Check your connection and retry.' }));
    }, 15000);
    let redirectFailure: string | null = null;
    let sessionController: ReturnType<typeof startSession<User, UserData>> | undefined;
    const init = async () => {
      try {
        const [client, authSdk, firestore] = await Promise.all([
          import('@/lib/firebase/client'), import('firebase/auth'), import('firebase/firestore'),
        ]);
        if (!alive) return;
        runtime.current = { ...client, ...authSdk };
        // getAuth already selects available IndexedDB/local/session storage, with a memory fallback.
        // Do not force localStorage or wait for redirect processing before subscribing.
        const { auth, db } = client;
        sessionController = startSession<User, UserData>({
          observeUser: (next, fail) => authSdk.onAuthStateChanged(auth, user => next(user || auth.currentUser), fail),
          observeProfile: (user, next, fail) => firestore.onSnapshot(firestore.doc(db, 'users', user.uid), { includeMetadataChanges: true }, snapshot => next(snapshot.exists() ? snapshot.data() as UserData : null, snapshot.metadata.fromCache), fail),
          createProfile: user => firestore.runTransaction(db, async tx => {
            const ref = firestore.doc(db, 'users', user.uid);
            const existing = await tx.get(ref);
            if (existing.exists()) return existing.data() as UserData;
            const profile: UserData = {
              role: 'student', totalPoints: 0, email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'Student',
              photoURL: user.photoURL || null, createdAt: new Date().toISOString(), profileCompleted: false,
            };
            tx.set(ref, profile);
            return profile;
          }),
          update: next => {
            if (!next.loading) window.clearTimeout(startupTimer);
            if (alive) setSession({ ...next, error: next.error || (!next.user ? redirectFailure : null) });
          },
          ready: () => {
            redirectFailure = null;
            try {
              const pending = readRedirectAttempt(sessionStorage.getItem('ieee_google_redirect'));
              sessionStorage.removeItem('ieee_google_redirect');
              if (pending && `${window.location.pathname}${window.location.search}${window.location.hash}` !== pending.path) window.location.replace(pending.path);
            } catch { /* Storage restrictions must not invalidate a signed-in session. */ }
            void import('@/lib/backend').then(({ httpsCallable }) => httpsCallable(null, 'syncPublicProfile')({})).catch(() => console.warn('Public profile synchronization is pending.'));
          },
        });
        controller.current = sessionController;
        void authSdk.getRedirectResult(auth).then(async result => {
          if (!alive) return;
          if (result?.user && auth.currentUser?.uid === result.user.uid) sessionController?.acceptUser(result.user);
          else {
            await auth.authStateReady();
            let pending = null;
            try { pending = readRedirectAttempt(sessionStorage.getItem('ieee_google_redirect')); } catch { /* optional storage */ }
            if (alive && pending && !auth.currentUser) {
              redirectFailure = loginErrorMessage({ code: 'auth/missing-initial-state' });
              setSession(current => ({ ...current, loading: false, error: redirectFailure }));
            }
          }
        }).catch(error => {
          // A stale redirect error must not erase a valid persisted or popup session.
          if (alive && !auth.currentUser) {
            redirectFailure = loginErrorMessage(error);
            setSession(current => ({ ...current, loading: false, error: redirectFailure }));
          }
        });
      } catch {
        window.clearTimeout(startupTimer);
        if (alive) setSession(current => ({ ...current, loading: false, error: 'تعذر تهيئة تسجيل الدخول. أعد المحاولة. / Could not initialize sign-in. Please retry.' }));
      }
    };
    void init();
    return () => { alive = false; window.clearTimeout(startupTimer); sessionController?.dispose(); controller.current = null; };
  }, [attempt]);

  const retry = () => {
    setSession(current => ({ ...current, loading: true, error: null }));
    if (controller.current && runtime.current) controller.current.retry(runtime.current.auth.currentUser);
    else setAttempt(value => value + 1);
  };

  const login = async () => {
    if (loginInProgress.current) return;
    if (isInAppBrowser()) { setShowInAppBrowserModal(true); return; }
    const sdk = runtime.current;
    if (!sdk) { retry(); return; }
    loginInProgress.current = true;
    setSession(current => ({ ...current, error: null }));
    try {
      // Open synchronously from the click; imports/network waits can lose the browser's gesture.
      const popup = sdk.signInWithPopup(sdk.auth, sdk.googleProvider);
      setSigningIn(true);
      const result = await popup;
      controller.current?.acceptUser(result.user);
    } catch (error) {
      const code = authErrorCode(error);
      if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(code)) return;
      if (code === 'auth/disallowed-useragent') { setShowInAppBrowserModal(true); return; }
      if (canRedirectAfterPopup(error, sdk.auth.app.options.authDomain, window.location.host)) {
        try {
          sessionStorage.setItem('ieee_google_redirect', JSON.stringify({ path: `${window.location.pathname}${window.location.search}${window.location.hash}`, startedAt: Date.now() }));
          await sdk.signInWithRedirect(sdk.auth, sdk.googleProvider); return;
        }
        catch (redirectError) { setSession(current => ({ ...current, error: loginErrorMessage(redirectError) })); return; }
      }
      setSession(current => ({ ...current, error: loginErrorMessage(error) }));
    } finally { loginInProgress.current = false; setSigningIn(false); }
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
    <AuthContext.Provider value={{ user: session.user, userData: session.profile, loading: session.loading || signingIn, error: session.error, login, logout, retry }}>
      {children}
      <InAppBrowserModal 
        isOpen={showInAppBrowserModal} 
        onClose={() => setShowInAppBrowserModal(false)} 
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
