'use client';

import { useCallback, useEffect, useState } from 'react';

/** A browser-only (per-viewer) array store keyed in localStorage. Starts from `seed` on every
 * render (server and client) to avoid a hydration mismatch, then swaps in whatever was actually
 * saved once mounted. Used by the Task Center's design/logic-only tabs, which have no backend
 * yet -- swap this for real fetch/mutate calls later without touching the tab components. */
export function useLocalCollection<T extends { id: string }>(key: string, seed: T[]) {
  const [items, setItems] = useState<T[]>(seed);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setItems(JSON.parse(raw) as T[]);
    } catch { /* ignore malformed or inaccessible storage */ }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(key, JSON.stringify(items)); } catch { /* ignore */ }
  }, [key, items, hydrated]);

  const add = useCallback((item: T) => setItems(prev => [item, ...prev]), []);
  const update = useCallback((id: string, patch: Partial<T>) =>
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item)), []);
  const remove = useCallback((id: string) => setItems(prev => prev.filter(item => item.id !== id)), []);

  return { items, add, update, remove };
}
