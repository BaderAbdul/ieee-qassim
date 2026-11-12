'use client';

import { useState } from 'react';
import { Lightbulb, Plus, ThumbsUp, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLocalCollection } from '@/hooks/useLocalCollection';
import { IDEA_CATEGORIES, IDEA_STATUS_LABELS, IDEA_STATUSES, type IdeaStatus, type TCIdea } from '@/lib/taskCenter';
import TemplateDialog from '@/components/admin/TemplateDialog';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { SEED_IDEAS } from './taskCenterSeed';
import { IDEA_STATUS_COLORS, button, card, input, label, primaryButton } from './taskCenterUi';

export default function TaskCenterIdeasTab({ isAr, canModerate }: { isAr: boolean; canModerate: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { userData } = useAuth();
  const { items: ideas, add, update, remove } = useLocalCollection<TCIdea>('task_center_ideas', SEED_IDEAS);
  const [filter, setFilter] = useState<IdeaStatus | ''>('');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<typeof IDEA_CATEGORIES[number]>('Other');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [voted, setVoted] = useState<Set<string>>(new Set());

  const visible = filter ? ideas.filter(idea => idea.status === filter) : ideas;
  const createIdea = () => {
    if (!title.trim()) return;
    add({
      id: crypto.randomUUID(), title: title.trim(), description: description.trim(), category, status: 'new', votes: 0,
      createdBy: userData?.displayName || t('أنا', 'Me'), createdAt: new Date().toISOString(),
    });
    setTitle(''); setDescription(''); setCategory('Other'); setCreating(false);
  };
  const vote = (idea: TCIdea) => {
    if (voted.has(idea.id)) return;
    update(idea.id, { votes: idea.votes + 1 });
    setVoted(prev => new Set(prev).add(idea.id));
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-bold"><Lightbulb size={18} />{t('بنك الأفكار', 'Ideas Bank')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('مساحة حرة لطرح وتصويت ومناقشة الأفكار الجديدة.', 'An open space to propose, vote on and discuss new ideas.')}</p></div>
      <button type="button" className={primaryButton} onClick={() => setCreating(true)}><Plus size={15} />{t('طرح فكرة', 'Propose an idea')}</button>
    </div>

    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setFilter('')} className={`${button} ${!filter ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-transparent' : ''}`}>{t('الكل', 'All')}</button>
      {IDEA_STATUSES.map(status => (
        <button key={status} type="button" onClick={() => setFilter(status)} className={`${button} ${filter === status ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)] border-transparent' : ''}`}>{isAr ? IDEA_STATUS_LABELS[status].ar : IDEA_STATUS_LABELS[status].en}</button>
      ))}
    </div>

    {visible.length ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visible.map(idea => (
        <article key={idea.id} className={`${card} space-y-2.5 p-4`}>
          <div className="flex items-start justify-between gap-2">
            <div><p className="text-xs font-bold text-[var(--color-text-muted)]">{idea.category}</p><h3 className="font-bold">{idea.title}</h3></div>
            <button type="button" aria-label={t('حذف', 'Delete')} onClick={() => setDeleteId(idea.id)} className="shrink-0 rounded-lg p-1.5 hover:bg-[var(--color-surface-2)]"><Trash2 size={15} /></button>
          </div>
          <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-bold ${IDEA_STATUS_COLORS[idea.status]}`}>{isAr ? IDEA_STATUS_LABELS[idea.status].ar : IDEA_STATUS_LABELS[idea.status].en}</span>
          {idea.description && <p className="line-clamp-3 text-sm text-[var(--color-text-secondary)]">{idea.description}</p>}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button type="button" onClick={() => vote(idea)} disabled={voted.has(idea.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs font-bold disabled:opacity-60">
              <ThumbsUp size={13} />{idea.votes}
            </button>
            {canModerate && <select className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-xs"
                    value={idea.status} onChange={e => update(idea.id, { status: e.target.value as IdeaStatus })}>
              {IDEA_STATUSES.map(s => <option key={s} value={s}>{isAr ? IDEA_STATUS_LABELS[s].ar : IDEA_STATUS_LABELS[s].en}</option>)}
            </select>}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">{t('بواسطة', 'By')} {idea.createdBy}</p>
        </article>
      ))}
    </div> : <p className={`${card} p-8 text-center text-sm text-[var(--color-text-muted)]`}>{t('لا توجد أفكار مطابقة.', 'No matching ideas.')}</p>}

    {creating && <TemplateDialog title={t('طرح فكرة', 'Propose an idea')} onClose={() => setCreating(false)}>
      <div className="space-y-3">
        <label className={label}><span>{t('العنوان', 'Title')}</span><input className={input} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className={label}><span>{t('الوصف', 'Description')}</span><textarea rows={4} className={input} value={description} onChange={e => setDescription(e.target.value)} /></label>
        <label className={label}><span>{t('التصنيف', 'Category')}</span>
          <select className={input} value={category} onChange={e => setCategory(e.target.value as typeof category)}>
            {IDEA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select></label>
        <div className="flex justify-end"><button type="button" disabled={!title.trim()} onClick={createIdea} className={primaryButton}>{t('نشر', 'Post')}</button></div>
      </div>
    </TemplateDialog>}

    <ConfirmDialog open={deleteId !== null} icon={<Trash2 size={22} />} tone="warning" title={t('حذف الفكرة؟', 'Delete this idea?')}
      message={t('لا يمكن التراجع عن هذا.', 'This cannot be undone.')} confirmLabel={t('حذف', 'Delete')} cancelLabel={t('إلغاء', 'Cancel')} busy={false}
      onConfirm={() => { if (deleteId) remove(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
  </div>;
}
