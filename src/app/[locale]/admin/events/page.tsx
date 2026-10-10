'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, documentId, startAfter, limit, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { httpsCallable } from '@/lib/backend';
import type { PlatformEvent, EventState } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { Plus, Pin, ArrowUpRight } from 'lucide-react';
import { AdminError, AdminLoading, formatAdminDate } from '@/components/admin/AdminData';
import { eventStateLabel } from '@/components/admin/EventWorkspace';

const transitions: Record<EventState, EventState[]> = {
  Draft: ['Published', 'Archived'], Published: ['Draft', 'Registration Open', 'Archived'],
  'Registration Open': ['Registration Closed', 'Ongoing', 'Archived'],
  'Registration Closed': ['Registration Open', 'Ongoing', 'Archived'],
  Ongoing: ['Completed'], Completed: ['Archived'], Archived: [],
};
export default function AdminEventsPage() {
  const locale = useLocale(); const isAr = locale === 'ar';
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [nextCursor, setNextCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false); const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState(''); const [search, setSearch] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const result = await getDocs(query(collection(db, 'events'), orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(25)));
        if (!active) return;
        const page = result.docs.map(item => ({ id: item.id, ...item.data() } as PlatformEvent));
        setEvents(previous => cursor ? [...previous.filter(item => !page.some(next => next.id === item.id)), ...page] : page);
        setNextCursor(result.docs.at(-1) || null); setHasMore(result.size === 25);
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load events'); }
      finally { if (active) setLoading(false); }
    };
    void load(); return () => { active = false; };
  }, [cursor, revision]);
  const changeState = async (event: PlatformEvent, state: EventState) => {
    if (busy || state === event.state) return;
    if (!window.confirm(isAr ? 'تغيير حالة «' + event.title + '» إلى «' + eventStateLabel(state, true) + '»؟' : 'Change ' + event.title + ' to ' + state + '?')) return;
    setBusy(event.id); setError(null);
    try { await httpsCallable(null, 'changeEventState')({ eventId: event.id, state }); setEvents(previous => previous.map(item => item.id === event.id ? { ...item, state } : item)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to change state'); }
    finally { setBusy(null); }
  };
  const togglePin = async (event: PlatformEvent) => {
    if (busy) return; setBusy(event.id); setError(null);
    try { await httpsCallable(null, 'saveEvent')({ eventId: event.id, isPinned: !event.isPinned }); setEvents(previous => previous.map(item => item.id === event.id ? { ...item, isPinned: !event.isPinned } : item)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update pin'); }
    finally { setBusy(null); }
  };
  const visible = events.filter(event => (!filter || event.state === filter) && (event.title + ' ' + (event.titleEn || '')).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-black font-cairo">{isAr ? 'إدارة الفعاليات' : 'Event management'}</h1><p className="mt-2 text-sm text-slate-500">{isAr ? 'افتح مساحة الفعالية لإدارة التسجيل والحضور والشهادات. الأرشفة تحفظ السجلات بدل حذفها.' : 'Open an event workspace to manage registration, attendance and certificates. Archiving preserves its records.'}</p></div><Link href="/admin/events/create" className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-3 font-bold text-white"><Plus size={18} />{isAr ? 'إنشاء فعالية' : 'Create event'}</Link></header>
    <div className="flex flex-wrap gap-3"><input aria-label={isAr ? 'بحث في الفعاليات المحملة' : 'Search loaded events'} value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? 'بحث في الفعاليات المحملة…' : 'Search loaded events…'} className="min-w-0 flex-1 rounded-xl border bg-white px-4 py-2" /><select aria-label={isAr ? 'تصفية الحالة' : 'Filter status'} value={filter} onChange={e => setFilter(e.target.value)} className="rounded-xl border bg-white px-3 py-2"><option value="">{isAr ? 'كل الحالات' : 'All statuses'}</option>{Object.keys(transitions).map(state => <option key={state} value={state}>{eventStateLabel(state as EventState, isAr)}</option>)}</select><button onClick={() => { setCursor(null); setRevision(value => value + 1); }} disabled={loading || busy !== null} className="rounded-xl border bg-white px-4 py-2 disabled:opacity-50">{isAr ? 'تحديث' : 'Refresh'}</button></div>
    {error && <AdminError message={error} retry={() => setRevision(value => value + 1)} />}
    {!events.length && loading ? <AdminLoading /> : <div className="grid gap-4 lg:grid-cols-2">{visible.map(event => {
      const date = event.date instanceof Date ? event.date : event.date?.toDate?.();
      return <article key={event.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><Link href={'/admin/events/' + event.id} className="min-w-0"><h2 className="text-lg font-bold text-slate-900">{!isAr && event.titleEn ? event.titleEn : event.title}</h2><p className="mt-1 text-xs text-slate-500">{formatAdminDate(date?.toISOString(), locale)}</p></Link><button disabled={busy !== null} onClick={() => void togglePin(event)} aria-label={event.isPinned ? (isAr ? 'إلغاء التثبيت' : 'Unpin event') : (isAr ? 'تثبيت الفعالية' : 'Pin event')} aria-pressed={!!event.isPinned} className="rounded-lg bg-slate-50 p-2 text-amber-600 disabled:opacity-50"><Pin size={18} className={event.isPinned ? 'fill-current' : ''} /></button></div>
        <p className="mt-4 text-sm text-purple-700">{eventStateLabel(event.state, isAr)}</p><p className="mt-2 text-sm text-slate-500">{isAr ? 'المسجلون:' : 'Registered:'} {event.registeredCount || 0} / {event.isUnlimitedCapacity ? '∞' : event.capacity} · {isAr ? 'الحضور:' : 'Attended:'} {event.attendanceCount || 0}</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><Link href={'/admin/events/' + event.id} className="inline-flex items-center gap-2 text-sm font-bold text-purple-600">{isAr ? 'فتح مساحة العمل' : 'Open workspace'}<ArrowUpRight size={16} /></Link>{transitions[event.state]?.length ? <select aria-label={isAr ? 'تغيير حالة ' + event.title : 'Change event state'} value={event.state} disabled={busy !== null} onChange={e => void changeState(event, e.target.value as EventState)} className="max-w-full rounded-lg border px-3 py-2 text-xs disabled:opacity-50"><option value={event.state}>{eventStateLabel(event.state, isAr)}</option>{transitions[event.state].map(state => <option key={state} value={state}>{eventStateLabel(state, isAr)}</option>)}</select> : <span className="text-xs text-slate-400">{isAr ? 'السجلات محفوظة في الأرشيف' : 'Records retained in archive'}</span>}</div>
      </article>;
    })}</div>}
    {!loading && !error && !visible.length && <p className="rounded-xl border bg-white p-6 text-slate-500">{isAr ? 'لا توجد نتائج ضمن الفعاليات المحملة. غيّر المرشح أو حمّل المزيد.' : 'No matching loaded events. Change filters or load more.'}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{isAr ? 'عدد الفعاليات المحملة:' : 'Loaded events:'} {events.length} · {isAr ? 'البحث والتصفية في المحمل فقط' : 'Search and filters apply to loaded events only'}</p>{hasMore && <button disabled={loading} onClick={() => setCursor(nextCursor)} className="rounded-xl border bg-white px-4 py-2 disabled:opacity-50">{isAr ? 'تحميل المزيد' : 'Load more'}</button>}</div>
  </div>;
}
