'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export default function TemplateDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} aria-labelledby="template-dialog-title" onCancel={event => { event.preventDefault(); onClose(); }}
    className="fixed inset-0 m-auto max-h-[92dvh] w-[min(1200px,95vw)] overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0 text-[var(--color-text-primary)] shadow-2xl backdrop:bg-slate-950/65">
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 id="template-dialog-title" className="text-xl font-bold font-cairo">{title}</h2>
      <button type="button" aria-label="Close / إغلاق" onClick={onClose} className="rounded-xl p-2 hover:bg-[var(--color-surface-2)]"><X size={20} /></button>
    </header><div className="p-5 sm:p-7">{children}</div>
  </dialog>;
}
