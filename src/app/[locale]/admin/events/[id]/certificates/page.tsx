'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet, httpsCallable } from '@/lib/backend';
import { apiGetArray } from '@/lib/backendResponse';
import { downloadCSV, parseCSV, secureCertificateURL } from '@/lib/csv';
import { runOperations, type OperationResult } from '@/lib/admin-operations';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { FileText, CheckCircle, Clock, XCircle, AlertCircle, RefreshCw, XOctagon, Download, Upload } from 'lucide-react';
import { Certificate, PlatformEvent } from '@/lib/types';

interface Attendee {
  userId: string;
  name: string;
  email: string;
  eligible: boolean;
  certificate?: Certificate;
}

export default function CertificatesManagementPage() {
  const { userData, loading: authLoading } = useAuth();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [manualLinks, setManualLinks] = useState<Record<string, string>>({});
  const [importRows, setImportRows] = useState<{ id: string; name: string; email: string; userId?: string; url?: string; problem?: string }[]>([]);
  const [results, setResults] = useState<OperationResult[]>([]);
  const [retryRows, setRetryRows] = useState<typeof importRows>([]);
  const [issueRetryIds, setIssueRetryIds] = useState<string[]>([]);
  const role = userData?.role;
  const canIssue = event?.state === 'Completed' && event?.hasCertificate === true;
  const canAttachExternal = ['Ongoing', 'Completed'].includes(event?.state || '');

  const handleCompleteEventAndEnableCertificates = async () => {
    setProcessing(true);
    setError(null);
    try {
      if (event?.state !== 'Completed') {
        await httpsCallable(null, 'changeEventState')({ eventId, state: 'Completed' });
      }
      await httpsCallable(null, 'saveEvent')({ eventId, hasCertificate: true });
      setEvent(prev => prev ? { ...prev, state: 'Completed', hasCertificate: true } : null);
      setReloadKey(k => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنهاء الفعالية وتفعيل الشهادات');
    } finally {
      setProcessing(false);
    }
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rendering = useRef(false);

  // Hobby/Spark: work is awaited in bounded requests, never left running after a response.
  // Keeping this organizer page open drains queued certificates one at a time.
  useEffect(() => {
    const pending = attendees.find(a => a.certificate?.status === 'Generating');
    if (!pending?.certificate || rendering.current || processing) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      rendering.current = true;
      try {
        await httpsCallable(null, 'renderCertificate')({ certificateId: pending.certificate!.id });
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Certificate generation failed.');
      } finally {
        rendering.current = false;
        if (active) {
          try {
            const certificate = await apiGet<Certificate>(`/api/admin/certificates/${pending.certificate!.id}`);
            if (active) setAttendees(previous => previous.map(item => item.userId === pending.userId ? { ...item, certificate } : item));
          } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'تعذر تحديث الشهادة'); }
        }
      }
    }, 2000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [attendees, processing]);

  useEffect(() => {
    if (role !== 'super_admin' && role !== 'event_organizer') {
      return;
    }

    let active = true;

    const loadData = async () => {
      try {
        const [eventData, attendance, certs] = await Promise.all([
          apiGet<PlatformEvent>(`/api/admin/events/${eventId}`),
          apiGetArray<{ userId: string; userName: string; userEmail: string; certificateId?: string; certificateStatus?: string }>(`/api/admin/events/${eventId}/attendance`),
          apiGetArray<Certificate>(`/api/admin/events/${eventId}/certificates`),
        ]);
        if (!active) return;
        setEvent(eventData);

        const certsByUserId: Record<string, Certificate> = {};
        certs.forEach(c => { certsByUserId[c.userId] = c; });

        // The backend re-validates eligibility (restriction status) when certificates are actually
        // issued; this list is for display, so every attendee shown here is treated as eligible.
        const combined: Attendee[] = attendance.map(a => ({
          userId: a.userId,
          name: a.userName || 'Unknown',
          email: a.userEmail || 'No email',
          eligible: true,
          certificate: certsByUserId[a.userId],
        }));

        if (active) setAttendees(combined);
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Error fetching data';
          setError(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [role, eventId, reloadKey]);

  const handleIssueCertificates = async (retryIds?: string[]) => {
    if (!canIssue) {
      setError('Certificates can only be issued for Completed events.');
      return;
    }
    
    const eligibleUserIds = attendees
      .filter(a => a.eligible && (!a.certificate || a.certificate.status === 'Failed') && (!retryIds || retryIds.includes(a.userId)))
      .map(a => a.userId);

    if (eligibleUserIds.length === 0) {
      setError('No eligible attendees to issue certificates to.');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const issueFn = httpsCallable<unknown, { results: { userId: string; status: 'queued' | 'skipped' | 'failed'; message?: string }[] }>(null, 'issueCertificates');
      const outcome: OperationResult[] = [];
      for (let index = 0; index < eligibleUserIds.length; index += 100) {
        const batch = eligibleUserIds.slice(index, index + 100);
        try {
          const response = await issueFn({ eventId, userIds: batch });
          outcome.push(...batch.map(id => {
            const result = response.data.results.find(item => item.userId === id);
            return { id, name: attendees.find(a => a.userId === id)?.name || id, success: !!result && result.status !== 'failed', message: result?.message || (!result ? 'لم يؤكد الخادم نتيجة هذا المستفيد' : undefined) };
          }));
        }
        catch (reason) { outcome.push(...batch.map(id => ({ id, name: attendees.find(a => a.userId === id)?.name || id, success: false, message: reason instanceof Error ? reason.message : 'تعذر إصدار الدفعة' }))); }
      }
      setResults(outcome);
      setIssueRetryIds(outcome.filter(row => !row.success).map(row => row.id));
      setReloadKey(k => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error issuing certificates';
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleRetry = async (certificateId: string) => {
    setProcessing(true);
    try {
      const retryFn = httpsCallable(null, 'retryCertificate');
      await retryFn({ certificateId });
      setReloadKey(k => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error retrying certificate';
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleRevoke = async (certificateId: string) => {
    if (!confirm('Are you sure you want to revoke this certificate? This action cannot be fully undone.')) return;
    setProcessing(true);
    try {
      const revokeFn = httpsCallable(null, 'revokeCertificate');
      await revokeFn({ certificateId });
      setReloadKey(k => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error revoking certificate';
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const saveManualLink = async (attendee: Attendee) => {
    const url = manualLinks[attendee.userId];
    let safeURL: string;
    try { safeURL = secureCertificateURL(url || ''); } catch { setError('يجب إدخال رابط HTTPS صحيح'); return; }
    setProcessing(true);
    try {
      await httpsCallable(null, 'saveExternalCertificate')({ eventId, userId: attendee.userId, url: safeURL });
      setResults([{ id: attendee.userId, name: attendee.name, success: true }]);
      setReloadKey(k => k + 1);
    } catch (err) {
      alert('خطأ في حفظ الرابط: ' + (err instanceof Error ? err.message : 'أعد المحاولة'));
    } finally {
      setProcessing(false);
    }
  };

  const handleExportCSV = () => {
    const header = ['Name', 'Email', 'Status', 'Certificate URL'];
    downloadCSV(`attendees_${event?.title}.csv`, [header, ...attendees.map(a => [
        a.name, a.email,
        a.certificate ? a.certificate.status : 'Not Issued',
        a.certificate?.externalUrl || ''
      ])]);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCSV(true);
    setError(null);
      try {
        if (file.size > 2 * 1024 * 1024) throw new Error('الحد الأقصى للملف 2MB');
        const rows = parseCSV(await file.text());
        if (rows.length < 2 || rows.length > 5001) throw new Error('يلزم عنوان أعمدة و1 إلى 5000 صف');
        const headers = rows[0].map(h => h.trim().toLowerCase());
        const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('بريد'));
        const urlIdx = headers.findIndex(h => h.includes('url') || h.includes('link') || h.includes('رابط'));
        
        if (emailIdx === -1 || urlIdx === -1) {
          throw new Error('CSV must contain an Email column and a URL/Link column');
        }

        const seen = new Set<string>();
        setImportRows(rows.slice(1).map((cols, index) => {
          const email = (cols[emailIdx] || '').trim().toLowerCase();
          const attendee = attendees.find(a => a.email.toLowerCase() === email);
          let problem = !email || !attendee ? 'لا يوجد حاضر بهذا البريد' : !attendee.eligible ? 'الحساب غير مؤهل' : ['Generating', 'Revoked'].includes(attendee.certificate?.status || '') ? 'الشهادة مولّدة حاليًا أو ملغاة' : undefined;
          if (seen.has(email)) problem = 'بريد مكرر في الملف';
          seen.add(email);
          let url: string | undefined;
          try { url = secureCertificateURL(cols[urlIdx] || ''); } catch { problem = 'رابط HTTPS غير صحيح'; }
          return { id: String(index + 2), name: attendee?.name || email, email, userId: attendee?.userId, url, problem };
        }));
        setResults([]); setRetryRows([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطأ في معالجة الملف');
      } finally {
        setUploadingCSV(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const applyImport = async (rows: typeof importRows) => {
    setUploadingCSV(true);
    try {
      const outcome = await runOperations(rows.filter(row => !row.problem), row => httpsCallable(null, 'saveExternalCertificate')({ eventId, userId: row.userId, url: row.url }));
      setResults(outcome);
      const failed = new Set(outcome.filter(row => !row.success).map(row => row.id));
      setRetryRows(rows.filter(row => failed.has(row.id)));
      setImportRows([]); setReloadKey(key => key + 1);
    } finally { setUploadingCSV(false); }
  };

  const isAuthorized = userData && (userData.role === 'super_admin' || userData.role === 'event_organizer');

  if (authLoading || (isAuthorized && loading)) return <div className="p-8 text-center">Loading...</div>;

  if (!isAuthorized) {
    return <div className="p-8 text-center text-red-600">Access Denied.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-cairo">إدارة الشهادات</h1>
          <p className="mt-2 text-sm text-slate-500">اترك هذه الصفحة مفتوحة أثناء توليد الشهادات؛ تتم معالجتها واحدة تلو الأخرى. ويمكنك أيضًا إرفاق روابط شهادات خارجية.</p>
          <p className="text-gray-500">{event?.title} ({event?.state})</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm"
          >
            <Download className="h-4 w-4" />
            تصدير CSV الحضور
          </button>
          
          <div className="relative">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleImportCSV} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              ref={fileInputRef}
              disabled={uploadingCSV || !canAttachExternal || processing}
              aria-label="اختيار ملف CSV لمعاينة روابط الشهادات"
            />
            <button
              disabled={uploadingCSV || !canAttachExternal || processing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Upload className="h-4 w-4" />
              {uploadingCSV ? 'جاري المعالجة...' : 'معاينة روابط CSV'}
            </button>
          </div>
          
          <button
            onClick={() => handleIssueCertificates()}
            disabled={processing || !canIssue || uploadingCSV}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <FileText className="h-5 w-5" />
            إصدار آلي للشهادات
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>}
      {issueRetryIds.length > 0 && <button disabled={processing || !canIssue} onClick={() => handleIssueCertificates(issueRetryIds)} className="rounded-xl bg-purple-600 px-4 py-3 text-white disabled:opacity-50">إعادة إرسال دفعات الإصدار المتعثرة فقط</button>}
      {results.length > 0 && <section className="rounded-xl border bg-white p-4" aria-live="polite"><p>نجح {results.filter(row => row.success).length} / {results.length}.</p>{results.filter(row => !row.success).map(row => <p key={row.id} className="text-red-700">{row.name}: {row.message}</p>)}<button className="mt-2 underline" onClick={() => downloadCSV('certificate-operation-results.csv', [['Name', 'Success', 'Message'], ...results.map(row => [row.name, row.success, row.message || ''])])}>تنزيل تقرير النتائج</button>{retryRows.length > 0 && <button disabled={uploadingCSV} className="ms-4 rounded bg-blue-600 px-4 py-2 text-white" onClick={() => applyImport(retryRows)}>إعادة محاولة الفاشل فقط ({retryRows.length})</button>}</section>}
      {importRows.length > 0 && <section className="rounded-xl border bg-blue-50 p-4"><h2 className="font-bold">معاينة قبل الحفظ — لم يُطبّق أي رابط بعد</h2><p>صالح {importRows.filter(row => !row.problem).length}، يحتاج مراجعة {importRows.filter(row => row.problem).length}.</p><div className="max-h-64 overflow-auto mt-3">{importRows.map(row => <p key={row.id} className={row.problem ? 'text-red-700' : 'text-green-800'}>صف {row.id}: {row.email} — {row.problem || 'جاهز للربط'}</p>)}</div><button disabled={uploadingCSV || !canAttachExternal || !importRows.some(row => !row.problem)} onClick={() => applyImport(importRows)} className="mt-3 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">تطبيق الصفوف الصالحة فقط</button><button disabled={uploadingCSV} onClick={() => setImportRows([])} className="ms-3 underline">إلغاء الاستيراد</button></section>}
      
      {!canIssue && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">
                {event?.state !== 'Completed' && !event?.hasCertificate
                  ? 'الفعالية جارية ولم يتم تفعيل خيار الشهادات بعد.'
                  : event?.state !== 'Completed'
                  ? 'الفعالية لا تزال جارية (Ongoing) ولم تكتمل بعد.'
                  : 'لم يتم تفعيل خيار الشهادات لهذه الفعالية.'}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                يمكنك إنهاء الفعالية وتفعيل الشهادات بنقرة واحدة لتمكين التوليد الآلي، كما يمكنك إرفاق روابط الشهادات الخارجية للحضور مباشرة.
              </p>
            </div>
          </div>
          <button
            onClick={handleCompleteEventAndEnableCertificates}
            disabled={processing}
            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all shrink-0 flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            إنهاء الفعالية وتفعيل الشهادات الآن
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-start">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-4 px-6 font-medium">اسم الطالب</th>
              <th className="py-4 px-6 font-medium">البريد الإلكتروني</th>
              <th className="py-4 px-6 font-medium">الرابط المرفق</th>
              <th className="py-4 px-6 font-medium">حالة الشهادة</th>
              <th className="py-4 px-6 font-medium">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y border-gray-100">
            {attendees.map(attendee => (
              <tr key={attendee.userId} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 font-bold">{attendee.name}</td>
                <td className="py-4 px-6 text-gray-500">{attendee.email}</td>
                <td className="py-4 px-6">
                  {attendee.certificate?.externalUrl ? (
                    <a href={attendee.certificate.externalUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-bold truncate block max-w-[150px]">
                      رابط خارجي
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  {!attendee.certificate ? (
                    <span className="text-gray-500">غير مصدرة</span>
                  ) : attendee.certificate.status === 'Generating' ? (
                    <span className="inline-flex items-center text-blue-600"><Clock className="h-4 w-4 me-1 animate-pulse" /> جاري الإصدار</span>
                  ) : attendee.certificate.status === 'Available' ? (
                    <span className="inline-flex items-center text-green-600"><CheckCircle className="h-4 w-4 me-1" /> متوفرة</span>
                  ) : attendee.certificate.status === 'Failed' ? (
                    <span className="inline-flex items-center text-red-600"><XCircle className="h-4 w-4 me-1" /> فشل الإصدار</span>
                  ) : (
                    <span className="inline-flex items-center text-gray-400"><XOctagon className="h-4 w-4 me-1" /> ملغاة</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  {attendee.certificate?.status === 'Failed' && (
                    <button onClick={() => handleRetry(attendee.certificate!.id)} disabled={processing} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm font-bold flex items-center">
                      <RefreshCw className="h-4 w-4 me-1" /> إعادة المحاولة
                    </button>
                  )}
                  {attendee.certificate?.status === 'Available' && (
                    <button onClick={() => handleRevoke(attendee.certificate!.id)} disabled={processing} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm font-bold mt-1 block">
                      إلغاء الشهادة
                    </button>
                  )}
                  {canAttachExternal && attendee.eligible && (!attendee.certificate || attendee.certificate.status === 'Failed') && (
                    <div className="flex gap-2 items-center mt-2">
                      <input 
                        type="url" 
                        placeholder="https://…"
                        aria-label={`رابط شهادة ${attendee.name}`}
                        value={manualLinks[attendee.userId] || ''}
                        onChange={(e) => setManualLinks(prev => ({ ...prev, [attendee.userId]: e.target.value }))}
                        className="p-2 border rounded-lg text-sm flex-1 outline-none focus:ring-1 focus:ring-blue-500 dir-ltr text-left"
                      />
                      <button 
                        onClick={() => saveManualLink(attendee)}
                        disabled={processing || uploadingCSV || !manualLinks[attendee.userId]}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                      >
                        رفع
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {attendees.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">لا يوجد حضور مسجل لهذه الفعالية.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
