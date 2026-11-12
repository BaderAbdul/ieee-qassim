'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, ListTodo, Plus, Search, Trash2, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLocalCollection } from '@/hooks/useLocalCollection';
import {
  TASK_CENTER_DEPARTMENTS, TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS,
  type TCProject, type TCTask, type TaskCenterDepartment, type TaskPriority, type TaskStatus,
} from '@/lib/taskCenter';
import TemplateDialog from '@/components/admin/TemplateDialog';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { SEED_PROJECTS, SEED_TASKS } from './taskCenterSeed';
import { PRIORITY_COLORS, card, input, label, primaryButton } from './taskCenterUi';

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = { todo: Circle, doing: ListTodo, done: CheckCircle2, blocked: XCircle };
const emptyDraft = {
  title: '', description: '', priority: 'medium' as TaskPriority,
  department: TASK_CENTER_DEPARTMENTS[0] as TaskCenterDepartment, dueDate: '', projectId: '',
};

export default function TaskCenterTasksTab({ isAr }: { isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { userData } = useAuth();
  const { items: tasks, add, update, remove } = useLocalCollection<TCTask>('task_center_tasks', SEED_TASKS);
  const { items: projects } = useLocalCollection<TCProject>('task_center_projects', SEED_PROJECTS);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = tasks.filter(task =>
    (!search.trim() || task.title.toLowerCase().includes(search.trim().toLowerCase())) &&
    (!deptFilter || task.department === deptFilter));

  const createTask = () => {
    if (!draft.title.trim()) return;
    add({
      id: crypto.randomUUID(), title: draft.title.trim(), description: draft.description.trim(), status: 'todo',
      priority: draft.priority, dueDate: draft.dueDate, department: draft.department, projectId: draft.projectId || null,
      createdBy: userData?.displayName || t('أنا', 'Me'), createdAt: new Date().toISOString(),
    });
    setDraft(emptyDraft); setCreating(false);
  };

  return <div className="space-y-5">
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold"><ListTodo size={18} />{t('لوحة المهام', 'Tasks Board')}</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">{t('إدارة المهام وتتبع الإنجاز.', 'Manage tasks and track completion.')}</p>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <Search size={16} className="absolute start-3 top-3 text-[var(--color-text-muted)]" />
        <input className={`${input} ps-9`} placeholder={t('بحث عن مهمة', 'Search tasks')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <select className={`${input} w-auto`} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
        <option value="">{t('كل الأقسام', 'All departments')}</option>
        {TASK_CENTER_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <button type="button" className={primaryButton} onClick={() => setCreating(true)}><Plus size={15} />{t('إضافة مهمة', 'Add Task')}</button>
    </div>
    <p className="text-sm text-[var(--color-text-muted)]">{filtered.length} {t('مهمة معروضة', 'tasks shown')}</p>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {TASK_STATUSES.map(status => {
        const StatusIcon = STATUS_ICONS[status];
        const columnTasks = filtered.filter(task => task.status === status);
        return <div key={status} className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-sm font-bold">
            <StatusIcon size={15} />{isAr ? TASK_STATUS_LABELS[status].ar : TASK_STATUS_LABELS[status].en}
            <span className="ms-auto rounded-full bg-[var(--color-surface)] px-2 text-xs">{columnTasks.length}</span>
          </div>
          <div className="space-y-2.5">
            {columnTasks.map(task => {
              const project = projects.find(p => p.id === task.projectId);
              return <article key={task.id} className={`${card} space-y-2 p-3.5`}>
                <div className="flex items-start justify-between gap-2">
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[task.priority]}`}>{isAr ? TASK_PRIORITY_LABELS[task.priority].ar : TASK_PRIORITY_LABELS[task.priority].en}</span>
                  <button type="button" aria-label={t('حذف', 'Delete')} onClick={() => setDeleteId(task.id)} className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"><Trash2 size={14} /></button>
                </div>
                <p className="text-sm font-bold">{task.title}</p>
                {task.description && <p className="line-clamp-2 text-xs text-[var(--color-text-secondary)]">{task.description}</p>}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {task.dueDate && <span className="rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5">{task.dueDate}</span>}
                  {project && <span className="rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5">📁 {project.title}</span>}
                  <span className="rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5">{task.department}</span>
                </div>
                <select className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-xs"
                        value={task.status} onChange={e => update(task.id, { status: e.target.value as TaskStatus })}>
                  {TASK_STATUSES.map(s => <option key={s} value={s}>{isAr ? TASK_STATUS_LABELS[s].ar : TASK_STATUS_LABELS[s].en}</option>)}
                </select>
              </article>;
            })}
            {!columnTasks.length && <p className={`${card} p-4 text-center text-xs text-[var(--color-text-muted)]`}>{t('لا توجد مهام', 'No tasks')}</p>}
          </div>
        </div>;
      })}
    </div>

    {creating && <TemplateDialog title={t('إضافة مهمة', 'Add task')} onClose={() => setCreating(false)}>
      <div className="space-y-3">
        <label className={label}><span>{t('العنوان', 'Title')}</span><input className={input} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
        <label className={label}><span>{t('الوصف', 'Description')}</span><textarea rows={3} className={input} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={label}><span>{t('الأولوية', 'Priority')}</span>
            <select className={input} value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as TaskPriority })}>
              {TASK_PRIORITIES.map(p => <option key={p} value={p}>{isAr ? TASK_PRIORITY_LABELS[p].ar : TASK_PRIORITY_LABELS[p].en}</option>)}
            </select></label>
          <label className={label}><span>{t('القسم', 'Department')}</span>
            <select className={input} value={draft.department} onChange={e => setDraft({ ...draft, department: e.target.value as TaskCenterDepartment })}>
              {TASK_CENTER_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select></label>
          <label className={label}><span>{t('تاريخ الاستحقاق', 'Due date')}</span><input type="date" className={input} value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} /></label>
          <label className={label}><span>{t('المشروع (اختياري)', 'Project (optional)')}</span>
            <select className={input} value={draft.projectId} onChange={e => setDraft({ ...draft, projectId: e.target.value })}>
              <option value="">{t('بلا مشروع', 'No project')}</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select></label>
        </div>
        <div className="flex justify-end"><button type="button" className={primaryButton} disabled={!draft.title.trim()} onClick={createTask}>{t('إضافة', 'Add')}</button></div>
      </div>
    </TemplateDialog>}

    <ConfirmDialog open={deleteId !== null} icon={<Trash2 size={22} />} tone="warning" title={t('حذف المهمة؟', 'Delete this task?')}
      message={t('لا يمكن التراجع عن هذا.', 'This cannot be undone.')} confirmLabel={t('حذف', 'Delete')} cancelLabel={t('إلغاء', 'Cancel')} busy={false}
      onConfirm={() => { if (deleteId) remove(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
  </div>;
}
