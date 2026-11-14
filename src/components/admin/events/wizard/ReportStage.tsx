'use client';

import { useEffect, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { downloadEventReport, uploadEventReport } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import type { EventReport } from '@/lib/types';
import ReportBuilder from './ReportBuilder';
import { button, input, label, primaryButton, type StageEmbedProps } from './wizardTypes';

export default function ReportStage({ isAr, eventId, report, onSaved, attendance, onAttendanceChange, registerCollect }: StageEmbedProps & {
  isAr: boolean; eventId: number; report: EventReport | null; onSaved: (report: EventReport) => void;
  /** The real attendance number the organizers counted, as typed ('' = not entered). */
  attendance: string; onAttendanceChange: (value: string) => void;
}) {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } catch (e) { showToast(e instanceof Error ? e.message : (isAr ? 'تعذر إكمال الطلب.' : 'Request failed.'), 'error'); }
    finally { setBusy(false); }
  };

  const collect = (): Record<string, unknown> | null => {
    const text = attendance.trim();
    if (text === '') { setError(''); return { manualAttendanceCount: null }; }
    const count = Number(text);
    if (!Number.isInteger(count) || count < 0 || count > 1_000_000) {
      setError(isAr ? 'أدخل عدد الحضور الفعلي كرقم صحيح (٠ أو أكثر).' : 'Enter the real attendance as a whole number (0 or more).');
      return null;
    }
    setError('');
    return { manualAttendanceCount: count };
  };
  useEffect(() => { registerCollect?.(collect); });

  return <div className="space-y-5">
    <ReportBuilder isAr={isAr} eventId={eventId} onAdopted={onSaved} />
    <label className={label}>
      <span>{isAr ? 'عدد الحضور الفعلي' : 'Real attendance number'}</span>
      <input type="number" min={0} inputMode="numeric" className={`${input} max-w-xs`} value={attendance}
             placeholder={isAr ? 'اتركه فارغًا لاستخدام العدّ الآلي' : 'Leave empty to use the automatic count'}
             onChange={e => onAttendanceChange(e.target.value)} />
    </label>
    {error && <p role="alert" className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
    <p className="text-xs text-[var(--color-text-muted)]">
      {isAr ? 'يظهر هذا الرقم للطلاب فقط في بطاقة الفعالية بالموقع، ولا يغيّر أرقام الحضور الفعلية في لوحة الإدارة.' : 'Students see this number on the event card of the website only; the admin dashboard keeps showing the counted attendance.'}
    </p>

    <p className="text-sm text-[var(--color-text-muted)]">{isAr ? 'ارفع تقرير الفعالية بصيغة PDF فقط، حتى ١٠ ميجابايت.' : 'Upload the event report as a PDF only, up to 10 MB.'}</p>
    {report && <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-2">
      <p className="font-bold break-all">{report.fileName}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{new Date(report.uploadedAt).toLocaleString(isAr ? 'ar-SA' : 'en-GB')} · {(report.size / 1024 / 1024).toFixed(2)} MB</p>
      <button type="button" disabled={busy} className={button} onClick={() => void run(() => downloadEventReport(eventId, report.fileName))}><Download size={16} />{isAr ? 'تنزيل التقرير' : 'Download report'}</button>
    </div>}
    <label className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-[var(--color-border)] p-6 text-sm">
      <span className="font-bold">{report ? (isAr ? 'استبدال التقرير' : 'Replace report') : (isAr ? 'ملف التقرير' : 'Report file')}</span>
      <input disabled={busy} type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
    </label>
    <div className="flex justify-end"><button type="button" disabled={!file || busy} className={primaryButton} onClick={() => void run(async () => {
      if (!file) return;
      const saved = await uploadEventReport(eventId, file); onSaved(saved); setFile(null);
      showToast(isAr ? 'تم رفع التقرير.' : 'Report uploaded.', 'success');
    })}><Upload size={16} />{busy ? (isAr ? 'جارٍ التنفيذ...' : 'Working...') : (isAr ? 'رفع التقرير' : 'Upload report')}</button></div>
  </div>;
}
