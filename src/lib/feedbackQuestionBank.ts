import type { CustomQuestion } from './types';

export interface ArchivedQuestion {
  id: string;
  title: string;
  type: 'choice' | 'text';
  options?: string[];
  quickChips?: string[];
  placeholder?: string;
  required: boolean;
  createdAt?: number;
  usageCount?: number;
  source?: 'default' | 'user' | 'event';
}

const STORAGE_KEY_BANK = 'ieee_feedback_question_bank_v1';
const STORAGE_KEY_DELETED = 'ieee_feedback_question_bank_deleted_v1';

export const DEFAULT_ARCHIVED_QUESTIONS: ArchivedQuestion[] = [
  {
    id: 'q_bank_default_1',
    title: 'ما هي أهم فائدة اكتسبتها من الفعالية؟',
    type: 'choice',
    options: ['محتوى متميز ومفيد', 'شرح واضح ومبسط', 'تنظيم ممتاز', 'تطبيق عملي ملهم'],
    required: false,
    usageCount: 1,
    source: 'default',
  },
  {
    id: 'q_bank_default_2',
    title: 'كيف تقيم جودة الفعالية وتنظيمها بشكل عام؟',
    type: 'choice',
    options: ['ممتاز جداً ⭐⭐⭐⭐⭐', 'جيد جداً ⭐⭐⭐⭐', 'جيد ومقبول ⭐⭐⭐', 'يحتاج تحسين ⭐⭐'],
    required: true,
    usageCount: 1,
    source: 'default',
  },
  {
    id: 'q_bank_default_3',
    title: 'هل حققت الفعالية أهدافك وتوقعاتك المعرفية؟',
    type: 'choice',
    options: ['نعم بالكامل', 'إلى حد كبير', 'جزئياً', 'ليس بالشكل المتوقع'],
    required: false,
    usageCount: 1,
    source: 'default',
  },
  {
    id: 'q_bank_default_4',
    title: 'كيف تقيم تمكن وتفاعل المتحدث / المدرب؟',
    type: 'choice',
    options: ['متمكن ورائع جداً', 'شرح واضح ومتجاوب', 'جيد ومناسب', 'يحتاج تفاعل أكبر'],
    required: false,
    usageCount: 1,
    source: 'default',
  },
  {
    id: 'q_bank_default_5',
    title: 'هل توصي زملاءك بحضور فعالياتنا وورش عملنا القادمة؟',
    type: 'choice',
    options: ['بالتأكيد وبشدة', 'نعم غالباً', 'ربما', 'لا أعتقد'],
    required: false,
    usageCount: 1,
    source: 'default',
  },
  {
    id: 'q_bank_default_6',
    title: 'ما هي مقترحاتك وملاحظاتك لتطوير فعالياتنا القادمة؟',
    type: 'text',
    quickChips: ['محتوى رائع شكراً لكم', 'زيادة وقت التطبيق العملي', 'تنظيم ووقت ممتاز', 'توفير مراجع وملفات إضافية'],
    placeholder: 'اكتب مقترحك أو اختر من العبارات السريعة أعلاه...',
    required: false,
    usageCount: 1,
    source: 'default',
  },
  {
    id: 'q_bank_default_7',
    title: 'ما هي المواضيع والمهارات التقنية التي تود أن نطرحها مستقبلاً؟',
    type: 'text',
    quickChips: ['الذكاء الاصطناعي وتعلم الآلة', 'الأمن السيبراني', 'تطوير الويب والحوسبة السحابية', 'إنترنت الأشياء والروبوتات'],
    placeholder: 'اكتب المجالات أو المهارات التي تهمك...',
    required: false,
    usageCount: 1,
    source: 'default',
  },
];

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function getDeletedTitles(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setDeletedTitles(titles: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(titles));
  } catch (e) {
    console.error('Failed to save deleted question titles', e);
  }
}

export function getArchivedQuestions(): ArchivedQuestion[] {
  if (typeof window === 'undefined') return DEFAULT_ARCHIVED_QUESTIONS;
  
  try {
    const deletedTitles = getDeletedTitles();
    const raw = localStorage.getItem(STORAGE_KEY_BANK);
    
    let list: ArchivedQuestion[];
    if (!raw) {
      // First initialization
      list = DEFAULT_ARCHIVED_QUESTIONS.filter(q => !deletedTitles.includes(normalizeTitle(q.title)));
      localStorage.setItem(STORAGE_KEY_BANK, JSON.stringify(list));
    } else {
      list = JSON.parse(raw);
    }

    // Filter out any explicitly deleted questions
    return list.filter(q => !deletedTitles.includes(normalizeTitle(q.title)));
  } catch (error) {
    console.error('Failed to load archived questions', error);
    return DEFAULT_ARCHIVED_QUESTIONS;
  }
}

