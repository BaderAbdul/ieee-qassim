'use client';

import { useState } from 'react';
import { Briefcase, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLocalCollection } from '@/hooks/useLocalCollection';
import {
  PROJECT_STATUS_LABELS, PROJECT_STATUSES, TASK_CENTER_DEPARTMENTS,
  type ProjectStatus, type TCProject, type TCTask, type TaskCenterDepartment,
} from '@/lib/taskCenter';
import TemplateDialog from '@/components/admin/TemplateDialog';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { SEED_PROJECTS, SEED_TASKS } from './taskCenterSeed';
import { PROJECT_STATUS_COLORS, button, card, input, label, primaryButton } from './taskCenterUi';

const emptyDraft = { title: '', description: '', department: TASK_CENTER_DEPARTMENTS[0] as TaskCenterDepartment, category: '', dueDate: '', progress: 0 };

export default function TaskCenterProjectsTab({ isAr }: { isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { userData } = useAuth();
  const { items: projects, add, update, remove } = useLocalCollection<TCProject>('task_center_projects', SEED_PROJECTS);
  const { items: tasks } = useLocalCollection<TCTask>('task_center_tasks', SEED_TASKS);
  const [filterDept, setFilterDept] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = filterDept ? projects.filter(p => p.department === filterDept) : projects;
  const openProject = projects.find(p => p.id === openId);
  const openTasks = openProject ? tasks.filter(task => task.projectId === openProject.id) : [];

  const createProject = () => {
    if (!draft.title.trim()) return;
    add({
      id: crypto.randomUUID(), title: draft.title.trim(), description: draft.description.trim(),
      department: draft.department, category: draft.category.trim() || t('أخرى', 'Other'),
      status: 'active', progress: draft.progress, dueDate: draft.dueDate, goalId: null,
      createdBy: userData?.displayName || t('أنا', 'Me'), createdAt: new Date().toISOString(),
    });
    setDraft(emptyDraft); setCreating(false);
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-bold"><Briefcase size={18} />{t('المشاريع', 'Projects')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('الأشياء الكبيرة التي تحتاج لأكثر من مهمة أو أسبوع لإنجازها.', 'Big things needing more than one task or more than a week.')}</p></div>
      <button type="button" className={primaryButton} onClick={() => setCreating(true)}><Plus size={15} />{t('مشروع جديد', 'New project')}</button>
    </div>

    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setFilterDept('')} className={`${button} ${!filterDept ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-transparent' : ''}`}>{t('الكل', 'All')}</button>
      {TASK_CENTER_DEPARTMENTS.map(dept => (
        <button key={dept} type="button" onClick={() => setFilterDept(dept)} className={`${button} ${filterDept === dept ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-transparent' : ''}`}>{dept}</button>
      ))}
    </div>

    {visible.length ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visible.map(project => {
        const linkedCount = tasks.filter(task => task.projectId === project.id).length;
        return <article key={project.id} className={`${card} cursor-pointer space-y-3 p-4`} onClick={() => setOpenId(project.id)}>
          <div className="flex items-start justify-between gap-2">
            <div><p className="text-xs font-bold text-[var(--color-text-muted)]">{project.department}</p><h3 className="font-bold">{project.title}</h3></div>
            <button type="button" aria-label={t('حذف', 'Delete')} onClick={e => { e.stopPropagation(); setDeleteId(project.id); }} className="shrink-0 rounded-lg p-1.5 hover:bg-[var(--color-surface-2)]"><Trash2 size={15} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-lg bg-[var(--color-surface-2)] px-2 py-0.5 text-xs font-bold">{project.category}</span>
            <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${PROJECT_STATUS_COLORS[project.status]}`}>{isAr ? PROJECT_STATUS_LABELS[project.status].ar : PROJECT_STATUS_LABELS[project.status].en}</span>
          </div>
          {project.description && <p className="line-clamp-2 text-sm text-[var(--color-text-secondary)]">{project.description}</p>}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[var(--color-text-muted)]"><span>{t('الإنجاز', 'Progress')}</span><span>{project.progress}%</span></div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]"><div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${project.progress}%` }} /></div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">{linkedCount} {t('مهمة مرتبطة', 'linked tasks')} {project.dueDate && `· ${project.dueDate}`}</p>
        </article>;
      })}
    </div> : <p className={`${card} p-8 text-center text-sm text-[var(--color-text-muted)]`}>{t('لا توجد مشاريع مطابقة.', 'No matching projects.')}</p>}

    {creating && <TemplateDialog title={t('مشروع جديد', 'New project')} onClose={() => setCreating(false)}>
      <div className="space-y-3">
        <label className={label}><span>{t('العنوان', 'Title')}</span><input className={input} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
        <label className={label}><span>{t('الوصف', 'Description')}</span><textarea rows={3} className={input} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={label}><span>{t('القسم', 'Department')}</span>
            <select className={input} value={draft.department} onChange={e => setDraft({ ...draft, department: e.target.value as TaskCenterDepartment })}>
              {TASK_CENTER_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select></label>
          <label className={label}><span>{t('التصنيف', 'Category')}</span><input className={input} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} /></label>
          <label className={label}><span>{t('تاريخ الاستحقاق', 'Due date')}</span><input type="date" className={input} value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })} /></label>
          <label className={label}><span>{t('نسبة الإنجاز', 'Progress')} %</span><input type="number" min={0} max={100} className={input} value={draft.progress} onChange={e => setDraft({ ...draft, progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} /></label>
        </div>
        <div className="flex justify-end"><button type="button" disabled={!draft.title.trim()} onClick={createProject} className={primaryButton}>{t('إنشاء', 'Create')}</button></div>
      </div>
    </TemplateDialog>}

    {openProject && <TemplateDialog title={openProject.title} onClose={() => setOpenId(null)}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-[var(--color-surface-2)] px-2 py-0.5 text-xs font-bold">{openProject.department}</span>
          <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${PROJECT_STATUS_COLORS[openProject.status]}`}>{isAr ? PROJECT_STATUS_LABELS[openProject.status].ar : PROJECT_STATUS_LABELS[openProject.status].en}</span>
        </div>
        <label className={label}><span>{t('الحالة', 'Status')}</span>
          <select className={input} value={openProject.status} onChange={e => update(openProject.id, { status: e.target.value as ProjectStatus })}>
            {PROJECT_STATUSES.map(s => <option key={s} value={s}>{isAr ? PROJECT_STATUS_LABELS[s].ar : PROJECT_STATUS_LABELS[s].en}</option>)}
          </select></label>
        {openProject.description && <p className="text-sm text-[var(--color-text-secondary)]">{openProject.description}</p>}
        <div>
          <h4 className="mb-2 text-sm font-bold">{t('المهام المرتبطة', 'Linked tasks')} ({openTasks.length})</h4>
          {openTasks.length ? <ul className="space-y-1.5">{openTasks.map(task => (
            <li key={task.id} className="flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-sm"><span>{task.title}</span><span className="text-xs text-[var(--color-text-muted)]">{task.status}</span></li>
          ))}</ul> : <p className="text-sm text-[var(--color-text-muted)]">{t('لا توجد مهام مرتبطة بهذا المشروع.', 'No tasks linked to this project yet.')}</p>}
        </div>
      </div>
    </TemplateDialog>}

    <ConfirmDialog open={deleteId !== null} icon={<Trash2 size={22} />} tone="warning" title={t('حذف المشروع؟', 'Delete this project?')}
      message={t('لن يؤثر هذا على المهام المرتبطة به.', 'This won’t affect its linked tasks.')}
      confirmLabel={t('حذف', 'Delete')} cancelLabel={t('إلغاء', 'Cancel')} busy={false}
      onConfirm={() => { if (deleteId) remove(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
  </div>;
}
