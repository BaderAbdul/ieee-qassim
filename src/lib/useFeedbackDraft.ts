"use client";
import { useEffect, useState } from 'react';

/** Local drafts are scoped to the signed-in account and event; never claim a save offline. */
export function useFeedbackDraft(key: string | null) {
  const [rating, setRating] = useState(5);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    // Hydrate after mount, keeping browser storage access outside server rendering.
    queueMicrotask(() => {
      if (!active) return;
      let draft: { rating?: number; answers?: Record<string, string> } = {};
      try { draft = JSON.parse(key ? localStorage.getItem(key) || '{}' : '{}'); } catch { /* storage optional */ }
      setRating(Number.isInteger(draft?.rating) && draft.rating! >= 1 && draft.rating! <= 5 ? draft.rating! : 5);
      setAnswers(draft?.answers && typeof draft.answers === 'object' ? draft.answers : {});
      setLoadedKey(key);
    });
    return () => { active = false; };
  }, [key]);
  useEffect(() => {
    if (!key || loadedKey !== key) return;
    try { localStorage.setItem(key, JSON.stringify({ rating, answers })); } catch { /* storage optional */ }
  }, [key, loadedKey, rating, answers]);
  const clearDraft = () => { try { if (key) localStorage.removeItem(key); } catch { /* storage optional */ } };
  return { rating, setRating, answers, setAnswers, clearDraft };
}