export function saveQuestionToBank(
  question: Partial<CustomQuestion> & { title: string },
  source: 'user' | 'event' = 'user'
): ArchivedQuestion | null {
  if (!question.title || !question.title.trim()) return null;
  if (typeof window === 'undefined') return null;

  try {
    const norm = normalizeTitle(question.title);
    
    // If it was in deleted list, remove it because user specifically saved it now
    const deleted = getDeletedTitles();
    if (deleted.includes(norm)) {
      setDeletedTitles(deleted.filter(d => d !== norm));
    }

    const currentBank = getArchivedQuestions();
    const existingIndex = currentBank.findIndex(q => normalizeTitle(q.title) === norm);

    let target: ArchivedQuestion;

    if (existingIndex >= 0) {
      const existing = currentBank[existingIndex];
      target = {
        ...existing,
        type: question.type || existing.type,
        options: question.options && question.options.length > 0 ? question.options : existing.options,
        quickChips: question.quickChips && question.quickChips.length > 0 ? question.quickChips : existing.quickChips,
        placeholder: question.placeholder || existing.placeholder,
        required: question.required !== undefined ? question.required : existing.required,
        usageCount: (existing.usageCount || 1) + 1,
        source: source === 'user' ? 'user' : existing.source,
      };
      currentBank[existingIndex] = target;
    } else {
      target = {
        id: `q_bank_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: question.title.trim(),
        type: question.type || 'choice',
        options: question.options && question.options.length > 0 ? question.options : ['محتوى مميز', 'تنظيم رائع', 'تفاعل ممتاز'],
        quickChips: question.quickChips || ['محتوى رائع', 'شكراً لكم', 'تنظيم ممتاز'],
        placeholder: question.placeholder || '',
        required: question.required || false,
        createdAt: Date.now(),
        usageCount: 1,
        source,
      };
      // Prepend newly added question so it appears first
      currentBank.unshift(target);
    }

    localStorage.setItem(STORAGE_KEY_BANK, JSON.stringify(currentBank));
    window.dispatchEvent(new Event('ieee-question-bank-updated'));
    return target;
  } catch (error) {
    console.error('Failed to save question to bank', error);
    return null;
  }
}

export function saveMultipleQuestionsToBank(
  questions: Array<Partial<CustomQuestion> & { title: string }>,
  source: 'user' | 'event' = 'user'
) {
  if (!questions || !Array.isArray(questions)) return;
  for (const q of questions) {
    if (q.title && q.title.trim().length > 0) {
      saveQuestionToBank(q, source);
    }
  }
}

export function removeQuestionFromBank(idOrTitle: string): ArchivedQuestion[] {
  if (typeof window === 'undefined') return [];

  try {
    const currentBank = getArchivedQuestions();
    const target = currentBank.find(q => q.id === idOrTitle || normalizeTitle(q.title) === normalizeTitle(idOrTitle));
    
    if (target) {
      const norm = normalizeTitle(target.title);
      const deleted = getDeletedTitles();
      if (!deleted.includes(norm)) {
        deleted.push(norm);
        setDeletedTitles(deleted);
      }
    }

    const updated = currentBank.filter(q => q.id !== idOrTitle && normalizeTitle(q.title) !== normalizeTitle(idOrTitle));
    localStorage.setItem(STORAGE_KEY_BANK, JSON.stringify(updated));
    window.dispatchEvent(new Event('ieee-question-bank-updated'));
    return updated;
  } catch (error) {
    console.error('Failed to remove question from bank', error);
    return [];
  }
}

export function resetToDefaultBank(): ArchivedQuestion[] {
  if (typeof window === 'undefined') return DEFAULT_ARCHIVED_QUESTIONS;
  try {
    setDeletedTitles([]);
    localStorage.setItem(STORAGE_KEY_BANK, JSON.stringify(DEFAULT_ARCHIVED_QUESTIONS));
    window.dispatchEvent(new Event('ieee-question-bank-updated'));
    return DEFAULT_ARCHIVED_QUESTIONS;
  } catch (error) {
    console.error('Failed to reset question bank', error);
    return DEFAULT_ARCHIVED_QUESTIONS;
  }
}

export function harvestQuestionsFromEvents(
  events: Array<{ feedbackQuestions?: CustomQuestion[] }>
) {
  if (typeof window === 'undefined' || !events || !Array.isArray(events)) return;
  try {
    const deleted = getDeletedTitles();
    const currentBank = getArchivedQuestions();
    const existingTitles = new Set(currentBank.map(q => normalizeTitle(q.title)));

    let hasNew = false;
    for (const ev of events) {
      if (ev.feedbackQuestions && Array.isArray(ev.feedbackQuestions)) {
        for (const q of ev.feedbackQuestions) {
          if (!q.title || !q.title.trim()) continue;
          const norm = normalizeTitle(q.title);
          if (deleted.includes(norm) || existingTitles.has(norm)) continue;

          currentBank.push({
            id: `q_bank_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: q.title.trim(),
            type: q.type || 'choice',
            options: q.options || [],
            quickChips: q.quickChips || [],
            placeholder: q.placeholder || '',
            required: !!q.required,
            createdAt: Date.now(),
            usageCount: 1,
            source: 'event',
          });
          existingTitles.add(norm);
          hasNew = true;
        }
      }
    }

    if (hasNew) {
      localStorage.setItem(STORAGE_KEY_BANK, JSON.stringify(currentBank));
      window.dispatchEvent(new Event('ieee-question-bank-updated'));
    }
  } catch (e) {
    console.error('Failed to harvest questions from events', e);
  }
}
