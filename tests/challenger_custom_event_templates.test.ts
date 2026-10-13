import test from 'node:test';
import assert from 'node:assert/strict';

// Mock browser globals for customEventTemplates
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
  getCustomEventTemplates,
  saveCustomEventTemplate,
  deleteCustomEventTemplate,
  createTemplateFromEvent
} from '../src/lib/customEventTemplates.ts';

test('Custom Event Templates starts empty or with stored templates', () => {
  mockLocalStorage.clear();
  const list = getCustomEventTemplates();
  assert.equal(list.length, 0);
});

test('Save custom template adds new template with full details', () => {
  const tmpl = saveCustomEventTemplate({
    name: 'ورشة عمل روبوتات متقدمة',
    description: 'ورشة تطبيقية في برمجة الروبوتات والأنظمة المدمجة',
    type: 'Workshop',
    durationHours: 3,
    points: 15,
    hasCertificate: true,
    requiresRegistration: true,
    registrationMode: 'Auto',
    gains: ['برمجة ميكروكونترولر', 'تطبيق عملي'],
    speakers: ['م. فيصل'],
  });

  assert.ok(tmpl.id);
  assert.equal(tmpl.name, 'ورشة عمل روبوتات متقدمة');
  assert.equal(tmpl.points, 15);
  assert.equal(tmpl.hasCertificate, true);

  const list = getCustomEventTemplates();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, tmpl.id);
});

test('Create template from existing event copies details cleanly', () => {
  const existingEvent = {
    id: 'ev_123',
    title: 'هاكاثون الذكاء الاصطناعي',
    titleEn: 'AI Hackathon',
    description: 'مسابقة برمجية مكثفة لتطوير حلول ذكية',
    type: 'Competition' as const,
    durationHours: 8,
    capacity: 100,
    points: 30,
    hasCertificate: true,
    registrationMode: 'Manual' as const,
    requiresRegistration: true,
    gains: ['تطوير نماذج ذكاء اصطناعي'],
  };

  const created = createTemplateFromEvent(existingEvent as any, 'قالب مسابقة الهاكاثون');
  assert.equal(created.name, 'قالب مسابقة الهاكاثون');
  assert.equal(created.type, 'Competition');
  assert.equal(created.points, 30);
  assert.equal(created.durationHours, 8);

  const list = getCustomEventTemplates();
  assert.equal(list.length, 2);
});

test('Delete custom template removes it permanently', () => {
  const listBefore = getCustomEventTemplates();
  assert.equal(listBefore.length, 2);

  const idToDelete = listBefore[0].id;
  const listAfter = deleteCustomEventTemplate(idToDelete);

  assert.equal(listAfter.length, 1);
  assert.ok(!listAfter.some(t => t.id === idToDelete));

  const listReloaded = getCustomEventTemplates();
  assert.equal(listReloaded.length, 1);
  assert.ok(!listReloaded.some(t => t.id === idToDelete));
});
