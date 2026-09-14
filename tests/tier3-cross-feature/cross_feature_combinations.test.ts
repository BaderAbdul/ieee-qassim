import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 3: Cross-Feature - Registration + Cancellation + Capacity restoration + Waitlist promotion', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_xf1', displayName: 'Admin', email: 'xf1@qu.edu.sa', role: 'super_admin' });
  const studentA = await client.createUser({ uid: 'std_xf1_a', displayName: 'Student A', email: 'sa@qu.edu.sa' });
  const studentB = await client.createUser({ uid: 'std_xf1_b', displayName: 'Student B', email: 'sb@qu.edu.sa' });

  // 1. Create event with capacity 1
  const event = await client.createEvent(admin.uid, {
    title: 'ورشة روبوتات المقعد الواحد',
    titleEn: 'Single Seat Robotics Workshop',
    description: 'مقعد واحد متاح فقط',
    descriptionEn: 'Only one seat available',
    type: 'Workshop',
    date: new Date(),
    location: 'معمل الروبوتات',
    locationEn: 'Robotics Lab',
    durationHours: 3,
    gains: ['Robotics'],
    gainsEn: ['Robotics'],
    speakers: ['Dr. Salman'],
    capacity: 1,
    points: 40,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // 2. Student A registers and gets approved
  const regA = await client.registerForEvent(studentA.uid, event.id);
  assert.equal(regA.status, 'approved');

  let details = await client.getEventDetails(event.id);
  assert.equal(details.attendeeCount, 1);
  assert.equal(details.isFull, true);
  assert.equal(details.availableSeats, 0);

  // 3. Student B attempts to register and gets waitlisted
  const regB = await client.registerForEvent(studentB.uid, event.id);
  assert.equal(regB.status, 'waitlisted');

  // 4. Student A cancels registration
  const cancelA = await client.cancelRegistration(studentA.uid, event.id);
  assert.equal(cancelA.status, 'cancelled');

  // Active registrations now contains Student B (waitlisted)
  details = await client.getEventDetails(event.id);
  assert.equal(details.attendeeCount, 1);
  assert.equal(details.userRegistrationStatus, null); // Unauthenticated query

  // 5. System promotes waitlisted Student B to approved
  const promoted = await client.promoteWaitlistedAttendee(event.id);
  assert.ok(promoted);
  assert.equal(promoted?.userId, studentB.uid);
  assert.equal(promoted?.status, 'approved');

  // Verify Student B registration is now approved
  const detailsB = await client.getEventDetails(event.id, studentB.uid);
  assert.equal(detailsB.userRegistrationStatus, 'approved');
  assert.equal(detailsB.attendeeCount, 1);
  assert.equal(detailsB.isFull, true);
});

test('Tier 3: Cross-Feature - Registration + Attendance + Points increment + Activity feed sync', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_xf2', displayName: 'Admin', email: 'xf2@qu.edu.sa', role: 'event_organizer' });
  const student = await client.createUser({ uid: 'std_xf2', displayName: 'Fahad Al-Harbi', email: 'fahad@qu.edu.sa', department: 'Computer Engineering' });

  // 1. Create event with 60 points
  const event = await client.createEvent(admin.uid, {
    title: 'معسكر تقنيات الحوسبة المتقدمة',
    titleEn: 'Advanced Computing Bootcamp',
    description: 'معسكر تقني مكثف',
    descriptionEn: 'Intensive tech bootcamp',
    type: 'Camp',
    date: new Date(),
    location: 'القاعة الكبرى',
    locationEn: 'Grand Auditorium',
    durationHours: 6,
    gains: ['Cloud', 'Containers'],
    gainsEn: ['Cloud', 'Containers'],
    speakers: ['Prof. Tariq'],
    capacity: 30,
    points: 60,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // 2. Student registers
  await client.registerForEvent(student.uid, event.id);

  // 3. Organizer starts event and generates QR check-in token
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);

  // 4. Student checks in
  const checkInRes = await client.processCheckIn(student.uid, event.id, token);
  assert.equal(checkInRes.status, 'success');
  assert.equal(checkInRes.pointsAwarded, 60);

  // 5. Verify User balance
  const user = await client.getUser(student.uid);
  assert.equal(user?.totalPoints, 60);

  // 6. Verify synchronized activity feed
  const activity = await client.getUserActivity(student.uid);
  assert.equal(activity.registrations.length, 1);
  assert.equal(activity.registrations[0].status, 'approved');
  assert.equal(activity.attendance.length, 1);
  assert.equal(activity.attendance[0].verifiedByQR, true);
  assert.equal(activity.transactions.length, 1);
  assert.equal(activity.transactions[0].amount, 60);
  assert.equal(activity.transactions[0].source, 'attendance');
});

