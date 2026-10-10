import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Demo Firestore/Auth emulators required.');
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-ieee-qu';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
initializeApp({ projectId: 'demo-ieee-qu' });
const db = getFirestore();
const require = createRequire(import.meta.url);
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function (id, parent, main) {
  if (id === 'server-only') return {};
  if (id.startsWith('@/')) id = path.join(process.cwd(), '.spark-test', id.slice(2));
  return originalLoad.call(this, id, parent, main);
};
let POST, upload;
if (process.env.SPARK_TEST_USE_BUILD === '1') {
  const platform = require('../../.next/server/app/api/platform/[action]/route.js');
  const media = require('../../.next/server/app/api/media/route.js');
  await platform.routeModule.ensureUserland(); await media.routeModule.ensureUserland();
  POST = platform.routeModule.userland.POST; upload = media.routeModule.userland.POST;
} else {
  ({ POST } = require('../../.spark-test/app/api/platform/[action]/route.js'));
  ({ POST: upload } = require('../../.spark-test/app/api/media/route.js'));
}
const { processNotification } = require('../../.spark-test/lib/server/notifications.js');
const originalFetch = globalThis.fetch;
let pdfUploaded = false;
globalThis.fetch = async (url, options) => {
  if (String(url).startsWith('https://api.cloudinary.com/')) {
    const file = options.body.get('file');
    if (file.type === 'application/pdf') {
      assert.equal(options.body.get('type'), 'authenticated');
      const bytes = Buffer.from(await file.arrayBuffer());
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
      assert.ok(bytes.length > 10000); pdfUploaded = true;
    }
    assert.ok(options.body.get('signature'));
    assert.equal(options.body.get('api_secret'), null);
    return Response.json({ public_id: options.body.get('public_id'), secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/test.png', format: file.type === 'application/pdf' ? 'pdf' : 'png' });
  }
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(String(url))) throw new Error('Unexpected non-emulator network request');
  return originalFetch(url, options);
};
const tokens = {};
before(async () => {
  for (const [uid, role] of [['alice', 'student'], ['bob', 'student'], ['organizer', 'event_organizer']]) {
    await getAuth().createUser({ uid, email: `${uid}@example.test`, password: 'test-password-123' });
    await db.collection('users').doc(uid).set({ role, email: `${uid}@example.test`, displayName: uid, arabicFullName: 'طالب تجريبي', totalPoints: 0, profileCompleted: true });
    const r = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${uid}@example.test`, password: 'test-password-123', returnSecureToken: true }) });
    tokens[uid] = (await r.json()).idToken;
    assert.ok(tokens[uid]);
  }
});
after(() => { globalThis.fetch = originalFetch; Module._load = originalLoad; });
async function call(uid, action, data = {}) {
  const request = new Request(`https://example.test/api/platform/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: `Bearer ${tokens[uid] || uid}` } : {}) }, body: JSON.stringify(data) });
  const response = await POST(request, { params: Promise.resolve({ action }) });
  return { status: response.status, ...(await response.json()) };
}
const event = (state = 'Registration Open', capacity = 1) => ({ title: 'فعالية تجريبية', state, capacity, registrationMode: 'Auto', registeredCount: 0, attendanceCount: 0, points: 20, hasCertificate: true, type: 'Workshop' });

test('Vercel API rejects missing/forged bearer tokens and student organizer operations', async () => {
  assert.equal((await call(null, 'registerForEvent')).status, 401);
  assert.equal((await call('forged', 'registerForEvent')).status, 401);
  assert.equal((await call('alice', 'addManualPoints', { studentUid: 'alice', amount: 100, reason: 'forged' })).status, 403);
  assert.equal((await call('alice', 'generateCheckInToken', { eventId: 'e' })).status, 403);
});
test('Vercel registration preserves capacity, FIFO and cancellation idempotency', async () => {
  await db.collection('events').doc('capacity').set(event());
  assert.equal((await call('alice', 'registerForEvent', { eventId: 'capacity' })).data.status, 'approved');
  assert.equal((await call('bob', 'registerForEvent', { eventId: 'capacity' })).data.status, 'waitlisted');
  assert.equal((await call('alice', 'cancelRegistration', { eventId: 'capacity' })).status, 200);
  assert.equal((await db.collection('registrations').doc('capacity_bob').get()).data().status, 'approved');
  await call('alice', 'cancelRegistration', { eventId: 'capacity' });
  assert.equal((await db.collection('events').doc('capacity').get()).data().registeredCount, 1);
});
test('Token rotation, invalid attendance, duplicate check-ins and atomic points', async () => {
  await db.collection('events').doc('attendance').set(event('Ongoing', 10));
  await db.collection('registrations').doc('attendance_alice').set({ userId: 'alice', eventId: 'attendance', status: 'approved' });
  const old = (await call('organizer', 'generateCheckInToken', { eventId: 'attendance' })).data.token;
  const token = (await call('organizer', 'generateCheckInToken', { eventId: 'attendance' })).data.token;
  assert.equal((await call('alice', 'submitCheckIn', { eventId: 'attendance', token: old })).status, 403);
  assert.equal((await call('bob', 'submitCheckIn', { eventId: 'attendance', targetUserId: 'alice' })).status, 403);
  const results = await Promise.all([call('alice', 'submitCheckIn', { eventId: 'attendance', token }), call('alice', 'submitCheckIn', { eventId: 'attendance', token })]);
  assert.ok(results.every(r => r.status === 200));
  assert.equal((await db.collection('users').doc('alice').get()).data().totalPoints, 20);
  assert.equal((await db.collection('public_profiles').doc('alice').get()).data().totalPoints, 20);
  assert.ok((await db.collection('point_transactions').doc('attendance_attendance_alice').get()).data().aggregatedAt);
});
test('Manual deductions are atomic and never make total points negative', async () => {
  const r = await call('organizer', 'addManualPoints', { studentUid: 'alice', amount: -200, reason: 'Correction' });
  assert.equal(r.status, 200);
  assert.equal((await db.collection('users').doc('alice').get()).data().totalPoints, 0);
  assert.equal((await call('organizer', 'addManualPoints', { studentUid: 'missing', amount: 1, reason: 'x' })).status, 404);
});
test('External certificate links require attendance, HTTPS, organizer and ownership', async () => {
  await db.collection('events').doc('attendance').update({ state: 'Completed' });
  assert.equal((await call('alice', 'saveExternalCertificate', { eventId: 'attendance', userId: 'alice', url: 'https://cert.example.test/a' })).status, 403);
  assert.equal((await call('organizer', 'saveExternalCertificate', { eventId: 'attendance', userId: 'alice', url: 'http://cert.example.test/a' })).status, 400);
  assert.equal((await call('organizer', 'saveExternalCertificate', { eventId: 'attendance', userId: 'bob', url: 'https://cert.example.test/b' })).status, 409);
  assert.equal((await call('organizer', 'saveExternalCertificate', { eventId: 'attendance', userId: 'alice', url: 'https://cert.example.test/a' })).status, 200);
  const certificateId = 'certificate_attendance_alice';
  assert.equal((await call('bob', 'getCertificateDownloadUrl', { certificateId })).status, 403);
  assert.equal((await call('alice', 'getCertificateDownloadUrl', { certificateId })).data.url, 'https://cert.example.test/a');
  await call('organizer', 'revokeCertificate', { certificateId });
  assert.equal((await call('alice', 'getCertificateDownloadUrl', { certificateId })).status, 409);
  assert.equal((await call('organizer', 'saveExternalCertificate', { eventId: 'attendance', userId: 'alice', url: 'https://cert.example.test/a' })).status, 409);
});
test('Public projection excludes nested/private data and respects restrictions', async () => {
  await db.collection('users').doc('bob').update({ publicProfile: { bio: 'x', email: 'secret' } });
  assert.equal((await call('bob', 'syncPublicProfile')).status, 200);
  const data = (await db.collection('public_profiles').doc('bob').get()).data();
  assert.equal(data.email, undefined); assert.equal(data.publicProfile.email, undefined);
  await db.collection('users').doc('bob').update({ isRestricted: true });
  assert.equal((await call('bob', 'registerForEvent', { eventId: 'capacity' })).status, 403);
  await call('organizer', 'syncPublicProfile', { userId: 'bob' });
  assert.equal((await db.collection('public_profiles').doc('bob').get()).exists, false);
});
test('Media endpoint rejects non-images and student event uploads', async () => {
  const form = new FormData(); form.set('file', new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'x.svg'); form.set('purpose', 'avatar');
  const req = new Request('https://example.test/api/media', { method: 'POST', headers: { Authorization: `Bearer ${tokens.alice}`, 'Content-Length': '500' }, body: form });
  assert.equal((await upload(req)).status, 400);
  const form2 = new FormData(); form2.set('purpose', 'event'); form2.set('file', new Blob(['x'], { type: 'image/png' }), 'x.png');
  assert.equal((await upload(new Request('https://example.test/api/media', { method: 'POST', headers: { Authorization: `Bearer ${tokens.alice}`, 'Content-Length': '500' }, body: form2 }))).status, 403);
});
test('Real Arabic PDF rendering uploads authenticated Cloudinary assets; downloads expire', async () => {
  await db.collection('events').doc('pdf').set(event('Completed', 10));
  await db.collection('attendance_logs').doc('pdf_alice').set({ eventId: 'pdf', userId: 'alice', timestamp: new Date() });
  assert.equal((await call('organizer', 'issueCertificates', { eventId: 'pdf', userIds: ['alice'] })).data.queuedCount, 1);
  const certificateId = 'certificate_pdf_alice';
  const rendered = await call('organizer', 'renderCertificate', { certificateId });
  assert.equal(rendered.status, 200, JSON.stringify(rendered)); assert.equal(pdfUploaded, true);
  const result = await call('alice', 'getCertificateDownloadUrl', { certificateId });
  assert.equal(result.status, 200);
  const url = new URL(result.data.url);
  assert.equal(url.searchParams.get('type'), 'authenticated');
  assert.ok(Number(url.searchParams.get('expires_at')) <= Date.now() / 1000 + 301);
  assert.ok(!result.data.url.includes('test-secret'));
});
test('HTTP endpoint rejects cross-origin, invalid and oversized JSON requests', async () => {
  const context = { params: Promise.resolve({ action: 'syncPublicProfile' }) };
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.alice}` };
  const response = await POST(new Request('https://example.test/api/platform/syncPublicProfile', { method: 'POST', headers: { ...headers, Origin: 'https://attacker.test' }, body: '{}' }), context);
  assert.equal(response.status, 403);
  for (const body of ['[]', '{bad', JSON.stringify({ text: 'x'.repeat(66000) })]) {
    assert.equal((await POST(new Request('https://example.test/api/platform/syncPublicProfile', { method: 'POST', headers, body }), context)).status, 400);
  }
});
test('Only super admin can manage members; role/restriction/deletion update projections', async () => {
  assert.equal((await call('organizer', 'manageUser', { userId: 'bob', change: 'role', role: 'super_admin' })).status, 403);
  await db.collection('users').doc('organizer').update({ role: 'super_admin' });
  assert.equal((await call('organizer', 'manageUser', { userId: 'bob', change: 'restriction', isRestricted: false })).status, 200);
  assert.equal((await db.collection('public_profiles').doc('bob').get()).exists, true);
  assert.equal((await call('organizer', 'manageUser', { userId: 'bob', change: 'role', role: 'event_organizer' })).status, 200);
  assert.equal((await db.collection('public_profiles').doc('bob').get()).data().role, 'event_organizer');
  assert.equal((await call('organizer', 'manageUser', { userId: 'bob', change: 'delete' })).status, 200);
  assert.equal((await db.collection('public_profiles').doc('bob').get()).exists, false);
});
test('Valid avatar uploads are signed; request limits return 429', async () => {
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9S8AAAAASUVORK5CYII=', 'base64');
  const form = new FormData(); form.set('purpose', 'avatar'); form.set('file', new Blob([bytes], { type: 'image/png' }), 'avatar.png');
  const r = await upload(new Request('https://example.test/api/media', { method: 'POST', headers: { Authorization: `Bearer ${tokens.alice}`, 'Content-Length': '500' }, body: form }));
  assert.equal(r.status, 200); assert.ok((await r.json()).url.startsWith('https://'));
  await db.collection('api_limits').doc('platform_alice').set({ count: 60, startedAt: Date.now() });
  assert.equal((await call('alice', 'syncPublicProfile')).status, 429);
});
test('Concurrent notification delivery is leased and deduplicated; core events queue mail', async () => {
  const pending = await db.collection('notification_jobs').where('status', '==', 'PENDING').get();
  assert.ok(pending.size >= 4);
  const job = pending.docs[0]; let calls = 0;
  const sender = async (payload, key) => { calls++; assert.equal(key, job.id); assert.ok(payload.to.endsWith('@example.test')); };
  await Promise.all([processNotification(job.id, sender), processNotification(job.id, sender)]);
  assert.equal(calls, 1); assert.equal((await job.ref.get()).data().status, 'DELIVERED');
  await processNotification(job.id, sender); assert.equal(calls, 1);
});
test('Notification failures retry without exposing provider details', async () => {
  const ref = db.collection('notification_jobs').doc('delivery-failure');
  await ref.set({ to: 'alice@example.test', subject: 'x', text: 'x', status: 'PENDING', attempts: 0 });
  assert.equal(await processNotification(ref.id, async () => { throw new Error('secret provider token'); }), false);
  const data = (await ref.get()).data();
  assert.equal(data.status, 'PENDING'); assert.equal(data.attempts, 1); assert.ok(data.nextAttemptAt.toMillis() > Date.now());
  assert.ok(!data.lastError.includes('secret'));
});
test('Uncertain sends outside dedupe window require review; delivery is opt-in', async () => {
  const ref = db.collection('notification_jobs').doc('uncertain-delivery');
  await ref.set({ to: 'alice@example.test', subject: 'x', text: 'x', status: 'PROCESSING', leaseExpiresAt: 1, firstAttemptAt: new Date(Date.now() - 24 * 3600000) });
  let calls = 0;
  await processNotification(ref.id, async () => { calls++; });
  assert.equal(calls, 0); assert.equal((await ref.get()).data().status, 'REVIEW');
  delete process.env.EMAIL_NOTIFICATIONS_ENABLED;
  assert.equal((await call('organizer', 'processNotifications')).data.enabled, false);
});
