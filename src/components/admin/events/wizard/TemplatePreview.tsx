'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/backend';

type Kind = 'email' | 'certificate';

/**
 * "Preview" under a template picker: the approved template rendered with this event's own values (name, date,
 * place, speakers, organizers...) and a sample student. It loads when opened and follows the picked template.
 */
export default function TemplatePreview({ isAr, kind, templateId, eventId }: {
  isAr: boolean; kind: Kind; templateId: string; eventId?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mail, setMail] = useState<{ subject: string; html: string } | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    if (!open || !templateId) return;
    let active = true;
    let objectUrl = '';
    const params = eventId ? { event_id: String(eventId) } : undefined;
    // Loading state is set from the effect that starts the request, once per template change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusy(true); setError('');
    const request = kind === 'email'
      ? apiGet<{ subject: string; html: string }>(`/api/admin/mail/templates/${templateId}/preview`, params)
          .then(result => { if (active) setMail(result); })
      : apiGet<{ pdf: string }>(`/api/admin/templates/${templateId}/event-preview`, params)
          .then(result => {
            if (!active) return;
            const bytes = Uint8Array.from(atob(result.pdf), char => char.charCodeAt(0));
            objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
            setPdfUrl(objectUrl);
          });
    request
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : (isAr ? 'تعذرت المعاينة.' : 'Preview failed.')); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, templateId, eventId, kind, isAr]);

  if (!templateId) return null;
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setOpen(value => !value)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]">
        {open ? <EyeOff size={14} /> : <Eye size={14} />}
        {open ? (isAr ? 'إخفاء المعاينة' : 'Hide preview') : (isAr ? 'معاينة بيانات تجريبية' : 'Preview with sample data')}
      </button>
      {open && (
        <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {eventId
              ? (isAr ? 'تُعبَّأ بيانات الفعالية المحفوظة، واسم الطالب وبياناته بقيم تجريبية.' : 'Filled with the saved event data; the student’s name and details are samples.')
              : (isAr ? 'بقيم تجريبية؛ احفظ الفعالية لرؤية بياناتها.' : 'Sample values; save the event to see its own data.')}
          </p>
          {busy && <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]"><Loader2 size={14} className="animate-spin" />{isAr ? 'جارٍ التحميل…' : 'Loading…'}</p>}
          {error && <p role="alert" className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {!error && kind === 'email' && mail && (
            <>
              <p className="text-sm font-bold" dir="auto">{mail.subject || (isAr ? '(بلا عنوان)' : '(no subject)')}</p>
              {/* No scripts, no same-origin access: the template HTML is shown exactly like a mail client would. */}
              <iframe title={isAr ? 'معاينة البريد' : 'Email preview'} sandbox="" srcDoc={mail.html} className="h-80 w-full rounded-lg border border-[var(--color-border)] bg-white" />
            </>
          )}
          {!error && kind === 'certificate' && pdfUrl && (
            <iframe title={isAr ? 'معاينة الشهادة' : 'Certificate preview'} src={pdfUrl} className="h-80 w-full rounded-lg border border-[var(--color-border)] bg-white" />
          )}
        </div>
      )}
    </div>
  );
}
