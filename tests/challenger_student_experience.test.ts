import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnTo, normalizeStudentId, competitionRanks, eventCapacityLabel, registrationLabel } from '../src/lib/studentExperience.ts';
import { formatDateSafe, parseRiyadhInput } from '../src/lib/dateUtils.ts';

test('Onboarding destinations remain internal and preserve the intended event', () => {
  assert.equal(safeReturnTo('/ar/events/event-1?tab=info#registration'), '/events/event-1?tab=info#registration');
  for (const value of ['https://attacker.test/', '//attacker.test', '/\\attacker.test', '/%2Fattacker.test', '/api/platform/x', '/complete-profile']) assert.equal(safeReturnTo(value), '/');
});
test('Arabic and Persian digits normalize to the same student identifier', () => {
  assert.equal(normalizeStudentId('١٢٣٤٥٦٧٨٩'), '123456789');
  assert.equal(normalizeStudentId('۱۲۳۴۵۶۷۸۹'), '123456789');
});
test('Equal point balances share competition ranks', () => {
  assert.deepEqual(competitionRanks([100, 100, 80, 70, 70, 10]), [1, 1, 3, 4, 4, 6]);
});
test('Zero attendance does not become registration count; rejection is explicit', () => {
  assert.equal(eventCapacityLabel({ state: 'Completed', attendanceCount: 0, registeredCount: 100, capacity: 100 }, true), 'الحضور: 0');
  assert.equal(eventCapacityLabel({ state: 'Registration Open', registeredCount: 20, capacity: 50, hideExactCapacity: true }, true), 'مقاعد محدودة');
  assert.equal(registrationLabel('rejected', true), 'لم يُقبل التسجيل');
});
test('Riyadh event editing round-trips midnight correctly and rejects invalid dates', () => {
  const instant = parseRiyadhInput('2026-10-10', '00:30');
  assert.equal(instant.toISOString(), '2026-10-09T21:30:00.000Z');
  assert.equal(formatDateSafe(instant, 'yyyy-MM-dd HH:mm'), '2026-10-10 00:30');
  assert.throws(() => parseRiyadhInput('2026-02-31', '13:30'));
  assert.throws(() => parseRiyadhInput('2026-10-10', '25:00'));
});
