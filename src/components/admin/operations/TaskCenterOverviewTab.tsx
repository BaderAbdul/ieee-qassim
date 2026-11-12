'use client';

import { Briefcase, CheckSquare, ListTodo, Target, TrendingUp } from 'lucide-react';
import { useLocalCollection } from '@/hooks/useLocalCollection';
import { TASK_CENTER_DEPARTMENTS, type TCGoal, type TCProject, type TCTask } from '@/lib/taskCenter';
import { SEED_GOALS, SEED_PROJECTS, SEED_TASKS } from './taskCenterSeed';
import { card } from './taskCenterUi';

export default function TaskCenterOverviewTab({ isAr }: { isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { items: tasks } = useLocalCollection<TCTask>('task_center_tasks', SEED_TASKS);
  const { items: projects } = useLocalCollection<TCProject>('task_center_projects', SEED_PROJECTS);
  const { items: goals } = useLocalCollection<TCGoal>('task_center_goals', SEED_GOALS);

  const openTasks = tasks.filter(task => task.status !== 'done');
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
          <span>{task.title}</span><span className="text-xs text-[var(--color-text-muted)]">{task.department}</span>
        </li>
      ))}</ul> : <p className="text-sm text-[var(--color-text-muted)]">{t('لا توجد مهام مفتوحة حاليًا.', 'No open tasks right now.')}</p>}
    </div>

    <div className={`${card} p-5`}>
      <h3 className="mb-3 flex items-center gap-2 font-bold"><Target size={17} />{t('ملخص الأقسام', 'Department summary')}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TASK_CENTER_DEPARTMENTS.map(dept => {
          const deptTasks = tasks.filter(task => task.department === dept);
          const deptDone = deptTasks.filter(task => task.status === 'done').length;
          return <div key={dept} className="rounded-xl border border-[var(--color-border)] p-3 text-sm">
            <p className="font-bold">{dept}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t(`${deptTasks.length} مهمة، ${deptDone} مكتملة`, `${deptTasks.length} tasks, ${deptDone} done`)}</p>
          </div>;
        })}
      </div>
    </div>

    <div className={`${card} p-5`}>
      <h3 className="mb-3 font-bold">{t('أهداف الربع الحالي', 'Current quarter goals')}</h3>
      {goals.length ? <ol className="space-y-3">{[...goals].sort((a, b) => a.order - b.order).map(goal => (
        <li key={goal.id} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-xs font-black text-[var(--color-accent)]">{goal.order}</span>
          <div><p className="font-bold">{goal.title}</p>{goal.rationale && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{goal.rationale}</p>}</div>
        </li>
      ))}</ol> : <p className="text-sm text-[var(--color-text-muted)]">{t('لا توجد أهداف محددة بعد.', 'No goals set yet.')}</p>}
    </div>
  </div>;
}
