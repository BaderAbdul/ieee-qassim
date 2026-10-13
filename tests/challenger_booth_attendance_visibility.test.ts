import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from './engine/platform.ts';
import { serializeCSV, parseCSV } from '../src/lib/csv.ts';

test('Booth event with requiresRegistration: false allows direct QR check-in and records walk-in registration with timestamp and profile details', async () => {
  const client = new IEEEPlatformClient();

  const admin = await client.createUser({
    uid: 'admin_booth_organizer',
    displayName: 'Eng Organizer',
    email: 'organizer@ieeequ.org',
    role: 'event_organizer',
  });

  const boothEvent = await client.createEvent(admin.uid, {
    title: 'بوث فرع IEEE الطلابي في بهو الكلية',
    titleEn: 'IEEE Student Branch Booth',
    description: 'زيارة بوث الفرع الطلابي والتعرف على الأنشطة',
    descriptionEn: 'Visit student branch booth',
    type: 'Booth',
    requiresRegistration: false,
    date: new Date('2026-11-15T09:00:00Z'),
    location: 'بهو كلية الهندسة',
    locationEn: 'Engineering College Lobby',
    durationHours: 6,
    capacity: 500,
    isUnlimitedCapacity: true,
    points: 15,
    hasCertificate: false,
    registrationMode: 'Auto',
    state: 'Ongoing',
  });

  const student = await client.createUser({
    uid: 'student_booth_visitor_1',
    displayName: 'سليمان الحربي',
    email: 'sulaiman@qu.edu.sa',
    universityId: '441012345',
    role: 'student',
  });

  // Verify student was NOT pre-registered
  const regBefore = await client.db.collection('registrations').doc(`${boothEvent.id}_${student.uid}`).get();
  assert.equal(regBefore.exists, false, 'Student should not have a registration before visiting booth');

  // Generate QR token
  const { token } = await client.generateCheckInToken(admin.uid, boothEvent.id, 300);

  // Student checks in at the booth
  const checkInResult = await client.processCheckIn(student.uid, boothEvent.id, token);
  assert.equal(checkInResult.status, 'success');
  assert.equal(checkInResult.pointsAwarded, 15);

  // Verify attendance log
  const logSnap = await client.db.collection('attendance_logs').doc(`${boothEvent.id}_${student.uid}`).get();
  assert.equal(logSnap.exists, true);
  assert.equal(logSnap.data()?.userId, student.uid);

  // CRITICAL: Verify registration document was created with timestamp, isWalkIn, and user details
  const regAfter = await client.db.collection('registrations').doc(`${boothEvent.id}_${student.uid}`).get();
  assert.equal(regAfter.exists, true, 'Registration record MUST exist for booth visitor');
  const regData = regAfter.data()!;
  assert.equal(regData.status, 'attended');
  assert.equal(regData.attended, true);
  assert.equal(regData.isWalkIn, true);
  assert.ok(regData.timestamp, 'timestamp must be present so Firestore queries do not omit the record');
  assert.equal(regData.userName, 'سليمان الحربي');
  assert.equal(regData.userEmail, 'sulaiman@qu.edu.sa');
  assert.equal(regData.universityId, '441012345');

  // Verify user points
  const updatedUser = await client.getUser(student.uid);
  assert.equal(updatedUser?.totalPoints, 15);
});

test('Booth event manual attendance override works for walk-in students without prior registration', async () => {
  const client = new IEEEPlatformClient();

  const admin = await client.createUser({
    uid: 'admin_booth_desk',
    displayName: 'مشرف البوث',
    email: 'desk@ieeequ.org',
    role: 'event_organizer',
  });

  const boothEvent = await client.createEvent(admin.uid, {
    title: 'بوث اليوم الهندسي',
    type: 'Booth',
    requiresRegistration: false,
    date: new Date('2026-11-20T10:00:00Z'),
    location: 'المعرض الرئيسي',
    durationHours: 4,
    capacity: 1000,
    isUnlimitedCapacity: true,
    points: 10,
    state: 'Ongoing',
  });

  const student = await client.createUser({
    uid: 'student_booth_walkin_2',
    displayName: 'عبدالله المطيري',
    email: 'abdullah@qu.edu.sa',
    universityId: '441098765',
    role: 'student',
  });

  // Admin manually records attendance at desk
  const overrideResult = await client.manualAttendanceOverride(admin.uid, student.uid, boothEvent.id);
  assert.equal(overrideResult.status, 'success');
  assert.equal(overrideResult.pointsAwarded, 10);

  // Verify registration record
  const regSnap = await client.db.collection('registrations').doc(`${boothEvent.id}_${student.uid}`).get();
  assert.equal(regSnap.exists, true);
  const data = regSnap.data()!;
  assert.equal(data.status, 'attended');
  assert.equal(data.attended, true);
  assert.equal(data.isWalkIn, true);
  assert.ok(data.timestamp, 'timestamp must be defined');
  assert.equal(data.userName, 'عبدالله المطيري');
  assert.equal(data.universityId, '441098765');
});

