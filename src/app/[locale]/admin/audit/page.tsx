'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from '@/lib/backend';
import type { AuditResult } from '@/lib/adminTypes';
import { AdminError, AdminLoading, formatAdminDate, useAdminQuery } from '@/components/admin/AdminData';

export default function AdminAuditPage() {
  const locale = useLocale(); const isAr = locale === 'ar'; const { userData } = useAuth();
  const { data, error, loading, refresh } = useAdminQuery<AuditResult>('getAuditLog');
  const [extra, setExtra] = useState<AuditResult | null>(null);
  const [busy, setBusy] = useState(false); const [pageError, setPageError] = useState<string | null>(null);
  const current = extra || data;
  const next = async () => {
    if (!current?.nextCursor || busy) return;
    setBusy(true); setPageError(null);
    try { const result = await httpsCallable<unknown, AuditResult>(null, 'getAuditLog')({ cursor: current.nextCursor }); setExtra(result.data); }
    catch (reason) { setPageError(reason instanceof Error ? reason.message : 'Unable to load audit log'); }
    finally { setBusy(false); }
  };
  if (userData?.role !== 'super_admin') return <AdminError message={isAr ? 'سجل الإجراءات مخصص للمدير العام.' : 'Audit log requires super admin access.'} />;
  return <div className="space-y-5"><header className="flex flex-wrap justify-between gap-3"><div><h1 className="text-3xl font-black font-cairo">{isAr ? 'سجل الإجراءات' : 'Audit log'}</h1><p className="mt-2 text-sm text-slate-500">{isAr ? 'سجل العمليات الجديدة المدعومة؛ لا يشكل سجلًا بأثر رجعي للتغييرات القديمة أو التعديلات المباشرة من وحدة Firebase.' : 'Logs new supported operations. It does not retroactively record old changes or direct Firebase console edits.'}</p></div><button onClick={() => { setExtra(null); refresh(); }} disabled={loading || busy} className="rounded-xl border bg-white px-4 py-2">{isAr ? 'أحدث السجلات' : 'Latest entries'}</button></header>
    {pageError && <AdminError message={pageError} />}
    {error ? <AdminError message={error} retry={refresh} /> : loading ? <AdminLoading /> : current ? <><div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-start text-sm"><thead className="bg-slate-50"><tr>{[isAr ? 'الوقت' : 'Time', isAr ? 'الإجراء' : 'Action', isAr ? 'المنفذ' : 'Actor', isAr ? 'السجل' : 'Target', isAr ? 'السبب' : 'Reason'].map(label => <th key={label} className="p-4 text-start">{label}</th>)}</tr></thead><tbody>{current.entries.map(entry => <tr key={entry.id} className="border-t"><td className="whitespace-nowrap p-4">{formatAdminDate(entry.createdAt, locale)}</td><td className="p-4">{entry.action}</td><td className="max-w-48 break-all p-4 font-mono text-xs">{entry.actorUid || '—'}</td><td className="max-w-48 break-all p-4 font-mono text-xs">{entry.targetId || '—'}</td><td className="p-4">{entry.reason || '—'}</td></tr>)}</tbody></table>{!current.entries.length && <p className="p-6 text-slate-500">{isAr ? 'لا توجد إجراءات مسجلة ضمن هذه الصفحة.' : 'No entries on this page.'}</p>}</div>{current.nextCursor && <button onClick={() => void next()} disabled={busy} className="rounded-xl border bg-white px-4 py-2 disabled:opacity-50">{isAr ? 'السجلات الأقدم' : 'Older entries'}</button>}</> : null}
  </div>;
}
