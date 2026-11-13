'use client';

import { useEffect, useState } from 'react';
import { Edit2, Plus, Target, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { apiGetArray } from '@/lib/backendResponse';
import { goalsApi, type Goal } from '@/lib/taskCenterApi';
import TemplateDialog from '@/components/admin/TemplateDialog';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { AdminError, AdminLoading } from '@/components/admin/AdminData';
import { card, input, label, primaryButton } from './taskCenterUi';

interface TeamOption { id: string; nameAr: string; nameEn: string }

const emptyForm = { title: '', why: '', successMetric: '', teamId: '', progress: 0 };

export default function TaskCenterGoalsTab({ isAr }: { isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { userData } = useAuth();
  const { showToast } = useToast();
  const isSuperAdmin = userData?.isSuperAdmin === true;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [goalsList, teamsList] = await Promise.all([goalsApi.list(), apiGetArray<TeamOption>('/api/admin/teams')]);
      setGoals(goalsList);
      setTeams(teamsList);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load goals');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const startCreate = () => { setForm(emptyForm); setEditingId(0); };
  const startEdit = (goal: Goal) => {
    setForm({ title: goal.title, why: goal.why, successMetric: goal.successMetric, teamId: goal.teamId || '', progress: goal.progress });
    setEditingId(goal.id);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      const payload = { title: form.title.trim(), why: form.why.trim(), successMetric: form.successMetric.trim(), teamId: form.teamId || null };
      if (editingId) {
        await goalsApi.update(editingId, { ...payload, progress: form.progress });
      } else {
        await goalsApi.create(payload);
      }
      setEditingId(null);
      await load();
      showToast(isAr ? 'تم الحفظ بنجاح' : 'Saved successfully', 'success');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر الحفظ' : 'Unable to save'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setBusy(true);
    try {
      await goalsApi.remove(deleteId);
      setDeleteId(null);
      await load();
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : (isAr ? 'تعذر الحذف' : 'Unable to delete'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AdminLoading />;
  if (error) return <AdminError message={error} retry={load} />;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold"><Target size={18} />{t('الأهداف', 'Goals')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('أهداف النادي للربع الحالي (4-5 أهداف رئيسية فقط).', "The club's goals for the current quarter (4-5 main goals only).")}</p>
      </div>
      {isSuperAdmin && (
        <button type="button" className={primaryButton} onClick={startCreate}><Plus size={15} />{t('إضافة هدف', 'Add goal')}</button>
      )}
    </div>

    {goals.length ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map(goal => (
          <div key={goal.id} className={`${card} p-4 space-y-3 flex flex-col`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                <h3 className="font-bold leading-tight">{goal.title}</h3>
              </div>
              {isSuperAdmin && (
                <div className="flex shrink-0 gap-1">
                  <button type="button" aria-label={t('تعديل', 'Edit')} onClick={() => startEdit(goal)} className="rounded-lg p-1.5 hover:bg-[var(--color-surface-2)]"><Edit2 size={14} /></button>
                  <button type="button" aria-label={t('حذف', 'Delete')} onClick={() => setDeleteId(goal.id)} className="rounded-lg p-1.5 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
            {goal.teamNameAr && (
              <span className="w-fit rounded-lg bg-[var(--color-accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-accent)]">
                {isAr ? goal.teamNameAr : goal.teamNameEn}
              </span>
            )}
            {goal.why && (
              <div className="rounded-xl bg-[var(--color-surface-2)]/60 p-2.5 text-xs">
                <p className="mb-1 font-bold text-[var(--color-text-muted)]">{t('السبب (WHY)', 'Why')}</p>
                <p className="text-[var(--color-text-secondary)]">{goal.why}</p>
              </div>
            )}
            {goal.successMetric && (
              <div className="rounded-xl bg-[var(--color-surface-2)]/60 p-2.5 text-xs">
                <p className="mb-1 font-bold text-[var(--color-text-muted)]">{t('مؤشر النجاح', 'Success metric')}</p>
                <p className="text-[var(--color-text-secondary)]">{goal.successMetric}</p>
              </div>
            )}
            <div className="mt-auto pt-1">
              <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-[var(--color-text-muted)]">
                <span>{t('التقدم', 'Progress')}</span><span>{goal.progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${goal.progress}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className={`${card} p-10 text-center`}>
        <Target size={32} className="mx-auto mb-3 text-[var(--color-accent)]" />
        <p className="font-bold">{t('لا توجد أهداف حالياً', 'No goals currently')}</p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t('ابدأ بتحديد الأهداف الاستراتيجية للفريق للربع الحالي.', 'Start by setting the team’s strategic goals for this quarter.')}</p>
      </div>
    )}

    {editingId !== null && (
      <TemplateDialog title={editingId ? t('تعديل الهدف', 'Edit goal') : t('إضافة هدف جديد', 'Add new goal')} onClose={() => setEditingId(null)}>
        <div className="space-y-3">
          <label className={label}><span>{t('الهدف', 'Goal')}</span>
            <input className={input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label className={label}><span>{t('السبب', 'Why')}</span>
            <textarea rows={2} className={input} value={form.why} onChange={e => setForm({ ...form, why: e.target.value })} /></label>
          <label className={label}><span>{t('المسؤول (القسم)', 'Owner (department)')}</span>
            <select className={input} value={form.teamId} onChange={e => setForm({ ...form, teamId: e.target.value })}>
              <option value="">{t('بدون', 'None')}</option>
              {teams.map(team => <option key={team.id} value={team.id}>{isAr ? team.nameAr : team.nameEn}</option>)}
            </select></label>
          <label className={label}><span>{t('كيف يبدو النجاح؟', 'How does success look?')}</span>
            <textarea rows={2} className={input} value={form.successMetric} onChange={e => setForm({ ...form, successMetric: e.target.value })} /></label>
          {editingId > 0 && (
            <label className={label}><span>{t('التقدم (%)', 'Progress (%)')}</span>
              <input type="number" min={0} max={100} className={input} value={form.progress}
                     onChange={e => setForm({ ...form, progress: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} /></label>
          )}
          <div className="flex justify-end">
            <button type="button" disabled={!form.title.trim() || busy} onClick={save} className={primaryButton}>
              {editingId ? t('حفظ', 'Save') : t('إضافة الهدف', 'Add goal')}
            </button>
          </div>
        </div>
      </TemplateDialog>
    )}

    <ConfirmDialog open={deleteId !== null} icon={<Trash2 size={22} />} tone="danger" title={t('حذف الهدف؟', 'Delete this goal?')}
      message={t('لا يمكن التراجع عن هذا.', 'This cannot be undone.')} confirmLabel={t('حذف', 'Delete')} cancelLabel={t('إلغاء', 'Cancel')} busy={busy}
      onConfirm={confirmDelete} onCancel={() => setDeleteId(null)} />
  </div>;
}
