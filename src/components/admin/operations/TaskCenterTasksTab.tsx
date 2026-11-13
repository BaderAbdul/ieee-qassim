'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Folder, LayoutGrid, List, Plus, Search, Trash2, User, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useToast } from '@/context/ToastContext';
import { httpsCallable } from '@/lib/backend';
import { apiGetArray } from '@/lib/backendResponse';
import type { AdminMember, MemberSearchResult } from '@/lib/adminTypes';
import {
  TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS,
  tasksApi, type TaskInput, type TaskPriority, type TaskStatus, type TCTask,
} from '@/lib/taskCenterApi';
import TemplateDialog from '@/components/admin/TemplateDialog';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { PRIORITY_COLORS, TASK_STATUS_COLORS, button, card, input, label, primaryButton } from './taskCenterUi';

interface TeamOption { id: string; nameAr: string; nameEn: string }
type ViewMode = 'board' | 'list' | 'agenda';

const emptyForm: TaskInput = {
  title: '', description: '', projectId: null, assigneeIds: [], teamIds: [], deadline: null, priority: 'medium', status: 'todo',
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

export default function TaskCenterTasksTab({ isAr, initialProjectId, initialAssigneeId, initialTeamId }: { isAr: boolean; initialProjectId?: number | null; initialAssigneeId?: string | null; initialTeamId?: string | null }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();

  const [tasks, setTasks] = useState<TCTask[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('board');
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState(initialTeamId ?? '');
  const [mineOnly, setMineOnly] = useState(false);
  const [projectFilter, setProjectFilter] = useState<number | null>(initialProjectId ?? null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(initialAssigneeId ?? null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  const [editingId, setEditingId] = useState<number | 0 | null>(null);
  const [form, setForm] = useState<TaskInput>(emptyForm);
  const [assigneeResults, setAssigneeResults] = useState<AdminMember[]>([]);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<AdminMember[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [tasksList, teamsList] = await Promise.all([
        tasksApi.list({
          mine: mineOnly, assigneeId: !mineOnly && assigneeFilter ? assigneeFilter : undefined,
          teamId: teamFilter || undefined, projectId: projectFilter || undefined,
        }),
        apiGetArray<TeamOption>('/api/admin/teams'),
      ]);
      setTasks(tasksList); setTeams(teamsList);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load tasks');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [mineOnly, teamFilter, projectFilter, assigneeFilter]);

  useEffect(() => {
    if (editingId === null) return;
    const query = assigneeQuery.trim();
    if (!query) { setAssigneeResults([]); return; }
    const timer = window.setTimeout(() => {
      void httpsCallable<unknown, MemberSearchResult>(null, 'searchMembers')({ query }).then(
        result => setAssigneeResults(result.data.users.filter(u => !selectedAssignees.some(a => a.id === u.id)))
      ).catch(() => setAssigneeResults([]));
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigneeQuery, editingId]);

  const filtered = useMemo(() => tasks.filter(task =>
    !search.trim() || task.title.toLowerCase().includes(search.trim().toLowerCase())
  ), [tasks, search]);

  const startCreate = () => {
    setForm({ ...emptyForm, projectId: projectFilter }); setSelectedAssignees([]); setAssigneeQuery(''); setAssigneeResults([]); setEditingId(0);
  };
  const startEdit = (task: TCTask) => {
    setForm({
      title: task.title, description: task.description, projectId: task.projectId, assigneeIds: task.assigneeIds,
      teamIds: task.teamIds, deadline: task.deadline, priority: task.priority, status: task.status,
    });
    setSelectedAssignees(task.assignees.map(a => ({ id: a.id, displayName: a.name, arabicFullName: a.name })));
    setAssigneeQuery(''); setAssigneeResults([]);
    setEditingId(task.id);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    const payload = { ...form, assigneeIds: selectedAssignees.map(a => a.id) };
    try {
      if (editingId) await tasksApi.update(editingId, payload);
      else await tasksApi.create(payload);
      setEditingId(null);
      await load();
      showToast(isAr ? 'تم الحفظ بنجاح' : 'Saved successfully', 'success');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر الحفظ' : 'Unable to save'), 'error');
    }
  };

  const setStatus = async (taskId: number, status: TaskStatus) => {
    setTasks(current => current.map(task => task.id === taskId ? { ...task, status } : task));
    try {
      await tasksApi.setStatus(taskId, status);
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر تغيير الحالة' : 'Unable to change status'), 'error');
      await load();
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await tasksApi.remove(deleteId);
      setDeleteId(null);
      await load();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر الحذف' : 'Unable to delete'), 'error');
    }
  };

  const toggleFormTeam = (teamId: string) => {
    setForm(f => ({ ...f, teamIds: f.teamIds.includes(teamId) ? f.teamIds.filter(id => id !== teamId) : [...f.teamIds, teamId] }));
  };

  if (loading) return <AdminLoading />;
  if (error) return <AdminError message={error} retry={load} />;

  const TaskCard = ({ task, draggable }: { task: TCTask; draggable: boolean }) => (
    <article
      draggable={draggable}
      onDragStart={e => { e.dataTransfer.setData('text/plain', String(task.id)); }}
      className={`${card} space-y-2 p-3.5 ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[task.priority]}`}>
          {isAr ? TASK_PRIORITY_LABELS[task.priority].ar : TASK_PRIORITY_LABELS[task.priority].en}
        </span>
        <button type="button" aria-label={t('حذف', 'Delete')} onClick={() => setDeleteId(task.id)} className="shrink-0 text-[var(--color-danger)] hover:opacity-70"><Trash2 size={15} /></button>
      </div>
      <button type="button" className="text-start" onClick={() => startEdit(task)}>
        <p className="text-sm font-bold">{task.title}</p>
        {task.description && <p className="line-clamp-2 text-xs text-[var(--color-text-secondary)]">{task.description}</p>}
      </button>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {task.deadline && <span className="flex items-center gap-1 rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5"><CalendarDays size={11} />{task.deadline}</span>}
        {task.projectName && (
          <Link href={`/admin/operations/projects/${task.projectId}`} className="flex items-center gap-1 rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 hover:opacity-80">
            <Folder size={11} />{task.projectName}
          </Link>
        )}
        {task.teams.map(team => <span key={team.id} className="rounded-md bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[var(--color-accent)]">{isAr ? team.nameAr : team.nameEn}</span>)}
      </div>
      {task.assignees.length > 0 && (
        <div className="flex -space-x-1.5 rtl:space-x-reverse">
          {task.assignees.map(assignee => (
            <span key={assignee.id} title={assignee.name} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-accent-soft)] text-[10px] font-black text-[var(--color-accent)]">
              {assignee.name.trim().charAt(0) || '?'}
            </span>
          ))}
        </div>
      )}
      {!isDesktop && (
        <select className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-xs"
                value={task.status} onChange={e => void setStatus(task.id, e.target.value as TaskStatus)}>
          {TASK_STATUSES.map(s => <option key={s} value={s}>{isAr ? TASK_STATUS_LABELS[s].ar : TASK_STATUS_LABELS[s].en}</option>)}
        </select>
      )}
    </article>
  );

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold"><LayoutGrid size={18} />{t('لوحة المهام', 'Tasks Board')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('إدارة المهام وتتبع الإنجاز.', 'Manage tasks and track completion.')}</p>
      </div>
      <div className="flex gap-1 rounded-xl bg-[var(--color-surface-2)] p-1">
        {([['board', LayoutGrid, t('اللوحة', 'Board')], ['list', List, t('قائمة', 'List')], ['agenda', CalendarDays, t('أجندة', 'Agenda')]] as const).map(([id, Icon, label2]) => (
          <button key={id} type="button" onClick={() => setView(id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${view === id ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' : 'text-[var(--color-text-secondary)]'}`}>
            <Icon size={14} />{label2}
          </button>
        ))}
      </div>
    </div>

    {projectFilter && (
      <div className="flex items-center gap-2 rounded-xl bg-[var(--color-accent-soft)] px-3 py-2 text-xs font-bold text-[var(--color-accent)]">
        <Folder size={14} />{t('مُفلترة حسب مشروع واحد', 'Filtered to one project')}
        <button type="button" onClick={() => setProjectFilter(null)} className="ms-auto hover:opacity-70"><X size={14} /></button>
      </div>
    )}
    {assigneeFilter && !mineOnly && (
      <div className="flex items-center gap-2 rounded-xl bg-[var(--color-accent-soft)] px-3 py-2 text-xs font-bold text-[var(--color-accent)]">
        <User size={14} />{t('مُفلترة حسب شخص واحد', 'Filtered to one person')}
        <button type="button" onClick={() => setAssigneeFilter(null)} className="ms-auto hover:opacity-70"><X size={14} /></button>
      </div>
    )}

    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <Search size={16} className="absolute start-3 top-3 text-[var(--color-text-muted)]" />
        <input className={`${input} ps-9`} placeholder={t('بحث عن مهمة أو مسؤول', 'Search task or assignee')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <select className={`${input} w-auto`} value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
        <option value="">{t('كل الأقسام', 'All departments')}</option>
        {teams.map(teamOption => <option key={teamOption.id} value={teamOption.id}>{isAr ? teamOption.nameAr : teamOption.nameEn}</option>)}
      </select>
      <button type="button" onClick={() => setMineOnly(v => !v)}
              className={`${button} ${mineOnly ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-transparent' : ''}`}>
        <User size={14} />{t('مهامي', 'My tasks')}
      </button>
      <button type="button" className={primaryButton} onClick={startCreate}><Plus size={15} />{t('إضافة مهمة', 'Add Task')}</button>
    </div>
    <p className="text-sm text-[var(--color-text-muted)]">{filtered.length} {t('مهمة معروضة', 'tasks shown')}</p>

    {view === 'board' && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map(status => {
          const columnTasks = filtered.filter(task => task.status === status);
          return (
            <div key={status}
                 onDragOver={isDesktop ? e => { e.preventDefault(); setDragOverStatus(status); } : undefined}
                 onDragLeave={isDesktop ? () => setDragOverStatus(null) : undefined}
                 onDrop={isDesktop ? e => {
                   e.preventDefault();
                   const taskId = Number(e.dataTransfer.getData('text/plain'));
                   setDragOverStatus(null);
                   if (taskId) void setStatus(taskId, status);
                 } : undefined}
                 className={`space-y-3 rounded-2xl p-1 transition-colors ${dragOverStatus === status ? 'bg-[var(--color-accent-soft)]' : ''}`}>
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${TASK_STATUS_COLORS[status]}`}>
                {isAr ? TASK_STATUS_LABELS[status].ar : TASK_STATUS_LABELS[status].en}
                <span className="ms-auto rounded-full bg-[var(--color-surface)] px-2 text-xs">{columnTasks.length}</span>
              </div>
              <div className="space-y-2.5">
                {columnTasks.map(task => <TaskCard key={task.id} task={task} draggable={isDesktop} />)}
                {!columnTasks.length && <p className={`${card} p-4 text-center text-xs text-[var(--color-text-muted)]`}>{t('لا توجد مهام', 'No tasks')}</p>}
              </div>
            </div>
          );
        })}
      </div>
    )}

    {view === 'list' && (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-start text-xs text-[var(--color-text-muted)]">
            <th className="p-2 text-start">{t('المهمة', 'Task')}</th>
            <th className="p-2 text-start">{t('المسؤول', 'Assignee')}</th>
            <th className="p-2 text-start">{t('الموعد', 'Due')}</th>
            <th className="p-2 text-start">{t('الأولوية', 'Priority')}</th>
            <th className="p-2 text-start">{t('الحالة', 'Status')}</th>
            <th className="p-2 text-start" />
          </tr></thead>
          <tbody>
            {filtered.map(task => (
              <tr key={task.id} className="border-t border-[var(--color-border)]/50">
                <td className="p-2"><button type="button" className="font-bold hover:text-[var(--color-accent)]" onClick={() => startEdit(task)}>{task.title}</button></td>
                <td className="p-2">{task.assignees.map(a => a.name).join(', ') || '—'}</td>
                <td className="p-2">{task.deadline || '—'}</td>
                <td className="p-2">{isAr ? TASK_PRIORITY_LABELS[task.priority].ar : TASK_PRIORITY_LABELS[task.priority].en}</td>
                <td className="p-2">
                  <select className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-xs"
                          value={task.status} onChange={e => void setStatus(task.id, e.target.value as TaskStatus)}>
                    {TASK_STATUSES.map(s => <option key={s} value={s}>{isAr ? TASK_STATUS_LABELS[s].ar : TASK_STATUS_LABELS[s].en}</option>)}
                  </select>
                </td>
                <td className="p-2"><button type="button" aria-label={t('حذف', 'Delete')} onClick={() => setDeleteId(task.id)} className="rounded-lg p-1 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {view === 'agenda' && (
      <ul className="space-y-2">
        {[...filtered].sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999')).map(task => (
          <li key={task.id} className={`${card} flex items-center justify-between gap-3 p-3`}>
            <div className="min-w-0">
              <p className="truncate font-bold">{task.title}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">{task.assignees.map(a => a.name).join(', ')}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${PRIORITY_COLORS[task.priority]}`}>{isAr ? TASK_PRIORITY_LABELS[task.priority].ar : TASK_PRIORITY_LABELS[task.priority].en}</span>
              <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${TASK_STATUS_COLORS[task.status]}`}>{isAr ? TASK_STATUS_LABELS[task.status].ar : TASK_STATUS_LABELS[task.status].en}</span>
              <span className="text-sm font-black text-[var(--color-danger)]">{task.deadline || '—'}</span>
            </div>
          </li>
        ))}
        {!filtered.length && <p className={`${card} p-8 text-center text-sm text-[var(--color-text-muted)]`}>{t('لا توجد مهام', 'No tasks')}</p>}
      </ul>
    )}

    {editingId !== null && (
      <TemplateDialog title={editingId ? t('تعديل المهمة', 'Edit task') : t('إضافة مهمة', 'Add task')} onClose={() => setEditingId(null)}>
        <div className="space-y-3">
          <label className={label}><span>{t('عنوان المهمة', 'Task title')}</span>
            <input className={input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label className={label}><span>{t('تفاصيل المهمة (اختياري)', 'Task details (optional)')}</span>
            <textarea rows={3} className={input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>

          <div className={label}>
            <span>{t('المنفذون (يمكن اختيار أكثر من منفذ)', 'Assignees (multiple allowed)')}</span>
            {selectedAssignees.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedAssignees.map(assignee => (
                  <span key={assignee.id} className="flex items-center gap-1 rounded-lg bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-bold text-[var(--color-accent)]">
                    {assignee.arabicFullName || assignee.displayName}
                    <button type="button" onClick={() => setSelectedAssignees(selectedAssignees.filter(a => a.id !== assignee.id))}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
            <input className={input} value={assigneeQuery} onChange={e => setAssigneeQuery(e.target.value)} placeholder={t('ابحث بالاسم أو البريد…', 'Search by name or email…')} />
            {assigneeResults.length > 0 && (
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-[var(--color-border)] p-1.5">
                {assigneeResults.map(assigneeUser => (
                  <button key={assigneeUser.id} type="button"
                          onClick={() => { setSelectedAssignees([...selectedAssignees, assigneeUser]); setAssigneeQuery(''); setAssigneeResults([]); }}
                          className="block w-full rounded-lg px-2 py-1.5 text-start text-sm hover:bg-[var(--color-surface-2)]">
                    {assigneeUser.arabicFullName || assigneeUser.displayName} <span className="text-xs text-[var(--color-text-muted)]">{assigneeUser.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={label}>
            <span>{t('الأقسام المسؤولة (يمكن اختيار أكثر من قسم)', 'Responsible department(s) (multiple allowed)')}</span>
            <div className="flex flex-wrap gap-1.5">
              {teams.map(teamOption => (
                <button key={teamOption.id} type="button" onClick={() => toggleFormTeam(teamOption.id)}
                        className={`${button} text-[11px] ${form.teamIds.includes(teamOption.id) ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-transparent' : ''}`}>
                  {isAr ? teamOption.nameAr : teamOption.nameEn}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={label}><span>{t('الموعد النهائي (اختياري)', 'Deadline (optional)')}</span>
              <input type="date" className={input} value={form.deadline ?? ''} onChange={e => setForm({ ...form, deadline: e.target.value || null })} /></label>
            <label className={label}><span>{t('الأولوية', 'Priority')}</span>
              <select className={input} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })}>
                {TASK_PRIORITIES.map(priorityOption => <option key={priorityOption} value={priorityOption}>{isAr ? TASK_PRIORITY_LABELS[priorityOption].ar : TASK_PRIORITY_LABELS[priorityOption].en}</option>)}
              </select></label>
          </div>

          <div className="flex items-center justify-between pt-2">
            {editingId ? (
              <button type="button" aria-label={t('حذف', 'Delete')} onClick={() => { setEditingId(null); setDeleteId(editingId); }}
                      className="rounded-xl p-2 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><Trash2 size={18} /></button>
            ) : <span />}
            <button type="button" disabled={!form.title.trim()} onClick={save} className={primaryButton}>
              {editingId ? t('حفظ التعديلات', 'Save changes') : t('إضافة', 'Add')}
            </button>
          </div>
        </div>
      </TemplateDialog>
    )}

    <ConfirmDialog open={deleteId !== null} icon={<Trash2 size={22} />} tone="danger" title={t('حذف المهمة؟', 'Delete this task?')}
      message={t('لا يمكن التراجع عن هذا.', 'This cannot be undone.')} confirmLabel={t('حذف', 'Delete')} cancelLabel={t('إلغاء', 'Cancel')} busy={false}
      onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
  </div>;
}
