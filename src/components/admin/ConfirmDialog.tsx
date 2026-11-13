'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const subscribeNever = () => () => {};

type Tone = 'accent' | 'warning' | 'danger';

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  accent: { bg: 'bg-[var(--color-accent-soft)]', fg: 'text-[var(--color-accent)]' },
  warning: { bg: 'bg-[var(--color-warning-soft)]', fg: 'text-[var(--color-warning)]' },
  danger: { bg: 'bg-[var(--color-danger-soft)]', fg: 'text-[var(--color-danger)]' },
};

interface ConfirmDialogProps {
  open: boolean;
  icon: ReactNode;
  tone?: Tone;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  /** When set, the confirm button stays disabled until the admin types this exact word. */
  confirmWord?: string;
}

export default function ConfirmDialog({
  open, icon, tone = 'accent', title, message, confirmLabel, cancelLabel, onConfirm, onCancel, busy, confirmWord,
}: ConfirmDialogProps) {
  // A card with backdrop-blur (glassmorphism) becomes a containing block for its own
  // fixed-position descendants, which would otherwise trap this dialog inside the card
  // instead of covering the page. Render it through a portal to document.body instead,
  // once mounted on the client (document doesn't exist during server rendering).
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [typed, setTyped] = useState('');
  useEffect(() => { if (open) setTyped(''); }, [open]);

  if (!open || !mounted) return null;
  const toneStyle = TONE_STYLES[tone];
  const confirmBlocked = confirmWord !== undefined && typed !== confirmWord;
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 flex flex-col items-center gap-3 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${toneStyle.bg} ${toneStyle.fg}`}>
          {icon}
        </div>
        <p className="text-base font-bold text-[var(--color-text-primary)]">{title}</p>
        <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
        {confirmWord !== undefined && (
          <input
            type="text"
            dir="ltr"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmWord}
            disabled={busy}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-center text-sm font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50"
          />
        )}
        <div className="flex gap-2 mt-2 w-full">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmBlocked}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold bg-[var(--color-accent)] text-[var(--color-accent-contrast)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
