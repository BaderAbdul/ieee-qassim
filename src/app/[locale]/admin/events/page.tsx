'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  documentId, 
  startAfter, 
  limit, 
  type QueryDocumentSnapshot, 
  type DocumentData 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { httpsCallable } from '@/lib/backend';
import type { PlatformEvent, EventState, EventType } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { 
  Plus, 
  Pin, 
  ArrowUpRight, 
  Calendar, 
  Clock, 
  Users, 
  Award, 
  QrCode, 
  Edit3, 
  Layers, 
  RotateCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  Sparkles,
  MapPin,
  Check
} from 'lucide-react';
import { AdminError, AdminLoading, formatAdminDate } from '@/components/admin/AdminData';
import { eventStateLabel } from '@/components/admin/EventWorkspace';
import EventTemplatesModal from '@/components/admin/EventTemplatesModal';
import { 
  getCustomEventTemplates, 
  createTemplateFromEvent 
} from '@/lib/customEventTemplates';

const transitions: Record<EventState, EventState[]> = {
  Draft: ['Published', 'Archived'],
  Published: ['Draft', 'Registration Open', 'Archived'],
  'Registration Open': ['Registration Closed', 'Ongoing', 'Archived'],
  'Registration Closed': ['Registration Open', 'Ongoing', 'Archived'],
  Ongoing: ['Completed'],
  Completed: ['Archived'],
  Archived: [],
};

const stateBadgeColors: Record<EventState, { bg: string; text: string; border: string }> = {
  Draft: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  Published: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Registration Open': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Registration Closed': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Ongoing: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Completed: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  Archived: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
};

