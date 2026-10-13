import test from 'node:test';
import assert from 'node:assert/strict';

// Mock browser globals for feedbackQuestionBank
const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, val: string) => { storage[key] = val; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => {
    for (const k of Object.keys(storage)) delete storage[k];
  }
};

(globalThis as any).window = {
  dispatchEvent: () => true,
};
(globalThis as any).localStorage = mockLocalStorage;

import {
  DEFAULT_ARCHIVED_QUESTIONS,
  getArchivedQuestions,
  saveQuestionToBank,
  saveMultipleQuestionsToBank,
  removeQuestionFromBank,
  resetToDefaultBank,
  harvestQuestionsFromEvents
} from '../src/lib/feedbackQuestionBank.ts';

test('Feedback Question Bank loads defaults initially', () => {
  mockLocalStorage.clear();
  const bank = getArchivedQuestions();
  assert.ok(bank.length >= 7);
  assert.equal(bank[0].title, DEFAULT_ARCHIVED_QUESTIONS[0].title);
});

test('Save question to bank adds custom question and retrieves it', () => {
  const newQ = saveQuestionToBank({
    title: 'ما هو انطباعك العام عن مكان الفعالية والضيافة؟',
    type: 'choice',
    options: ['رائع جداً', 'جيد', 'يحتاج تحسين'],
    required: true,
  });

  assert.ok(newQ);
  assert.equal(newQ.title, 'ما هو انطباعك العام عن مكان الفعالية والضيافة؟');
  
  const bank = getArchivedQuestions();
  const found = bank.find(q => q.title === 'ما هو انطباعك العام عن مكان الفعالية والضيافة؟');
  assert.ok(found);
  assert.equal(found.required, true);
});

test('Remove question from bank removes it permanently and respects deletion', () => {
  const toDeleteTitle = DEFAULT_ARCHIVED_QUESTIONS[0].title;
  removeQuestionFromBank(toDeleteTitle);

  const bankAfter = getArchivedQuestions();
  assert.ok(!bankAfter.some(q => q.title === toDeleteTitle));
});

test('Harvest questions from events ignores deleted questions and imports new ones', () => {
  const pastEvents = [
    {
      feedbackQuestions: [
        {
          id: 'q_legacy_1',
          title: 'هل ترغب في الانضمام إلى لجان تنظيم IEEE مستقبلاً؟',
          type: 'choice' as const,
          options: ['نعم بكل تأكيد', 'ربما لاحقاً', 'غير مهتم حالياً'],
          required: false,
        },
        {
          id: 'q_legacy_deleted',
          title: DEFAULT_ARCHIVED_QUESTIONS[0].title, // Was deleted in previous test
          type: 'choice' as const,
          options: ['...'],
          required: false,
        }
      ]
    }
  ];

  harvestQuestionsFromEvents(pastEvents);

  const bank = getArchivedQuestions();
  // New question imported
  const imported = bank.find(q => q.title === 'هل ترغب في الانضمام إلى لجان تنظيم IEEE مستقبلاً؟');
  assert.ok(imported);
  
  // Deleted question must NOT be re-imported
  const deletedQ = bank.find(q => q.title === DEFAULT_ARCHIVED_QUESTIONS[0].title);
  assert.equal(deletedQ, undefined);
});

test('Reset to defaults restores all original template questions', () => {
  resetToDefaultBank();
  const bank = getArchivedQuestions();
  assert.equal(bank.length, DEFAULT_ARCHIVED_QUESTIONS.length);
  assert.ok(bank.some(q => q.title === DEFAULT_ARCHIVED_QUESTIONS[0].title));
});
