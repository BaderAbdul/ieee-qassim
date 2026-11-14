'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { apiGet, apiSend } from '@/lib/backend';
import { isAdminRole, useAuth } from '@/context/AuthContext';
import MessageModal from './MessageModal';
import type { InboxMessage } from './messageTypes';

interface StaffMessages { messages: InboxMessage[]; open: (message: InboxMessage) => void }
const Context = createContext<StaffMessages>({ messages: [], open: () => {} });
export const useStaffMessages = () => useContext(Context);

/**
 * Loads the signed-in staff member's visible messages (inside their show/hide window). Unread ones
 * pop up as a modal, one after another; once read they stay in the overview page's notification
 * container until their hide time passes. There is no separate inbox page.
 */
export function StaffMessagesProvider({ children }: { children: ReactNode }) {
  const isAr = useLocale() === 'ar';
  const { userData } = useAuth();
  const staff = isAdminRole(userData);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [current, setCurrent] = useState<InboxMessage | null>(null);
  const announced = useRef<Set<string>>(new Set());     // popped up already in this tab; never twice

  const load = useCallback(async () => {
    try { setMessages((await apiGet<{ messages: InboxMessage[] }>('/api/me/messages')).messages); } catch { /* the container simply stays empty */ }
  }, []);

  useEffect(() => {
    if (!staff) return;
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [staff, load]);

  const open = useCallback((message: InboxMessage) => {
    announced.current.add(message.id);
    setCurrent(message);
    if (!message.readAt) {
      void apiSend('POST', `/api/me/messages/${message.id}/read`)
        .then(() => setMessages(list => list.map(item => item.id === message.id ? { ...item, readAt: new Date().toISOString() } : item)))
        .catch(() => {});
    }
  }, []);

  // Pop the next unread message whenever nothing is on screen.
  useEffect(() => {
    if (current) return;
    const next = messages.find(message => !message.readAt && !announced.current.has(message.id));
    if (next) open(next);
  }, [messages, current, open]);

  const value = useMemo(() => ({ messages, open }), [messages, open]);
  return (
    <Context.Provider value={value}>
      {children}
      {current && <MessageModal message={current} isAr={isAr} onClose={() => setCurrent(null)} />}
    </Context.Provider>
  );
}
