'use client';

import dynamic from 'next/dynamic';
import { useUser } from '@clerk/nextjs';

const SetPasswordPrompt = dynamic(() => import('./SetPasswordPrompt'), { ssr: false });

// Anonymous landing-page visits do not need password-management UI or its JS.
export default function AccountEnhancements({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded || !isSignedIn || !user || user.passwordEnabled) return children;
  // Do not mount the site (including profile redirects and feedback dialogs) until
  // Clerk confirms that this account has a password. OAuth does not bypass this.
  return <div className="min-h-dvh bg-slate-50"><SetPasswordPrompt key={user.id} /></div>;
}
