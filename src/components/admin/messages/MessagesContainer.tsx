'use client';

import { useLocale } from 'next-intl';
import { Heart, Mail, Paperclip } from 'lucide-react';
import { useStaffMessages } from './StaffMessagesContext';

/** Notification container on the overview page, right under the top bar: every message currently visible to this person. */
export default function MessagesContainer() {
  const isAr = useLocale() === 'ar';
  const { messages, open } = useStaffMessages();
  if (messages.length === 0) return null;

  return (
    <section aria-label={isAr ? 'رسائل الإدارة' : 'Messages from the leadership'} className="mb-6 space-y-2">
      {messages.map(message => (
        <button key={message.id} type="button" onClick={() => open(message)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-start shadow-xs transition hover:shadow-md ${
                  message.kind === 'thanks'
                    ? 'border-pink-200 bg-gradient-to-l from-pink-50 via-amber-50 to-sky-50'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${message.kind === 'thanks' ? 'bg-gradient-to-tr from-pink-500 to-amber-400 text-white' : 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'}`}>
            {message.kind === 'thanks' ? <Heart size={18} /> : <Mail size={18} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className={`truncate text-sm text-[var(--color-text-primary)] ${message.readAt ? 'font-bold' : 'font-black'}`}>{message.title}</span>
              {!message.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-highlight)]" aria-label={isAr ? 'جديدة' : 'New'} />}
              {message.hasAttachment && <Paperclip size={13} className="shrink-0 text-[var(--color-text-muted)]" />}
            </span>
            <span className="mt-0.5 line-clamp-1 block text-xs text-[var(--color-text-secondary)]">{message.body}</span>
          </span>
          <span className="shrink-0 text-[11px] font-bold text-[var(--color-accent)]">{isAr ? 'فتح' : 'Open'}</span>
        </button>
      ))}
    </section>
  );
}
