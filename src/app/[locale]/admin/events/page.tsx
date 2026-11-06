'use client';
import { useEffect, useState, useMemo } from 'react';
import { httpsCallable } from '@/lib/backend';
import type { AdminEventsPage as AdminEventsResult } from '@/lib/adminTypes';
import { toJsDate } from '@/lib/dateUtils';
import type { PlatformEvent, EventState } from '@/lib/types';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import {
  Plus,
  Calendar,
  Users,
  Layers,
  RotateCw,
  Search,
  CheckCircle2,
  QrCode,
  BarChart3,
} from 'lucide-react';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { eventStateLabel } from '@/components/admin/EventWorkspace';
import EventTemplatesModal from '@/components/admin/EventTemplatesModal';
import EventCard, { transitions } from '@/components/admin/events/EventCard';
import { useAdminTopbarActions } from '@/components/admin/AdminTopbarActions';
import {
  getCustomEventTemplates,
  createTemplateFromEvent
} from '@/lib/customEventTemplates';

const DRAFT_STATES: EventState[] = ['Draft', 'Published'];
const OPEN_STATES: EventState[] = ['Registration Open', 'Registration Closed', 'Ongoing'];
const CLOSED_STATES: EventState[] = ['Completed', 'Archived'];

export default function AdminEventsPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'registered'>('date');

  // Custom Templates Modal & State
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [templatesCount, setTemplatesCount] = useState(() => getCustomEventTemplates().length);
  const [savedAsTemplateSuccessId, setSavedAsTemplateSuccessId] = useState<string | null>(null);

  const refreshTemplatesCount = () => {
    setTemplatesCount(getCustomEventTemplates().length);
  };

  useEffect(() => {
    window.addEventListener('ieee-event-templates-updated', refreshTemplatesCount);
    return () => window.removeEventListener('ieee-event-templates-updated', refreshTemplatesCount);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await httpsCallable<unknown, AdminEventsResult>(null, 'getAdminEvents')(cursor ? { cursor } : {});
        if (!active) return;
        const page = data.events;
        setEvents(prev => cursor ? [...prev.filter(item => !page.some(next => next.id === item.id)), ...page] : page);
        setNextCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
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

  const toggleVisibility = async (event: PlatformEvent, nextUnlisted: boolean) => {
    if (busy) return;
    setBusy(event.id);
    setError(null);
    try {
      await httpsCallable(null, 'saveEvent')({ eventId: event.id, isUnlisted: nextUnlisted });
      setEvents(prev => prev.map(item => item.id === event.id ? { ...item, isUnlisted: nextUnlisted } : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update visibility');
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

  const topbarActions = useMemo(() => (
    <>
      <Link
        href="/admin/check-in"
        className="cursor-pointer flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-slate-300 hover:text-white transition-all"
      >
        <QrCode className="w-4 h-4" />
        <span className="hidden lg:inline text-xs font-bold">{isAr ? 'مكتب التحضير' : 'Check-in desk'}</span>
      </Link>
      <Link
        href="/admin/reports"
        className="cursor-pointer flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-slate-300 hover:text-white transition-all"
      >
        <BarChart3 className="w-4 h-4" />
        <span className="hidden lg:inline text-xs font-bold">{isAr ? 'تقرير تفصيلي' : 'Detailed report'}</span>
      </Link>
      <button
        type="button"
        onClick={() => setIsTemplatesModalOpen(true)}
        className="cursor-pointer flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-slate-300 hover:text-white transition-all"
      >
        <Layers className="w-4 h-4" />
        <span className="hidden lg:inline text-xs font-bold">{isAr ? 'قوالب الفعاليات' : 'Event Templates'}</span>
        <span className="text-xs font-bold">({templatesCount})</span>
      </button>
      <Link
        href="/admin/events/create"
        className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] hover:opacity-90 px-3.5 py-2 text-xs font-bold text-[var(--color-accent-contrast)] transition-opacity"
      >
        <Plus size={16} />
        <span>{isAr ? 'إنشاء فعالية' : 'Create Event'}</span>
      </Link>
    </>
  ), [isAr, templatesCount]);
  useAdminTopbarActions(topbarActions);

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
        if (sortBy === 'registered') {
          return (b.registeredCount || 0) - (a.registeredCount || 0);
        }
        // Default: by date
        const dateA = toJsDate(a.date)?.getTime() || 0;
        const dateB = toJsDate(b.date)?.getTime() || 0;
        return dateB - dateA;
      });
  }, [events, statusFilter, typeFilter, search, sortBy]);

  return (
    <div className="space-y-6 pb-12">
      {/* Metrics Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Events */}
        <div className="bg-[var(--color-surface)]/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[var(--color-border)]/50 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-[var(--color-accent-soft)] text-[var(--color-accent)] rounded-xl">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--color-text-muted)] block">
              {isAr ? 'إجمالي الفعاليات' : 'Total Events'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-[var(--color-text-primary)] font-cairo">
              {metrics.total}
            </span>
          </div>
        </div>

        {/* Active Events */}
        <div className="bg-[var(--color-surface)]/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[var(--color-border)]/50 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--color-text-muted)] block">
              {isAr ? 'النشطة / التسجيل متاح' : 'Active / Open'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-[var(--color-text-primary)] font-cairo">
              {metrics.active}
            </span>
          </div>
        </div>

        {/* Registered / Attended */}
        <div className="bg-[var(--color-surface)]/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[var(--color-border)]/50 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--color-text-muted)] block">
              {isAr ? 'المسجلون / الحضور' : 'Registered / Attended'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-[var(--color-text-primary)] font-cairo">
              {metrics.totalRegistered} <span className="text-xs font-normal text-[var(--color-text-muted)]">({metrics.totalAttended} حضروا)</span>
            </span>
          </div>
        </div>

        {/* Saved Templates */}
        <div 
          onClick={() => setIsTemplatesModalOpen(true)}
          className="bg-[var(--color-surface)]/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[var(--color-border)]/50 shadow-sm flex items-center gap-3.5 cursor-pointer hover:border-indigo-300 transition-all group"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex-1">
            <span className="text-xs font-bold text-[var(--color-text-muted)] block">
              {isAr ? 'القوالب المحفوظة' : 'Saved Templates'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-indigo-900 font-cairo">
              {templatesCount}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Sorting */}
      <div className="bg-[var(--color-surface)]/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[var(--color-border)]/50 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            aria-label={isAr ? 'بحث في الفعاليات' : 'Search events'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isAr ? 'ابحث باسم الفعالية، الوصف، أو المكان…' : 'Search by title, description, or location…'}
            className="w-full pr-10 pl-4 py-2.5 text-xs sm:text-sm bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl focus:bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] text-xs"
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
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-xs font-bold text-[var(--color-text-secondary)] focus:bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-accent)]"
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
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-xs font-bold text-[var(--color-text-secondary)] focus:bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-accent)]"
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
            onChange={e => setSortBy(e.target.value as 'date' | 'registered')}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-xs font-bold text-[var(--color-text-secondary)] focus:bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="date">{isAr ? 'الأحدث تاريخاً' : 'Latest date'}</option>
            <option value="registered">{isAr ? 'الأكثر تسجيلاً' : 'Most registered'}</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => { setCursor(null); setRevision(v => v + 1); }}
            disabled={loading || busy !== null}
            className="cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] px-3.5 py-2.5 text-xs font-bold text-[var(--color-text-secondary)] disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
            title={isAr ? 'تحديث البيانات' : 'Refresh'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && <AdminError message={error} retry={() => setRevision(v => v + 1)} />}

      {/* Events, grouped by status */}
      {!events.length && loading ? (
        <AdminLoading />
      ) : (
        <div className="flex flex-col gap-8">
          {([
            { key: 'draft', label: isAr ? 'مسودة ومعالجة' : 'Draft & processing', states: DRAFT_STATES, accent: false },
            { key: 'open', label: isAr ? 'مفتوحة الآن' : 'Open now', states: OPEN_STATES, accent: true },
            { key: 'closed', label: isAr ? 'مغلقة ومكتملة' : 'Closed & completed', states: CLOSED_STATES, accent: false },
          ] as const).map((group) => {
            const groupEvents = visible.filter((event) => group.states.includes(event.state));
            if (!groupEvents.length) return null;
            return (
              <div key={group.key} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold uppercase tracking-wide ${group.accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {groupEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isAr={isAr}
                      locale={locale}
                      busy={busy === event.id}
                      isJustSavedTemplate={savedAsTemplateSuccessId === event.id}
                      onChangeState={(state) => void changeState(event, state)}
                      onToggleVisibility={(nextUnlisted) => void toggleVisibility(event, nextUnlisted)}
                      onSaveTemplate={() => handleSaveEventAsTemplate(event)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !visible.length && (
        <div className="bg-[var(--color-surface)]/60 backdrop-blur-md rounded-3xl border border-[var(--color-border)]/50 p-12 text-center">
          <div className="w-14 h-14 bg-[var(--color-surface-2)] rounded-2xl flex items-center justify-center mx-auto mb-3 text-[var(--color-text-muted)]">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[var(--color-text-primary)] font-cairo">
            {isAr ? 'لا توجد فعاليات مطابقة' : 'No matching events'}
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-sm mx-auto">
            {search || statusFilter || typeFilter
              ? (isAr ? 'لم نجد أي نتائج للمرشحات المحددة. جرب تغيير البحث أو إلغاء التصفية.' : 'No results found. Try clearing your search or filters.')
              : (isAr ? 'لم يتم إضافة فعاليات بعد. ابدأ بإنشاء فعاليتك الأولى الآن!' : 'No events created yet. Start creating your first event!')}
          </p>
          {(search || statusFilter || typeFilter) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }}
              className="mt-4 bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold text-xs px-4 py-2 rounded-xl hover:opacity-80 transition-all"
            >
              {isAr ? 'إعادة ضبط التصفية' : 'Reset filters'}
            </button>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface)]/60 backdrop-blur-md p-4 rounded-2xl border border-[var(--color-border)]/50 shadow-sm">
        <p className="text-xs text-[var(--color-text-secondary)]">
          {isAr ? 'الفعاليات المعروضة:' : 'Showing:'} <strong>{visible.length}</strong> {isAr ? 'من أصل' : 'of'} {events.length}
        </p>
        {hasMore && (
          <button
            disabled={loading}
            onClick={() => setCursor(nextCursor)}
            className="rounded-xl bg-[var(--color-accent-soft)] hover:opacity-80 text-[var(--color-accent)] text-xs font-bold px-4 py-2 disabled:opacity-50 transition-all"
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
