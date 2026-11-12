import type { IdeaStatus, ProjectStatus, TaskPriority, TaskStatus } from '@/lib/taskCenter';

export const input = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm';
export const label = 'block space-y-1.5 text-sm font-bold text-[var(--color-text-secondary)]';
export const button = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-bold disabled:opacity-40';
export const primaryButton = `${button} bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-transparent`;
export const card = 'rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] shadow-sm';
export const panel = 'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7 space-y-4';

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-rose-100 text-rose-700',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-600',
  doing: 'bg-sky-100 text-sky-700',
  done: 'bg-emerald-100 text-emerald-700',
  blocked: 'bg-rose-100 text-rose-700',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  needs_follow_up: 'bg-amber-100 text-amber-700',
  done: 'bg-slate-100 text-slate-600',
};

export const IDEA_STATUS_COLORS: Record<IdeaStatus, string> = {
  new: 'bg-amber-100 text-amber-700',
  review: 'bg-sky-100 text-sky-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export function avatarInitial(name: string): string {
  return (name.trim()[0] || '?').toUpperCase();
}
