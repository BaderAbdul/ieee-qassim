import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from './engine/platform.ts';
import { normalizeStudentId } from '../src/lib/studentExperience.ts';
import { verifyCheckInToken } from './engine/crypto.ts';

test('normalizeStudentId correctly converts Arabic-indic and Persian numerals to standard digits', () => {
  assert.equal(normalizeStudentId('٤٤١٠١٢٣٤٥'), '441012345');
  assert.equal(normalizeStudentId('۴۴۱۰۱۲۳۴۵'), '441012345');
  assert.equal(normalizeStudentId(' 441012345 '), '441012345');
  assert.equal(normalizeStudentId(''), '');
});

test('Manual points deduction properly reduces user balance and records transaction', async () => {
  const client = new IEEEPlatformClient();
  const superAdmin = await client.createUser({
    uid: 'admin_points_mgr',
    displayName: 'Super Admin',
    email: 'admin_pt@qu.edu.sa',
    role: 'super_admin'
  });

  const student = await client.createUser({
    uid: 'student_pt_deduct',
    displayName: 'عبدالله السعيد',
    email: 'abdullah@qu.edu.sa',
    universityId: '441098765',
    role: 'student'
  });

  // Award 100 points initially
  const initialAdd = await client.addManualPoints(superAdmin.uid, student.uid, 100, 'نقاط أولية');
  assert.equal(initialAdd.newTotal, 100);

  let userSnap = await client.getUser(student.uid);
  assert.equal(userSnap?.totalPoints, 100);

  // Deduct 30 points
  const deductResult = await client.addManualPoints(superAdmin.uid, student.uid, -30, 'خصم نقاط بسبب مخالفة تنظيمية');
  assert.equal(deductResult.status, 'success');
  assert.equal(deductResult.newTotal, 70);

  userSnap = await client.getUser(student.uid);
  assert.equal(userSnap?.totalPoints, 70);

  // Verify transaction in point_transactions collection
  const txSnap = await client.db.collection('point_transactions').where('userId', '==', student.uid).get();
  assert.equal(txSnap.empty, false);
  const txs = txSnap.docs.map(d => d.data());
  const deductTx = txs.find(t => t.amount === -30);
  assert.ok(deductTx, 'Transaction with negative amount -30 must exist');
  assert.equal(deductTx.source, 'manual_adjustment');
});

test('Check-in token generation supports custom duration expiration', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({
    uid: 'admin_tok_test',
    displayName: 'Event Lead',
    email: 'lead@ieeequ.org',
    role: 'event_organizer'
  });

  const event = await client.createEvent(admin.uid, {
    title: 'هاكاثون البرمجة السحابية',
    titleEn: 'Cloud Hackathon',
    description: 'هاكاثون على مدار يوم كامل',
    descriptionEn: 'Full day hackathon',
    type: 'Competition',
    date: new Date(),
    location: 'المختبر المركزي',
    locationEn: 'Central Lab',
    durationHours: 12,
    capacity: 100,
    points: 50,
    hasCertificate: true,
    state: 'Ongoing',
    registrationMode: 'Auto'
  });

  // Generate 4-hour token (240 minutes = 14400 seconds)
  const durationSec = 14400;
  const { token } = await client.generateCheckInToken(admin.uid, event.id, durationSec);
  assert.ok(token);

  // Verify token is valid with cryptographic verification
  const payload = verifyCheckInToken(token);
  assert.equal(payload.eventId, event.id);
  assert.ok(payload.exp > Math.floor(Date.now() / 1000) + 3600);
});

test('Student can be checked in and verified attendance allows certificate attachment', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({
    uid: 'admin_cert_att',
    displayName: 'Cert Lead',
    email: 'certlead@ieeequ.org',
    role: 'event_organizer'
  });

  const event = await client.createEvent(admin.uid, {
    title: 'معسكر الأمن السيبراني',
    titleEn: 'Cybersecurity Camp',
    description: 'تدريب مكثف',
    descriptionEn: 'Intensive training',
    type: 'Camp',
    date: new Date(),
    location: 'المدرج 2',
    locationEn: 'Auditorium 2',
    durationHours: 5,
    capacity: 50,
    points: 40,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto'
  });

  const student = await client.createUser({
    uid: 'student_cert_target',
    displayName: 'بدر الدخيل الله',
    email: 'bader@qu.edu.sa',
    universityId: '441023456',
    role: 'student'
  });

  // Register while event is open
  await client.registerForEvent(student.uid, event.id);

  // Transition event to Ongoing
  await client.updateEventState(admin.uid, event.id, 'Ongoing');

  // Check in
  const { token } = await client.generateCheckInToken(admin.uid, event.id, 900);
  const checkinResult = await client.processCheckIn(student.uid, event.id, token);
  assert.equal(checkinResult.status, 'success');

  // Verify attendance log
  const logDoc = await client.db.collection('attendance_logs').doc(`${event.id}_${student.uid}`).get();
  assert.equal(logDoc.exists, true);

  // Mark event as Completed
  await client.updateEventState(admin.uid, event.id, 'Completed');

  // Issue certificates
  const certResult = await client.issueCertificates(admin.uid, event.id, [student.uid]);
  assert.equal(certResult.status, 'success');
  assert.equal(certResult.queuedCount, 1);

  const certDocs = await client.db.collection('certificates').where('eventId', '==', event.id).where('userId', '==', student.uid).get();
  assert.equal(certDocs.empty, false);
});