test('Tier 3: Cross-Feature - Attendance + Certificate issuance + Signed download URL access', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_xf3', displayName: 'Admin', email: 'xf3@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_xf3', displayName: 'Reem Al-Shammari', email: 'reem@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة الذكاء الهندسي',
    titleEn: 'Engineering AI Workshop',
    description: '1',
    descriptionEn: '1',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 3,
    gains: ['AI'],
    gainsEn: ['AI'],
    speakers: ['Dr. Sarah'],
    capacity: 25,
    points: 40,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // Attend
  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  await client.processCheckIn(student.uid, event.id, token);

  // Complete & Issue
  await client.updateEventState(admin.uid, event.id, 'Completed');
  const issueResult = await client.issueCertificates(admin.uid, event.id, [student.uid]);
  assert.equal(issueResult.queuedCount, 1);

  const certId = `certificate_${event.id}_${student.uid}`;
  await client.generateCertificateArtifact(certId);

  // Student downloads certificate
  const download = await client.getCertificateDownloadUrl(student.uid, certId);
  assert.equal(download.status, 'success');
  assert.ok(download.url.includes(certId));

  // External verification
  const check = await client.verifyCertificate(certId);
  assert.equal(check.valid, true);
  assert.equal(check.studentName, 'Reem Al-Shammari');
  assert.equal(check.eventTitle, 'ورشة الذكاء الهندسي');
  assert.ok(check.verificationHash);
});

test('Tier 3: Cross-Feature - Attendance milestone progression awards tiered badges', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_xf4', displayName: 'Admin', email: 'xf4@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_milestone_badges', displayName: 'Ziyad', email: 'ziyad@qu.edu.sa' });

  // Student attends Event 1 -> Should unlock 'ieee_starter'
  const e1 = await client.createEvent(admin.uid, {
    title: 'فعالية 1',
    titleEn: 'E1',
    description: '1',
    descriptionEn: '1',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 20,
    points: 10,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });
  await client.registerForEvent(student.uid, e1.id);
  await client.updateEventState(admin.uid, e1.id, 'Ongoing');
  const t1 = await client.generateCheckInToken(admin.uid, e1.id);
  await client.processCheckIn(student.uid, e1.id, t1.token);

  let profile = await client.getUser(student.uid);
  assert.deepEqual(profile?.badges, ['ieee_starter']);

  // Student attends Events 2 and 3 -> Should unlock 'active_engineer'
  for (let i = 2; i <= 3; i++) {
    const ev = await client.createEvent(admin.uid, {
      title: `فعالية ${i}`,
      titleEn: `E${i}`,
      description: `${i}`,
      descriptionEn: `${i}`,
      type: 'Lecture',
      date: new Date(),
      location: '1',
      locationEn: '1',
      durationHours: 1,
      gains: [],
      gainsEn: [],
      speakers: [],
      capacity: 20,
      points: 10,
      hasCertificate: true,
      state: 'Registration Open',
      registrationMode: 'Auto',
    });
    await client.registerForEvent(student.uid, ev.id);
    await client.updateEventState(admin.uid, ev.id, 'Ongoing');
    const t = await client.generateCheckInToken(admin.uid, ev.id);
    await client.processCheckIn(student.uid, ev.id, t.token);
  }

  profile = await client.getUser(student.uid);
  assert.ok(profile?.badges.includes('ieee_starter'));
  assert.ok(profile?.badges.includes('active_engineer'));
  assert.equal(profile?.badges.length, 2);

  // Student attends Events 4 and 5 -> Should unlock 'tech_pioneer'
  for (let i = 4; i <= 5; i++) {
    const ev = await client.createEvent(admin.uid, {
      title: `فعالية ${i}`,
      titleEn: `E${i}`,
      description: `${i}`,
      descriptionEn: `${i}`,
      type: 'Lecture',
      date: new Date(),
      location: '1',
      locationEn: '1',
      durationHours: 1,
      gains: [],
      gainsEn: [],
      speakers: [],
      capacity: 20,
      points: 10,
      hasCertificate: true,
      state: 'Registration Open',
      registrationMode: 'Auto',
    });
    await client.registerForEvent(student.uid, ev.id);
    await client.updateEventState(admin.uid, ev.id, 'Ongoing');
    const t = await client.generateCheckInToken(admin.uid, ev.id);
    await client.processCheckIn(student.uid, ev.id, t.token);
  }

  profile = await client.getUser(student.uid);
  assert.ok(profile?.badges.includes('tech_pioneer'));
  assert.equal(profile?.badges.length, 3);
});

