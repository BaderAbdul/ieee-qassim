'use client';

import { useSyncExternalStore } from 'react';

export type AdminThemeMode = 'light' | 'dark' | 'system';

function readMode(): AdminThemeMode {
  try {
    const value = localStorage.getItem('admin_theme');
    return value === 'dark' || value === 'light' || value === 'system' ? value : 'light';
  } catch {
    return 'light';
  }
}

function systemPrefersDark(): boolean {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
}

function readIsDark(): boolean {
  const mode = readMode();
  return mode === 'system' ? systemPrefersDark() : mode === 'dark';
}

const subscribe = (notify: () => void) => {
  window.addEventListener('storage', notify);
  window.addEventListener('ieee-admin-theme', notify);
  let media: MediaQueryList | null = null;
  try {
    media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', notify);
  } catch { media = null; }
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener('ieee-admin-theme', notify);
    media?.removeEventListener('change', notify);
  };
};

/**
 * Admin board theme: explicit light/dark, or "system" to follow the OS. Shared by the desktop
 * sidebar's sun/moon toggle and the mobile settings sheet's three-way picker, kept in sync across
 * both (and across tabs) via the `admin_theme` localStorage key and the `ieee-admin-theme` event.
 */
export function useAdminTheme() {
  const mode = useSyncExternalStore(subscribe, readMode, () => 'light' as AdminThemeMode);
  const isDark = useSyncExternalStore(subscribe, readIsDark, () => false);

  const setMode = (next: AdminThemeMode) => {
    try { localStorage.setItem('admin_theme', next); } catch { return; }
    window.dispatchEvent(new Event('ieee-admin-theme'));
  };

  return { mode, isDark, setMode };
}
