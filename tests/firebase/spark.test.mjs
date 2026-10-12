import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc as clientDoc, updateDoc as clientUpdate, deleteDoc as clientDelete } from 'firebase/firestore';

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
  for (const [uid, role] of [['alice', 'student'], ['bob', 'student'], ['organizer', 'event_organizer'], ['carol', 'student'], ['dan', 'student']]) {
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
test('Manual deductions reject excess amounts and preserve ledger/balance equality', async () => {
  const excess = await call('organizer', 'addManualPoints', { studentUid: 'alice', amount: -200, reason: 'Correction', operationId: 'deduction-excess' });
  assert.equal(excess.status, 409);
  assert.equal((await db.collection('users').doc('alice').get()).data().totalPoints, 20);
  const r = await call('organizer', 'addManualPoints', { studentUid: 'alice', amount: -20, reason: 'Correction', operationId: 'deduction-correct' });
  assert.equal(r.status, 200);
  assert.equal((await db.collection('users').doc('alice').get()).data().totalPoints, 0);
  assert.equal((await call('organizer', 'addManualPoints', { studentUid: 'missing', amount: 1, reason: 'x', operationId: 'missing-student' })).status, 404);
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
test('Only super admin can manage members; roles/restrictions/archive preserve records', async () => {
  assert.equal((await call('organizer', 'manageUser', { userId: 'bob', change: 'role', role: 'super_admin' })).status, 403);
  await db.collection('users').doc('organizer').update({ role: 'super_admin' });
  assert.equal((await call('organizer', 'manageUser', { userId: 'bob', change: 'restriction', isRestricted: false })).status, 200);
  assert.equal((await db.collection('public_profiles').doc('bob').get()).exists, true);
  assert.equal((await call('organizer', 'manageUser', { userId: 'bob', change: 'role', role: 'event_organizer' })).status, 200);
  assert.equal((await db.collection('public_profiles').doc('bob').get()).data().role, 'event_organizer');
  assert.equal((await call('organizer', 'manageUser', { userId: 'bob', change: 'delete' })).status, 200);
  assert.equal((await db.collection('public_profiles').doc('bob').get()).exists, false);
  assert.equal((await db.collection('users').doc('bob').get()).data().isRestricted, true);
  assert.ok((await db.collection('users').doc('bob').get()).data().archivedAt);
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

test('Explicit waitlisting is not rejection and releases only one reserved seat', async () => {
  await db.collection('events').doc('explicit-waitlist').set(event('Registration Open', 1));
  await db.collection('events').doc('explicit-waitlist').update({ registeredCount: 1 });
  await db.collection('registrations').doc('explicit-waitlist_carol').set({ eventId: 'explicit-waitlist', userId: 'carol', status: 'approved', timestamp: new Date(1) });
  await db.collection('registrations').doc('explicit-waitlist_dan').set({ eventId: 'explicit-waitlist', userId: 'dan', status: 'waitlisted', timestamp: new Date(2) });
  const result = await call('organizer', 'manageRegistration', { eventId: 'explicit-waitlist', userId: 'carol', action: 'waitlist' });
  assert.equal(result.status, 200);
  assert.equal((await db.collection('registrations').doc('explicit-waitlist_carol').get()).data().status, 'waitlisted');
  assert.equal((await db.collection('registrations').doc('explicit-waitlist_dan').get()).data().status, 'approved');
  assert.equal((await db.collection('events').doc('explicit-waitlist').get()).data().registeredCount, 1);
});

test('Manual awards are idempotent across concurrent requests; changed payload cannot reuse key', async () => {
  const input = { studentUid: 'carol', amount: 12, reason: 'Volunteer work', operationId: 'volunteer-operation-001' };
  const results = await Promise.all([call('organizer', 'addManualPoints', input), call('organizer', 'addManualPoints', input)]);
  assert.ok(results.every(result => result.status === 200), JSON.stringify(results));
  assert.equal((await db.collection('users').doc('carol').get()).data().totalPoints, 12);
  const ledger = await db.collection('point_transactions').where('userId', '==', 'carol').get();
  assert.equal(ledger.size, 1);
  assert.equal(ledger.docs[0].data().balanceAfter - ledger.docs[0].data().balanceBefore, ledger.docs[0].data().amount);
  assert.equal((await call('organizer', 'addManualPoints', { ...input, amount: 15 })).status, 409);
});

test('Concurrent profile completion atomically claims university IDs and normalizes Arabic digits', async () => {
  const input = { firstName: 'بدر', fatherName: 'عبدالله', familyName: 'الدخيل', isQassimStudent: true, universityId: '١٢٣٤٥٦٧٨٩', college: 'الهندسة', major: 'كهرباء', academicLevel: 'المستوى الأول' };
  const results = await Promise.all([call('carol', 'saveProfile', input), call('dan', 'saveProfile', input)]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const winner = results[0].status === 200 ? 'carol' : 'dan';
  const profile = (await db.collection('users').doc(winner).get()).data();
  assert.equal(profile.universityId, '123456789');
  assert.equal((await db.collection('university_ids').doc('123456789').get()).data().userId, winner);
  assert.equal((await db.collection('public_profiles').doc(winner).get()).data().universityId, undefined);
  assert.equal((await call(winner, 'saveProfile', { firstName: '' })).status, 400);
});

test('Feedback can be edited without a check-in token or duplicate attendance/points', async () => {
  const before = (await db.collection('users').doc('carol').get()).data().totalPoints;
  await db.collection('events').doc('feedback-only').set(event('Completed', 20));
  await db.collection('attendance_logs').doc('feedback-only_carol').set({ eventId: 'feedback-only', userId: 'carol', timestamp: new Date() });
  assert.equal((await call('dan', 'submitEventFeedback', { eventId: 'feedback-only', feedbackData: { rating: 5 } })).status, 409);
  assert.equal((await call('carol', 'submitEventFeedback', { eventId: 'feedback-only', feedbackData: { rating: 0 } })).status, 400);
  assert.equal((await call('carol', 'submitEventFeedback', { eventId: 'feedback-only', feedbackData: { rating: 2 } })).status, 200);
  assert.equal((await call('carol', 'submitEventFeedback', { eventId: 'feedback-only', feedbackData: { rating: 4 } })).status, 200);
  assert.equal((await db.collection('event_feedback').doc('feedback-only_carol').get()).data().rating, 4);
  assert.equal((await db.collection('users').doc('carol').get()).data().totalPoints, before);
});

test('Event lifecycle rejects incomplete publication and invalid jumps; admin APIs fail closed', async () => {
  await db.collection('events').doc('workflow').set(event('Draft', 10));
  assert.equal((await call('organizer', 'changeEventState', { eventId: 'workflow', state: 'Completed' })).status, 409);
  assert.equal((await call('organizer', 'changeEventState', { eventId: 'workflow', state: 'Published' })).status, 409);
  await db.collection('events').doc('workflow').update({ description: 'وصف', location: 'الجامعة', date: new Date(), durationHours: 1 });
  assert.equal((await call('organizer', 'changeEventState', { eventId: 'workflow', state: 'Published' })).status, 200);
  assert.equal((await call('organizer', 'changeEventState', { eventId: 'workflow', state: 'Registration Open' })).status, 200);
  assert.equal((await call('carol', 'getAdminOverview')).status, 403);
  const result = await call('organizer', 'getAdminOverview');
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.data.counts.availableCertificates, (await db.collection('certificates').where('status', '==', 'Available').get()).size);
  assert.equal((await call('organizer', 'getEventReport', { eventId: 'feedback-only' })).data.feedback.averageRating, 4);
});

test('Member search finds beyond the first page and excludes arbitrary private fields', async () => {
  const batch = db.batch();
  for (let i = 0; i < 65; i++) batch.set(db.collection('users').doc(`search-${String(i).padStart(3, '0')}`), { displayName: `Member ${i}`, email: `search-${i}@example.test`, role: 'student', totalPoints: 0, privateToken: 'not-public' });
  await batch.commit();
  const first = await call('organizer', 'searchMembers');
  assert.equal(first.data.users.length, 50); assert.ok(first.data.nextCursor);
  const results = await call('organizer', 'searchMembers', { query: 'Member 64' });
  assert.ok(results.data.users.some(user => user.id === 'search-064'));
  assert.equal(results.data.users[0].privateToken, undefined);
});

test('Last super admin cannot be archived or demoted and audit is restricted', async () => {
  assert.equal((await call('organizer', 'manageUser', { userId: 'organizer', change: 'delete' })).status, 409);
  assert.equal((await call('organizer', 'manageUser', { userId: 'organizer', change: 'role', role: 'student' })).status, 409);
  assert.equal((await call('carol', 'getAuditLog')).status, 403);
  const audit = await call('organizer', 'getAuditLog');
  assert.equal(audit.status, 200); assert.ok(audit.data.entries.some(entry => entry.action === 'points.adjust'));
  assert.ok(!JSON.stringify(audit.data).includes('test-secret'));
});

test('Certificate batch reports partial failure rather than pretending all recipients succeeded', async () => {
  await db.collection('events').doc('partial-certs').set(event('Completed', 20));
  await db.collection('attendance_logs').doc('partial-certs_carol').set({ eventId: 'partial-certs', userId: 'carol', timestamp: new Date() });
  const result = await call('organizer', 'issueCertificates', { eventId: 'partial-certs', userIds: ['carol', 'dan'] });
  assert.equal(result.status, 200); assert.equal(result.data.queuedCount, 1); assert.equal(result.data.failedCount, 1);
  assert.deepEqual(result.data.results.map(item => item.status), ['queued', 'failed']);
});

test('Content saves are audited and stale structure writes cannot overwrite another organizer', async () => {
  const input = { committees: [{ id: 'engineering', name: 'الهندسة', description: '', iconName: 'Users', members: [] }], expectedStructureRevision: 0 };
  assert.equal((await call('carol', 'saveHomepage', { heroTitle: 'forged' })).status, 403);
  assert.equal((await call('organizer', 'saveHomepage', input)).status, 200);
  assert.equal((await call('organizer', 'saveHomepage', input)).status, 409);
  assert.equal((await call('organizer', 'saveHomepage', { heroTitle: 'IEEE Qassim' })).status, 200);
  assert.equal((await db.collection('settings').doc('homepage').get()).data().committees.length, 1);
});

test('Actual Firestore rules reject identity/role/points and lifecycle bypasses, allow safe owner edits', async () => {
  const testEnv = await initializeTestEnvironment({ projectId: 'demo-ieee-qu', firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') } });
  try {
    const student = testEnv.authenticatedContext('carol').firestore();
    const admin = testEnv.authenticatedContext('organizer').firestore();
    await assertFails(clientUpdate(clientDoc(student, 'users', 'carol'), { universityId: '999999999', profileCompleted: true }));
    await assertFails(clientUpdate(clientDoc(student, 'users', 'carol'), { totalPoints: 1000000 }));
    await assertFails(clientUpdate(clientDoc(admin, 'users', 'carol'), { role: 'super_admin' }));
    await assertSucceeds(clientUpdate(clientDoc(student, 'users', 'carol'), { photoURL: 'https://example.test/avatar.png' }));
    await assertFails(clientUpdate(clientDoc(admin, 'events', 'workflow'), { state: 'Completed' }));
    await assertFails(clientUpdate(clientDoc(admin, 'events', 'workflow'), { title: 'عنوان معدل' }));
    await assertFails(clientDelete(clientDoc(admin, 'events', 'workflow')));
    await assertFails(clientUpdate(clientDoc(admin, 'settings', 'homepage'), { heroTitle: 'bypass' }));
  } finally { await testEnv.cleanup(); }
});

test('Invalid waitlist accounts are skipped without consuming a freed seat', async () => {
  await db.collection('events').doc('restricted-queue').set({ ...event('Registration Open', 1), registeredCount: 1 });
  await db.collection('registrations').doc('restricted-queue_carol').set({ eventId: 'restricted-queue', userId: 'carol', status: 'approved', timestamp: new Date(1) });
  await db.collection('registrations').doc('restricted-queue_bob').set({ eventId: 'restricted-queue', userId: 'bob', status: 'waitlisted', timestamp: new Date(2) });
  await db.collection('registrations').doc('restricted-queue_dan').set({ eventId: 'restricted-queue', userId: 'dan', status: 'waitlisted', timestamp: new Date(3) });
  assert.equal((await call('carol', 'cancelRegistration', { eventId: 'restricted-queue' })).status, 200);
  assert.equal((await db.collection('registrations').doc('restricted-queue_dan').get()).data().status, 'approved');
  assert.equal((await db.collection('registrations').doc('restricted-queue_bob').get()).data().status, 'cancelled');
  assert.equal((await db.collection('events').doc('restricted-queue').get()).data().registeredCount, 1);
});

test('A certificate that loses eligibility leaves the queue with an actionable failure', async () => {
  await db.collection('events').doc('eligibility-loss').set(event('Completed', 20));
  await db.collection('attendance_logs').doc('eligibility-loss_carol').set({ eventId: 'eligibility-loss', userId: 'carol', timestamp: new Date() });
  await call('organizer', 'issueCertificates', { eventId: 'eligibility-loss', userIds: ['carol'] });
  await db.collection('events').doc('eligibility-loss').update({ state: 'Archived' });
  const result = await call('organizer', 'renderCertificate', { certificateId: 'certificate_eligibility-loss_carol' });
  assert.equal(result.status, 200);
  assert.equal((await db.collection('certificates').doc('certificate_eligibility-loss_carol').get()).data().status, 'Failed');
});

test('Event content saves create audited drafts and cannot overwrite counters or stale edits', async () => {
  const input = { title: 'فعالية آمنة', titleEn: 'Safe event', description: 'وصف', descriptionEn: '', location: 'جامعة القصيم', locationEn: '', type: 'Workshop', date: '2026-11-10T10:00:00.000Z', durationHours: 2, capacity: 10, points: 0, registrationMode: 'Auto', hasCertificate: true, gains: [], gainsEn: [], speakers: [], state: 'Completed' };
  assert.equal((await call('carol', 'saveEvent', input)).status, 403);
  const created = await call('organizer', 'saveEvent', input);
  assert.equal(created.status, 200, JSON.stringify(created));
  const id = created.data.eventId;
  const ref = db.collection('events').doc(id);
  const before = (await ref.get()).data();
  assert.equal(before.state, 'Draft'); assert.equal(before.registeredCount, 0); assert.equal(before.points, 0);
  const expectedUpdatedAt = before.updatedAt.toDate().getTime();
  await ref.update({ registeredCount: 5 });
  assert.equal((await call('organizer', 'saveEvent', { eventId: id, title: 'تعديل مع تسجيل متزامن', expectedUpdatedAt })).status, 200);
  assert.equal((await ref.get()).data().registeredCount, 5);
  assert.equal((await call('organizer', 'saveEvent', { eventId: id, registeredCount: 0 })).status, 400);
  assert.equal((await call('organizer', 'saveEvent', { eventId: id, capacity: 2 })).status, 409);
  assert.equal((await call('organizer', 'saveEvent', { eventId: id, title: 'تعديل قديم', expectedUpdatedAt })).status, 409);
});

test('Discovery visibility is organizer-controlled metadata and preserves registrations and certificates', async () => {
  const ref = db.collection('events').doc('visibility');
  await ref.set({ ...event('Completed', 10), date: new Date('2026-11-10T10:00:00.000Z'), durationHours: 2, registeredCount: 2, attendanceCount: 1 });
  const registration = db.collection('registrations').doc('visibility_carol');
  const certificate = db.collection('certificates').doc('certificate_visibility_carol');
  await registration.set({ userId: 'carol', eventId: ref.id, status: 'attended' });
  await certificate.set({ userId: 'carol', eventId: ref.id, status: 'Rendered', url: 'https://cert.example.test/visibility' });
  assert.equal((await call('carol', 'saveEvent', { eventId: ref.id, hideFromDiscovery: true })).status, 403);
  assert.equal((await call('organizer', 'saveEvent', { eventId: ref.id, hideFromDiscovery: 'true' })).status, 400);
  assert.equal((await call('organizer', 'saveEvent', { eventId: ref.id, hideFromDiscovery: true })).status, 200);
  const hidden = (await ref.get()).data();
  assert.equal(hidden.hideFromDiscovery, true);
  assert.equal(hidden.state, 'Completed');
  assert.equal(hidden.registeredCount, 2);
  assert.equal(hidden.attendanceCount, 1);
  assert.equal((await registration.get()).data().status, 'attended');
  assert.equal((await certificate.get()).data().url, 'https://cert.example.test/visibility');
  assert.equal((await call('organizer', 'saveEvent', { eventId: ref.id, hideFromDiscovery: false })).status, 200);
  assert.equal((await ref.get()).data().hideFromDiscovery, false);
  const visibilityAudit = await db.collection('audit_logs').where('targetId', '==', ref.id).get();
  assert.ok(visibilityAudit.docs.some(doc => doc.data().action === 'event.update' && doc.data().fields?.includes('hideFromDiscovery')));
});

test('Member diagnostics are admin-only, read-only and flag a missing public projection', async () => {
  await db.collection('users').doc('activity-member').set({ displayName: 'عضو تجريبي', role: 'student', totalPoints: 10, email: 'activity@example.test' });
  assert.equal((await call('carol', 'getMemberOverview', { userId: 'activity-member' })).status, 403);
  assert.equal((await call('carol', 'getMemberActivity', { userId: 'activity-member', section: 'points' })).status, 403);
  const overview = await call('organizer', 'getMemberOverview', { userId: 'activity-member' });
  assert.equal(overview.status, 200); assert.equal(overview.data.member.totalPoints, 10);
  assert.deepEqual(overview.data.publicProjection, { exists: false, balance: null, matchesBalance: false });
  assert.equal((await db.collection('public_profiles').doc('activity-member').get()).exists, false);
  await db.collection('public_profiles').doc('activity-member').set({ totalPoints: 5 });
  const stale = await call('organizer', 'getMemberOverview', { userId: 'activity-member' });
  assert.equal(stale.data.publicProjection.matchesBalance, false);
  assert.equal((await db.collection('users').doc('activity-member').get()).data().totalPoints, 10);
  assert.equal((await call('carol', 'syncPublicProfile', { userId: 'activity-member' })).status, 403);
  assert.equal((await call('organizer', 'syncPublicProfile', { userId: 'activity-member' })).status, 200);
  assert.equal((await db.collection('public_profiles').doc('activity-member').get()).data().totalPoints, 10);
  assert.equal((await db.collection('users').doc('activity-member').get()).data().totalPoints, 10);
  const projectionAudit = await db.collection('audit_logs').where('targetId', '==', 'activity-member').get();
  assert.ok(projectionAudit.docs.some(doc => doc.data().action === 'profile.sync_projection'));
  assert.equal((await call('organizer', 'getMemberOverview', { userId: 'missing-member' })).status, 404);
});

test('Member activity includes undated legacy records, stable pagination and no certificate secrets', async () => {
  await db.collection('events').doc('activity-event').set({ title: 'عنوان الفعالية' });
  const batch = db.batch();
  for (let index = 0; index < 65; index++) batch.set(db.collection('registrations').doc(`activity-${String(index).padStart(3, '0')}`), { userId: 'activity-member', eventId: 'activity-event', status: 'approved', secretField: 'hidden' });
  batch.set(db.collection('registrations').doc('activity-foreign'), { userId: 'carol', eventId: 'activity-event' });
  batch.set(db.collection('certificates').doc('activity-certificate'), { userId: 'activity-member', eventId: 'activity-event', status: 'Available', cloudinaryPublicId: 'private-asset', externalUrl: 'https://example.test/private', lease: 'secret', downloadToken: 'hidden' });
  await batch.commit();
  const ids = []; let cursor = null;
  do {
    const page = await call('organizer', 'getMemberActivity', { userId: 'activity-member', section: 'registrations', ...(cursor ? { cursor } : {}) });
    assert.equal(page.status, 200); assert.ok(page.data.entries.length <= 30);
    for (const entry of page.data.entries) { ids.push(entry.id); assert.equal(entry.secretField, undefined); assert.equal(entry.eventTitle, 'عنوان الفعالية'); }
    cursor = page.data.nextCursor;
  } while (cursor);
  assert.equal(ids.length, 65); assert.equal(new Set(ids).size, 65);
  assert.equal((await call('organizer', 'getMemberActivity', { userId: 'activity-member', section: 'registrations', cursor: 'activity-foreign' })).status, 400);
  assert.equal((await call('organizer', 'getMemberActivity', { userId: 'activity-member', section: '__proto__' })).status, 400);
  const certs = await call('organizer', 'getMemberActivity', { userId: 'activity-member', section: 'certificates' });
  for (const field of ['cloudinaryPublicId', 'externalUrl', 'lease', 'downloadToken']) assert.equal(certs.data.entries[0][field], undefined);
  const summary = await call('organizer', 'getMemberOverview', { userId: 'activity-member' });
  assert.equal(summary.data.counts.registrations, 65); assert.equal(summary.data.counts.certificates, 1);
});
