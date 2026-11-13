'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { ArrowLeft, ArrowRight, Plus, Target, Trash2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useToast } from '@/context/ToastContext';
import {
  DELIVERABLE_STATUS_LABELS, DELIVERABLE_STATUSES, PROJECT_CATEGORY_LABELS, REQUEST_STATUS_LABELS, REQUEST_STATUSES,
  TASK_STATUS_LABELS, crossTeamRequestsApi, deliverablesApi, projectProgress, projectsApi, tasksApi,
  type CrossTeamRequest, type Deliverable, type DeliverableStatus, type Project, type RequestStatus, type TCTask,
} from '@/lib/taskCenterApi';
import { apiGetArray } from '@/lib/backendResponse';
import TemplateDialog from '@/components/admin/TemplateDialog';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { TASK_STATUS_COLORS, card, input, label, primaryButton } from '@/components/admin/operations/taskCenterUi';

interface TeamOption { id: string; nameAr: string; nameEn: string }

export default function ProjectDetail({ id }: { id: string }) {
  const isAr = useLocale() === 'ar';
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { showToast } = useToast();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<TCTask[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [requests, setRequests] = useState<CrossTeamRequest[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'deptStats'>('overview');

  const [addingDeliverable, setAddingDeliverable] = useState(false);
  const [deliverableForm, setDeliverableForm] = useState({ title: '', teamId: '', dueDate: '', status: 'pending' as DeliverableStatus, notes: '' });
  const [addingRequest, setAddingRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({ what: '', fromTeamId: '', toTeamId: '', dueDate: '', status: 'pending' as RequestStatus });

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [projectData, tasksList, deliverablesList, requestsList, teamsList] = await Promise.all([
        projectsApi.get(projectId), tasksApi.list({ projectId }), deliverablesApi.list(projectId),
        crossTeamRequestsApi.listForProject(projectId), apiGetArray<TeamOption>('/api/admin/teams'),
      ]);
      setProject(projectData); setTasks(tasksList); setDeliverables(deliverablesList); setRequests(requestsList); setTeams(teamsList);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load project');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [projectId]);

  const taskCounts = useMemo(() => {
    const counts = { total: tasks.length, done: 0, doing: 0, todo: 0, blocked: 0 };
    for (const task of tasks) counts[task.status]++;
    return counts;
  }, [tasks]);

  const deptStats = useMemo(() => {
    return teams.filter(team => project?.teamIds.includes(team.id)).map(team => {
      const teamDeliverables = deliverables.filter(d => d.teamId === team.id);
      const done = teamDeliverables.filter(d => d.status === 'done').length;
      const rated = teamDeliverables.filter(d => d.rating != null);
      const avgRating = rated.length ? rated.reduce((sum, d) => sum + (d.rating || 0), 0) / rated.length : null;
      const inReview = teamDeliverables.filter(d => d.status === 'in_review').length;
      return { team, total: teamDeliverables.length, done, avgRating, inReview };
    });
  }, [teams, project, deliverables]);

  const createDeliverable = async () => {
    if (!deliverableForm.title.trim()) return;
    try {
      await deliverablesApi.create(projectId, {
        title: deliverableForm.title.trim(), teamId: deliverableForm.teamId || null,
        dueDate: deliverableForm.dueDate || null, status: deliverableForm.status, notes: deliverableForm.notes.trim(),
      });
      setAddingDeliverable(false);
      setDeliverableForm({ title: '', teamId: '', dueDate: '', status: 'pending', notes: '' });
      await load();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر الإضافة' : 'Unable to add'), 'error');
    }
  };

  const createRequest = async () => {
    if (!requestForm.what.trim() || !requestForm.fromTeamId || !requestForm.toTeamId) return;
    try {
      await crossTeamRequestsApi.create(projectId, {
        what: requestForm.what.trim(), fromTeamId: requestForm.fromTeamId, toTeamId: requestForm.toTeamId,
        dueDate: requestForm.dueDate || null, status: requestForm.status,
      });
      setAddingRequest(false);
      setRequestForm({ what: '', fromTeamId: '', toTeamId: '', dueDate: '', status: 'pending' });
      await load();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر الإضافة' : 'Unable to add'), 'error');
    }
  };

  if (loading) return <AdminLoading />;
  if (error || !project) return <AdminError message={error || 'Not found'} retry={load} />;

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return <div className="space-y-5">
    <div className="flex items-start gap-3">
      <Link href="/admin/operations?tab=projects" className="mt-1 rounded-lg p-1.5 hover:bg-[var(--color-surface-2)]"><BackIcon size={18} /></Link>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{project.name}</h1>
          <span className="rounded-lg bg-[var(--color-surface-2)] px-2 py-0.5 text-xs font-bold">
            {isAr ? PROJECT_CATEGORY_LABELS[project.category].ar : PROJECT_CATEGORY_LABELS[project.category].en}
          </span>
        </div>
        {project.objective && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t('الهدف', 'Objective')}: {project.objective}</p>}
      </div>
    </div>

    <div className="flex gap-2 border-b border-[var(--color-border)]">
      <button type="button" onClick={() => setTab('overview')} className={`px-3 py-2 text-sm font-bold ${tab === 'overview' ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}>
        {t('نظرة عامة', 'Overview')}
      </button>
      <button type="button" onClick={() => setTab('deptStats')} className={`px-3 py-2 text-sm font-bold ${tab === 'deptStats' ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}>
        {t('إحصائيات الأقسام (للقادة)', 'Department stats (for leaders)')}
      </button>
    </div>

    {tab === 'overview' ? <div className="space-y-6">
      {project.description && <div className={`${card} p-4`}><p className="text-sm text-[var(--color-text-secondary)]">{project.description}</p></div>}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t('مهام لوحة العمل المرتبطة', 'Linked board tasks')}</h2>
          <Link href={`/admin/operations?tab=tasks&projectId=${project.id}`} className="text-xs font-bold text-[var(--color-accent)] hover:opacity-80">
            {t('فتح لوحة المهام', 'Open task board')}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={`${card} p-3 text-center`}><p className="text-xl font-black">{taskCounts.total}</p><p className="text-[11px] text-[var(--color-text-muted)]">{t('إجمالي المهام', 'Total')}</p></div>
          <div className={`${card} p-3 text-center`}><p className="text-xl font-black text-emerald-600">{taskCounts.done}</p><p className="text-[11px] text-[var(--color-text-muted)]">{t('مكتملة', 'Done')}</p></div>
          <div className={`${card} p-3 text-center`}><p className="text-xl font-black text-sky-600">{taskCounts.doing}</p><p className="text-[11px] text-[var(--color-text-muted)]">{t('قيد التنفيذ', 'Doing')}</p></div>
          <div className={`${card} p-3 text-center`}><p className="text-xl font-black text-slate-500">{taskCounts.todo}</p><p className="text-[11px] text-[var(--color-text-muted)]">{t('قيد الانتظار', 'To do')}</p></div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[var(--color-text-muted)]"><span>{t('الإنجاز', 'Progress')}</span><span>{projectProgress(project)}%</span></div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]"><div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${projectProgress(project)}%` }} /></div>
        </div>
        {tasks.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {tasks.map(taskItem => (
              <div key={taskItem.id} className={`${card} p-3 flex items-center justify-between gap-2`}>
                <span className="text-sm font-bold truncate">{taskItem.title}</span>
                <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold ${TASK_STATUS_COLORS[taskItem.status]}`}>
                  {isAr ? TASK_STATUS_LABELS[taskItem.status].ar : TASK_STATUS_LABELS[taskItem.status].en}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t('جدول المهام والتسليمات', 'Deliverables')}</h2>
          <button type="button" className={primaryButton} onClick={() => setAddingDeliverable(true)}><Plus size={14} />{t('إضافة تسليمة', 'Add deliverable')}</button>
        </div>
        {deliverables.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-start text-xs text-[var(--color-text-muted)]">
                <th className="p-2 text-start">{t('التسليمة', 'Deliverable')}</th>
                <th className="p-2 text-start">{t('القسم', 'Department')}</th>
                <th className="p-2 text-start">{t('تاريخ التسليم', 'Due date')}</th>
                <th className="p-2 text-start">{t('الحالة', 'Status')}</th>
                <th className="p-2 text-start">{t('التقييم', 'Rating')}</th>
                <th className="p-2 text-start" />
              </tr></thead>
              <tbody>
                {deliverables.map(deliverable => (
                  <tr key={deliverable.id} className="border-t border-[var(--color-border)]/50">
                    <td className="p-2 font-bold">{deliverable.title}</td>
                    <td className="p-2">{deliverable.teamId ? (isAr ? deliverable.teamNameAr : deliverable.teamNameEn) : '—'}</td>
                    <td className="p-2">{deliverable.dueDate || '—'}</td>
                    <td className="p-2">{isAr ? DELIVERABLE_STATUS_LABELS[deliverable.status].ar : DELIVERABLE_STATUS_LABELS[deliverable.status].en}</td>
                    <td className="p-2">{deliverable.rating ?? '—'}</td>
                    <td className="p-2">
                      <button type="button" aria-label={t('حذف', 'Delete')}
                              onClick={() => { void deliverablesApi.remove(deliverable.id).then(load); }}
                              className="rounded-lg p-1 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-[var(--color-text-muted)]">{t('لا توجد تسليمات لهذا المشروع بعد.', 'No deliverables for this project yet.')}</p>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t('التسليمات بين الأقسام', 'Cross-team requests')}</h2>
          <button type="button" className={primaryButton} onClick={() => setAddingRequest(true)}><Plus size={14} />{t('إضافة تسليمة للأقسام', 'Add cross-team request')}</button>
        </div>
        {requests.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-start text-xs text-[var(--color-text-muted)]">
                <th className="p-2 text-start">{t('ما الذي يتم تسليمه؟', 'What')}</th>
                <th className="p-2 text-start">{t('من', 'From')}</th>
                <th className="p-2 text-start">{t('إلى', 'To')}</th>
                <th className="p-2 text-start">{t('الموعد', 'Due')}</th>
                <th className="p-2 text-start">{t('الحالة', 'Status')}</th>
                <th className="p-2 text-start" />
              </tr></thead>
              <tbody>
                {requests.map(request => (
                  <tr key={request.id} className="border-t border-[var(--color-border)]/50">
                    <td className="p-2 font-bold">{request.what}</td>
                    <td className="p-2">{isAr ? request.fromTeamNameAr : request.fromTeamNameEn}</td>
                    <td className="p-2">{isAr ? request.toTeamNameAr : request.toTeamNameEn}</td>
                    <td className="p-2">{request.dueDate || '—'}</td>
                    <td className="p-2">{isAr ? REQUEST_STATUS_LABELS[request.status].ar : REQUEST_STATUS_LABELS[request.status].en}</td>
                    <td className="p-2">
                      <button type="button" aria-label={t('حذف', 'Delete')}
                              onClick={() => { void crossTeamRequestsApi.remove(request.id).then(load); }}
                              className="rounded-lg p-1 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-[var(--color-text-muted)]">{t('لا توجد تسليمات بين الأقسام مسجلة لهذا المشروع بعد.', 'No cross-team requests recorded for this project yet.')}</p>}
      </section>
    </div> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {deptStats.map(({ team, total, done, avgRating, inReview }) => (
        <div key={team.id} className={`${card} p-4 space-y-2`}>
          <h3 className="font-bold flex items-center gap-2"><Target size={15} />{isAr ? team.nameAr : team.nameEn}</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">{t('نسبة الإنجاز (التسليمات)', 'Completion (deliverables)')}: {total ? Math.round((100 * done) / total) : 0}% ({done}/{total})</p>
          <p className="text-sm text-[var(--color-text-secondary)]">{t('متوسط التقييم', 'Average rating')}: {avgRating != null ? avgRating.toFixed(1) : '—'}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">{t('تسليمات قيد المراجعة', 'Deliverables in review')}: {inReview}</p>
        </div>
      ))}
      {deptStats.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">{t('لا توجد أقسام مرتبطة بهذا المشروع.', 'No departments linked to this project.')}</p>}
    </div>}

    {addingDeliverable && (
      <TemplateDialog title={t('إضافة تسليمة', 'Add deliverable')} onClose={() => setAddingDeliverable(false)}>
        <div className="space-y-3">
          <label className={label}><span>{t('العنوان', 'Title')}</span>
            <input className={input} value={deliverableForm.title} onChange={e => setDeliverableForm({ ...deliverableForm, title: e.target.value })} /></label>
          <label className={label}><span>{t('القسم', 'Department')}</span>
            <select className={input} value={deliverableForm.teamId} onChange={e => setDeliverableForm({ ...deliverableForm, teamId: e.target.value })}>
              <option value="">{t('بدون', 'None')}</option>
              {teams.map(teamOption => <option key={teamOption.id} value={teamOption.id}>{isAr ? teamOption.nameAr : teamOption.nameEn}</option>)}
            </select></label>
          <label className={label}><span>{t('تاريخ التسليم', 'Due date')}</span>
            <input type="date" className={input} value={deliverableForm.dueDate} onChange={e => setDeliverableForm({ ...deliverableForm, dueDate: e.target.value })} /></label>
          <label className={label}><span>{t('الحالة', 'Status')}</span>
            <select className={input} value={deliverableForm.status} onChange={e => setDeliverableForm({ ...deliverableForm, status: e.target.value as DeliverableStatus })}>
              {DELIVERABLE_STATUSES.map(s => <option key={s} value={s}>{isAr ? DELIVERABLE_STATUS_LABELS[s].ar : DELIVERABLE_STATUS_LABELS[s].en}</option>)}
            </select></label>
          <label className={label}><span>{t('ملاحظات', 'Notes')}</span>
            <textarea rows={2} className={input} value={deliverableForm.notes} onChange={e => setDeliverableForm({ ...deliverableForm, notes: e.target.value })} /></label>
          <div className="flex justify-end"><button type="button" disabled={!deliverableForm.title.trim()} onClick={createDeliverable} className={primaryButton}>{t('إضافة', 'Add')}</button></div>
        </div>
      </TemplateDialog>
    )}

    {addingRequest && (
      <TemplateDialog title={t('إضافة تسليمة بين الأقسام', 'Add cross-team request')} onClose={() => setAddingRequest(false)}>
        <div className="space-y-3">
          <label className={label}><span>{t('ما الذي يتم تسليمه؟', 'What is being delivered?')}</span>
            <input className={input} value={requestForm.what} onChange={e => setRequestForm({ ...requestForm, what: e.target.value })} /></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={label}><span>{t('من', 'From')}</span>
              <select className={input} value={requestForm.fromTeamId} onChange={e => setRequestForm({ ...requestForm, fromTeamId: e.target.value })}>
                <option value="">—</option>
                {teams.map(teamOption => <option key={teamOption.id} value={teamOption.id}>{isAr ? teamOption.nameAr : teamOption.nameEn}</option>)}
              </select></label>
            <label className={label}><span>{t('إلى', 'To')}</span>
              <select className={input} value={requestForm.toTeamId} onChange={e => setRequestForm({ ...requestForm, toTeamId: e.target.value })}>
                <option value="">—</option>
                {teams.map(teamOption => <option key={teamOption.id} value={teamOption.id}>{isAr ? teamOption.nameAr : teamOption.nameEn}</option>)}
              </select></label>
          </div>
          <label className={label}><span>{t('الموعد', 'Due date')}</span>
            <input type="date" className={input} value={requestForm.dueDate} onChange={e => setRequestForm({ ...requestForm, dueDate: e.target.value })} /></label>
          <label className={label}><span>{t('الحالة', 'Status')}</span>
            <select className={input} value={requestForm.status} onChange={e => setRequestForm({ ...requestForm, status: e.target.value as RequestStatus })}>
              {REQUEST_STATUSES.map(s => <option key={s} value={s}>{isAr ? REQUEST_STATUS_LABELS[s].ar : REQUEST_STATUS_LABELS[s].en}</option>)}
            </select></label>
          <div className="flex justify-end">
            <button type="button" disabled={!requestForm.what.trim() || !requestForm.fromTeamId || !requestForm.toTeamId} onClick={createRequest} className={primaryButton}>
              {t('إضافة', 'Add')}
            </button>
          </div>
        </div>
      </TemplateDialog>
    )}
  </div>;
}
