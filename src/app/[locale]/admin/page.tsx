'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Users, ListTodo, ArrowRightLeft, ClipboardList, Sparkles } from 'lucide-react';
import type { AdminOverview, AdminEventsPage, AdminEventSummary } from '@/lib/adminTypes';
import { AdminError, AdminLoading, useAdminQuery } from '@/components/admin/AdminData';
import AdminCalendar from '@/components/admin/home/AdminCalendar';
import DayDetailsPanel from '@/components/admin/home/DayDetailsPanel';
import HomeEventsTable from '@/components/admin/home/HomeEventsTable';

function RequestsPanel({ icon: Icon, title, description, isAr }: { icon: typeof ArrowRightLeft; title: string; description: string; isAr: boolean }) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/80 backdrop-blur-md p-5 shadow-xs flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black font-cairo text-[var(--color-text-primary)] flex items-center gap-2">
          <Icon size={17} className="text-[var(--color-accent)]" />
          {title}
        </h3>
        <span className="text-[10px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-2 py-0.5 rounded-full">
          {isAr ? 'قريبًا' : 'Coming soon'}
        </span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6 border border-dashed border-[var(--color-border)] rounded-2xl">
        <Sparkles className="text-[var(--color-text-muted)] mb-2" size={22} />
        <p className="text-xs text-[var(--color-text-muted)] max-w-[220px]">{description}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const locale = useLocale(); const isAr = locale === 'ar';
  const { data, loading, error, refresh } = useAdminQuery<AdminOverview>('getAdminOverview');
  const { data: eventsPage } = useAdminQuery<AdminEventsPage>('getAdminEvents');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
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

  return (
    <div className="space-y-6">
      {error ? (
        <AdminError message={error} retry={refresh} />
      ) : loading && !data ? (
        <AdminLoading />
      ) : data ? (
        <>
          {/* Calendar + KPIs/day details */}
          <div className="grid gap-4 lg:grid-cols-3 items-stretch">
            <div className="lg:col-span-2">
              <AdminCalendar events={events} isAr={isAr} selected={selectedDay} onSelectDay={setSelectedDay} />
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

                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 backdrop-blur-md p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                      <ListTodo size={16} />
                    </div>
                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded-full">
                      {isAr ? 'قريبًا' : 'Soon'}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider truncate">{isAr ? 'المهام المتبقية' : 'Remaining tasks'}</p>
                  <p className="mt-0.5 text-xl font-black text-[var(--color-text-muted)] font-cairo">—</p>
                </div>
              </div>

              <DayDetailsPanel selected={selectedDay} events={events} isAr={isAr} />
            </div>
          </div>

          {/* Requests */}
          <div className="grid gap-4 md:grid-cols-2">
            <RequestsPanel
              icon={ArrowRightLeft}
              title={isAr ? 'طلبات بين الفرق' : 'Inter-team requests'}
              description={isAr ? 'عندما يطلب فريق شيئاً من فريق آخر، مثل الفعاليات من اللوجستيات، سيظهر هنا.' : 'When one team requests something from another — e.g. Events from Logistics — it will show up here.'}
              isAr={isAr}
            />
            <RequestsPanel
              icon={ClipboardList}
              title={isAr ? 'مهام الفريق من القائد' : "Team tasks from the leader"}
              description={isAr ? 'المهام التي يسندها قائد الفريق لأعضاء فريقه ستظهر هنا.' : 'Tasks a team leader assigns to their own team members will show up here.'}
              isAr={isAr}
            />
          </div>

          {/* Events table */}
          <HomeEventsTable events={events} locale={locale} isAr={isAr} />
        </>
      ) : null}
    </div>
  );
}
