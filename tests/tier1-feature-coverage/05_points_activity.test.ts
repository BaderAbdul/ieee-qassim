import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 1: Points & Activity - Check-in automatically awards event points to student', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_pt1', displayName: 'Admin', email: 'org1@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_pt1', displayName: 'Hassan', email: 'hassan@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة مهارات الذكاء الاصطناعي',
    titleEn: 'AI Skills Workshop',
    description: 'تطبيقات عملية',
    descriptionEn: 'Hands-on practice',
    type: 'Workshop',
    date: new Date(),
    location: 'قاعة 1',
    locationEn: 'Hall 1',
    durationHours: 3,
    gains: ['AI'],
    gainsEn: ['AI'],
    speakers: ['Dr. Mona'],
    capacity: 20,
    points: 70,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');

  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  const result = await client.processCheckIn(student.uid, event.id, token);

  assert.equal(result.status, 'success');
  assert.equal(result.pointsAwarded, 70);

  const updatedStudent = await client.getUser(student.uid);
  assert.equal(updatedStudent?.totalPoints, 70);
});

test('Tier 1: Points & Activity - Immutable point transaction recorded with source attendance', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_pt2', displayName: 'Admin', email: 'org2@qu.edu.sa', role: 'event_organizer' });
  const student = await client.createUser({ uid: 'std_pt2', displayName: 'Lama', email: 'lama@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ندوة هندسة البرمجيات',
    titleEn: 'Software Engineering Seminar',
    description: 'معمارية النظم الحديثة',
    descriptionEn: 'Modern software architecture',
    type: 'Lecture',
    date: new Date(),
    location: 'القاعة الكبرى',
    locationEn: 'Grand Hall',
    durationHours: 2,
    gains: ['Clean Architecture'],
    gainsEn: ['Clean Architecture'],
    speakers: ['Eng. Tariq'],
    capacity: 40,
    points: 45,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');

  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  await client.processCheckIn(student.uid, event.id, token);

  const txId = `attendance_${event.id}_${student.uid}`;
  const txDoc = client.db.collection('point_transactions').doc(txId);
  const snap = await txDoc.get();

  assert.ok(snap.exists);
  const data = snap.data();
  assert.equal(data?.userId, student.uid);
  assert.equal(data?.amount, 45);
  assert.equal(data?.source, 'attendance');
  assert.equal(data?.sourceEventId, event.id);
  assert.ok(data?.createdAt instanceof Date);
});

test('Tier 1: Points & Activity - Student total points balance is atomically incremented across multiple events', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_pt3', displayName: 'Admin', email: 'org3@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_multi_event', displayName: 'Khaled', email: 'khaled@qu.edu.sa' });

  // Event 1: 30 points
  const event1 = await client.createEvent(admin.uid, {
    title: 'ورشة بايثون',
    titleEn: 'Python Workshop',
    description: '1',
    descriptionEn: '1',
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
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // Event 2: 50 points
  const event2 = await client.createEvent(admin.uid, {
    title: 'هاكاثون البرمجة',
    titleEn: 'Coding Hackathon',
    description: '2',
    descriptionEn: '2',
    type: 'Competition',
    date: new Date(),
    location: '2',
    locationEn: '2',
    durationHours: 6,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 50,
    points: 50,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // Check-in event 1
  await client.registerForEvent(student.uid, event1.id);
  await client.updateEventState(admin.uid, event1.id, 'Ongoing');
  const tok1 = await client.generateCheckInToken(admin.uid, event1.id);
  await client.processCheckIn(student.uid, event1.id, tok1.token);

  let user = await client.getUser(student.uid);
  assert.equal(user?.totalPoints, 30);

  // Check-in event 2
  await client.registerForEvent(student.uid, event2.id);
  await client.updateEventState(admin.uid, event2.id, 'Ongoing');
  const tok2 = await client.generateCheckInToken(admin.uid, event2.id);
  await client.processCheckIn(student.uid, event2.id, tok2.token);

  user = await client.getUser(student.uid);
  assert.equal(user?.totalPoints, 80);
});

test('Tier 1: Points & Activity - Activity feed reflects complete chronologically sorted history', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_pt4', displayName: 'Admin', email: 'org4@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_activity_feed', displayName: 'Samir', email: 'samir@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة تحليل البيانات',
    titleEn: 'Data Analysis Workshop',
    description: 'Pandas & NumPy',
    descriptionEn: 'Pandas & NumPy',
    type: 'Workshop',
    date: new Date(),
    location: 'معمل 4',
    locationEn: 'Lab 4',
    durationHours: 2,
    gains: ['Pandas'],
    gainsEn: ['Pandas'],
    speakers: ['Dr. Adel'],
    capacity: 20,
    points: 40,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  await client.processCheckIn(student.uid, event.id, token);

  const activity = await client.getUserActivity(student.uid);
  assert.equal(activity.registrations.length, 1);
  assert.equal(activity.attendance.length, 1);
  assert.equal(activity.transactions.length, 1);
  assert.equal(activity.totalPoints, 40);
  assert.equal(activity.registrations[0].eventTitle, 'ورشة تحليل البيانات');
  assert.equal(activity.transactions[0].amount, 40);
});

test('Tier 1: Points & Activity - Leaderboard accurately ranks students by total points descending', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_pt5', displayName: 'Admin', email: 'org5@qu.edu.sa', role: 'super_admin' });

  const s1 = await client.createUser({ uid: 'rank_s1', displayName: 'Rank One', email: 's1@qu.edu.sa' });
  const s2 = await client.createUser({ uid: 'rank_s2', displayName: 'Rank Two', email: 's2@qu.edu.sa' });
  const s3 = await client.createUser({ uid: 'rank_s3', displayName: 'Rank Three', email: 's3@qu.edu.sa' });

  // Award points manually
  await client.addManualPoints(admin.uid, s1.uid, 300, 'Distinction award');
  await client.addManualPoints(admin.uid, s2.uid, 200, 'Participation award');
  await client.addManualPoints(admin.uid, s3.uid, 100, 'Workshop award');

  const leaderboard = await client.getLeaderboard(10);
  assert.equal(leaderboard.length, 3);
  assert.equal(leaderboard[0].name, 'Rank One');
  assert.equal(leaderboard[0].points, 300);
  assert.equal(leaderboard[0].rank, 1);

  assert.equal(leaderboard[1].name, 'Rank Two');
  assert.equal(leaderboard[1].points, 200);
  assert.equal(leaderboard[1].rank, 2);

  assert.equal(leaderboard[2].name, 'Rank Three');
  assert.equal(leaderboard[2].points, 100);
  assert.equal(leaderboard[2].rank, 3);
});

test('Tier 1: Points & Activity - Leaderboard excludes students with zero points', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_pt6', displayName: 'Admin', email: 'org6@qu.edu.sa', role: 'super_admin' });

  const activeStudent = await client.createUser({ uid: 'std_active', displayName: 'Active Engineer', email: 'active@qu.edu.sa' });
  const inactiveStudent = await client.createUser({ uid: 'std_zero', displayName: 'Zero Points Student', email: 'zero@qu.edu.sa' });

  await client.addManualPoints(admin.uid, activeStudent.uid, 50, 'Attended workshop');

  const leaderboard = await client.getLeaderboard();
  const userIds = leaderboard.map(u => u.id);

  assert.ok(userIds.includes(activeStudent.uid));
  assert.ok(!userIds.includes(inactiveStudent.uid));
});
