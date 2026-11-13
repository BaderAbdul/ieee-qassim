'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet, httpsCallable } from '@/lib/backend';
import { apiGetArray } from '@/lib/backendResponse';
import { downloadCSV, parseCSV, secureCertificateURL } from '@/lib/csv';
import { runOperations, type OperationResult } from '@/lib/admin-operations';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useParams } from 'next/navigation';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
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
  const { showToast } = useToast();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [manualLinks, setManualLinks] = useState<Record<string, string>>({});
  const [importRows, setImportRows] = useState<{ id: string; name: string; email: string; userId?: string; url?: string; problem?: string }[]>([]);
  const [results, setResults] = useState<OperationResult[]>([]);
  const [retryRows, setRetryRows] = useState<typeof importRows>([]);
  const [issueRetryIds, setIssueRetryIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<{ id: string; nameAr: string }[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [genders, setGenders] = useState<Record<string, string>>({});
  const [revokeTarget, setRevokeTarget] = useState<Certificate | null>(null);
  const role = userData?.role;
  const canIssue = event?.state === 'Completed' && event?.hasCertificate === true;
  const canAttachExternal = ['Ongoing', 'Completed'].includes(event?.state || '');

  useEffect(() => {
    if (!userData) return;
    let active = true;
    apiGet<{ templates: { id: string; nameAr: string }[] }>('/api/admin/templates', { scope: 'approved' })
      .then(result => { if (active) setTemplates(result.templates); })
      .catch(reason => { if (active) setLoadError(reason instanceof Error ? reason.message : 'تعذر تحميل القوالب المعتمدة'); });
    return () => { active = false; };
  }, [userData]);

  const handleCompleteEventAndEnableCertificates = async () => {
    setProcessing(true);
    try {
      if (event?.state !== 'Completed') {
        await httpsCallable(null, 'changeEventState')({ eventId, state: 'Completed' });
      }
      await httpsCallable(null, 'saveEvent')({ eventId, hasCertificate: true });
      setEvent(prev => prev ? { ...prev, state: 'Completed', hasCertificate: true } : null);
      setReloadKey(k => k + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'تعذر إنهاء الفعالية وتفعيل الشهادات', 'error');
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
        if (active) showToast(reason instanceof Error ? reason.message : 'Certificate generation failed.', 'error');
      } finally {
        rendering.current = false;
        if (active) {
          try {
            const certificate = await apiGet<Certificate>(`/api/admin/certificates/${pending.certificate!.id}`);
            if (active) setAttendees(previous => previous.map(item => item.userId === pending.userId ? { ...item, certificate } : item));
          } catch (reason) { if (active) showToast(reason instanceof Error ? reason.message : 'تعذر تحديث الشهادة', 'error'); }
        }
      }
    }, 2000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [attendees, processing, showToast]);

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
        setTemplateId(prev => prev || eventData.certificateTemplateId || '');

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
          setLoadError(msg);
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
      showToast('Certificates can only be issued for Completed events.', 'error');
      return;
    }

    const eligibleUserIds = attendees
      .filter(a => a.eligible && (!a.certificate || a.certificate.status === 'Failed') && (!retryIds || retryIds.includes(a.userId)))
      .map(a => a.userId);

    if (eligibleUserIds.length === 0) {
      showToast('No eligible attendees to issue certificates to.', 'error');
      return;
    }

    setProcessing(true);
    try {
      const issueFn = httpsCallable<unknown, { results: { userId: string; status: 'queued' | 'skipped' | 'failed'; message?: string }[] }>(null, 'issueCertificates');
      const outcome: OperationResult[] = [];
      for (let index = 0; index < eligibleUserIds.length; index += 100) {
        const batch = eligibleUserIds.slice(index, index + 100);
        try {
          const response = await issueFn({ eventId, userIds: batch, templateId: templateId || undefined,
            genders: Object.fromEntries(batch.map(id => [id, genders[id] || ''])) });
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
      showToast(err instanceof Error ? err.message : 'Error issuing certificates', 'error');
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
      showToast(err instanceof Error ? err.message : 'Error retrying certificate', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevoke = async (certificateId: string) => {
    setProcessing(true);
    try {
      const revokeFn = httpsCallable(null, 'revokeCertificate');
      await revokeFn({ certificateId });
      setReloadKey(k => k + 1);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error revoking certificate', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const saveManualLink = async (attendee: Attendee) => {
    const url = manualLinks[attendee.userId];
    let safeURL: string;
    try { safeURL = secureCertificateURL(url || ''); } catch { showToast('يجب إدخال رابط HTTPS صحيح', 'error'); return; }
    setProcessing(true);
    try {
      await httpsCallable(null, 'saveExternalCertificate')({ eventId, userId: attendee.userId, url: safeURL });
      setResults([{ id: attendee.userId, name: attendee.name, success: true }]);
      setReloadKey(k => k + 1);
    } catch (err) {
      showToast('خطأ في حفظ الرابط: ' + (err instanceof Error ? err.message : 'أعد المحاولة'), 'error');
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
        showToast(err instanceof Error ? err.message : 'خطأ في معالجة الملف', 'error');
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black font-cairo text-slate-900">إدارة الشهادات</h1>
          <p className="mt-2 text-sm text-slate-500">اترك هذه الصفحة مفتوحة أثناء توليد الشهادات؛ تتم معالجتها واحدة تلو الأخرى. ويمكنك أيضًا إرفاق روابط شهادات خارجية.</p>
          <p className="text-sm text-slate-500 mt-0.5">{event?.title} ({event?.state})</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm"
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

      <section className="space-y-3 rounded-2xl border border-slate-100 shadow-sm bg-white p-6 text-slate-900">
        <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">قالب الشهادة المعتمد</span><select disabled={processing} value={templateId} onChange={e => setTemplateId(e.target.value)} className="w-full rounded-xl border p-3"><option value="">قالب الفعالية المرتبط، أو التصميم الافتراضي إن لم يُحدد</option>{templates.map(template => <option key={template.id} value={template.id}>{template.nameAr}</option>)}</select></label>
        <p className="text-sm text-slate-500">تُملأ بيانات الفعالية وvTools من إعدادات الفعالية تلقائيًا، ويُستخدم اسم كل مشارك بالإنجليزية وتاريخ بصيغة 23 Nov, 2026.</p>
        {(templateId || event?.certificateTemplateId) && <details><summary className="cursor-pointer font-bold">بيانات المخاطبة للمستفيدين</summary><p className="my-3 text-sm text-slate-500">حدد البيانات عند الحاجة للشروط. غير المحدد يستخدم النص البديل في القالب؛ لا نستنتج الجنس من الاسم.</p><div className="max-h-64 space-y-2 overflow-y-auto">{attendees.map(attendee => <label key={attendee.userId} className="flex items-center justify-between gap-3"><span>{attendee.name}</span><select disabled={processing} className="rounded-lg border p-2" value={genders[attendee.userId] || ''} onChange={e => setGenders(previous => ({ ...previous, [attendee.userId]: e.target.value }))}><option value="">غير محدد</option><option value="male">ذكر</option><option value="female">أنثى</option></select></label>)}</div></details>}
        <p className="text-xs text-slate-500">المسودات غير متاحة للإصدار. تُحفظ نسخة من القالب المعتمد وبياناته مع الشهادة عند إضافتها لقائمة الإصدار.</p>
      </section>
      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{loadError}</div>}
      {issueRetryIds.length > 0 && <button disabled={processing || !canIssue} onClick={() => handleIssueCertificates(issueRetryIds)} className="rounded-xl bg-purple-600 hover:bg-purple-700 transition-colors px-4 py-3 text-white font-bold disabled:opacity-50">إعادة إرسال دفعات الإصدار المتعثرة فقط</button>}
      {results.length > 0 && <section className="rounded-2xl border border-slate-100 shadow-sm bg-white p-5" aria-live="polite"><p className="text-sm text-slate-700">نجح <span className="font-bold text-emerald-600">{results.filter(row => row.success).length}</span> / {results.length}.</p>{results.filter(row => !row.success).map(row => <p key={row.id} className="text-sm text-red-600 mt-1">{row.name}: {row.message}</p>)}<button className="mt-3 text-sm font-bold text-purple-600 hover:underline" onClick={() => downloadCSV('certificate-operation-results.csv', [['Name', 'Success', 'Message'], ...results.map(row => [row.name, row.success, row.message || ''])])}>تنزيل تقرير النتائج</button>{retryRows.length > 0 && <button disabled={uploadingCSV} className="ms-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 text-sm font-bold text-white" onClick={() => applyImport(retryRows)}>إعادة محاولة الفاشل فقط ({retryRows.length})</button>}</section>}
      {importRows.length > 0 && <section className="rounded-2xl border border-slate-100 bg-slate-50 p-5"><h2 className="font-bold text-slate-900">معاينة قبل الحفظ — لم يُطبّق أي رابط بعد</h2><p className="text-sm text-slate-600 mt-1">صالح {importRows.filter(row => !row.problem).length}، يحتاج مراجعة {importRows.filter(row => row.problem).length}.</p><div className="max-h-64 overflow-auto mt-3 space-y-0.5">{importRows.map(row => <p key={row.id} className={`text-sm ${row.problem ? 'text-red-700' : 'text-emerald-700'}`}>صف {row.id}: {row.email} — {row.problem || 'جاهز للربط'}</p>)}</div><button disabled={uploadingCSV || !canAttachExternal || !importRows.some(row => !row.problem)} onClick={() => applyImport(importRows)} className="mt-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 text-sm font-bold text-white disabled:opacity-50">تطبيق الصفوف الصالحة فقط</button><button disabled={uploadingCSV} onClick={() => setImportRows([])} className="ms-3 text-sm font-bold text-slate-600 hover:underline">إلغاء الاستيراد</button></section>}
      
      {!canIssue && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">سجل الحضور والشهادات</h3>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {attendees.filter(a => a.certificate?.status === 'Available' || a.certificate?.externalUrl).length} / {attendees.length} صادرة
          </span>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-start">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <tr>
              <th className="py-4 px-6 font-medium">اسم الطالب</th>
              <th className="py-4 px-6 font-medium">البريد الإلكتروني</th>
              <th className="py-4 px-6 font-medium">الرابط المرفق</th>
              <th className="py-4 px-6 font-medium">حالة الشهادة</th>
              <th className="py-4 px-6 font-medium">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y border-slate-100">
            {attendees.map(attendee => (
              <tr key={attendee.userId} className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-900">{attendee.name}</td>
                <td className="py-4 px-6 text-slate-500">{attendee.email}</td>
                <td className="py-4 px-6">
                  {attendee.certificate?.externalUrl ? (
                    <a href={attendee.certificate.externalUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm font-bold truncate block max-w-[150px]">
                      رابط خارجي
                    </a>
                  ) : (
                    <span className="text-slate-400 text-sm">-</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  {!attendee.certificate ? (
                    <span className="text-slate-500">غير مصدرة</span>
                  ) : attendee.certificate.status === 'Generating' ? (
                    <span className="inline-flex items-center text-blue-600"><Clock className="h-4 w-4 me-1 animate-pulse" /> جاري الإصدار</span>
                  ) : attendee.certificate.status === 'Available' ? (
                    <span className="inline-flex items-center text-emerald-600"><CheckCircle className="h-4 w-4 me-1" /> متوفرة</span>
                  ) : attendee.certificate.status === 'Failed' ? (
                    <span className="inline-flex items-center text-red-600"><XCircle className="h-4 w-4 me-1" /> فشل الإصدار</span>
                  ) : (
                    <span className="inline-flex items-center text-slate-400"><XOctagon className="h-4 w-4 me-1" /> ملغاة</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  {attendee.certificate?.status === 'Failed' && (
                    <button onClick={() => handleRetry(attendee.certificate!.id)} disabled={processing} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-bold flex items-center transition-colors">
                      <RefreshCw className="h-4 w-4 me-1" /> إعادة المحاولة
                    </button>
                  )}
                  {attendee.certificate?.status === 'Available' && (
                    <button onClick={() => setRevokeTarget(attendee.certificate!)} disabled={processing} className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg text-sm font-bold mt-1 block transition-colors">
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
                        className="p-2 border border-slate-200 rounded-lg text-sm flex-1 outline-none focus:ring-1 focus:ring-blue-500 dir-ltr text-left"
                      />
                      <button
                        onClick={() => saveManualLink(attendee)}
                        disabled={processing || uploadingCSV || !manualLinks[attendee.userId]}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
                <td colSpan={5} className="py-8 text-center text-slate-500">لا يوجد حضور مسجل لهذه الفعالية.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      <ConfirmDialog
        open={!!revokeTarget}
        icon={<XOctagon className="h-6 w-6" />}
        tone="danger"
        title="إلغاء الشهادة"
        message="هل أنت متأكد من إلغاء هذه الشهادة؟ لا يمكن التراجع عن هذا الإجراء بالكامل."
        confirmLabel="إلغاء الشهادة"
        cancelLabel="تراجع"
        busy={processing}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={async () => { const id = revokeTarget!.id; setRevokeTarget(null); await handleRevoke(id); }}
      />
    </div>
  );
}
