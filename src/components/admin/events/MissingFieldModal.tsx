'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Link } from '@/i18n/routing';

const subscribeNever = () => () => {};

interface MissingFieldModalProps {
  open: boolean;
  isAr: boolean;
  eventId: number;
  stage: string;
  field: string;
  labelAr: string;
  labelEn: string;
  onClose: () => void;
}

export default function MissingFieldModal({ open, isAr, eventId, stage, field, labelAr, labelEn, onClose }: MissingFieldModalProps) {
  // Same portal-to-body reasoning as ConfirmDialog: a glassmorphism card is a containing block
  // for its own fixed-position descendants, which would trap this dialog inside the card.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!open || !mounted) return null;
  const label = isAr ? labelAr : labelEn;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={isAr ? 'بيانات ناقصة' : 'Missing data'}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 flex flex-col items-center gap-3 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[var(--color-warning-soft)] text-[var(--color-warning)]">
          <AlertTriangle size={26} />
        </div>
        <p className="text-base font-bold text-[var(--color-text-primary)]">
          {isAr ? `${label} مفقود` : `${label} is missing`}
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {isAr ? 'أكمل هذا الحقل أولًا قبل المتابعة.' : 'Complete this field first before continuing.'}
        </p>
        <div className="flex gap-2 mt-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:opacity-80 transition-opacity"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
          <Link
            href={`/admin/events/create?eventId=${eventId}&stage=${stage}&field=${field}`}
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold bg-[var(--color-accent)] text-[var(--color-accent-contrast)] hover:opacity-90 transition-opacity text-center"
          >
            {isAr ? 'الذهاب الآن' : 'Go now'}
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}
