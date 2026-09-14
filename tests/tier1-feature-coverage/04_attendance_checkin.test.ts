import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 1: Attendance Check-in - Admin generates time-limited cryptographic QR check-in token', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_chk1', displayName: 'Dr. Organizer', email: 'org1@qu.edu.sa', role: 'event_organizer' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة الأنظمة المدمجة الجارية',
    titleEn: 'Ongoing Embedded Systems Workshop',
    description: 'فعالية جارية حالياً للحضور',
    descriptionEn: 'Currently ongoing event for check-in',
    type: 'Workshop',
    date: new Date(),
    location: 'قاعة 5',
    locationEn: 'Hall 5',
    durationHours: 2,
    gains: ['ARM'],
    gainsEn: ['ARM'],
    speakers: ['Eng. Anas'],
    capacity: 30,
    points: 40,
    hasCertificate: true,
    state: 'Ongoing',
    registrationMode: 'Auto',
  });

  const { token } = await client.generateCheckInToken(admin.uid, event.id, 60);
  assert.ok(token);
  assert.equal(typeof token, 'string');
  assert.equal(token.split('.').length, 3); // Standard JWT format
});

test('Tier 1: Attendance Check-in - Student check-in succeeds with valid token and registration', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_chk2', displayName: 'Admin', email: 'org2@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_chk2', displayName: 'Majed Al-Mutairi', email: 'majed@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ندوة الأمن المتقدم',
    titleEn: 'Advanced Security Seminar',
    description: 'ندوة تقنية متقدمة',
    descriptionEn: 'Advanced technical seminar',
    type: 'Lecture',
    date: new Date(),
    location: 'المسرح الرئيسي',
    locationEn: 'Main Hall',
    durationHours: 2,
    gains: ['Cryptography'],
    gainsEn: ['Cryptography'],
    speakers: ['Dr. Rayan'],
    capacity: 50,
    points: 50,
    hasCertificate: true,
    state: 'Published',
    registrationMode: 'Auto',
  });

  // Student registers
  await client.registerForEvent(student.uid, event.id);

  // Organizer transitions event to Ongoing
  await client.updateEventState(admin.uid, event.id, 'Ongoing');

  // Token is generated
  const { token } = await client.generateCheckInToken(admin.uid, event.id);

  // Student performs check-in
  const result = await client.processCheckIn(student.uid, event.id, token);
  assert.equal(result.status, 'success');
  assert.equal(result.pointsAwarded, 50);

  // Verify attendance log in database
  const logRef = client.db.collection('attendance_logs').doc(`${event.id}_${student.uid}`);
  const logSnap = await logRef.get();
  assert.ok(logSnap.exists);
  assert.equal(logSnap.data()?.verifiedByQR, true);
  assert.equal(logSnap.data()?.userId, student.uid);
});

test('Tier 1: Attendance Check-in - Check-in rejected for unregistered student', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_chk3', displayName: 'Admin', email: 'org3@qu.edu.sa', role: 'event_organizer' });
  const student = await client.createUser({ uid: 'std_unregistered', displayName: 'Ghost Student', email: 'ghost@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة خاصة',
    titleEn: 'Private Workshop',
    description: 'فحص عدم التسجيل',
    descriptionEn: 'Test unregistered case',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 2,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 20,
    points: 30,
    hasCertificate: true,
    state: 'Ongoing',
    registrationMode: 'Auto',
  });

  const { token } = await client.generateCheckInToken(admin.uid, event.id);

  await assert.rejects(
    async () => {
      await client.processCheckIn(student.uid, event.id, token);
    },
    {
      message: 'You are not registered for this event.',
    }
  );
});

test('Tier 1: Attendance Check-in - Check-in rejected for waitlisted student', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_chk4', displayName: 'Admin', email: 'org4@qu.edu.sa', role: 'event_organizer' });
  const student1 = await client.createUser({ uid: 'std_approved', displayName: 'Student Approved', email: 'app@qu.edu.sa' });
  const student2 = await client.createUser({ uid: 'std_waitlisted', displayName: 'Student Waitlisted', email: 'wait@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة مقعد فردي',
    titleEn: 'Single Seat Workshop',
    description: 'سعة مقعد واحد',
    descriptionEn: 'Capacity 1',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 1,
    points: 20,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // Student 1 approved, Student 2 waitlisted
  await client.registerForEvent(student1.uid, event.id);
  const reg2 = await client.registerForEvent(student2.uid, event.id);
  assert.equal(reg2.status, 'waitlisted');

  // Start event
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);

  // Student 2 attempts check-in
  await assert.rejects(
    async () => {
      await client.processCheckIn(student2.uid, event.id, token);
    },
    {
      message: 'Your registration is not approved.',
    }
  );
});

test('Tier 1: Attendance Check-in - Attendance log records timestamp and QR nonce', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_chk5', displayName: 'Admin', email: 'org5@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_chk5', displayName: 'Nawaf', email: 'nawaf@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية التدقيق',
    titleEn: 'Audit Trail Event',
    description: 'فحص سجل الحضور',
    descriptionEn: 'Check attendance log details',
    type: 'Lecture',
    date: new Date(),
    location: 'قاعة 10',
    locationEn: 'Hall 10',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 50,
    points: 25,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');

  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  await client.processCheckIn(student.uid, event.id, token);

  const logRef = client.db.collection('attendance_logs').doc(`${event.id}_${student.uid}`);
  const logSnap = await logRef.get();
  const logData = logSnap.data();

  assert.ok(logData?.timestamp instanceof Date);
  assert.equal(typeof logData?.tokenNonce, 'string');
  assert.ok(logData?.tokenNonce.length > 0);
  assert.equal(logData?.verifiedByQR, true);
});

test('Tier 1: Attendance Check-in - Duplicate check-in is strictly idempotent', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_chk6', displayName: 'Admin', email: 'org6@qu.edu.sa', role: 'event_organizer' });
  const student = await client.createUser({ uid: 'std_idempotent', displayName: 'Sultan', email: 'sultan@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية فحص التكرار',
    titleEn: 'Idempotency Test Event',
    description: 'منع تكرار تسجيل الحضور',
    descriptionEn: 'Prevent duplicate check-ins',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 2,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 20,
    points: 40,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);

  // 1st Check-in
  const firstAttempt = await client.processCheckIn(student.uid, event.id, token);
  assert.equal(firstAttempt.status, 'success');
  assert.equal(firstAttempt.pointsAwarded, 40);

  // 2nd Check-in with same or new token
  const { token: token2 } = await client.generateCheckInToken(admin.uid, event.id);
  const secondAttempt = await client.processCheckIn(student.uid, event.id, token2);
  assert.equal(secondAttempt.status, 'already_checked_in');
  assert.equal(secondAttempt.pointsAwarded, 0);

  // Verify points not doubled in profile
  const user = await client.getUser(student.uid);
  assert.equal(user?.totalPoints, 40);
});
