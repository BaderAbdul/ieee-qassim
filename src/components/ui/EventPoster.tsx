'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Expand, X } from 'lucide-react';

export default function EventPoster({ url, title, compact = false }: { url?: string; title: string; compact?: boolean }) {
  const isAr = useLocale() === 'ar'; const labelId = useId();
  const dialog = useRef<HTMLDialogElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    const opener = trigger.current;
    const previousOverflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = previousOverflow; opener?.focus(); };
  }, [open]);
  if (!url) return null;
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="block w-full text-start focus-visible:outline-offset-[-3px]">
      <span className={`relative block w-full bg-slate-100 ${compact ? 'h-40' : 'aspect-[3/4]'}`}>
        <Image src={url} alt={title} fill className="object-contain" sizes={compact ? '(max-width: 1024px) 100vw, 600px' : '(max-width: 1024px) 100vw, 40vw'} />
      </span>
      <span className="flex min-h-12 items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-bold text-blue-700"><Expand size={18} aria-hidden="true" />{isAr ? 'عرض بوستر الفعالية كاملًا' : 'View full event poster'}</span>
    </button>
    <dialog ref={dialog} aria-labelledby={labelId} onCancel={event => { event.preventDefault(); setOpen(false); }} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }} className="m-auto max-h-[94dvh] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-2xl bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/70">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4"><h2 id={labelId} className="text-base font-bold">{title}</h2><button autoFocus type="button" onClick={() => setOpen(false)} aria-label={isAr ? 'إغلاق البوستر' : 'Close poster'} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200"><X size={20} /></button></div>
      <div className="relative h-[70dvh] w-full bg-slate-50"><Image src={url} alt={title} fill className="object-contain" sizes="(max-width: 1024px) 100vw, 896px" /></div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center px-4 py-3 text-sm font-bold text-blue-700 underline">{isAr ? 'فتح الصورة الأصلية في نافذة جديدة' : 'Open the original image in a new tab'}</a>
    </dialog>
  </section>;
}
