'use client';

import { useEffect } from 'react';
import { apiSend } from '@/lib/backend';
import { useAuth } from '@/context/AuthContext';
import { isStandalone } from '@/lib/pwa';

/** When the site runs as the installed app, tell the server once per session so installs can be counted. Renders nothing. */
export default function InstallReporter() {
  const { user } = useAuth();
  const signedIn = !!user;
  useEffect(() => {
    if (!signedIn || !isStandalone()) return;
    try { if (sessionStorage.getItem('pwa-install-reported') === '1') return; } catch { /* private mode */ }
    apiSend('POST', '/api/me/pwa/installed').then(() => { try { sessionStorage.setItem('pwa-install-reported', '1'); } catch { /* ignore */ } }).catch(() => {});
  }, [signedIn]);
  return null;
}
