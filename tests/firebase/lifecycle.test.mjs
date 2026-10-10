import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, setLogLevel } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

const projectId = 'demo-ieee-qu';
setLogLevel('silent'); // Permission-denied logs are expected assertions in this suite.
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  throw new Error('Run npm run test:firebase; these tests must never connect to production.');
}
const requireFunctions = createRequire(new URL('../../functions/package.json', import.meta.url));
const admin = requireFunctions('firebase-admin/app');
const { getFirestore, Timestamp } = requireFunctions('firebase-admin/firestore');
admin.initializeApp({ projectId, storageBucket: projectId + '.appspot.com' });
const db = getFirestore();
const { registerForEvent, cancelRegistration, manageRegistration } = requireFunctions('./lib/registerForEvent.js');
const { submitCheckIn } = requireFunctions('./lib/submitCheckIn.js');
const { generateCheckInToken } = requireFunctions('./lib/generateCheckInToken.js');
const { aggregatePoints } = requireFunctions('./lib/onPointTransactionCreated.js');
const { issueCertificates } = requireFunctions('./lib/issueCertificates.js');
const { getCertificateDownloadUrl } = requireFunctions('./lib/getCertificateDownloadUrl.js');
const { saveExternalCertificate } = requireFunctions('./lib/saveExternalCertificate.js');
const { syncPublicProfile } = requireFunctions('./lib/publicProfiles.js');
const { addManualPoints } = requireFunctions('./lib/addManualPoints.js');
const { generateCertificate } = requireFunctions('./lib/generateCertificate.js');
const { getStorage } = requireFunctions('firebase-admin/storage');
const { emailRegistrations } = requireFunctions('./lib/triggers/emailRegistrations.js');
const { processMailQueue } = requireFunctions('./lib/workers/processMailQueue.js');
const { getEmailHtml } = requireFunctions('./lib/utils/emailTemplates.js');
const context = uid => ({ auth: { uid, token: { email: uid + '@example.com', email_verified: true } } });
let env;
const client = uid => env.authenticatedContext(uid, { email: uid + '@example.com' }).firestore();
const seedUser = (uid, role = 'student') => db.collection('users').doc(uid).set({
  role, totalPoints: 0, email: uid + '@example.com', displayName: uid, arabicFullName: 'طالب تجريبي',
  universityId: '123456789', profileCompleted: true, createdAt: '2026-10-10',
});
const seedEvent = (extra = {}) => db.collection('events').doc('event').set({
  state: 'Registration Open', title: 'ورشة تجريبية', type: 'Workshop', date: Timestamp.now(),
  capacity: 1, registeredCount: 0, attendanceCount: 0, registrationMode: 'Auto', points: 50, hasCertificate: true, ...extra,
});
before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
    storage: { host: '127.0.0.1', port: 9199, rules: readFileSync(new URL('../../storage.rules', import.meta.url), 'utf8') },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  await Promise.all([seedUser('alice'), seedUser('bob'), seedUser('organizer', 'event_organizer'), seedUser('root', 'super_admin'), seedEvent()]);
});
after(async () => { await env?.cleanup(); await admin.deleteApp(admin.getApp()); });

test('Actual rules block forged points, roles, attendance, registrations, and counters', async () => {
  const student = client('alice');
  await assertFails(updateDoc(doc(student, 'users/alice'), { totalPoints: 1000 }));
  await assertFails(updateDoc(doc(student, 'users/alice'), { role: 'super_admin' }));
  await assertFails(updateDoc(doc(student, 'users/alice'), { badges: ['engineering_leader'] }));
  await assertFails(setDoc(doc(student, 'attendance_logs/event_alice'), { userId: 'alice', eventId: 'event', timestamp: new Date() }));
  await assertFails(setDoc(doc(student, 'point_transactions/attendance_event_alice'), { userId: 'alice', source: 'attendance', amount: 1000 }));
  await assertFails(setDoc(doc(student, 'registrations/event_alice'), { userId: 'alice', eventId: 'event', status: 'approved' }));
  await assertFails(updateDoc(doc(student, 'events/event'), { registeredCount: 1 }));
  await assertFails(updateDoc(doc(student, 'events/event'), { attendanceCount: 1 }));
  await assertFails(setDoc(doc(student, 'certificates/forged'), { userId: 'alice', status: 'Available' }));
});

test('Actual rules allow safe owner changes and deny organizer escalation or direct points', async () => {
  await assertSucceeds(updateDoc(doc(client('alice'), 'users/alice'), { displayName: 'Updated' }));
  await assertFails(updateDoc(doc(client('alice'), 'users/bob'), { displayName: 'Forged' }));
  await assertFails(updateDoc(doc(client('organizer'), 'users/bob'), { totalPoints: 99 }));
  await assertFails(updateDoc(doc(client('organizer'), 'users/bob'), { role: 'super_admin' }));
  await assertSucceeds(updateDoc(doc(client('root'), 'users/bob'), { role: 'event_organizer' }));
  await assertFails(updateDoc(doc(client('alice'), 'users/alice'), { publicProfile: { email: 'leaked@example.com' } }));
});

