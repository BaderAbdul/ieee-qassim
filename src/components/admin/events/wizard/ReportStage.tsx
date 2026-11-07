'use client';

import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { downloadEventReport, uploadEventReport } from '@/lib/backend';
import type { EventReport } from '@/lib/types';
import { button, primaryButton } from './wizardTypes';

export default function ReportStage({ isAr, eventId, report, onSaved }: {
  isAr: boolean; eventId: number; report: EventReport | null; onSaved: (report: EventReport) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : (isAr ? 'تعذر إكمال الطلب.' : 'Request failed.')); }
    finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <p className="text-sm text-[var(--color-text-muted)]">{isAr ? 'ارفع تقرير الفعالية بصيغة PDF فقط، حتى ١٠ ميجابايت.' : 'Upload the event report as a PDF only, up to 10 MB.'}</p>
    {report && <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-2">
      <p className="font-bold break-all">{report.fileName}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{new Date(report.uploadedAt).toLocaleString(isAr ? 'ar-SA' : 'en-GB')} · {(report.size / 1024 / 1024).toFixed(2)} MB</p>
      <button type="button" disabled={busy} className={button} onClick={() => void run(() => downloadEventReport(eventId, report.fileName))}><Download size={16} />{isAr ? 'تنزيل التقرير' : 'Download report'}</button>
    </div>}
    <label className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-[var(--color-border)] p-6 text-sm">
      <span className="font-bold">{report ? (isAr ? 'استبدال التقرير' : 'Replace report') : (isAr ? 'ملف التقرير' : 'Report file')}</span>
      <input disabled={busy} type="file" accept="application/pdf,.pdf" onChange={e => { setError(''); setFile(e.target.files?.[0] || null); }} />
    </label>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex justify-end"><button type="button" disabled={!file || busy} className={primaryButton} onClick={() => void run(async () => {
      if (!file) return;
      const saved = await uploadEventReport(eventId, file); onSaved(saved); setFile(null);
    })}><Upload size={16} />{busy ? (isAr ? 'جارٍ التنفيذ...' : 'Working...') : (isAr ? 'رفع التقرير' : 'Upload report')}</button></div>
  </div>;
}
