import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFeedbackQuestions, feedbackQuestionError } from '../src/lib/feedbackQuestionValidation.ts';
import type { CustomQuestion } from '../src/lib/types.ts';

test('legacy Arabic-only API questions load without undefined English fields', () => {
  const legacy = { id: 'old', title: 'السؤال', type: 'text', required: false } as CustomQuestion;
  const normalized = normalizeFeedbackQuestions([legacy]);
  assert.equal(normalized[0].titleEn, '');
  assert.match(feedbackQuestionError(normalized, false)!, /manually/);
  assert.equal('titleEn' in legacy, false);
});

test('review save catches missing titles instead of dropping incomplete questions', () => {
  const question: CustomQuestion = { id: 'new', title: '', titleEn: 'English only', type: 'text', required: false };
  assert.match(feedbackQuestionError([question], false)!, /Question 1/);
  assert.equal(feedbackQuestionError([], false), null);
});

test('blank and mismatched choice translations are rejected before the API call', () => {
  const question: CustomQuestion = { id: 'choice', title: 'اختر', titleEn: 'Choose', type: 'choice', required: true,
    options: ['ممتاز', 'جيد'], optionsEn: ['Excellent', 'Good'] };
  assert.equal(feedbackQuestionError([question], false), null);
  assert.ok(feedbackQuestionError([{ ...question, optionsEn: ['Excellent', ' '] }], false));
  assert.ok(feedbackQuestionError([{ ...question, optionsEn: ['Excellent'] }], false));
  assert.ok(feedbackQuestionError([{ ...question, titleEn: 'x'.repeat(1001) }], false));
});
