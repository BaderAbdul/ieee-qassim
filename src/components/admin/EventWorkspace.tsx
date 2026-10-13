'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Link } from '@/i18n/routing';
import type { PlatformEvent, EventState } from '@/lib/types';
import { AdminError, AdminLoading } from './AdminData';

const EventContext = createContext<PlatformEvent | null>(null);
export const useAdminEvent = () => useContext(EventContext);
const arabicStates: Record<EventState, string> = { Draft: 'مسودة', Published: 'منشورة', 'Registration Open': 'التسجيل مفتوح', 'Registration Closed': 'التسجيل مغلق', Ongoing: 'جارية', Completed: 'مكتملة', Archived: 'مؤرشفة' };
export const eventStateLabel = (state: EventState, isAr: boolean) => isAr ? arabicStates[state] || state : state;

export default function EventWorkspace({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>(); const pathname = usePathname(); const isAr = useLocale() === 'ar';
  const [event, setEvent] = useState<PlatformEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [revision, setRevision] = useState(0);
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'events', id), snapshot => {
      setLoading(false);
      if (!snapshot.exists()) { setError(isAr ? 'الفعالية غير موجودة أو لم تعد متاحة.' : 'Event not found or no longer available.'); setEvent(null); return; }
      setError(null); setEvent({ id: snapshot.id, ...snapshot.data() } as PlatformEvent);
    }, reason => { setLoading(false); setError(reason.message); });
    return unsubscribe;
  }, [id, isAr, revision]);
  const base = '/admin/events/' + id;
  const tabs = [
    { path: '', label: isAr ? 'ملخص وتقرير' : 'Summary & report' },
    { path: '/edit', label: isAr ? 'تفاصيل الفعالية' : 'Event details' },
    { path: '/registrations', label: (event?.requiresRegistration === false || event?.type === 'Booth') ? (isAr ? 'سجل الحضور والزوار' : 'Attendance & Visitors') : (isAr ? 'التسجيلات والحضور' : 'Registrations & Attendance') },
    { path: '/checkin-desk', label: isAr ? 'التحضير' : 'Check-in desk' },
    { path: '/certificates', label: isAr ? 'الشهادات' : 'Certificates' },
    { path: '/feedback', label: isAr ? 'التقييمات' : 'Feedback' },
  ];
  if (loading) return <AdminLoading />;
  if (error || !event) return <AdminError message={error || 'Event unavailable'} retry={() => { setLoading(true); setRevision(value => value + 1); }} />;
  return <EventContext.Provider value={event}><div className="space-y-6">
    <header className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm"><Link href="/admin/events" className="text-sm font-bold text-purple-600">{isAr ? '← جميع الفعاليات' : '← All events'}</Link><div className="mt-3 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-black font-cairo text-slate-900">{!isAr && event.titleEn ? event.titleEn : event.title}</h1><p className="mt-2 text-sm text-slate-500">{eventStateLabel(event.state, isAr)} · {isAr ? 'المسجلون:' : 'Registered:'} {event.registeredCount || 0} · {isAr ? 'الحضور:' : 'Attended:'} {event.attendanceCount || 0}</p></div><Link href={`/events/${id}`} className="rounded-lg border px-3 py-2 text-sm font-bold">{isAr ? 'عرض صفحة الطالب' : 'View student page'}</Link></div>
      <nav aria-label={isAr ? 'مساحة عمل الفعالية' : 'Event workspace'} className="mt-5 flex flex-wrap gap-2 border-t pt-4">{tabs.map(tab => {
        const active = tab.path ? pathname.endsWith(base + tab.path) : pathname.endsWith(base);
        return <Link key={tab.path} href={base + tab.path} aria-current={active ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-bold ${active ? 'bg-purple-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-purple-50'}`}>{tab.label}</Link>;
      })}</nav>
    </header>{children}
  </div></EventContext.Provider>;
}
