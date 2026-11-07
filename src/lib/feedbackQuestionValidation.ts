import type { CustomQuestion } from './types';

// API records from before bilingual feedback existed legitimately omit these fields.
export function normalizeFeedbackQuestions(questions: readonly CustomQuestion[]): CustomQuestion[] {
  return questions.map(question => ({ ...question, titleEn: question.titleEn ?? '' }));
}

export function feedbackQuestionError(questions: readonly CustomQuestion[], isAr: boolean): string | null {
  if (questions.length > 25) return isAr ? 'الحد الأقصى ٢٥ سؤالًا.' : 'Use up to 25 questions.';
  for (const [index, question] of questions.entries()) {
    const name = isAr ? `السؤال ${index + 1}` : `Question ${index + 1}`;
    if (!question.title.trim() || !(question.titleEn ?? '').trim()) {
      return isAr ? `${name}: أكمل النص بالعربية والإنجليزية. يمكنك إدخال الترجمة يدويًا.` : `${name}: enter both Arabic and English text. You can enter the translation manually.`;
    }
    if (question.title.length > 1000 || question.titleEn.length > 1000) {
      return isAr ? `${name}: الحد الأقصى ١٠٠٠ حرف لكل لغة.` : `${name}: use at most 1000 characters per language.`;
    }
    if (question.type === 'choice') {
      const ar = question.options ?? [], en = question.optionsEn ?? [];
      if (!ar.length || ar.length > 30 || ar.length !== en.length || [...ar, ...en].some(option => !option.trim() || option.length > 500)) {
        return isAr ? `${name}: أدخل خيارات متطابقة العدد بالعربية والإنجليزية (حتى ٣٠ خيارًا، و٥٠٠ حرف للخيار).` : `${name}: enter matching Arabic and English options (up to 30 options, 500 characters each).`;
      }
    }
  }
  return null;
}
