'use client';

import dynamic from 'next/dynamic';
import { useUser } from '@clerk/nextjs';

const SetPasswordPrompt = dynamic(() => import('./SetPasswordPrompt'), { ssr: false });

// Anonymous landing-page visits do not need password-management UI or its JS.
export default function AccountEnhancements() {
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded || !isSignedIn || !user || user.passwordEnabled) return null;
  return <SetPasswordPrompt />;
}