test('Google users outside Qassim can create a student profile under actual rules', async () => {
  await assertSucceeds(setDoc(doc(client('new-user'), 'users/new-user'), {
    role: 'student', totalPoints: 0, email: 'new-user@example.com', displayName: 'New Student',
    photoURL: null, profileCompleted: false, createdAt: new Date().toISOString(),
  }));
  await assertFails(setDoc(doc(client('attacker'), 'users/attacker'), {
    role: 'super_admin', totalPoints: 0, email: 'attacker@example.com', profileCompleted: false,
  }));
});

test('Private profiles and email stay private; public projection has only approved fields', async () => {
  await assertFails(getDoc(doc(client('alice'), 'users/bob')));
  await assertFails(getDocs(collection(client('alice'), 'users')));
  await assertSucceeds(getDoc(doc(client('organizer'), 'users/bob')));
  await db.collection('users').doc('bob').update({ publicProfile: { bio: 'Hello', avatar: '', linkedin: '', email: 'nested-secret' } });
  await syncPublicProfile('bob');
  const publicSnap = await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'public_profiles/bob')));
  assert.equal(publicSnap.data().email, undefined);
  assert.equal(publicSnap.data().universityId, undefined);
  assert.equal(publicSnap.data().publicProfile.email, undefined);
  await assertFails(updateDoc(doc(client('bob'), 'public_profiles/bob'), { totalPoints: 999 }));
});

