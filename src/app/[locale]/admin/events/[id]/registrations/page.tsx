'use client';

import { useEffect, useState, use, useRef } from 'react';
import { collection, query, where, getDocs, doc, getDoc, getCountFromServer, limit, orderBy, documentId, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { downloadCSV } from '@/lib/csv';
import { registrationAction, runOperations, type OperationResult } from '@/lib/admin-operations';
import { db, functions } from '@/lib/firebase/client';
import { httpsCallable } from '@/lib/backend';
import { PlatformEvent } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { ArrowRight, Download, Users, Check, X, Clock, UserCheck, CheckSquare, Square, Trophy, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface RegistrationData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  universityId?: string;
  major?: string;
  college?: string;
  academicLevel?: string;
  isQassimStudent?: boolean;
  status: string;
  timestamp: { toDate?: () => Date } | Date | null;
}

const toDate = (val: { toDate?: () => Date } | Date | null | undefined): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  return null;
};

export default function RegistrationDeskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [pageCursor, setPageCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [nextCursor, setNextCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totals, setTotals] = useState({ all: 0, approved: 0, waiting: 0 });
  const [exporting, setExporting] = useState(false);
  const [results, setResults] = useState<OperationResult[]>([]);
  const [retryJob, setRetryJob] = useState<{ status?: string; points?: { amount: number; reason: string; operationIds: Record<string, string> }; items: RegistrationData[] } | null>(null);
  const pointsBatch = useRef<{ key: string; operationIds: Record<string, string> } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Points Awarding Modal State
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsAmount, setPointsAmount] = useState<number>(5);
  const [pointsDesc, setPointsDesc] = useState('');
  const [isAwarding, setIsAwarding] = useState(false);
  const pointsDialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPointsModal) return;
    const previous = document.activeElement as HTMLElement | null;
    pointsDialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isAwarding) setShowPointsModal(false);
      if (event.key !== 'Tab') return;
      const controls = Array.from(pointsDialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || []);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, [showPointsModal, isAwarding]);



  useEffect(() => {
    let active = true;

    const fetchRegistrations = async () => {
      try {
        const eventSnap = await getDoc(doc(db, 'events', eventId));
        if (eventSnap.exists() && active) {
          setEvent({ id: eventSnap.id, ...eventSnap.data() } as PlatformEvent);
        }

        const base = query(collection(db, 'registrations'), where('eventId', '==', eventId));
        const counts = await Promise.all([getCountFromServer(base), getCountFromServer(query(base, where('status', '==', 'approved'))), getCountFromServer(query(base, where('status', 'in', ['pending', 'waitlisted'])))]);
        if (active) setTotals({ all: counts[0].data().count, approved: counts[1].data().count, waiting: counts[2].data().count });
        const q = query(base, orderBy('timestamp', 'asc'), orderBy(documentId()), ...(pageCursor ? [startAfter(pageCursor)] : []), limit(50));
        const snap = await getDocs(q);
        
        // Parallelize user fetching using Promise.all & cache to eliminate N+1 sequential waterfall
        const userIdsToFetch = new Set<string>();
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.userId) {
            userIdsToFetch.add(data.userId);
          }
        });

        const userCache = new Map<string, Record<string, unknown>>();
        if (userIdsToFetch.size > 0) {
          const userSnaps = await Promise.all(
            Array.from(userIdsToFetch).map(uid => getDoc(doc(db, 'users', uid)))
          );
          userSnaps.forEach(uSnap => {
            if (uSnap.exists()) {
              userCache.set(uSnap.id, uSnap.data() as Record<string, unknown>);
            }
          });
        }

        const regs: RegistrationData[] = snap.docs.map(regDoc => {
          const regData = regDoc.data();
          const cachedUser = userCache.get(regData.userId);
          const cachedName = (cachedUser?.arabicFullName as string | undefined) || (cachedUser?.displayName as string | undefined);
          const cachedEmail = cachedUser?.email as string | undefined;
          return {
            id: regDoc.id,
            userId: regData.userId,
            userName: regData.userName || cachedName || 'Unknown',
            userEmail: regData.userEmail || cachedEmail || 'Unknown',
            universityId: (cachedUser?.universityId as string | undefined) || regData.universityId,
            major: cachedUser?.major as string | undefined,
            college: cachedUser?.college as string | undefined,
            academicLevel: cachedUser?.academicLevel as string | undefined,
            isQassimStudent: cachedUser?.isQassimStudent as boolean | undefined,
            status: regData.status,
            timestamp: regData.timestamp
          };
        });
        
        regs.sort((a, b) => {
          const tA = (a.timestamp as { toDate?: () => Date })?.toDate?.()?.getTime() || 0;
          const tB = (b.timestamp as { toDate?: () => Date })?.toDate?.()?.getTime() || 0;
          return tA - tB; // Earliest first
        });
        
        if (active) {
          setRegistrations(previous => pageCursor ? [...previous.filter(item => !regs.some(next => next.id === item.id)), ...regs] : regs);
          setNextCursor(snap.docs.at(-1) || null);
          setHasMore(snap.size === 50);
        }
      } catch (error) {
        console.error("Error fetching registrations", error);
        if (active) setLoadError(error instanceof Error ? error : new Error('Unable to load registrations'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchRegistrations();

    return () => {
      active = false;
    };
  }, [eventId, reloadKey, pageCursor]);

  if (loadError) throw loadError;

  const handleUpdateStatus = async (regId: string, newStatus: string) => {
    const reg = registrations.find(item => item.id === regId);
    if (reg) await performJob({ status: newStatus, items: [reg] });
  };

  const handleBulkUpdateStatus = async (newStatus: string) => {
    if (!selectedIds.length || !confirm(`تحديث ${selectedIds.length} تسجيل؟`)) return;
    await performJob({ status: newStatus, items: registrations.filter(item => selectedIds.includes(item.id)) });
  };

  const performJob = async (job: NonNullable<typeof retryJob>) => {
    setIsUpdatingBulk(true);
    try {
      const outcome = await runOperations(job.items.map(item => ({ ...item, name: item.userName })), async item => {
        if (job.points) await httpsCallable(functions, 'addManualPoints')({ studentUid: item.userId, amount: job.points.amount, reason: job.points.reason, operationId: job.points.operationIds[item.id] });
        else {
          if (job.status === 'attended') await httpsCallable(functions, 'submitCheckIn')({ eventId, targetUserId: item.userId });
          else await httpsCallable(functions, 'manageRegistration')({ eventId, userId: item.userId, action: registrationAction(job.status || '') });
        }
      });
      setResults(outcome);
      const failedIds = outcome.filter(item => !item.success).map(item => item.id);
      setRetryJob(failedIds.length ? { ...job, items: job.items.filter(item => failedIds.includes(item.id)) } : null);
      setSelectedIds([]);
      if (job.points && !failedIds.length) pointsBatch.current = null;
    } finally { setPageCursor(null); setReloadKey(key => key + 1); setIsUpdatingBulk(false); }
  };

  const handleAwardPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIds.length || !Number.isSafeInteger(pointsAmount) || pointsAmount <= 0 || !pointsDesc.trim()) return;
    setIsAwarding(true);
    try {
      const items = registrations.filter(item => selectedIds.includes(item.id));
      const key = JSON.stringify([items.map(item => item.id).sort(), pointsAmount, pointsDesc.trim()]);
      if (pointsBatch.current?.key !== key) pointsBatch.current = { key, operationIds: Object.fromEntries(items.map(item => [item.id, crypto.randomUUID()])) };
      await performJob({ items, points: { amount: pointsAmount, reason: pointsDesc.trim(), operationIds: pointsBatch.current.operationIds } });
      setShowPointsModal(false);
      setSelectedIds([]);
      setPointsDesc('');
    } finally { setIsAwarding(false); }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === registrations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(registrations.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const exportCSV = async () => {
    if (!event) return;
    setExporting(true);
    try {
    const all: RegistrationData[] = [];
    let cursor: QueryDocumentSnapshot<DocumentData> | undefined;
    do {
      const snap = await getDocs(query(collection(db, 'registrations'), where('eventId', '==', eventId), orderBy('timestamp', 'asc'), orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(200)));
      const page = snap.docs.map(item => ({ id: item.id, ...item.data() } as RegistrationData));
      // Bounded enrichment preserves all exported columns without loading every user at once.
      for (let offset = 0; offset < page.length; offset += 25) {
        await Promise.all(page.slice(offset, offset + 25).map(async item => {
          const profile = await getDoc(doc(db, 'users', item.userId));
          if (profile.exists()) {
            const user = profile.data();
            Object.assign(item, { userName: item.userName || user.arabicFullName || user.displayName, userEmail: item.userEmail || user.email, universityId: user.universityId || item.universityId, college: user.college || '', major: user.major || '', academicLevel: user.academicLevel || '', isQassimStudent: user.isQassimStudent === true });
          }
        }));
      }
      all.push(...page);
      cursor = snap.size === 200 ? snap.docs.at(-1) : undefined;
    } while (cursor);
    const headers = ['Name', 'Email', 'University ID', 'College', 'Major', 'Academic Level', 'Qassim Student?', 'Status', 'Date (UTC)'];
    const rows = all.map(r => {
      const d = toDate(r.timestamp);
      return [
        r.userName, r.userEmail, r.universityId || '', r.college || '', r.major || '', r.academicLevel || '', r.isQassimStudent ? 'Yes' : 'No',
        r.status,
        d ? d.toISOString() : ''
      ];
    });
    
    downloadCSV(`registrations_${event.title}.csv`, [headers, ...rows]);
    } catch (error) { setResults([{ id: 'export', name: 'تصدير جميع التسجيلات', success: false, message: error instanceof Error ? error.message : 'تعذر التصدير' }]); }
    finally { setExporting(false); }
  };



  if (loading) {
    return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  if (!event) {
    return <div className="text-center py-20 text-gray-500">الفعالية غير موجودة.</div>;
  }

  const approvedCount = totals.approved;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center mb-2">
            <Link href="/admin/events" className="text-gray-500 hover:text-gray-900 me-2">
              <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 font-cairo">مكتب التسجيل</h1>
          </div>
          <p className="text-gray-600 text-lg">{event.title}</p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={exportCSV} disabled={exporting} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center shadow-sm disabled:opacity-50">
            <Download size={18} className="me-2" />
            {exporting ? 'جارٍ تصدير الكل…' : 'تصدير جميع التسجيلات (CSV)'}
          </button>
        </div>
      </div>

      {results.length > 0 && <section className="mb-6 rounded-xl border p-4 bg-white" aria-live="polite"><p>نجح {results.filter(item => item.success).length} / {results.length}. فشل {results.filter(item => !item.success).length}.</p>{results.filter(item => !item.success).map(item => <p key={item.id} className="text-red-700">{item.name}: {item.message}</p>)}{retryJob && <button disabled={isUpdatingBulk} onClick={() => performJob(retryJob)} className="mt-3 rounded-lg bg-blue-600 text-white px-4 py-2">إعادة محاولة الفاشل فقط</button>}</section>}
      <p className="mb-4 text-sm text-gray-500">المحمّل {registrations.length} من {totals.all}. التحديد يشمل الصفوف المحمّلة فقط؛ التصدير يشمل الجميع.</p>
      {/* Check-in Desk Link Section */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 mb-6 shadow-sm text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 font-cairo">
            <QrCode size={24} className="text-blue-300" />
            مكتب التحضير (Check-in Desk)
          </h3>
          <p className="text-blue-100 text-sm max-w-lg">
            قم بالانتقال إلى مكتب التحضير لفتح شاشة الـ QR للطلاب، أو استخدام كاميرا الجهاز لمسح بطاقاتهم الجامعية/الرقمية للتحضير السريع والآمن.
          </p>
        </div>
        <Link 
          href={`/admin/events/${eventId}/checkin-desk`}
          className="shrink-0 bg-white text-blue-900 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold transition-colors flex items-center shadow-lg"
        >
          فتح مكتب التحضير
          <ArrowRight className="w-5 h-5 ms-2 rtl:-scale-x-100" />
        </Link>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-blue-800 font-bold">
            تم تحديد {selectedIds.length} مسجل
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              disabled={isUpdatingBulk || isAwarding}
              onClick={() => { pointsBatch.current = null; setShowPointsModal(true); }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
            >
              <Trophy size={16} /> رصد نقاط
            </button>
            <button 
              disabled={isUpdatingBulk}
              onClick={() => handleBulkUpdateStatus('approved')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Check size={16} /> قبول
            </button>
            <button 
              disabled={isUpdatingBulk}
              onClick={() => handleBulkUpdateStatus('waitlisted')}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Clock size={16} /> انتظار
            </button>
            <button 
              disabled={isUpdatingBulk}
              onClick={() => handleBulkUpdateStatus('rejected')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <X size={16} /> رفض
            </button>
            <button 
              disabled={isUpdatingBulk}
              onClick={() => handleBulkUpdateStatus('attended')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <UserCheck size={16} /> تحضير (حضور)
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center me-4">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">إجمالي المسجلين</p>
            <h3 className="text-2xl font-bold text-gray-900">{totals.all}</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="h-12 w-12 rounded-lg bg-green-100 text-green-600 flex items-center justify-center me-4">
            <Check size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">المقبولين (سعة {event.capacity})</p>
            <h3 className="text-2xl font-bold text-gray-900">{approvedCount}</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="h-12 w-12 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center me-4">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">قائمة الانتظار / معلق</p>
            <h3 className="text-2xl font-bold text-gray-900">{totals.waiting}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {registrations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">لا يوجد مسجلين حتى الآن.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-start">
                    <button disabled={isUpdatingBulk || isAwarding} aria-label="تحديد جميع الصفوف المحمّلة" onClick={toggleSelectAll} className="text-gray-400 hover:text-blue-600 transition-colors">
                      {selectedIds.length === registrations.length && registrations.length > 0 ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">الطالب</th>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">تاريخ التسجيل</th>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-4 text-start text-xs font-semibold text-gray-500 uppercase tracking-wider">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {registrations.map((reg) => (
                  <tr key={reg.id} className={`hover:bg-gray-50 ${selectedIds.includes(reg.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <button disabled={isUpdatingBulk || isAwarding} aria-label={`تحديد ${reg.userName}`} onClick={() => toggleSelect(reg.id)} className="text-gray-400 hover:text-blue-600 transition-colors">
                        {selectedIds.includes(reg.id) ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{reg.userName}</div>
                      <div className="text-sm text-gray-500">{reg.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {toDate(reg.timestamp) ? format(toDate(reg.timestamp)!, 'dd MMM yyyy HH:mm', { locale: ar }) : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        reg.status === 'approved' ? 'bg-green-100 text-green-700' :
                        reg.status === 'attended' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        reg.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-700' :
                        reg.status === 'rejected' || reg.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {reg.status === 'attended' ? 'attended (حاضر)' : reg.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-start text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {reg.status !== 'approved' && reg.status !== 'attended' && (
                          <button disabled={isUpdatingBulk || isAwarding} aria-label={`قبول ${reg.userName}`} onClick={() => handleUpdateStatus(reg.id, 'approved')} className="text-green-600 hover:bg-green-50 p-2.5 rounded" title="قبول">
                            <Check size={18} />
                          </button>
                        )}
                        {reg.status === 'approved' && ['Ongoing', 'Completed'].includes(event.state) && (
                          <button disabled={isUpdatingBulk || isAwarding} aria-label={`تحضير ${reg.userName}`} onClick={() => handleUpdateStatus(reg.id, 'attended')} className="text-blue-600 hover:bg-blue-50 p-2.5 rounded" title="تحضير (حضر الفعالية)">
                            <UserCheck size={18} />
                          </button>
                        )}
                        {reg.status !== 'waitlisted' && reg.status !== 'attended' && (
                          <button disabled={isUpdatingBulk || isAwarding} aria-label={`نقل ${reg.userName} إلى الانتظار`} onClick={() => handleUpdateStatus(reg.id, 'waitlisted')} className="text-yellow-600 hover:bg-yellow-50 p-2.5 rounded" title="وضع في قائمة الانتظار">
                            <Clock size={18} />
                          </button>
                        )}
                        {reg.status !== 'rejected' && reg.status !== 'cancelled' && reg.status !== 'attended' && (
                          <button disabled={isUpdatingBulk || isAwarding} aria-label={`رفض ${reg.userName}`} onClick={() => handleUpdateStatus(reg.id, 'rejected')} className="text-red-600 hover:bg-red-50 p-2.5 rounded" title="رفض">
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Points Modal */}
      {showPointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div ref={pointsDialog} role="dialog" aria-modal="true" aria-labelledby="points-dialog-title" className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-4 flex justify-between items-center text-white">
              <h3 id="points-dialog-title" className="text-xl font-bold font-cairo flex items-center gap-2">
                <Trophy size={20} />
                رصد نقاط للمسجلين ({selectedIds.length})
              </h3>
              <button disabled={isAwarding} aria-label="إغلاق نافذة النقاط" onClick={() => setShowPointsModal(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAwardPoints} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">عدد النقاط</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  value={pointsAmount}
                  onChange={e => setPointsAmount(Number(e.target.value))}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">الوصف (يظهر للمستخدم)</label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: حضور الفعالية وتفاعل مميز"
                  value={pointsDesc}
                  onChange={e => setPointsDesc(e.target.value)}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button 
                  type="submit" 
                  disabled={isAwarding}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors"
                >
                  {isAwarding ? 'جاري الرصد...' : 'رصد النقاط الآن'}
                </button>
                <button 
                  type="button"
                  disabled={isAwarding}
                  onClick={() => setShowPointsModal(false)}
                  className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {hasMore && <button disabled={loading} onClick={() => { setLoading(true); setPageCursor(nextCursor); }} className="mt-6 rounded-xl bg-slate-100 px-5 py-3 font-bold disabled:opacity-50">تحميل المزيد / Load more</button>}

    </div>
  );
}
