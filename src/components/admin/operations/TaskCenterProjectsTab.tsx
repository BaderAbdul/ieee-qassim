'use client';

import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Plus, Trash2, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { httpsCallable } from '@/lib/backend';
import { apiGetArray } from '@/lib/backendResponse';
import type { AdminMember, MemberSearchResult } from '@/lib/adminTypes';
import { useToast } from '@/context/ToastContext';
import {
  PROJECT_CATEGORIES, PROJECT_CATEGORY_LABELS, PROJECT_STATUS_LABELS,
  projectProgress, projectsApi, goalsApi,
  type Goal, type Project, type ProjectCategory, type ProjectInput,
} from '@/lib/taskCenterApi';
import TemplateDialog from '@/components/admin/TemplateDialog';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { PROJECT_STATUS_COLORS, button, card, input, label, primaryButton } from './taskCenterUi';

interface TeamOption { id: string; nameAr: string; nameEn: string }

const emptyForm: ProjectInput = {
  name: '', description: '', category: 'other', objective: '', goalIds: [], ownerIds: [], teamIds: [],
  deadline: null, status: 'active',
};

export default function TaskCenterProjectsTab({ isAr }: { isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { showToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filterTeam, setFilterTeam] = useState('');

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ProjectInput>(emptyForm);
  const [ownerResults, setOwnerResults] = useState<AdminMember[]>([]);
  const [ownerQuery, setOwnerQuery] = useState('');
  const [selectedOwners, setSelectedOwners] = useState<AdminMember[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [projectsList, teamsList, goalsList] = await Promise.all([
        projectsApi.list(), apiGetArray<TeamOption>('/api/admin/teams'), goalsApi.list(),
      ]);
      setProjects(projectsList); setTeams(teamsList); setGoals(goalsList);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load projects');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!creating) return;
    const query = ownerQuery.trim();
    if (!query) { setOwnerResults([]); return; }
    const timer = window.setTimeout(() => {
      void httpsCallable<unknown, MemberSearchResult>(null, 'searchMembers')({ query }).then(
        result => setOwnerResults(result.data.users.filter(u => !selectedOwners.some(o => o.id === u.id)))
      ).catch(() => setOwnerResults([]));
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerQuery, creating]);

  const visible = useMemo(
    () => filterTeam ? projects.filter(p => p.teamIds.includes(filterTeam)) : projects,
    [projects, filterTeam]);

  const startCreate = () => { setForm(emptyForm); setSelectedOwners([]); setOwnerQuery(''); setOwnerResults([]); setCreating(true); };

  const createProject = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      await projectsApi.create({ ...form, ownerIds: selectedOwners.map(o => o.id) });
      setCreating(false);
      await load();
      showToast(isAr ? 'تم إنشاء المشروع بنجاح' : 'Project created successfully', 'success');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر الإنشاء' : 'Unable to create'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setBusy(true);
    try {
      await projectsApi.remove(deleteId);
      setDeleteId(null);
      await load();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر الحذف' : 'Unable to delete'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleFormTeam = (teamId: string) => {
    setForm(f => ({ ...f, teamIds: f.teamIds.includes(teamId) ? f.teamIds.filter(id => id !== teamId) : [...f.teamIds, teamId] }));
  };
  const toggleFormGoal = (goalId: number) => {
    setForm(f => ({ ...f, goalIds: f.goalIds.includes(goalId) ? f.goalIds.filter(id => id !== goalId) : [...f.goalIds, goalId] }));
  };

  if (loading) return <AdminLoading />;
  if (error) return <AdminError message={error} retry={load} />;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold"><Briefcase size={18} />{t('المشاريع', 'Projects')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('الأشياء الكبيرة التي تحتاج لأكثر من مهمة أو أكثر من أسبوع لإنجازها.', 'Big things needing more than one task or more than a week.')}</p>
      </div>
      <button type="button" className={primaryButton} onClick={startCreate}><Plus size={15} />{t('مشروع جديد', 'New project')}</button>
    </div>

    <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
      <button type="button" onClick={() => setFilterTeam('')} className={`${button} shrink-0 ${!filterTeam ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-transparent' : ''}`}>{t('الكل', 'All')}</button>
      {teams.map(team => (
        <button key={team.id} type="button" onClick={() => setFilterTeam(team.id)} className={`${button} shrink-0 ${filterTeam === team.id ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-transparent' : ''}`}>
          {isAr ? team.nameAr : team.nameEn}
        </button>
      ))}
    </div>

    {visible.length ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map(project => {
          const progress = projectProgress(project);
          return (
            <Link key={project.id} href={`/admin/operations/projects/${project.id}`}
                  className={`${card} block space-y-3 p-4 hover:border-[var(--color-accent)]/50 transition-colors`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {project.teams.map(team => (
                    <span key={team.id} className="rounded-lg bg-[var(--color-accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-accent)]">
                      {isAr ? team.nameAr : team.nameEn}
                    </span>
                  ))}
                  <span className="rounded-lg bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] font-bold">
                    {isAr ? PROJECT_CATEGORY_LABELS[project.category].ar : PROJECT_CATEGORY_LABELS[project.category].en}
                  </span>
                </div>
                <button type="button" aria-label={t('حذف', 'Delete')}
                        onClick={e => { e.preventDefault(); setDeleteId(project.id); }}
                        className="shrink-0 rounded-lg p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><Trash2 size={15} /></button>
              </div>
              <h3 className="font-bold leading-tight">{project.name}</h3>
              {project.description && <p className="line-clamp-2 text-sm text-[var(--color-text-secondary)]">{project.description}</p>}
              <span className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-bold ${PROJECT_STATUS_COLORS[project.status]}`}>
                {isAr ? PROJECT_STATUS_LABELS[project.status].ar : PROJECT_STATUS_LABELS[project.status].en}
              </span>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[var(--color-text-muted)]"><span>{t('الإنجاز', 'Progress')}</span><span>{progress}%</span></div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]"><div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${progress}%` }} /></div>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>{project.deadline ? `${t('الموعد النهائي', 'Deadline')}: ${project.deadline}` : ''}</span>
                {project.owners[0] && <span>{t('بواسطة', 'By')}: {project.owners[0].name}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    ) : (
      <p className={`${card} p-8 text-center text-sm text-[var(--color-text-muted)]`}>{t('لا توجد مشاريع مطابقة.', 'No matching projects.')}</p>
    )}

    {creating && (
      <TemplateDialog title={t('إضافة مشروع جديد', 'Add new project')} onClose={() => setCreating(false)}>
        <div className="space-y-3">
          <label className={label}><span>{t('اسم المشروع', 'Project name')}</span>
            <input className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label className={label}><span>{t('شرح المشروع', 'Project description')}</span>
            <textarea rows={3} className={input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
          <label className={label}><span>{t('تصنيف المشروع', 'Project category')}</span>
            <select className={input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ProjectCategory })}>
              {PROJECT_CATEGORIES.map(c => <option key={c} value={c}>{isAr ? PROJECT_CATEGORY_LABELS[c].ar : PROJECT_CATEGORY_LABELS[c].en}</option>)}
            </select></label>
          <label className={label}><span>{t('الهدف من المشروع', 'Project objective')}</span>
            <input className={input} value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} /></label>

          {goals.length > 0 && (
            <div className={label}><span>{t('يخدم أي هدف استراتيجي؟ (يمكن اختيار أكثر من هدف)', 'Serves which strategic goal(s)? (multiple allowed)')}</span>
              <div className="flex flex-wrap gap-1.5">
                {goals.map(goal => (
                  <button key={goal.id} type="button" onClick={() => toggleFormGoal(goal.id)}
                          className={`${button} text-[11px] ${form.goalIds.includes(goal.id) ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-transparent' : ''}`}>
                    {goal.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={label}>
            <span>{t('المسؤولون (يمكن اختيار أكثر من مسؤول)', 'Owners (multiple allowed)')}</span>
            {selectedOwners.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedOwners.map(owner => (
                  <span key={owner.id} className="flex items-center gap-1 rounded-lg bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-bold text-[var(--color-accent)]">
                    {owner.arabicFullName || owner.displayName}
                    <button type="button" onClick={() => setSelectedOwners(selectedOwners.filter(o => o.id !== owner.id))}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
            <input className={input} value={ownerQuery} onChange={e => setOwnerQuery(e.target.value)} placeholder={t('ابحث بالاسم أو البريد…', 'Search by name or email…')} />
            {ownerResults.length > 0 && (
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-[var(--color-border)] p-1.5">
                {ownerResults.map(user => (
                  <button key={user.id} type="button"
                          onClick={() => { setSelectedOwners([...selectedOwners, user]); setOwnerQuery(''); setOwnerResults([]); }}
                          className="block w-full rounded-lg px-2 py-1.5 text-start text-sm hover:bg-[var(--color-surface-2)]">
                    {user.arabicFullName || user.displayName} <span className="text-xs text-[var(--color-text-muted)]">{user.email}</span>
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

          <label className={label}><span>{t('الموعد النهائي', 'Deadline')}</span>
            <input type="date" className={input} value={form.deadline ?? ''} onChange={e => setForm({ ...form, deadline: e.target.value || null })} /></label>

          <div className="flex justify-end">
            <button type="button" disabled={!form.name.trim() || busy} onClick={createProject} className={primaryButton}>
              {t('إضافة المشروع', 'Add project')}
            </button>
          </div>
        </div>
      </TemplateDialog>
    )}

    <ConfirmDialog open={deleteId !== null} icon={<Trash2 size={22} />} tone="danger" title={t('حذف المشروع؟', 'Delete this project?')}
      message={t('سيتم حذف كل تسليماته وطلباته بين الأقسام أيضًا.', 'Its deliverables and cross-team requests will be deleted too.')}
      confirmLabel={t('حذف', 'Delete')} cancelLabel={t('إلغاء', 'Cancel')} busy={busy}
      onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
  </div>;
}
