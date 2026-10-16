import test from 'node:test';
import assert from 'node:assert/strict';
import { retryAttendanceRequest } from '../src/lib/retryAttendanceRequest.ts';

test('Attendance retries a lost acknowledgement once and returns the confirmed result', async () => {
  let attempts = 0;
  const result = await retryAttendanceRequest(async () => {
    if (++attempts === 1) throw new TypeError('Network disconnected');
    return { status: 'already_checked_in', awardedPoints: 0 };
  }, async () => {});
  assert.equal(attempts, 2); assert.equal(result.status, 'already_checked_in');
});

test('Attendance does not retry validation, permission, or rate-limit errors', async () => {
  for (const status of [400, 401, 403, 409, 429]) {
    let attempts = 0;
    await assert.rejects(retryAttendanceRequest(async () => { attempts++; throw Object.assign(new Error('Rejected'), { status }); }, async () => {}));
    assert.equal(attempts, 1);
  }
});

test('Attendance retries transient server failures at most once', async () => {
  for (const status of [502, 503, 504]) {
    let attempts = 0;
    await assert.rejects(retryAttendanceRequest(async () => { attempts++; throw Object.assign(new Error('Unavailable'), { status }); }, async () => {}));
    assert.equal(attempts, 2);
  }
});
