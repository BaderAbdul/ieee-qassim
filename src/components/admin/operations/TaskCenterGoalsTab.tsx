'use client';

import { useState } from 'react';
import { Plus, Target, Trash2 } from 'lucide-react';
import { useLocalCollection } from '@/hooks/useLocalCollection';
import type { TCGoal } from '@/lib/taskCenter';
import TemplateDialog from '@/components/admin/TemplateDialog';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { SEED_GOALS } from './taskCenterSeed';
import { card, input, label, primaryButton } from './taskCenterUi';

const MAX_GOALS = 5;

export default function TaskCenterGoalsTab({ isAr }: { isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { items: goals, add, remove } = useLocalCollection<TCGoal>('task_center_goals', SEED_GOALS);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = [...goals].sort((a, b) => a.order - b.order);
  const createGoal = () => {
    if (!title.trim() || goals.length >= MAX_GOALS) return;
    add({ id: crypto.randomUUID(), title: title.trim(), rationale: rationale.trim(), order: goals.length + 1 });
    setTitle(''); setRationale(''); setCreating(false);
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-bold"><Target size={18} />{t('الأهداف', 'Goals')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t(`أهداف الفرع للربع الحالي (${MAX_GOALS} أهداف رئيسية كحد أقصى).`, `The branch's current-quarter goals (up to ${MAX_GOALS} main goals).`)}</p></div>
      <button type="button" disabled={goals.length >= MAX_GOALS} className={primaryButton} onClick={() => setCreating(true)}><Plus size={15} />{t('إضافة هدف', 'Add goal')}</button>
    </div>

    {sorted.length ? <ol className="space-y-3">{sorted.map(goal => (
      <li key={goal.id} className={`${card} flex items-start gap-3 p-4`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-sm font-black text-[var(--color-accent)]">{goal.order}</span>
        <div className="flex-1"><p className="font-bold">{goal.title}</p>{goal.rationale && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{goal.rationale}</p>}</div>
        <button type="button" aria-label={t('حذف', 'Delete')} onClick={() => setDeleteId(goal.id)} className="shrink-0 rounded-lg p-1.5 hover:bg-[var(--color-surface-2)]"><Trash2 size={15} /></button>
      </li>
    ))}</ol> : <div className={`${card} p-10 text-center`}>
      <Target size={32} className="mx-auto mb-3 text-[var(--color-accent)]" />
      <p className="font-bold">{t('لا توجد أهداف حالياً', 'No goals currently')}</p>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t('ابدأ بتحديد الأهداف الاستراتيجية للفريق للربع الحالي.', 'Start by setting the team’s strategic goals for this quarter.')}</p>
    </div>}

    {creating && <TemplateDialog title={t('إضافة هدف', 'Add goal')} onClose={() => setCreating(false)}>
      <div className="space-y-3">
        <label className={label}><span>{t('العنوان', 'Title')}</span><input className={input} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className={label}><span>{t('لماذا هذا الهدف؟', 'Why this goal?')}</span><textarea rows={3} className={input} value={rationale} onChange={e => setRationale(e.target.value)} /></label>
        <div className="flex justify-end"><button type="button" disabled={!title.trim()} onClick={createGoal} className={primaryButton}>{t('إضافة', 'Add')}</button></div>
      </div>
    </TemplateDialog>}

    <ConfirmDialog open={deleteId !== null} icon={<Trash2 size={22} />} tone="warning" title={t('حذف الهدف؟', 'Delete this goal?')}
      message={t('لا يمكن التراجع عن هذا.', 'This cannot be undone.')} confirmLabel={t('حذف', 'Delete')} cancelLabel={t('إلغاء', 'Cancel')} busy={false}
      onConfirm={() => { if (deleteId) remove(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
  </div>;
}
