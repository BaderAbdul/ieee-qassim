'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Users, ListTodo, ArrowRightLeft, ClipboardList, Sparkles, ChevronDown } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { hasPrivilege, useAuth } from '@/context/AuthContext';
import type { AdminOverview, AdminEventsPage, AdminEventSummary } from '@/lib/adminTypes';
import { AdminError, AdminLoading, useAdminQuery } from '@/components/admin/AdminData';
import AdminCalendar, { type CalendarEvent, type VacationSettings } from '@/components/admin/home/AdminCalendar';
import DayDetailsPanel from '@/components/admin/home/DayDetailsPanel';
import HomeEventsTable from '@/components/admin/home/HomeEventsTable';
import {
  overviewApi, projectsApi, crossTeamRequestsApi, tasksApi,
  type RemainingTasksEntry, type CrossTeamRequest, type Project, type TCTask,
} from '@/lib/taskCenterApi';

function RequestsPanel({ icon: Icon, title, children, isEmpty, emptyLabel }: {
  icon: typeof ArrowRightLeft; title: string; children: React.ReactNode; isEmpty: boolean; emptyLabel: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-5 shadow-xs flex flex-col">
      <h3 className="text-sm font-black font-cairo text-[var(--color-text-primary)] flex items-center gap-2 mb-4">
        <Icon size={17} className="text-[var(--color-accent)]" />
        {title}
      </h3>
      <div className="flex-1 space-y-2">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center py-6 border border-dashed border-[var(--color-border)] rounded-2xl">
            <Sparkles className="text-[var(--color-text-muted)] mb-2" size={22} />
            <p className="text-xs text-[var(--color-text-muted)] max-w-[220px]">{emptyLabel}</p>
          </div>
        ) : children}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const locale = useLocale(); const isAr = locale === 'ar';
  const { userData } = useAuth();
  const { data, loading, error, refresh } = useAdminQuery<AdminOverview>('getAdminOverview');
  const { data: eventsPage } = useAdminQuery<AdminEventsPage>('getAdminEvents');
  const { data: vacation } = useAdminQuery<VacationSettings>('getVacationDays');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [remainingTasks, setRemainingTasks] = useState<RemainingTasksEntry[]>([]);
  const [showRemainingBreakdown, setShowRemainingBreakdown] = useState(false);
  const [crossTeamRequests, setCrossTeamRequests] = useState<CrossTeamRequest[]>([]);
  const [leaderTasks, setLeaderTasks] = useState<TCTask[]>([]);
  const [projectDeadlines, setProjectDeadlines] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<TCTask[]>([]);

  const ledTeams = (userData?.teams || []).filter(team => team.isLeader);

  // Each home-page widget is its own privilege: the calendar's three layers, the task counters and
  // the inter-team requests. A widget the user can't use is hidden instead of failing quietly.
  const canSeeTasks = hasPrivilege(userData, 'tasks.read');
  const canSeeRequests = hasPrivilege(userData, 'cross_team_requests.read');
  const showEventsOnCalendar = hasPrivilege(userData, 'calendar_events.read') && hasPrivilege(userData, 'events.read');
  const showProjectsOnCalendar = hasPrivilege(userData, 'calendar_projects.read') && hasPrivilege(userData, 'projects.read');
  const showTasksOnCalendar = hasPrivilege(userData, 'calendar_tasks.read') && canSeeTasks;

  useEffect(() => {
    if (canSeeTasks) void overviewApi.remainingTasks().then(setRemainingTasks).catch(() => {});
    if (canSeeRequests) void crossTeamRequestsApi.listAll().then(setCrossTeamRequests).catch(() => {});
    if (showProjectsOnCalendar) void projectsApi.list().then(setProjectDeadlines).catch(() => {});
    if (showTasksOnCalendar) void tasksApi.list().then(setAllTasks).catch(() => {});
  }, [canSeeTasks, canSeeRequests, showProjectsOnCalendar, showTasksOnCalendar]);

  useEffect(() => {
    if (ledTeams.length === 0 || !canSeeTasks) { setLeaderTasks([]); return; }
    void Promise.all(ledTeams.map(team => tasksApi.list({ teamId: team.id })))
      .then(lists => setLeaderTasks(lists.flat().filter(task => task.status !== 'done').slice(0, 8)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.teams?.length]);

  const events: AdminEventSummary[] = (eventsPage?.events ?? data?.events ?? []).map(e => ({
    id: e.id,
    title: e.title,
    titleEn: e.titleEn,
    state: e.state,
    date: typeof e.date === 'string' ? e.date : e.date ? new Date(e.date).toISOString() : undefined,
    registeredCount: e.registeredCount,
    attendanceCount: e.attendanceCount,
    capacity: e.capacity,
    isUnlimitedCapacity: e.isUnlimitedCapacity,
  }));

  const calendarEvents: CalendarEvent[] = [
    ...(showEventsOnCalendar ? events : []).map(e => ({ id: e.id, title: e.title, titleEn: e.titleEn, date: e.date, kind: 'event' as const, completed: e.state === 'Completed' })),
    ...projectDeadlines.filter(p => p.deadline).map(p => ({ id: p.id, title: p.name, date: p.deadline!, kind: 'projectDeadline' as const })),
    ...allTasks.filter(task => task.deadline).map(task => ({ id: task.id, title: task.title, date: task.deadline!, kind: 'taskDeadline' as const })),
  ];

  const totalRemaining = remainingTasks.reduce((sum, u) => sum + u.remainingCount, 0);

  return (
    <div className="space-y-6">
      {error ? (
        <AdminError message={error} retry={refresh} />
      ) : loading && !data ? (
        <AdminLoading />
      ) : data ? (
        <>
          {/* Calendar + KPIs/day details */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-stretch">
            <div className="lg:col-span-2">
              <AdminCalendar events={calendarEvents} isAr={isAr} selected={selectedDay} onSelectDay={setSelectedDay} vacation={vacation ?? null} />
            </div>
            <div className="flex flex-col gap-3 min-h-0">
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-4 shadow-xs">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-contrast)' }}>
                    <Users size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider truncate">{isAr ? 'إجمالي الأعضاء' : 'Participants'}</p>
                  <p className="mt-0.5 text-xl font-black text-[var(--color-text-primary)] font-cairo">{data.counts.users.toLocaleString(locale)}</p>
                </div>

                {canSeeTasks && <button type="button" onClick={() => setShowRemainingBreakdown(v => !v)}
                        className="text-start cursor-pointer rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-4 shadow-xs hover:border-[var(--color-accent)]/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                      <ListTodo size={16} />
                    </div>
                    <ChevronDown size={14} className={`text-[var(--color-text-muted)] transition-transform ${showRemainingBreakdown ? 'rotate-180' : ''}`} />
                  </div>
                  <p className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider truncate">{isAr ? 'المهام المتبقية' : 'Remaining tasks'}</p>
                  <p className="mt-0.5 text-xl font-black text-[var(--color-text-primary)] font-cairo">{totalRemaining}</p>
                </button>}
              </div>

              {canSeeTasks && showRemainingBreakdown && (
                <div className="shrink-0 rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-3 shadow-xs max-h-48 overflow-y-auto space-y-1">
                  {remainingTasks.length ? remainingTasks.map(u => (
                    <Link key={u.userId} href={`/admin/operations?tab=tasks&assigneeId=${u.userId}`}
                          className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs hover:bg-[var(--color-surface-2)]">
                      <span className="font-bold truncate">{u.name}</span>
                      <span className="shrink-0 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] px-2 py-0.5 font-black">{u.remainingCount}</span>
                    </Link>
                  )) : <p className="text-center text-xs text-[var(--color-text-muted)] py-3">{isAr ? 'لا توجد مهام مفتوحة حاليًا.' : 'No open tasks right now.'}</p>}
                </div>
              )}

              <DayDetailsPanel selected={selectedDay} events={calendarEvents} isAr={isAr} vacation={vacation ?? null} />
            </div>
          </div>

          {/* Requests */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {canSeeRequests && <RequestsPanel icon={ArrowRightLeft} title={isAr ? 'طلبات بين الفرق' : 'Inter-team requests'}
                            isEmpty={crossTeamRequests.length === 0}
                            emptyLabel={isAr ? 'عندما يطلب فريق شيئاً من فريق آخر، مثل الفعاليات من اللوجستيات، سيظهر هنا.' : 'When one team requests something from another — e.g. Events from Logistics — it will show up here.'}>
              {crossTeamRequests.slice(0, 6).map(request => (
                <Link key={request.id} href={`/admin/operations/projects/${request.projectId}`}
                      className="flex items-center justify-between gap-2 rounded-xl bg-[var(--color-surface-2)]/60 px-3 py-2.5 text-xs hover:bg-[var(--color-surface-2)]">
                  <span className="font-bold truncate">{request.what}</span>
                  <span className="shrink-0 text-[var(--color-text-muted)]">{isAr ? request.fromTeamNameAr : request.fromTeamNameEn} → {isAr ? request.toTeamNameAr : request.toTeamNameEn}</span>
                </Link>
              ))}
            </RequestsPanel>}
            {canSeeTasks && <RequestsPanel icon={ClipboardList} title={isAr ? 'مهام الفريق من القائد' : 'Team tasks from the leader'}
                            isEmpty={leaderTasks.length === 0}
                            emptyLabel={ledTeams.length
                              ? (isAr ? 'لا توجد مهام مفتوحة لفريقك حاليًا.' : 'No open tasks for your team right now.')
                              : (isAr ? 'المهام التي يسندها قائد الفريق لأعضاء فريقه ستظهر هنا.' : 'Tasks a team leader assigns to their own team members will show up here.')}>
              {leaderTasks.map(task => (
                <Link key={task.id} href={`/admin/operations?tab=tasks&teamId=${task.teamIds[0] || ''}`}
                      className="flex items-center justify-between gap-2 rounded-xl bg-[var(--color-surface-2)]/60 px-3 py-2.5 text-xs hover:bg-[var(--color-surface-2)]">
                  <span className="font-bold truncate">{task.title}</span>
                  <span className="shrink-0 text-[var(--color-text-muted)]">{task.assignees.map(a => a.name).join(', ') || '—'}</span>
                </Link>
              ))}
            </RequestsPanel>}
          </div>

          {/* Events table */}
          {hasPrivilege(userData, 'events.read') && <HomeEventsTable events={events} locale={locale} isAr={isAr} />}
        </>
      ) : null}
    </div>
  );
}
