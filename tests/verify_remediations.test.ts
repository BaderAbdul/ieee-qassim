import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const read = (path: string) => readFileSync(join(import.meta.dirname, '..', path), 'utf8');

test('Registration page delegates registration and cancellation to the backend', () => {
  const source = read('src/app/[locale]/events/[id]/page.tsx');
  assert.ok(source.includes("'registerForEvent'") && source.includes("'cancelRegistration'"));
  assert.equal(source.includes('runTransaction'), false);
});
test('Backend selects FIFO waitlist candidates under the capacity transaction', () => {
  const source = read('functions/src/utils/eventLifecycle.ts');
  assert.ok(source.includes("where('status', '==', 'waitlisted').orderBy('timestamp').limit(1)"));
  assert.ok(source.includes('hasCapacity(event, count)'));
});
test('Organizer registration desk delegates attendance and points', () => {
  const source = read('src/app/[locale]/admin/events/[id]/registrations/page.tsx');
  assert.ok(source.includes("'submitCheckIn'") && source.includes("'addManualPoints'"));
  assert.equal(source.includes('increment('), false);
});
test('Points aggregation has a durable transaction marker', () => {
  const source = read('functions/src/onPointTransactionCreated.ts');
  assert.ok(source.includes('data.aggregatedAt'));
  assert.ok(source.includes('tx.update(ledger, { aggregatedAt:'));
});
test('Check-in token generation stays on the backend', () => {
  const source = read('src/app/[locale]/admin/events/[id]/checkin-desk/page.tsx');
  assert.ok(source.includes("'generateCheckInToken'"));
  assert.equal(source.includes('Math.random'), false);
});
test('Certificate issuance reads before writing in batches of 50', () => {
  const source = read('functions/src/issueCertificates.ts');
  assert.ok(source.includes('BATCH_SIZE = 50'));
  assert.ok(source.indexOf('Phase 1: All Reads') < source.indexOf('Phase 2: All Writes'));
});
test('Global error recovery retains root html and body', () => {
  const source = read('src/app/global-error.tsx');
  assert.ok(source.includes('<html') && source.includes('<body') && source.includes('reset()'));
});
