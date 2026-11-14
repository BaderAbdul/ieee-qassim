'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Languages, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { apiGet, httpsCallable } from '@/lib/backend';
import { useToast } from '@/context/ToastContext';
import { feedbackQuestionError } from '@/lib/feedbackQuestionValidation';
import type { CustomQuestion, QuestionType } from '@/lib/types';
import { button, input, label, primaryButton, type ReviewFields, type StageEmbedProps } from './wizardTypes';

interface ReviewStageProps extends StageEmbedProps {
  isAr: boolean;
  value: ReviewFields;
  onChange: Dispatch<SetStateAction<ReviewFields>>;
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

export default function ReviewStage({ isAr, value, onChange, onSave, saving, hideSave, registerCollect }: ReviewStageProps) {
  const { showToast } = useToast();
  const [error, setError] = useState('');
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translationState, setTranslationState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let active = true;
    apiGet<{ translationConfigured: boolean }>('/api/readiness')
      .then(result => { if (active) setTranslationState(result.translationConfigured ? 'ready' : 'unavailable'); })
      .catch(() => { if (active) setTranslationState('unavailable'); });
    return () => { active = false; };
  }, []);

  const questions = value.feedbackQuestions;
  const setQuestions = (next: CustomQuestion[]) => onChange({ feedbackQuestions: next });
  const patch = (id: string, fields: Partial<CustomQuestion>) =>
    onChange(previous => ({ feedbackQuestions: previous.feedbackQuestions.map(q => q.id === id ? { ...q, ...fields } : q) }));

  const addQuestion = () => { if (questions.length < 25) setQuestions([...questions, newQuestion()]); };
  const removeQuestion = (id: string) => setQuestions(questions.filter(q => q.id !== id));

  const translateQuestion = async (q: CustomQuestion) => {
    if (translationState !== 'ready' || translatingId || saving) return;
    setTranslatingId(q.id);
    try {
      const titleEn = q.title.trim() ? await translate(q.title, 'en') : '';
      const arabicLines = (q.options || []).map(o => o.trim()).filter(Boolean);
      // one request per line, so the English list always has exactly the same lines in the same order
      const optionsEn = q.type === 'choice' && arabicLines.length
        ? await Promise.all(arabicLines.map(o => translate(o, 'en'))) : undefined;
      patch(q.id, { titleEn, ...(optionsEn ? { optionsEn } : {}) });
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isAr ? 'تعذرت الترجمة الآلية.' : 'Automatic translation failed.'), 'error');
    } finally {
      setTranslatingId(null);
    }
  };

  // Option lists are typed one per line (empty lines are kept while typing, dropped when saving).
  const cleanLines = (lines?: string[]) => (lines ? lines.map(line => line.trim()).filter(Boolean) : lines);
  const collect = (): Record<string, unknown> | null => {
    const cleaned = questions.map(q => ({ ...q, options: cleanLines(q.options), optionsEn: cleanLines(q.optionsEn), quickChips: cleanLines(q.quickChips), quickChipsEn: cleanLines(q.quickChipsEn) }));
    const validationError = feedbackQuestionError(cleaned, isAr);
    if (validationError) { setError(validationError); return null; }
    setError('');
    return { feedbackQuestions: cleaned };
  };
  const save = async () => { const fields = collect(); if (fields) await onSave(fields); };
  useEffect(() => { registerCollect?.(collect); });
  const lines = (text: string) => text.split('\n');

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-text-muted)]">
        {isAr
          ? 'تظهر هذه الأسئلة للمشترك فور مسح رمز QR أو رابط التحضير لتسجيل الحضور والحصول على النقاط.'
          : 'Attendees see these questions right after scanning the check-in QR code or link.'}
      </p>
      {error && <p role="alert" className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>{error}</p>}
      {translationState === 'unavailable' && <p role="status" className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700">
        {isAr ? 'الترجمة التلقائية غير متاحة حاليًا. أدخل النص الإنجليزي يدويًا؛ يمكنك حفظ النموذج دون الترجمة التلقائية.' : 'Automatic translation is currently unavailable. Enter the English text manually; saving does not require automatic translation.'}
      </p>}

      <fieldset disabled={saving || translatingId !== null} className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-[var(--color-text-muted)]">{isAr ? `سؤال #${idx + 1}` : `Question #${idx + 1}`}</span>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => void translateQuestion(q)} disabled={translationState !== 'ready' || translatingId !== null || !q.title.trim()}
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
                <input className={input} dir="rtl" maxLength={1000} value={q.title} onChange={e => patch(q.id, { title: e.target.value })} /></label>
              <label className={label}><span>{isAr ? 'Question (English)' : 'Question (English)'}</span>
                <input className={input} dir="ltr" maxLength={1000} value={q.titleEn ?? ''} onChange={e => patch(q.id, { titleEn: e.target.value })} /></label>
            </div>

            <label className={label}><span>{isAr ? 'نوع الإجابة' : 'Answer type'}</span>
              <select className={input} value={q.type} onChange={e => patch(q.id, { type: e.target.value as QuestionType })}>
                <option value="choice">{isAr ? 'خيارات سريعة' : 'Quick options'}</option>
                <option value="text">{isAr ? 'نص حر مع اقتراحات' : 'Free text with suggestions'}</option>
              </select>
            </label>

            {q.type === 'choice' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className={label}><span>{isAr ? 'الخيارات (عربي، سطر لكل خيار)' : 'Options (Arabic, one per line)'}</span>
                  <textarea className={input} dir="rtl" rows={4} value={(q.options || []).join('\n')}
                    onChange={e => patch(q.id, { options: lines(e.target.value) })} /></label>
                <label className={label}><span>{isAr ? 'Options (English, one per line — same order)' : 'Options (English, one per line — same order)'}</span>
                  <textarea className={input} dir="ltr" rows={4} value={(q.optionsEn || []).join('\n')}
                    onChange={e => patch(q.id, { optionsEn: lines(e.target.value) })} /></label>
              </div>
            )}

            {q.type === 'text' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className={label}><span>{isAr ? 'اقتراحات سريعة (عربي، سطر لكل اقتراح)' : 'Quick suggestions (Arabic, one per line)'}</span>
                  <textarea className={input} dir="rtl" rows={3} value={(q.quickChips || []).join('\n')}
                    onChange={e => patch(q.id, { quickChips: lines(e.target.value) })} /></label>
                <label className={label}><span>{isAr ? 'Quick suggestions (English, one per line)' : 'Quick suggestions (English, one per line)'}</span>
                  <textarea className={input} dir="ltr" rows={3} value={(q.quickChipsEn || []).join('\n')}
                    onChange={e => patch(q.id, { quickChipsEn: lines(e.target.value) })} /></label>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)]">
              <input type="checkbox" checked={q.required} onChange={e => patch(q.id, { required: e.target.checked })} />
              {isAr ? 'إجابة إجبارية عند التحضير' : 'Required at check-in'}
            </label>
          </div>
        ))}
        {!questions.length && <p className="text-sm text-[var(--color-text-muted)]">{isAr ? 'لا توجد أسئلة بعد.' : 'No questions yet.'}</p>}
      </fieldset>

      <div className="flex items-center justify-between">
        <button type="button" disabled={saving || translatingId !== null || questions.length >= 25} onClick={addQuestion} className={button}><Plus size={15} />{isAr ? 'إضافة سؤال' : 'Add question'}</button>
        {!hideSave && <button type="button" disabled={saving || translatingId !== null} onClick={() => void save()} className={primaryButton}>
          <Save size={16} />{saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
        </button>}
      </div>
    </div>
  );
}
