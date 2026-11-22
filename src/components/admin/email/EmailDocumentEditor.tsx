'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { replaceEmailBody } from '@/lib/emailDocument';

/** The complete studio document is the editing canvas, isolated from admin CSS and direction. */
export default function EmailDocumentEditor({ html, frameRef, canEdit, onCommit, onSelect, title }: {
  html: string; frameRef: RefObject<HTMLIFrameElement | null>; canEdit: boolean;
  onCommit: (html: string) => void; onSelect: () => void; title: string;
}) {
  const [source, setSource] = useState(html);
  const original = useRef(html);
  const callbacks = useRef({ onCommit, onSelect, canEdit });
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => { callbacks.current = { onCommit, onSelect, canEdit }; }, [onCommit, onSelect, canEdit]);
  useEffect(() => {
    const body = frameRef.current?.contentDocument?.body;
    // Internal input/insertion is already in the DOM: avoid a reload that would move the caret.
    if (html === original.current || (body && html === replaceEmailBody(original.current, body.innerHTML))) {
      original.current = html;
      return;
    }
    original.current = html;
    setSource(html);
  }, [html, frameRef]);
  useEffect(() => {
    const body = frameRef.current?.contentDocument?.body;
    if (body) body.setAttribute('contenteditable', String(canEdit));
  }, [canEdit, frameRef]);
  useEffect(() => () => cleanup.current(), []);

  const loaded = () => {
    cleanup.current();
    const doc = frameRef.current?.contentDocument;
    if (!doc?.body) return;
    doc.body.setAttribute('contenteditable', String(callbacks.current.canEdit));
    const input = () => {
      if (!callbacks.current.canEdit) return;
      const next = replaceEmailBody(original.current, doc.body.innerHTML);
      original.current = next;
      callbacks.current.onCommit(next);
    };
    const select = () => callbacks.current.onSelect();
    const preventNavigation = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest('a')) event.preventDefault();
    };
    doc.body.addEventListener('input', input);
    doc.addEventListener('mouseup', select);
    doc.addEventListener('keyup', select);
    doc.addEventListener('click', preventNavigation);
    cleanup.current = () => {
      doc.body.removeEventListener('input', input);
      doc.removeEventListener('mouseup', select);
      doc.removeEventListener('keyup', select);
      doc.removeEventListener('click', preventNavigation);
    };
  };
  // Same-origin enables selection/editing only; scripts, forms and top navigation stay sandboxed.
  return <iframe ref={frameRef} title={title} sandbox="allow-same-origin" referrerPolicy="no-referrer"
    srcDoc={source || '<p></p>'} onLoad={loaded} className="h-full min-h-[600px] w-full rounded-xl border border-[var(--color-border)] bg-white" />;
}