test('Tier 3: Cross-Feature - Points accumulation crosses 100 points -> Century Club badge and rank 1', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_xf5', displayName: 'Admin', email: 'xf5@qu.edu.sa', role: 'super_admin' });
  const competitorA = await client.createUser({ uid: 'competitor_a', displayName: 'Competitor A', email: 'a@qu.edu.sa' });
  const risingStar = await client.createUser({ uid: 'rising_star', displayName: 'Rising Star', email: 'star@qu.edu.sa' });

  // Competitor has 50 points
  await client.addManualPoints(admin.uid, competitorA.uid, 50, 'Baseline points');

  // Rising Star attends high value hackathon (120 points)
  const hackathon = await client.createEvent(admin.uid, {
    title: 'هاكاثون البرمجيات الوطني',
    titleEn: 'National Software Hackathon',
    description: '120 نقطة',
    descriptionEn: '120 points reward',
    type: 'Competition',
    date: new Date(),
    location: 'مركز المؤتمرات',
    locationEn: 'Convention Center',
    durationHours: 8,
    gains: ['Hackathon'],
    gainsEn: ['Hackathon'],
    speakers: ['Judges'],
    capacity: 50,
    points: 120,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(risingStar.uid, hackathon.id);
  await client.updateEventState(admin.uid, hackathon.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, hackathon.id);
  await client.processCheckIn(risingStar.uid, hackathon.id, token);

  // Verify badge awarded
  const user = await client.getUser(risingStar.uid);
  assert.ok(user?.badges.includes('century_club'));
  assert.equal(user?.totalPoints, 120);

  // Verify Leaderboard ranking
  const leaderboard = await client.getLeaderboard();
  assert.equal(leaderboard[0].id, risingStar.uid);
  assert.equal(leaderboard[0].rank, 1);
  assert.equal(leaderboard[0].points, 120);
  assert.ok(leaderboard[0].badges.includes('century_club'));

  assert.equal(leaderboard[1].id, competitorA.uid);
  assert.equal(leaderboard[1].rank, 2);
});

test('Tier 3: Cross-Feature - Manual attendance override on Completed event synchronizes points ledger', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_xf6', displayName: 'Admin', email: 'xf6@qu.edu.sa', role: 'event_organizer' });
  const student = await client.createUser({ uid: 'std_override', displayName: 'Override Student', email: 'ov@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة عمل هندسية',
    titleEn: 'Engineering Workshop',
    description: 'ورشة عمل',
    descriptionEn: 'Workshop',
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

  // Student registered, but had technical difficulty scanning QR before event completed
  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Completed');

  // Organizer applies manual override
  const overrideRes = await client.manualAttendanceOverride(admin.uid, student.uid, event.id);
  assert.equal(overrideRes.status, 'success');
  assert.equal(overrideRes.pointsAwarded, 40);

  const updatedStudent = await client.getUser(student.uid);
  assert.equal(updatedStudent?.totalPoints, 40);

  const activity = await client.getUserActivity(student.uid);
  assert.equal(activity.attendance.length, 1);
  assert.equal(activity.attendance[0].manualOverride, true);
  assert.equal(activity.attendance[0].overriddenBy, admin.uid);
  assert.equal(activity.transactions[0].source, 'attendance_override');
});

test('Tier 3: Cross-Feature - Certificate issuance + Academic revocation + Public verification invalidation', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_xf7', displayName: 'Super Admin', email: 'admin7@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_revocation_flow', displayName: 'Audited Student', email: 'audited@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة البرمجة المتقدمة',
    titleEn: 'Advanced Coding Workshop',
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

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  await client.processCheckIn(student.uid, event.id, token);
  await client.updateEventState(admin.uid, event.id, 'Completed');

  await client.issueCertificates(admin.uid, event.id, [student.uid]);
  const certId = `certificate_${event.id}_${student.uid}`;
  await client.generateCertificateArtifact(certId);

  // Initial verification is valid
  let check = await client.verifyCertificate(certId);
  assert.equal(check.valid, true);
  assert.equal(check.status, 'Available');

  // Revoke certificate
  await client.revokeCertificate(admin.uid, certId, 'Unverified attendance proxy');

  // Subsequent verification shows invalid & Revoked
  check = await client.verifyCertificate(certId);
  assert.equal(check.valid, false);
  assert.equal(check.status, 'Revoked');

  // Student download is forbidden
  await assert.rejects(
    async () => {
      await client.getCertificateDownloadUrl(student.uid, certId);
    },
    {
      message: 'Certificate is not available. Current status: Revoked',
    }
  );
});

test('Tier 3: Cross-Feature - Multi-role permission isolation across operations', async () => {
  const client = new IEEEPlatformClient();
  const student = await client.createUser({ uid: 'std_role_iso', displayName: 'Student Actor', email: 'student@qu.edu.sa', role: 'student' });
  const organizer = await client.createUser({ uid: 'org_role_iso', displayName: 'Organizer Actor', email: 'organizer@qu.edu.sa', role: 'event_organizer' });
  const superAdmin = await client.createUser({ uid: 'admin_role_iso', displayName: 'Super Admin Actor', email: 'super@qu.edu.sa', role: 'super_admin' });

  // 1. Student attempts to create event -> fails
  await assert.rejects(
    async () => {
      await client.createEvent(student.uid, {
        title: 'غير مصرح',
        titleEn: 'Unauthorized',
        description: '',
        descriptionEn: '',
        type: 'Workshop',
        date: new Date(),
        location: '',
        locationEn: '',
        durationHours: 1,
        gains: [],
        gainsEn: [],
        speakers: [],
        capacity: 10,
        points: 10,
        hasCertificate: false,
        state: 'Published',
        registrationMode: 'Auto',
      });
    },
    {
      message: 'Permission denied: Only organizers or super admins can create events.',
    }
  );

  // 2. Organizer creates event -> succeeds
  const event = await client.createEvent(organizer.uid, {
    title: 'فعالية المنظم',
    titleEn: 'Organizer Event',
    description: '',
    descriptionEn: '',
    type: 'Workshop',
    date: new Date(),
    location: '',
    locationEn: '',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 10,
    points: 10,
    hasCertificate: true,
    state: 'Published',
    registrationMode: 'Auto',
  });
  assert.ok(event.id);

  // 3. Organizer attempts to add manual points without super_admin -> fails
  await assert.rejects(
    async () => {
      await client.addManualPoints(organizer.uid, student.uid, 50, 'Organizer manual bonus');
    },
    {
      message: 'Permission denied: Only Super Admins can add manual points.',
    }
  );

  // 4. Super Admin can add manual points -> succeeds
  const addRes = await client.addManualPoints(superAdmin.uid, student.uid, 50, 'Super admin authorized bonus');
  assert.equal(addRes.status, 'success');
  assert.equal(addRes.newTotal, 50);
});
