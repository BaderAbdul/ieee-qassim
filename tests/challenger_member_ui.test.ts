import test from 'node:test';
import assert from 'node:assert/strict';
import { mapMemberEvents, memberMajorLabel, memberPassUrl, memberRankLabel } from '../src/lib/memberPresentation.ts';

test('Membership QR opens a localized public pass on the configured HTTPS origin', () => {
  assert.equal(memberPassUrl('https://www.ieeequ.online/', 'ar', 'member-123'), 'https://www.ieeequ.online/ar/pass/member-123');
  assert.equal(memberPassUrl('https://preview.example.test/some/path', 'en', 'member id'), 'https://preview.example.test/en/pass/member%20id');
  for (const invalid of ['javascript:alert(1)', 'http://example.test', 'https://user:secret@example.test', 'not a URL']) {
    assert.equal(memberPassUrl(invalid, 'untrusted', 'member-123'), 'https://www.ieeequ.online/ar/pass/member-123');
  }
});

test('Member labels preserve specialty values and distinguish rank loading, failure and eligibility', () => {
  assert.equal(memberMajorLabel(' Electrical ', true), 'الهندسة الكهربائية');
  assert.equal(memberMajorLabel('electrical', false), 'Electrical Engineering');
  assert.equal(memberMajorLabel('الهندسة الكهربائية', false), 'Electrical Engineering');
  assert.equal(memberMajorLabel('Photonics', true), 'Photonics');
  assert.equal(memberRankLabel('loading', null, true), 'جارٍ التحميل');
  assert.equal(memberRankLabel('error', null, true), 'تعذر التحميل');
  assert.equal(memberRankLabel('unranked', null, true), 'غير مصنّف');
  assert.equal(memberRankLabel('ready', 1, false), '#1');
});

test('Historical event enrichment limits active reads and preserves successful records after failures', async () => {
  let active = 0;
  let maximum = 0;
  const values = await mapMemberEvents([1, 2, 3, 4, 5, 6, 7], async value => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 2));
    active--;
    if (value === 3) throw new Error('Archived details are unavailable');
    return `event-${value}`;
  }, 2);
  assert.equal(maximum, 2);
  assert.equal(values.length, 7);
  assert.deepEqual(values[0], { status: 'fulfilled', value: 'event-1' });
  assert.equal(values[2].status, 'rejected');
  assert.deepEqual(values[6], { status: 'fulfilled', value: 'event-7' });
  assert.deepEqual(await mapMemberEvents([], async value => value), []);
});
