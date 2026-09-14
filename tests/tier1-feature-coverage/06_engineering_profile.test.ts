import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 1: Engineering Profile - Displays academic details, university ID, and total points', async () => {
  const client = new IEEEPlatformClient();
  const student = await client.createUser({
    uid: 'prof_std_1',
    displayName: 'Eng. Youssef Al-Qasim',
    email: 'youssef@qu.edu.sa',
    department: 'Electrical Engineering',
    universityId: '441029384',
  });

  const profile = await client.getUser(student.uid);
  assert.ok(profile);
  assert.equal(profile.displayName, 'Eng. Youssef Al-Qasim');
  assert.equal(profile.email, 'youssef@qu.edu.sa');
  assert.equal(profile.department, 'Electrical Engineering');
  assert.equal(profile.universityId, '441029384');
  assert.equal(profile.totalPoints, 0);
  assert.deepEqual(profile.badges, []);
});

test('Tier 1: Engineering Profile - Badge milestone IEEE Starter awarded upon 1st attendance', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_p1', displayName: 'Admin', email: 'p1@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_badge_1', displayName: 'Bader', email: 'bader@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة المبتدئين',
    titleEn: 'Beginner Workshop',
    description: 'الورشة الأولى',
    descriptionEn: 'First Workshop',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 2,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 20,
    points: 25,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  await client.processCheckIn(student.uid, event.id, token);

  const updatedProfile = await client.getUser(student.uid);
  assert.ok(updatedProfile?.badges.includes('ieee_starter'));
  assert.equal(updatedProfile?.badges.length, 1);
});

test('Tier 1: Engineering Profile - Badge milestone Active Engineer awarded upon 3 attendances', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_p2', displayName: 'Admin', email: 'p2@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_badge_3', displayName: 'Ghada', email: 'ghada@qu.edu.sa' });

  for (let i = 1; i <= 3; i++) {
    const event = await client.createEvent(admin.uid, {
      title: `ورشة رقم ${i}`,
      titleEn: `Workshop ${i}`,
      description: `W ${i}`,
      descriptionEn: `W ${i}`,
      type: 'Workshop',
      date: new Date(),
      location: 'Lab',
      locationEn: 'Lab',
      durationHours: 1,
      gains: [],
      gainsEn: [],
      speakers: [],
      capacity: 30,
      points: 20,
      hasCertificate: true,
      state: 'Registration Open',
      registrationMode: 'Auto',
    });

    await client.registerForEvent(student.uid, event.id);
    await client.updateEventState(admin.uid, event.id, 'Ongoing');
    const { token } = await client.generateCheckInToken(admin.uid, event.id);
    await client.processCheckIn(student.uid, event.id, token);
  }

  const updatedProfile = await client.getUser(student.uid);
  assert.ok(updatedProfile?.badges.includes('ieee_starter'));
  assert.ok(updatedProfile?.badges.includes('active_engineer'));
});

test('Tier 1: Engineering Profile - Badge milestone Tech Pioneer awarded upon 5 attendances', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_p3', displayName: 'Admin', email: 'p3@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_badge_5', displayName: 'Mansour', email: 'mansour@qu.edu.sa' });

  for (let i = 1; i <= 5; i++) {
    const event = await client.createEvent(admin.uid, {
      title: `ندوة رقم ${i}`,
      titleEn: `Seminar ${i}`,
      description: `S ${i}`,
      descriptionEn: `S ${i}`,
      type: 'Lecture',
      date: new Date(),
      location: 'Hall',
      locationEn: 'Hall',
      durationHours: 1,
      gains: [],
      gainsEn: [],
      speakers: [],
      capacity: 30,
      points: 15,
      hasCertificate: true,
      state: 'Registration Open',
      registrationMode: 'Auto',
    });

    await client.registerForEvent(student.uid, event.id);
    await client.updateEventState(admin.uid, event.id, 'Ongoing');
    const { token } = await client.generateCheckInToken(admin.uid, event.id);
    await client.processCheckIn(student.uid, event.id, token);
  }

  const updatedProfile = await client.getUser(student.uid);
  assert.ok(updatedProfile?.badges.includes('ieee_starter'));
  assert.ok(updatedProfile?.badges.includes('active_engineer'));
  assert.ok(updatedProfile?.badges.includes('tech_pioneer'));
});

test('Tier 1: Engineering Profile - Accumulated portfolio stats aggregate events, points, and certificates', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_p4', displayName: 'Admin', email: 'p4@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_stats', displayName: 'Fatima', email: 'fatima@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'معسكر الروبوتات',
    titleEn: 'Robotics Bootcamp',
    description: 'معسكر برمجة الروبوتات',
    descriptionEn: 'Robot programming bootcamp',
    type: 'Camp',
    date: new Date(),
    location: 'معمل الروبوت',
    locationEn: 'Robotics Lab',
    durationHours: 6,
    gains: ['Robotics'],
    gainsEn: ['Robotics'],
    speakers: ['Dr. Ali'],
    capacity: 25,
    points: 80,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  await client.processCheckIn(student.uid, event.id, token);

  await client.updateEventState(admin.uid, event.id, 'Completed');
  await client.issueCertificates(admin.uid, event.id, [student.uid]);
  await client.generateCertificateArtifact(`certificate_${event.id}_${student.uid}`);

  const activity = await client.getUserActivity(student.uid);
  assert.equal(activity.registrations.length, 1);
  assert.equal(activity.attendance.length, 1);
  assert.equal(activity.certificates.length, 1);
  assert.equal(activity.totalPoints, 80);
});

test('Tier 1: Engineering Profile - Public profile view redacts confidential email and university ID', async () => {
  const client = new IEEEPlatformClient();
  const student = await client.createUser({
    uid: 'std_privacy_check',
    displayName: 'Ammar',
    email: 'ammar.confidential@qu.edu.sa',
    department: 'Civil Engineering',
    universityId: '442009123',
  });

  const publicProfile = await client.getPublicProfile(student.uid);
  assert.ok(publicProfile);
  assert.equal(publicProfile.displayName, 'Ammar');
  assert.equal(publicProfile.department, 'Civil Engineering');
  assert.equal(publicProfile.totalPoints, 0);

  // Assert sensitive fields are completely omitted per security rules
  const rawRecord = publicProfile as unknown as Record<string, unknown>;
  assert.equal(rawRecord.email, undefined);
  assert.equal(rawRecord.universityId, undefined);
});