test('Sync event attendance heals past records missing timestamp or missing from registrations collection', async () => {
  const client = new IEEEPlatformClient();

  const admin = await client.createUser({
    uid: 'admin_repair_tester',
    displayName: 'Admin Tester',
    email: 'admin@ieeequ.org',
    role: 'super_admin',
  });

  const boothEvent = await client.createEvent(admin.uid, {
    title: 'بوث سابق',
    type: 'Booth',
    requiresRegistration: false,
    date: new Date('2026-10-01T10:00:00Z'),
    location: 'البهو',
    durationHours: 4,
    capacity: 200,
    points: 10,
    state: 'Completed',
  });

  const student = await client.createUser({
    uid: 'past_booth_visitor_uid',
    displayName: 'طالب زائر سابق',
    email: 'past.visitor@qu.edu.sa',
    universityId: '441055555',
    role: 'student',
  });

  // Simulate past bug: attendance_log was written, but registrations doc was missing or lacked timestamp
  await client.db.collection('attendance_logs').doc(`${boothEvent.id}_${student.uid}`).set({
    id: `${boothEvent.id}_${student.uid}`,
    eventId: boothEvent.id,
    userId: student.uid,
    timestamp: new Date('2026-10-01T11:30:00Z'),
  });

  // Trigger sync
  const syncResult = await client.syncEventAttendance(admin.uid, boothEvent.id);
  assert.equal(syncResult.status, 'success');
  assert.equal(syncResult.repairedCount, 1);
  assert.equal(syncResult.totalAttendance, 1);

  // Verify registration document was healed
  const regSnap = await client.db.collection('registrations').doc(`${boothEvent.id}_${student.uid}`).get();
  assert.equal(regSnap.exists, true);
  const reg = regSnap.data()!;
  assert.equal(reg.status, 'attended');
  assert.equal(reg.attended, true);
  assert.equal(reg.isWalkIn, true);
  assert.ok(reg.timestamp, 'timestamp must be healed');
  assert.equal(reg.userName, 'طالب زائر سابق');
  assert.equal(reg.universityId, '441055555');
});

test('CSV export distinguishes walk-ins from pre-registrations with proper headers and escaping', () => {
  const headers = ['Name', 'Email', 'University ID', 'College', 'Major', 'Academic Level', 'Qassim Student?', 'Status', 'Attendance Type', 'Date (UTC)'];
  const rows = [
    [
      'سليمان الحربي',
      'sulaiman@qu.edu.sa',
      '441012345',
      'كلية الهندسة',
      'هندسة كهربائية',
      'المستوى 7',
      'Yes',
      'attended',
      'Walk-in / Booth (حضور مباشر)',
      '2026-11-15T09:15:00.000Z',
    ],
    [
      'محمد القحطاني',
      'mohammed@qu.edu.sa',
      '441067890',
      'كلية الهندسة',
      'هندسة ميكانيكية',
      'المستوى 5',
      'Yes',
      'approved',
      'Pre-registered (تسجيل مسبق)',
      '2026-11-10T14:00:00.000Z',
    ]
  ];

  const csvOutput = serializeCSV([headers, ...rows]);
  assert.ok(csvOutput.includes('Walk-in / Booth (حضور مباشر)'));
  assert.ok(csvOutput.includes('Pre-registered (تسجيل مسبق)'));

  const parsed = parseCSV(csvOutput);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[1][8], 'Walk-in / Booth (حضور مباشر)');
  assert.equal(parsed[2][8], 'Pre-registered (تسجيل مسبق)');
});