test('Actual Storage rules allow small owner images and block other users, SVGs, and certificates', async () => {
  const storage = env.authenticatedContext('alice').storage();
  await assertSucceeds(uploadBytes(ref(storage, 'avatars/alice/valid.png'), new Uint8Array([1, 2, 3]), { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(storage, 'avatars/bob/forged.png'), new Uint8Array([1]), { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(storage, 'avatars/alice/script.svg'), new Uint8Array([1]), { contentType: 'image/svg+xml' }));
  await assertFails(uploadBytes(ref(storage, 'certificates/event/forged.pdf'), new Uint8Array([1]), { contentType: 'application/pdf' }));
});

test('Backend rejects anonymous, unapproved, restricted, and non-admin callers', async () => {
  await assert.rejects(registerForEvent.run({ eventId: 'event' }, {}));
  await assert.rejects(manageRegistration.run({ eventId: 'event', userId: 'bob', action: 'approve' }, context('alice')));
  await db.collection('users').doc('alice').update({ profileCompleted: false });
  await assert.rejects(registerForEvent.run({ eventId: 'event' }, context('alice')));
  await db.collection('users').doc('alice').update({ profileCompleted: true, isRestricted: true });
  await assert.rejects(registerForEvent.run({ eventId: 'event' }, context('alice')));
  await assert.rejects(submitCheckIn.run({ eventId: 'event', targetUserId: 'bob' }, context('alice')));
});

test('Registration, FIFO cancellation, duplicate cancellation, and re-registration preserve capacity', async () => {
  assert.equal((await registerForEvent.run({ eventId: 'event' }, context('alice'))).status, 'approved');
  assert.equal((await registerForEvent.run({ eventId: 'event' }, context('bob'))).status, 'waitlisted');
  assert.equal((await db.doc('events/event').get()).data().registeredCount, 1);
  await assert.rejects(registerForEvent.run({ eventId: 'event' }, context('alice')));
  await cancelRegistration.run({ eventId: 'event' }, context('alice'));
  assert.equal((await db.doc('registrations/event_bob').get()).data().status, 'approved');
  await cancelRegistration.run({ eventId: 'event' }, context('alice'));
  assert.equal((await db.doc('events/event').get()).data().registeredCount, 1);
  assert.equal((await registerForEvent.run({ eventId: 'event' }, context('alice'))).status, 'waitlisted');
});

test('Manual approval, rejection, and promotion reserve seats consistently', async () => {
  await seedEvent({ registrationMode: 'Manual' });
  assert.equal((await registerForEvent.run({ eventId: 'event' }, context('alice'))).status, 'pending');
  assert.equal((await registerForEvent.run({ eventId: 'event' }, context('bob'))).status, 'waitlisted');
  await manageRegistration.run({ eventId: 'event', userId: 'alice', action: 'reject' }, context('organizer'));
  assert.equal((await db.doc('registrations/event_bob').get()).data().status, 'pending');
  await manageRegistration.run({ eventId: 'event', userId: 'bob', action: 'approve' }, context('organizer'));
  assert.equal((await db.doc('events/event').get()).data().registeredCount, 1);
});

test('Zero capacity waitlists while explicit unlimited capacity approves', async () => {
  await seedEvent({ capacity: 0 });
  assert.equal((await registerForEvent.run({ eventId: 'event' }, context('alice'))).status, 'waitlisted');
  await seedEvent({ capacity: 0, isUnlimitedCapacity: true });
  assert.equal((await registerForEvent.run({ eventId: 'event' }, context('bob'))).status, 'approved');
});

test('Tokens are private, expire, rotate, and cannot be generated by students', async () => {
  await db.doc('events/event').update({ state: 'Ongoing' });
  await assert.rejects(generateCheckInToken.run({ eventId: 'event' }, context('alice')));
  const first = await generateCheckInToken.run({ eventId: 'event' }, context('organizer'));
  const second = await generateCheckInToken.run({ eventId: 'event' }, context('organizer'));
  assert.notEqual(first.token, second.token);
  await assertFails(getDoc(doc(client('alice'), 'event_secrets/event')));
  assert.equal((await db.doc('events/event').get()).data().checkinToken, undefined);
});

test('Concurrent duplicate check-ins and duplicate trigger deliveries award points once', async () => {
  await registerForEvent.run({ eventId: 'event' }, context('alice'));
  await db.doc('events/event').update({ state: 'Ongoing' });
  const { token } = await generateCheckInToken.run({ eventId: 'event' }, context('organizer'));
  await assert.rejects(submitCheckIn.run({ eventId: 'event', token: 'forged' }, context('alice')));
  const results = await Promise.all(Array.from({ length: 4 }, () => submitCheckIn.run({ eventId: 'event', token }, context('alice'))));
  assert.equal(results.filter(result => result.status === 'success').length, 1);
  await Promise.all(Array.from({ length: 4 }, () => aggregatePoints('attendance_event_alice')));
  assert.equal((await db.doc('users/alice').get()).data().totalPoints, 50);
  assert.equal((await db.doc('events/event').get()).data().attendanceCount, 1);
  assert.equal((await db.collection('point_transactions').get()).size, 1);
  await assert.rejects(cancelRegistration.run({ eventId: 'event' }, context('alice')));
});

test('Expired links, waitlisted students, and closed events cannot check in', async () => {
  await registerForEvent.run({ eventId: 'event' }, context('alice'));
  await registerForEvent.run({ eventId: 'event' }, context('bob'));
  await db.doc('events/event').update({ state: 'Ongoing' });
  const { token } = await generateCheckInToken.run({ eventId: 'event' }, context('organizer'));
  await assert.rejects(submitCheckIn.run({ eventId: 'event', token }, context('bob')));
  await db.doc('event_secrets/event').update({ expiresAt: Timestamp.fromMillis(1) });
  await assert.rejects(submitCheckIn.run({ eventId: 'event', token }, context('alice')));
  await db.doc('events/event').update({ state: 'Completed' });
  await assert.rejects(submitCheckIn.run({ eventId: 'event', token }, context('alice')));
  assert.equal((await db.collection('attendance_logs').get()).size, 0);
});

test('Completed-event attendance produces eligible certificates and protected downloads', async () => {
  await registerForEvent.run({ eventId: 'event' }, context('alice'));
  await assert.rejects(issueCertificates.run({ eventId: 'event', userIds: ['alice'] }, context('organizer')));
  await db.doc('events/event').update({ state: 'Ongoing' });
  await submitCheckIn.run({ eventId: 'event', targetUserId: 'alice' }, context('organizer'));
  await db.doc('events/event').update({ state: 'Completed' });
  const issued = await issueCertificates.run({ eventId: 'event', userIds: ['alice', 'alice', 'bob'] }, context('organizer'));
  assert.equal(issued.queuedCount, 1);
  const id = 'certificate_event_alice';
  assert.equal((await db.doc('certificates/' + id).get()).data().studentName, 'طالب تجريبي');
  assert.equal((await issueCertificates.run({ eventId: 'event', userIds: ['alice'] }, context('organizer'))).queuedCount, 0);
  await assert.rejects(getCertificateDownloadUrl.run({ certificateId: id }, context('bob')));
  await assert.rejects(getCertificateDownloadUrl.run({ certificateId: id }, context('alice')));
  await db.doc('certificates/' + id).update({ status: 'Revoked' });
  assert.equal((await issueCertificates.run({ eventId: 'event', userIds: ['alice'] }, context('organizer'))).queuedCount, 0);
});

test('Manual HTTPS certificates require verified attendance and recheck ownership/status on download', async () => {
  await assert.rejects(saveExternalCertificate.run({ eventId: 'event', userId: 'alice', url: 'https://example.com/certificate.pdf' }, context('organizer')));
  await registerForEvent.run({ eventId: 'event' }, context('alice'));
  await db.doc('events/event').update({ state: 'Ongoing' });
  await submitCheckIn.run({ eventId: 'event', targetUserId: 'alice' }, context('organizer'));
  await db.doc('events/event').update({ state: 'Completed' });
  await saveExternalCertificate.run({ eventId: 'event', userId: 'alice', url: 'https://example.com/certificate.pdf' }, context('organizer'));
  const id = 'certificate_event_alice';
  assert.equal((await getCertificateDownloadUrl.run({ certificateId: id }, context('alice'))).url, 'https://example.com/certificate.pdf');
  await assert.rejects(getCertificateDownloadUrl.run({ certificateId: id }, context('bob')));
  await db.doc('certificates/' + id).update({ status: 'Revoked' });
  await assert.rejects(getCertificateDownloadUrl.run({ certificateId: id }, context('alice')));
});

test('Manual deductions floor at zero; invalid amounts cannot enter the ledger', async () => {
  await assert.rejects(addManualPoints.run({ studentUid: 'alice', amount: NaN, reason: 'invalid' }, context('organizer')));
  await assert.rejects(addManualPoints.run({ studentUid: 'alice', amount: 0.5, reason: 'invalid' }, context('organizer')));
  const result = await addManualPoints.run({ studentUid: 'alice', amount: -10, reason: 'correction' }, context('organizer'));
  await aggregatePoints(result.transactionId);
  assert.equal((await db.doc('users/alice').get()).data().totalPoints, 0);
});

test('Actual PDF worker renders Arabic and uploads a PDF to emulated Storage', { timeout: 120000 }, async () => {
  await registerForEvent.run({ eventId: 'event' }, context('alice'));
  await db.doc('events/event').update({ state: 'Ongoing' });
  await submitCheckIn.run({ eventId: 'event', targetUserId: 'alice' }, context('organizer'));
  await db.doc('events/event').update({ state: 'Completed' });
  const id = 'certificate_event_alice';
  const before = await db.doc('certificates/' + id).get();
  await issueCertificates.run({ eventId: 'event', userIds: ['alice'] }, context('organizer'));
  const after = await db.doc('certificates/' + id).get();
  await generateCertificate.run({ id: 'local-pdf', params: { certificateId: id }, data: { before, after } });
  const generated = (await db.doc('certificates/' + id).get()).data();
  assert.equal(generated.status, 'Available', generated.lastError);
  const [bytes] = await getStorage().bucket().file(generated.storagePath).download();
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.ok(bytes.length > 10000);
});

test('Registration email trigger deduplicates retries and the worker delivers through its emulator adapter', async () => {
  await registerForEvent.run({ eventId: 'event' }, context('alice'));
  const registration = await db.doc('registrations/event_alice').get();
  const event = { data: { after: registration }, params: { registrationId: 'event_alice' } };
  await emailRegistrations.run(event);
  await emailRegistrations.run(event);
  const mail = await db.collection('mail').get();
  assert.equal(mail.size, 1);
  process.env.FUNCTIONS_EMULATOR = 'true';
  try { await processMailQueue.run({ data: { after: mail.docs[0] } }); }
  finally { delete process.env.FUNCTIONS_EMULATOR; }
  assert.equal((await mail.docs[0].ref.get()).data().status, 'DELIVERED');
  const html = getEmailHtml('REGISTRATION_APPROVED', { eventTitle: '<script>alert(1)</script>' });
  assert.equal(html.includes('<script>'), false);
  assert.ok(html.includes('&lt;script&gt;'));
});

test('300 student registrations with five concurrent callers preserve capacity and FIFO', { timeout: 240000 }, async () => {
  await seedEvent({ capacity: 100 });
  const students = Array.from({ length: 300 }, (_, index) => 'student-' + index.toString().padStart(3, '0'));
  const batch = db.batch();
  for (const uid of students) batch.set(db.collection('users').doc(uid), {
    role: 'student', totalPoints: 0, profileCompleted: true, displayName: uid, email: uid + '@example.com',
  });
  await batch.commit();
  let next = 0;
  const results = [];
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (next < students.length) {
      const uid = students[next++];
      results.push({ uid, ...(await registerForEvent.run({ eventId: 'event' }, context(uid))) });
    }
  }));
  assert.equal(results.filter(result => result.status === 'approved').length, 100);
  assert.equal(results.filter(result => result.status === 'waitlisted').length, 200);
  assert.equal((await db.doc('events/event').get()).data().registeredCount, 100);
  const firstWaiting = await db.collection('registrations').where('eventId', '==', 'event').where('status', '==', 'waitlisted').orderBy('timestamp').limit(1).get();
  await cancelRegistration.run({ eventId: 'event' }, context(results.find(result => result.status === 'approved').uid));
  assert.equal((await firstWaiting.docs[0].ref.get()).data().status, 'approved');
  assert.equal((await db.doc('events/event').get()).data().registeredCount, 100);
});
