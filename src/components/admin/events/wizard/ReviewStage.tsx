'use client';

import { useState } from 'react';
import { Languages, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { httpsCallable } from '@/lib/backend';
import type { CustomQuestion, QuestionType } from '@/lib/types';
import { button, input, label, primaryButton, type ReviewFields } from './wizardTypes';

interface ReviewStageProps {
  isAr: boolean;
  value: ReviewFields;
  onChange: (next: ReviewFields) => void;
  onSave: (fields: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

const newQuestion = (): CustomQuestion => ({
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  title: '', titleEn: '', type: 'choice', required: false,
  options: ['محتوى مميز', 'تنظيم رائع', 'تفاعل ممتاز'],
  optionsEn: ['Great content', 'Great organization', 'Great interaction'],
});

async function translate(text: string, target: 'ar' | 'en'): Promise<string> {
  const { data } = await httpsCallable<{ text: string; target: string }, { translatedText: string }>(null, 'translateText')({ text, target });
  return data.translatedText;
}

export default function ReviewStage({ isAr, value, onChange, onSave, saving }: ReviewStageProps) {
  const [error, setError] = useState('');
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  const questions = value.feedbackQuestions;
  const setQuestions = (next: CustomQuestion[]) => onChange({ feedbackQuestions: next });
  const patch = (id: string, fields: Partial<CustomQuestion>) =>
    setQuestions(questions.map(q => q.id === id ? { ...q, ...fields } : q));

  const addQuestion = () => { if (questions.length < 25) setQuestions([...questions, newQuestion()]); };
  const removeQuestion = (id: string) => setQuestions(questions.filter(q => q.id !== id));

  const translateQuestion = async (q: CustomQuestion) => {
    setTranslatingId(q.id);
    setError('');
    try {
      const titleEn = q.title.trim() ? await translate(q.title, 'en') : '';
      const optionsEn = q.type === 'choice' && q.options?.length
        ? await Promise.all(q.options.map(o => translate(o, 'en'))) : undefined;
      patch(q.id, { titleEn, ...(optionsEn ? { optionsEn } : {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : (isAr ? 'تعذرت الترجمة الآلية.' : 'Automatic translation failed.'));
    } finally {
      setTranslatingId(null);
    }
  };

  const save = async () => {
    const cleaned = questions.filter(q => q.title.trim());
    for (const q of cleaned) {
      if (!q.titleEn.trim()) {
        setError(isAr ? 'أكمل الترجمة الإنجليزية لكل سؤال (استخدم زر الترجمة).' : 'Fill in the English translation for every question (use the translate button).');
        return;
      }
      if (q.type === 'choice' && (!q.options?.length || (q.optionsEn || []).length !== q.options.length)) {
        setError(isAr ? 'أكمل الترجمة الإنجليزية لخيارات كل سؤال.' : 'Translate every question’s options into English too.');
        return;
      }
    }
    setError('');
    await onSave({ feedbackQuestions: cleaned });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-text-muted)]">
        {isAr
          ? 'تظهر هذه الأسئلة للمشترك فور مسح رمز QR أو رابط التحضير لتسجيل الحضور والحصول على النقاط.'
          : 'Attendees see these questions right after scanning the check-in QR code or link.'}
      </p>
      {error && <p role="alert" className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>{error}</p>}

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-[var(--color-text-muted)]">{isAr ? `سؤال #${idx + 1}` : `Question #${idx + 1}`}</span>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => translateQuestion(q)} disabled={translatingId === q.id || !q.title.trim()}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold disabled:opacity-40"
                  style={{ color: 'var(--color-accent)', backgroundColor: 'var(--color-accent-soft)' }}
                  title={isAr ? 'ترجمة السؤال والخيارات إلى الإنجليزية' : 'Translate the question and its options to English'}>
                  {translatingId === q.id ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
                  {isAr ? 'ترجمة تلقائية' : 'Auto-translate'}
                </button>
                <button type="button" onClick={() => removeQuestion(q.id)} className="rounded-lg p-1.5" style={{ color: 'var(--color-danger)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={label}><span>{isAr ? 'نص السؤال (عربي)' : 'Question (Arabic)'}</span>
                <input className={input} dir="rtl" value={q.title} onChange={e => patch(q.id, { title: e.target.value })} /></label>
              <label className={label}><span>{isAr ? 'Question (English)' : 'Question (English)'}</span>
                <input className={input} dir="ltr" value={q.titleEn} onChange={e => patch(q.id, { titleEn: e.target.value })} /></label>
            </div>

            <label className={label}><span>{isAr ? 'نوع الإجابة' : 'Answer type'}</span>
              <select className={input} value={q.type} onChange={e => patch(q.id, { type: e.target.value as QuestionType })}>
                <option value="choice">{isAr ? 'خيارات سريعة' : 'Quick options'}</option>
                <option value="text">{isAr ? 'نص حر مع اقتراحات' : 'Free text with suggestions'}</option>
              </select>
            </label>

            {q.type === 'choice' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className={label}><span>{isAr ? 'الخيارات (عربي، مفصولة بفاصلة)' : 'Options (Arabic, comma-separated)'}</span>
                  <input className={input} dir="rtl" value={(q.options || []).join(', ')}
                    onChange={e => patch(q.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></label>
                <label className={label}><span>{isAr ? 'Options (English)' : 'Options (English)'}</span>
                  <input className={input} dir="ltr" value={(q.optionsEn || []).join(', ')}
                    onChange={e => patch(q.id, { optionsEn: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></label>
              </div>
            )}

            {q.type === 'text' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className={label}><span>{isAr ? 'اقتراحات سريعة (عربي)' : 'Quick suggestions (Arabic)'}</span>
                  <input className={input} dir="rtl" value={(q.quickChips || []).join(', ')}
                    onChange={e => patch(q.id, { quickChips: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></label>
                <label className={label}><span>{isAr ? 'Quick suggestions (English)' : 'Quick suggestions (English)'}</span>
                  <input className={input} dir="ltr" value={(q.quickChipsEn || []).join(', ')}
                    onChange={e => patch(q.id, { quickChipsEn: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></label>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)]">
              <input type="checkbox" checked={q.required} onChange={e => patch(q.id, { required: e.target.checked })} />
              {isAr ? 'إجابة إجبارية عند التحضير' : 'Required at check-in'}
            </label>
          </div>
        ))}
        {!questions.length && <p className="text-sm text-[var(--color-text-muted)]">{isAr ? 'لا توجد أسئلة بعد.' : 'No questions yet.'}</p>}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={addQuestion} className={button}><Plus size={15} />{isAr ? 'إضافة سؤال' : 'Add question'}</button>
        <button type="button" disabled={saving} onClick={save} className={primaryButton}>
          <Save size={16} />{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
        </button>
      </div>
    </div>
  );
}