export default function AdminEventsPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [nextCursor, setNextCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'registered' | 'pinned'>('date');

  // Custom Templates Modal & State
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [templatesCount, setTemplatesCount] = useState(0);
  const [savedAsTemplateSuccessId, setSavedAsTemplateSuccessId] = useState<string | null>(null);

  const refreshTemplatesCount = () => {
    setTemplatesCount(getCustomEventTemplates().length);
  };

  useEffect(() => {
    refreshTemplatesCount();
    window.addEventListener('ieee-event-templates-updated', refreshTemplatesCount);
    return () => window.removeEventListener('ieee-event-templates-updated', refreshTemplatesCount);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getDocs(
          query(
            collection(db, 'events'),
            orderBy(documentId()),
            ...(cursor ? [startAfter(cursor)] : []),
            limit(25)
          )
        );
        if (!active) return;
        const page = result.docs.map(item => ({ id: item.id, ...item.data() } as PlatformEvent));
        setEvents(prev => cursor ? [...prev.filter(item => !page.some(next => next.id === item.id)), ...page] : page);
        setNextCursor(result.docs.at(-1) || null);
        setHasMore(result.size === 25);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load events');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [cursor, revision]);

  const changeState = async (event: PlatformEvent, state: EventState) => {
    if (busy || state === event.state) return;
    if (!window.confirm(isAr ? `تغيير حالة «${event.title}» إلى «${eventStateLabel(state, true)}»؟` : `Change ${event.title} to ${state}?`)) return;
    
    setBusy(event.id);
    setError(null);
    try {
      await httpsCallable(null, 'changeEventState')({ eventId: event.id, state });
      setEvents(prev => prev.map(item => item.id === event.id ? { ...item, state } : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to change state');
    } finally {
      setBusy(null);
    }
  };

  const togglePin = async (event: PlatformEvent) => {
    if (busy) return;
    setBusy(event.id);
    setError(null);
    try {
      await httpsCallable(null, 'saveEvent')({ eventId: event.id, isPinned: !event.isPinned });
      setEvents(prev => prev.map(item => item.id === event.id ? { ...item, isPinned: !event.isPinned } : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update pin');
    } finally {
      setBusy(null);
    }
  };

  const handleSaveEventAsTemplate = (event: PlatformEvent) => {
    const customName = prompt(
      isAr ? 'أدخل اسماً لهذا القالب الجديد:' : 'Enter a name for this new template:',
      `قالب: ${event.title}`
    );
    if (!customName) return;

    createTemplateFromEvent(event, customName.trim());
    setSavedAsTemplateSuccessId(event.id);
    refreshTemplatesCount();
    setTimeout(() => setSavedAsTemplateSuccessId(null), 2500);
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = events.length;
    const active = events.filter(e => e.state === 'Registration Open' || e.state === 'Ongoing').length;
    const totalRegistered = events.reduce((sum, e) => sum + (e.registeredCount || 0), 0);
    const totalAttended = events.reduce((sum, e) => sum + (e.attendanceCount || 0), 0);
    return { total, active, totalRegistered, totalAttended };
  }, [events]);

  // Filtered and sorted events
  const visible = useMemo(() => {
    return events
      .filter(event => {
        if (statusFilter && event.state !== statusFilter) return false;
        if (typeFilter && event.type !== typeFilter) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        const titleMatch = (event.title || '').toLowerCase().includes(q);
        const titleEnMatch = (event.titleEn || '').toLowerCase().includes(q);
        const locationMatch = (event.location || '').toLowerCase().includes(q);
        return titleMatch || titleEnMatch || locationMatch;
      })
      .sort((a, b) => {
        if (sortBy === 'pinned') {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
        }
        if (sortBy === 'registered') {
          return (b.registeredCount || 0) - (a.registeredCount || 0);
        }
        // Default: by date
        const dateA = a.date instanceof Date ? a.date.getTime() : a.date?.toDate?.()?.getTime() || 0;
        const dateB = b.date instanceof Date ? b.date.getTime() : b.date?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });
  }, [events, statusFilter, typeFilter, search, sortBy]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 text-white rounded-2xl shadow-sm">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black font-cairo text-slate-900">
                {isAr ? 'إدارة الفعاليات' : 'Event Management'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {isAr 
                  ? 'متابعة شاملة للفعاليات، إدارة الحضور والتسجيل، والتحكم بالقوالب المخصصة.' 
                  : 'Complete overview of events, attendance, registrations, and custom templates.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Custom Templates Button */}
          <button
            type="button"
            onClick={() => setIsTemplatesModalOpen(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs sm:text-sm font-bold px-4 py-3 rounded-2xl transition-all flex items-center gap-2 shadow-sm"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>{isAr ? 'قوالب الفعاليات' : 'Event Templates'} ({templatesCount})</span>
          </button>

          {/* Create Event Button */}
          <Link
            href="/admin/events/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-700 px-5 py-3 text-xs sm:text-sm font-bold text-white transition-all shadow-md hover:shadow-lg"
          >
            <Plus size={18} />
            <span>{isAr ? 'إنشاء فعالية جديدة' : 'Create Event'}</span>
          </Link>
        </div>
      </header>

      {/* Metrics Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Events */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">
              {isAr ? 'إجمالي الفعاليات' : 'Total Events'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-cairo">
              {metrics.total}
            </span>
          </div>
        </div>

        {/* Active Events */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">
              {isAr ? 'النشطة / التسجيل متاح' : 'Active / Open'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-cairo">
              {metrics.active}
            </span>
          </div>
        </div>

        {/* Registered / Attended */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">
              {isAr ? 'المسجلون / الحضور' : 'Registered / Attended'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-cairo">
              {metrics.totalRegistered} <span className="text-xs font-normal text-slate-400">({metrics.totalAttended} حضروا)</span>
            </span>
          </div>
        </div>

        {/* Saved Templates */}
        <div 
          onClick={() => setIsTemplatesModalOpen(true)}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5 cursor-pointer hover:border-indigo-300 transition-all group"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1">
            <span className="text-xs font-bold text-slate-400 block">
              {isAr ? 'القوالب المحفوظة' : 'Saved Templates'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-indigo-900 font-cairo">
              {templatesCount}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Sorting */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            aria-label={isAr ? 'بحث في الفعاليات' : 'Search events'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isAr ? 'ابحث باسم الفعالية، الوصف، أو المكان…' : 'Search by title, description, or location…'}
            className="w-full pr-10 pl-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              مسح
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            aria-label={isAr ? 'تصفية الحالة' : 'Filter status'}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="">{isAr ? 'كل الحالات' : 'All statuses'}</option>
            {Object.keys(transitions).map(state => (
              <option key={state} value={state}>
                {eventStateLabel(state as EventState, isAr)}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            aria-label={isAr ? 'تصفية النوع' : 'Filter type'}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="">{isAr ? 'كل الأنواع' : 'All types'}</option>
            <option value="Workshop">{isAr ? 'ورشة عمل' : 'Workshop'}</option>
            <option value="Lecture">{isAr ? 'محاضرة' : 'Lecture'}</option>
            <option value="Camp">{isAr ? 'معسكر' : 'Camp'}</option>
            <option value="Competition">{isAr ? 'مسابقة' : 'Competition'}</option>
            <option value="Booth">{isAr ? 'زيارة بوث' : 'Booth'}</option>
            <option value="Meetup">{isAr ? 'لقاء' : 'Meetup'}</option>
          </select>

          {/* Sorting */}
          <select
            aria-label={isAr ? 'الترتيب' : 'Sort by'}
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="date">{isAr ? 'الأحدث تاريخاً' : 'Latest date'}</option>
            <option value="registered">{isAr ? 'الأكثر تسجيلاً' : 'Most registered'}</option>
            <option value="pinned">{isAr ? 'المثبتة أولاً' : 'Pinned first'}</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => { setCursor(null); setRevision(v => v + 1); }}
            disabled={loading || busy !== null}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
            title={isAr ? 'تحديث البيانات' : 'Refresh'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && <AdminError message={error} retry={() => setRevision(v => v + 1)} />}

      {/* Events Grid */}
      {!events.length && loading ? (
        <AdminLoading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map(event => {
            const date = event.date instanceof Date ? event.date : event.date?.toDate?.();
            const badge = stateBadgeColors[event.state] || stateBadgeColors.Draft;
            const isJustSavedTemplate = savedAsTemplateSuccessId === event.id;

            return (
              <article 
                key={event.id} 
                className={`rounded-3xl border bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                  event.isPinned ? 'border-amber-300 ring-1 ring-amber-100 bg-amber-50/20' : 'border-slate-200/90'
                }`}
              >
                <div>
                  {/* Top Badges & Pin Button */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* State Badge */}
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {eventStateLabel(event.state, isAr)}
                      </span>

                      {/* Type Badge */}
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60">
                        {event.type}
                      </span>

                      {/* Certificate Badge */}
                      {event.hasCertificate && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>شهادة</span>
                        </span>
                      )}

                      {/* Points Badge */}
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
                        +{event.points} نقطة
                      </span>
                    </div>

                    {/* Pin Toggle */}
                    <button
                      disabled={busy !== null}
                      onClick={() => void togglePin(event)}
                      aria-label={event.isPinned ? (isAr ? 'إلغاء التثبيت' : 'Unpin event') : (isAr ? 'تثبيت الفعالية' : 'Pin event')}
                      aria-pressed={!!event.isPinned}
                      className={`rounded-xl p-2 transition-all ${
                        event.isPinned 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-slate-100 text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                      }`}
                      title={event.isPinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'}
                    >
                      <Pin size={16} className={event.isPinned ? 'fill-current' : ''} />
                    </button>
                  </div>

                  {/* Title & Date */}
                  <Link href={`/admin/events/${event.id}`} className="group block mb-3">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors font-cairo">
                      {!isAr && event.titleEn ? event.titleEn : event.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatAdminDate(date?.toISOString(), locale)}</span>
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]">{event.location}</span>
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Capacity & Attendance Summary Bar */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        {isAr ? 'المسجلون:' : 'Registered:'} <strong className="text-slate-900">{event.registeredCount || 0}</strong> / {event.isUnlimitedCapacity ? '∞' : event.capacity}
                      </span>
                      <span className="text-purple-700 font-bold">
                        {isAr ? 'الحضور الفعلي:' : 'Attended:'} {event.attendanceCount || 0}
                      </span>
                    </div>

                    {!event.isUnlimitedCapacity && event.capacity && (
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.round(((event.registeredCount || 0) / event.capacity) * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    {/* Workspace */}
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                    >
                      <span>{isAr ? 'مساحة العمل' : 'Workspace'}</span>
                      <ArrowUpRight size={14} />
                    </Link>

                    {/* Check-in Desk */}
                    <Link
                      href={`/admin/events/${event.id}/checkin-desk`}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold p-2 rounded-xl transition-all"
                      title={isAr ? 'مكتب التحضير المباشر' : 'Check-in Desk'}
                    >
                      <QrCode size={15} />
                    </Link>

                    {/* Edit Event */}
                    <Link
                      href={`/admin/events/${event.id}/edit`}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold p-2 rounded-xl transition-all"
                      title={isAr ? 'تعديل الفعالية' : 'Edit Event'}
                    >
                      <Edit3 size={15} />
                    </Link>

                    {/* Save As Template Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveEventAsTemplate(event)}
                      className={`text-xs font-bold px-2.5 py-2 rounded-xl transition-all flex items-center gap-1 border ${
                        isJustSavedTemplate
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200/70'
                      }`}
                      title={isAr ? 'نسخ وحفظ كقالب جديد' : 'Save as Template'}
                    >
                      {isJustSavedTemplate ? (
                        <>
                          <Check size={14} />
                          <span className="hidden sm:inline">تم الحفظ!</span>
                        </>
                      ) : (
                        <>
                          <Layers size={14} className="text-indigo-600" />
                          <span className="hidden sm:inline">{isAr ? 'حفظ كقالب' : 'Template'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status Transition Selector */}
                  {transitions[event.state]?.length ? (
                    <select
                      aria-label={isAr ? `تغيير حالة ${event.title}` : `Change ${event.title} state`}
                      value={event.state}
                      disabled={busy !== null}
                      onChange={e => void changeState(event, e.target.value as EventState)}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      <option value={event.state}>{eventStateLabel(event.state, isAr)}</option>
                      {transitions[event.state].map(st => (
                        <option key={st} value={st}>
                          {eventStateLabel(st, isAr)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {isAr ? 'مؤرشفة' : 'Archived'}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !visible.length && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 font-cairo">
            {isAr ? 'لا توجد فعاليات مطابقة' : 'No matching events'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter || typeFilter
              ? (isAr ? 'لم نجد أي نتائج للمرشحات المحددة. جرب تغيير البحث أو إلغاء التصفية.' : 'No results found. Try clearing your search or filters.')
              : (isAr ? 'لم يتم إضافة فعاليات بعد. ابدأ بإنشاء فعاليتك الأولى الآن!' : 'No events created yet. Start creating your first event!')}
          </p>
          {(search || statusFilter || typeFilter) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }}
              className="mt-4 bg-purple-50 text-purple-700 font-bold text-xs px-4 py-2 rounded-xl hover:bg-purple-100 transition-all"
            >
              {isAr ? 'إعادة ضبط التصفية' : 'Reset filters'}
            </button>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <p className="text-xs text-slate-500">
          {isAr ? 'الفعاليات المعروضة:' : 'Showing:'} <strong>{visible.length}</strong> {isAr ? 'من أصل' : 'of'} {events.length}
        </p>
        {hasMore && (
          <button
            disabled={loading}
            onClick={() => setCursor(nextCursor)}
            className="rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold px-4 py-2 disabled:opacity-50 transition-all"
          >
            {isAr ? 'تحميل المزيد من الفعاليات' : 'Load more events'}
          </button>
        )}
      </div>

      {/* Event Templates Modal */}
      <EventTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        mode="manage"
      />
    </div>
  );
}
