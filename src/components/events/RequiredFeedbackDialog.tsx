"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

let scrollLocks = 0;
let originalOverflow = '';

const SurfaceContext = createContext<{ eventId: string | null; setEventId: (id: string | null) => void }>({ eventId: null, setEventId: () => {} });
export const useFeedbackSurface = () => useContext(SurfaceContext);

export function FeedbackSurfaceProvider({ children }: { children: ReactNode }) {
  const [eventId, setEventId] = useState<string | null>(null);
  return <SurfaceContext.Provider value={{ eventId, setEventId }}>{children}</SurfaceContext.Provider>;
}

/** The browser's top layer sits above every navbar and makes the background inert. */
export function RequiredFeedbackDialog({ children, eventId, ownsSurface = false }: { children: ReactNode; eventId: string; ownsSurface?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { setEventId } = useFeedbackSurface();
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    // `open` provides the initial server-rendered form; upgrade to a modal on mount.
    node.close();
    node.showModal();
    let active = true;
    const preventDismiss = (event: Event) => event.preventDefault();
    const keepOpen = () => { if (active && node.isConnected && !node.open) node.showModal(); };
    const preventEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); } };
    node.addEventListener('cancel', preventDismiss);
    node.addEventListener('close', keepOpen);
    node.addEventListener('keydown', preventEscape, true);
    if (scrollLocks++ === 0) { originalOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    if (ownsSurface) setEventId(eventId);
    return () => {
      active = false;
      node.removeEventListener('cancel', preventDismiss);
      node.removeEventListener('close', keepOpen);
      node.removeEventListener('keydown', preventEscape, true);
      node.close();
      if (--scrollLocks === 0) document.body.style.overflow = originalOverflow;
      if (ownsSurface) setEventId(null);
    };
  }, [eventId, ownsSurface, setEventId]);
  return <dialog ref={dialog} open aria-label="تقييم الفعالية المطلوب / Required event feedback" aria-modal="true" onCancel={event => event.preventDefault()}
    className="fixed inset-0 z-[2147483647] m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto overscroll-contain border-0 bg-slate-950/75 p-0 backdrop:bg-slate-950/75">
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-6 sm:py-10 [&>*]:shrink-0">{children}</div>
  </dialog>;
}

export function FeedbackPageFrame({ required, eventId, children }: { required: boolean; eventId: string; children: ReactNode }) {
  return required ? <RequiredFeedbackDialog eventId={eventId} ownsSurface>{children}</RequiredFeedbackDialog>
    : <div className="min-h-screen bg-gray-50 px-4 pt-28 pb-8 flex items-center justify-center">{children}</div>;
}
