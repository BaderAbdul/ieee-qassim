'use client';

import { useEffect, useState } from 'react';
import { Briefcase, CheckSquare, ListTodo, Target, TrendingUp } from 'lucide-react';
import { apiGetArray } from '@/lib/backendResponse';
import { goalsApi, projectsApi, tasksApi, type Goal, type Project, type TCTask } from '@/lib/taskCenterApi';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { card } from './taskCenterUi';

interface TeamOption { id: string; nameAr: string; nameEn: string }

export default function TaskCenterOverviewTab({ isAr }: { isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const [tasks, setTasks] = useState<TCTask[]>([]);
  const [myTasks, setMyTasks] = useState<TCTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [tasksList, myTasksList, projectsList, goalsList, teamsList] = await Promise.all([
        tasksApi.list(), tasksApi.list({ mine: true }), projectsApi.list(), goalsApi.list(), apiGetArray<TeamOption>('/api/admin/teams'),
      ]);
      setTasks(tasksList); setMyTasks(myTasksList); setProjects(projectsList); setGoals(goalsList); setTeams(teamsList);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load overview');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  if (loading) return <AdminLoading />;
  if (error) return <AdminError message={error} retry={load} />;

  const openTasks = myTasks.filter(task => task.status !== 'done');
  const doneCount = tasks.filter(task => task.status === 'done').length;
  const completion = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const activeProjects = projects.filter(p => p.status !== 'done').length;
  const blocked = tasks.filter(task => task.status === 'blocked').length;

  return <div className="space-y-6">
    <div className={`${card} p-5`}>
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-accent)]">{t('نظرة عامة', 'Overview')}</p>
      <h2 className="mt-1 text-xl font-bold">{t('مساحة عمل الفريق', 'Team workspace')}</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        {t('ملخص سريع للمهام والمشاريع والأهداف الحالية.', 'A quick summary of current tasks, projects and goals.')}
      </p>
    </div>

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[
        { label: t('المهام الحالية', 'Current tasks'), value: tasks.length, Icon: ListTodo, color: 'text-sky-500' },
        { label: t('المشاريع النشطة', 'Active projects'), value: activeProjects, Icon: Briefcase, color: 'text-indigo-500' },
        { label: t('إنجاز المهام', 'Task completion'), value: `${completion}%`, Icon: TrendingUp, color: 'text-emerald-500' },
        { label: t('تتطلب تدخل', 'Needs intervention'), value: blocked, Icon: CheckSquare, color: blocked ? 'text-rose-500' : 'text-slate-400' },
      ].map(({ label, value, Icon, color }) => (
        <div key={label} className={`${card} flex items-center gap-3 p-4`}>
          <div className={`rounded-xl bg-[var(--color-surface-2)] p-2.5 ${color}`}><Icon size={20} /></div>
          <div><p className="text-xs font-bold text-[var(--color-text-muted)]">{label}</p><p className="mt-0.5 text-xl font-black">{value}</p></div>
        </div>
      ))}
    </div>

    <div className={`${card} p-5`}>
      <h3 className="mb-3 font-bold">{t('مهامي المفتوحة', 'My open tasks')} ({openTasks.length})</h3>
      {openTasks.length ? <ul className="space-y-2">{openTasks.slice(0, 6).map(task => (
        <li key={task.id} className="flex items-center justify-between rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-sm">
          <span>{task.title}</span><span className="text-xs text-[var(--color-text-muted)]">{task.teams.map(team => isAr ? team.nameAr : team.nameEn).join(', ') || '—'}</span>
        </li>
      ))}</ul> : <p className="text-sm text-[var(--color-text-muted)]">{t('لا توجد مهام مفتوحة حاليًا.', 'No open tasks right now.')}</p>}
    </div>

    <div className={`${card} p-5`}>
      <h3 className="mb-3 flex items-center gap-2 font-bold"><Target size={17} />{t('ملخص الأقسام', 'Department summary')}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map(team => {
          const teamTasks = tasks.filter(task => task.teamIds.includes(team.id));
          const teamDone = teamTasks.filter(task => task.status === 'done').length;
          return <div key={team.id} className="rounded-xl border border-[var(--color-border)] p-3 text-sm">
            <p className="font-bold">{isAr ? team.nameAr : team.nameEn}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t(`${teamTasks.length} مهمة، ${teamDone} مكتملة`, `${teamTasks.length} tasks, ${teamDone} done`)}</p>
          </div>;
        })}
        {teams.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">{t('لا توجد أقسام بعد.', 'No departments yet.')}</p>}
      </div>
    </div>

    <div className={`${card} p-5`}>
      <h3 className="mb-3 font-bold">{t('أهداف الربع الحالي', 'Current quarter goals')}</h3>
      {goals.length ? <ol className="space-y-3">{goals.map((goal, i) => (
        <li key={goal.id} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-xs font-black text-[var(--color-accent)]">{i + 1}</span>
          <div><p className="font-bold">{goal.title}</p>{goal.why && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{goal.why}</p>}</div>
        </li>
      ))}</ol> : <p className="text-sm text-[var(--color-text-muted)]">{t('لا توجد أهداف محددة بعد.', 'No goals set yet.')}</p>}
    </div>
  </div>;
}
