'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowLeftCircle, CheckCircle2, MessageSquare, Send, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLocalCollection } from '@/hooks/useLocalCollection';
import type { TCCheckin } from '@/lib/taskCenter';
import { card, input, label, primaryButton } from './taskCenterUi';

export default function TaskCenterCheckinTab({ isAr }: { isAr: boolean }) {
  const t = (ar: string, en: string) => isAr ? ar : en;
  const { userData } = useAuth();
  const { items: checkins, add } = useLocalCollection<TCCheckin>('task_center_checkins', []);
  const [accomplished, setAccomplished] = useState('');
  const [next, setNext] = useState('');
  const [blockers, setBlockers] = useState('');
  const [needs, setNeeds] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!accomplished.trim() && !next.trim()) return;
    add({
      id: crypto.randomUUID(), author: userData?.displayName || t('أنا', 'Me'),
      accomplished: accomplished.trim(), next: next.trim(), blockers: blockers.trim(), needs: needs.trim(),
      createdAt: new Date().toISOString(),
    });
    setAccomplished(''); setNext(''); setBlockers(''); setNeeds('');
  };

  return <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
    <div className={`${card} space-y-4 p-5`}>
      <div><h2 className="flex items-center gap-2 text-lg font-bold"><MessageSquare size={18} />{t('تحديث أسبوعي', 'Weekly Check-in')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('صفحة واحدة، 4 أسئلة، إجابات قصيرة جداً.', 'One page, 4 questions, very short answers.')}</p></div>
      <form onSubmit={submit} className="space-y-3">
        <label className={label}><span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" />{t('ما أهم شيء أنجزته؟', 'What’s the most important thing you accomplished?')}</span>
          <input className={input} value={accomplished} onChange={e => setAccomplished(e.target.value)} placeholder={t('إجابة قصيرة ومباشرة…', 'Short and direct…')} /></label>
        <label className={label}><span className="flex items-center gap-1.5"><ArrowLeftCircle size={14} className="text-sky-500" />{t('ما أهم شيء ستعمل عليه؟', 'What’s the most important thing you’ll work on next?')}</span>
          <input className={input} value={next} onChange={e => setNext(e.target.value)} placeholder={t('إجابة قصيرة ومباشرة…', 'Short and direct…')} /></label>
        <label className={label}><span className="flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-500" />{t('هل يوجد شيء يوقفك؟ (Blockers)', 'Anything blocking you?')}</span>
          <input className={input} value={blockers} onChange={e => setBlockers(e.target.value)} placeholder={t('لا شيء، أو حدد المشكلة…', 'Nothing, or name the issue…')} /></label>
        <label className={label}><span className="flex items-center gap-1.5"><Users size={14} className="text-indigo-500" />{t('ما الذي تحتاجه من الفريق؟', 'What do you need from the team?')}</span>
          <input className={input} value={needs} onChange={e => setNeeds(e.target.value)} placeholder={t('من قسم X أحتاج Y…', 'From dept X I need Y…')} /></label>
        <button type="submit" className={primaryButton}><Send size={15} />{t('إرسال التحديث', 'Submit Update')}</button>
      </form>
    </div>

    <div className={`${card} space-y-3 p-5`}>
      <h3 className="font-bold">{t('آخر تحديثات الفريق', 'Recent Team Updates')}</h3>
      {checkins.length ? <ul className="space-y-3">{checkins.map(entry => (
        <li key={entry.id} className="rounded-xl border border-[var(--color-border)] p-3 text-sm">
          <p className="font-bold">{entry.author}</p>
          {entry.accomplished && <p className="mt-1"><strong>{t('أنجز:', 'Did:')}</strong> {entry.accomplished}</p>}
          {entry.next && <p><strong>{t('التالي:', 'Next:')}</strong> {entry.next}</p>}
          {entry.blockers && <p className="text-amber-600"><strong>{t('معوقات:', 'Blockers:')}</strong> {entry.blockers}</p>}
          {entry.needs && <p><strong>{t('يحتاج:', 'Needs:')}</strong> {entry.needs}</p>}
        </li>
      ))}</ul> : <p className="rounded-xl border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
        {t('لا توجد تحديثات هذا الأسبوع حتى الآن. كن أول من يشارك تحديثه!', 'No updates this week yet. Be the first to share yours!')}
      </p>}
    </div>
  </div>;
}
