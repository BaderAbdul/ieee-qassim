'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { httpsCallable } from '@/lib/backend';
import type { AdminOperations } from '@/lib/adminTypes';
import { AdminError, AdminLoading, useAdminQuery } from '@/components/admin/AdminData';

export default function AdminOperationsPage() {
  const isAr = useLocale() === 'ar';
  const { data, error, loading, refresh } = useAdminQuery<AdminOperations>('getOperations');
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const retry = async (jobId: string) => {
    if (busy) return; setBusy(jobId); setActionError(null);
    try { await httpsCallable(null, 'retryNotification')({ jobId }); refresh(); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Retry failed'); }
    finally { setBusy(null); }
  };
  return <div className="space-y-6">
    <header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-3xl font-black font-cairo">{isAr ? 'مركز المهام' : 'Operations center'}</h1><p className="mt-2 text-sm text-slate-500">{isAr ? 'عينة محدودة من مهام البريد والشهادات تحتاج متابعة. المعالجة الحالية تعتمد على إبقاء لوحة الإدارة وصفحة شهادات الفعالية مفتوحتين.' : 'A bounded sample of mail and certificate jobs requiring attention. Current processing requires the admin dashboard and event certificate page to remain open.'}</p></div><button disabled={loading} onClick={refresh} className="rounded-xl border bg-white px-4 py-2 disabled:opacity-50">{isAr ? 'تحديث' : 'Refresh'}</button></header>
    {actionError && <AdminError message={actionError} />}
    {error ? <AdminError message={error} retry={refresh} /> : loading ? <AdminLoading /> : data ? <>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">{isAr ? 'البريد' : 'Email'}</h2><p className="mt-2 text-sm text-amber-800">{isAr ? 'REVIEW يعني أن نتيجة الإرسال غير مؤكدة: تحقق من المزود قبل إعادة الإرسال. رسالة DELIVERED تعني قبول المزود، وليست إثبات قراءة الطالب.' : 'REVIEW means delivery is uncertain: check the provider before resending. DELIVERED means the provider accepted the message, not that the student read it.'}</p><div className="mt-4 space-y-3">{data.notificationJobs.map(job => <article key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div className="min-w-0"><p className="break-all text-sm font-bold">{job.to || job.id}</p><p className="mt-1 text-xs text-slate-500">{job.status} · {isAr ? 'المحاولات:' : 'Attempts:'} {job.attempts || 0}</p>{job.lastError && <p className="mt-2 text-sm text-red-700">{job.lastError}</p>}</div>{job.status === 'FAILED' && <button disabled={busy !== null} onClick={() => void retry(job.id)} className="rounded-lg bg-purple-600 px-3 py-2 text-sm text-white disabled:opacity-50">{busy === job.id ? (isAr ? 'جارٍ التحقق…' : 'Checking…') : (isAr ? 'إعادة المحاولة الآمنة' : 'Safe retry')}</button>}</article>)}</div>{!data.notificationJobs.length && <p className="mt-4 text-slate-500">{isAr ? 'لا توجد مهام ضمن هذه العينة.' : 'No jobs in this sample.'}</p>}</section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">{isAr ? 'الشهادات' : 'Certificates'}</h2><div className="mt-4 space-y-3">{data.certificateJobs.map(job => <article key={job.id} className="flex flex-wrap justify-between gap-3 rounded-xl border p-4"><div><p className="font-bold">{job.studentName || job.id}</p><p className="mt-1 text-sm text-slate-500">{job.eventTitle} · {job.status}</p>{job.lastError && <p className="mt-2 text-sm text-red-700">{job.lastError}</p>}</div>{job.eventId && <Link href={`/admin/events/${job.eventId}/certificates`} className="rounded-lg bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700">{isAr ? 'إدارة الشهادات' : 'Manage certificates'}</Link>}</article>)}</div>{!data.certificateJobs.length && <p className="mt-4 text-slate-500">{isAr ? 'لا توجد مهام ضمن هذه العينة.' : 'No jobs in this sample.'}</p>}</section>
    </> : null}
  </div>;
}
