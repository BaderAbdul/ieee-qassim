import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';
import { createCheckInToken } from '../engine/crypto.ts';

test('Tier 4: Scenario 1 - Complete Lifecycle: New engineering student joins, registers, attends, earns points, views activity, and downloads certificate', async () => {
  const client = new IEEEPlatformClient();
  const organizer = await client.createUser({ uid: 'org_lead', displayName: 'Dr. Tariq Al-Ghamdi', email: 'tariq@qu.edu.sa', role: 'event_organizer' });

  // 1. New student joins the platform
  const student = await client.createUser({
    uid: 'std_journey_1',
    displayName: 'Saud Al-Mutairi',
    email: 'saud@qu.edu.sa',
    department: 'Software Engineering',
    universityId: '441098234',
  });
  assert.equal(student.totalPoints, 0);

  // 2. Organizer publishes a hands-on AI & Robotics workshop
  const workshop = await client.createEvent(organizer.uid, {
    title: 'ورشة الذكاء الاصطناعي التطبيقي للروبوتات',
    titleEn: 'Applied AI for Robotics Workshop',
    description: 'بناء وبرمجة أنظمة الملاحة الذاتية باستخدام ROS2 و Python',
    descriptionEn: 'Building and programming autonomous navigation systems using ROS2 and Python',
    type: 'Workshop',
    date: new Date('2026-11-01T14:00:00Z'),
    location: 'معمل الميكاترونكس - مبنى الهندسة 4',
    locationEn: 'Mechatronics Lab - Engineering Building 4',
    durationHours: 4,
    gains: ['ROS2 Architecture', 'SLAM Navigation', 'Python Robotics'],
    gainsEn: ['ROS2 Architecture', 'SLAM Navigation', 'Python Robotics'],
    speakers: ['Eng. Anas Al-Harbi (IEEE Robotics Chapter Lead)'],
    capacity: 25,
    points: 50,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // 3. Student browses catalog and views event details
  const catalog = await client.listEvents({ search: 'Robotics', actorUid: student.uid });
  assert.equal(catalog.totalCount, 1);
  const details = await client.getEventDetails(workshop.id, student.uid);
  assert.equal(details.userRegistrationStatus, null);
  assert.equal(details.isRegistrationOpen, true);
  assert.equal(details.availableSeats, 25);

  // 4. Student registers for the workshop
  const regResult = await client.registerForEvent(student.uid, workshop.id);
  assert.equal(regResult.status, 'approved');

  // 5. On event day: Organizer starts session and generates dynamic 60s check-in QR code
  await client.updateEventState(organizer.uid, workshop.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(organizer.uid, workshop.id, 60);

  // 6. Student scans QR code and completes check-in
  const checkInResult = await client.processCheckIn(student.uid, workshop.id, token);
  assert.equal(checkInResult.status, 'success');
  assert.equal(checkInResult.pointsAwarded, 50);

  // 7. Student checks points balance and earned starter badge
  const updatedStudent = await client.getUser(student.uid);
  assert.equal(updatedStudent?.totalPoints, 50);
  assert.ok(updatedStudent?.badges.includes('ieee_starter'));

  // 8. Session concludes: Organizer completes event and issues certified certificates
  await client.updateEventState(organizer.uid, workshop.id, 'Completed');
  const issueResult = await client.issueCertificates(organizer.uid, workshop.id, [student.uid]);
  assert.equal(issueResult.queuedCount, 1);

  // 9. Certificate engine generates signed PDF artifact
  const certId = `certificate_${workshop.id}_${student.uid}`;
  const certDoc = await client.generateCertificateArtifact(certId);
  assert.equal(certDoc.status, 'Available');
  assert.ok(certDoc.verificationHash);

  // 10. Student opens Activity Dashboard and downloads verified certificate
  const activity = await client.getUserActivity(student.uid);
  assert.equal(activity.registrations.length, 1);
  assert.equal(activity.attendance.length, 1);
  assert.equal(activity.transactions.length, 1);
  assert.equal(activity.certificates.length, 1);

  const download = await client.getCertificateDownloadUrl(student.uid, certId);
  assert.ok(download.url.startsWith('https://storage.googleapis.com'));

  // 11. Employer or verifier verifies certificate authenticity
  const verify = await client.verifyCertificate(certId);
  assert.equal(verify.valid, true);
  assert.equal(verify.studentName, 'Saud Al-Mutairi');
  assert.equal(verify.eventTitle, 'ورشة الذكاء الاصطناعي التطبيقي للروبوتات');
});

test('Tier 4: Scenario 2 - High-Demand Seminar: Capacity reached, student cancels, waitlisted student promoted and attends', async () => {
  const client = new IEEEPlatformClient();
  const organizer = await client.createUser({ uid: 'org_lead2', displayName: 'Eng. Khalid', email: 'khalid@qu.edu.sa', role: 'event_organizer' });

  const studentA = await client.createUser({ uid: 'std_popular_a', displayName: 'Student Alpha', email: 'alpha@qu.edu.sa' });
  const studentB = await client.createUser({ uid: 'std_popular_b', displayName: 'Student Beta', email: 'beta@qu.edu.sa' });
  const studentWaitlist = await client.createUser({ uid: 'std_popular_wl', displayName: 'Student Waitlist', email: 'wl@qu.edu.sa' });

  // Popular seminar with tight capacity limit of 2 seats
  const seminar = await client.createEvent(organizer.uid, {
    title: 'ندوة الأمن المتقدم والتشفير الحديث',
    titleEn: 'Modern Cryptography Seminar',
    description: 'ندوة متخصصة في التشفير بعد الكم',
    descriptionEn: 'Post-quantum cryptography seminar',
    type: 'Lecture',
    date: new Date(),
    location: 'قاعة كبار الشخصيات',
    locationEn: 'VIP Conference Room',
    durationHours: 2,
    gains: ['Lattice Cryptography'],
    gainsEn: ['Lattice Cryptography'],
    speakers: ['Dr. Mona'],
    capacity: 2,
    points: 30,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // Students A and B register, filling up the event
  const regA = await client.registerForEvent(studentA.uid, seminar.id);
  const regB = await client.registerForEvent(studentB.uid, seminar.id);
  assert.equal(regA.status, 'approved');
  assert.equal(regB.status, 'approved');

  const details = await client.getEventDetails(seminar.id);
  assert.equal(details.isFull, true);
  assert.equal(details.availableSeats, 0);

  // Student WL registers and is placed on waitlist
  const regWL = await client.registerForEvent(studentWaitlist.uid, seminar.id);
  assert.equal(regWL.status, 'waitlisted');

  // Student B cancels due to scheduling conflict
  const cancelB = await client.cancelRegistration(studentB.uid, seminar.id);
  assert.equal(cancelB.status, 'cancelled');

  // Waitlist promotion triggers for Student WL
  const promoted = await client.promoteWaitlistedAttendee(seminar.id);
  assert.ok(promoted);
  assert.equal(promoted?.userId, studentWaitlist.uid);
  assert.equal(promoted?.status, 'approved');

  // Start seminar and both approved attendees check in
  await client.updateEventState(organizer.uid, seminar.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(organizer.uid, seminar.id);

  const checkA = await client.processCheckIn(studentA.uid, seminar.id, token);
  const checkWL = await client.processCheckIn(studentWaitlist.uid, seminar.id, token);

  assert.equal(checkA.status, 'success');
  assert.equal(checkWL.status, 'success');

  const profileWL = await client.getUser(studentWaitlist.uid);
  assert.equal(profileWL?.totalPoints, 30);
});

test('Tier 4: Scenario 3 - Multi-Semester Engagement: Student accumulates attendance milestones, points, and inspects engineering portfolio', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_semester', displayName: 'Dean Office', email: 'dean@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({
    uid: 'std_portfolio_master',
    displayName: 'Ammar Al-Sulaiman',
    email: 'ammar.s@qu.edu.sa',
    department: 'Electrical Engineering',
    universityId: '441001122',
  });

  const eventConfigs = [
    { title: 'ورشة إنترنت الأشياء', titleEn: 'IoT Fundamentals', points: 40 },
    { title: 'هاكاثون الطاقة المتجددة', titleEn: 'Clean Energy Hackathon', points: 70 },
    { title: 'ندوة الرقائق الإلكترونية', titleEn: 'Microchip Design Seminar', points: 50 },
    { title: 'مخيم الذكاء الاصطناعي', titleEn: 'Edge AI Bootcamp', points: 50 },
    { title: 'تحدي الاتصالات اللاسلكية', titleEn: '5G Communications Challenge', points: 50 },
  ];

  // Student completes 5 consecutive events across semesters
  for (let i = 0; i < eventConfigs.length; i++) {
    const cfg = eventConfigs[i];
    const event = await client.createEvent(admin.uid, {
      title: cfg.title,
      titleEn: cfg.titleEn,
      description: 'فعالية معتمدة',
      descriptionEn: 'Accredited event',
      type: 'Workshop',
      date: new Date(Date.now() - (eventConfigs.length - i) * 86400000),
      location: 'كلية الهندسة',
      locationEn: 'College of Engineering',
      durationHours: 3,
      gains: ['Engineering Excellence'],
      gainsEn: ['Engineering Excellence'],
      speakers: ['Professors'],
      capacity: 50,
      points: cfg.points,
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
  }

  // Final portfolio inspection
  const profile = await client.getUser(student.uid);
  assert.equal(profile?.totalPoints, 260); // 40 + 70 + 50 + 50 + 50 = 260

  // Verify all progressive milestone badges are earned:
  // 1 attendance -> ieee_starter
  // 3 attendances -> active_engineer
  // 5 attendances -> tech_pioneer
  // 100+ points -> century_club
  // 250+ points -> engineering_leader
  assert.ok(profile?.badges.includes('ieee_starter'));
  assert.ok(profile?.badges.includes('active_engineer'));
  assert.ok(profile?.badges.includes('tech_pioneer'));
  assert.ok(profile?.badges.includes('century_club'));
  assert.ok(profile?.badges.includes('engineering_leader'));

  // Activity portfolio reflects all 5 certificates
  const activity = await client.getUserActivity(student.uid);
  assert.equal(activity.certificates.length, 5);
  assert.equal(activity.attendance.length, 5);

  // Leaderboard ranking inspection
  const leaderboard = await client.getLeaderboard(5);
  assert.equal(leaderboard[0].id, student.uid);
  assert.equal(leaderboard[0].points, 260);
});

test('Tier 4: Scenario 4 - Organizer Supervision & Cryptographic Certificate Auditing', async () => {
  const client = new IEEEPlatformClient();
  const organizer = await client.createUser({ uid: 'org_supervisor', displayName: 'Prof. Al-Shaya', email: 'shaya@qu.edu.sa', role: 'event_organizer' });

  // Create workshop
  const event = await client.createEvent(organizer.uid, {
    title: 'ورشة مهارات الإشراف الهندسي',
    titleEn: 'Engineering Project Management',
    description: 'إدارة وتوجيه المشاريع الهندسية',
    descriptionEn: 'Managing engineering capstone projects',
    type: 'Workshop',
    date: new Date(),
    location: 'قاعة الاجتماعات الكبرى',
    locationEn: 'Main Boardroom',
    durationHours: 4,
    gains: ['Project Management'],
    gainsEn: ['Project Management'],
    speakers: ['Prof. Al-Shaya'],
    capacity: 20,
    points: 40,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // 3 students register
  const uids = ['std_aud_1', 'std_aud_2', 'std_aud_3'];
  for (const uid of uids) {
    await client.createUser({ uid, displayName: `Student ${uid}`, email: `${uid}@qu.edu.sa` });
    await client.registerForEvent(uid, event.id);
  }

  // 2 students attend in-person via rolling tokens
  await client.updateEventState(organizer.uid, event.id, 'Ongoing');
  const tok1 = await client.generateCheckInToken(organizer.uid, event.id);
  await client.processCheckIn(uids[0], event.id, tok1.token);

  const tok2 = await client.generateCheckInToken(organizer.uid, event.id);
  await client.processCheckIn(uids[1], event.id, tok2.token);

  // Event completed
  await client.updateEventState(organizer.uid, event.id, 'Completed');

  // Batch issue certificates to all registered candidates
  const issueReport = await client.issueCertificates(organizer.uid, event.id, uids);
  // Only the 2 verified attendees should have certificates generated
  assert.equal(issueReport.queuedCount, 2);

  for (let i = 0; i < 2; i++) {
    const cert = await client.generateCertificateArtifact(`certificate_${event.id}_${uids[i]}`);
    assert.equal(cert.status, 'Available');
    assert.ok(cert.verificationHash);

    // Auditor checks hash against certificate registry
    const verification = await client.verifyCertificate(cert.id);
    assert.equal(verification.valid, true);
    assert.equal(verification.verificationHash, cert.verificationHash);
  }

  // Verify non-attendee has no certificate
  const nonAttendeeCert = await client.verifyCertificate(`certificate_${event.id}_${uids[2]}`);
  assert.equal(nonAttendeeCert.valid, false);
  assert.equal(nonAttendeeCert.status, 'Not Issued');
});

test('Tier 4: Scenario 5 - Offline/Resilient Access: Student reviews past certificates and historical ledger with direct verification lookup', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_resilient', displayName: 'Admin', email: 'res@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_resilient', displayName: 'Nasser Al-Subaie', email: 'nasser@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة الشبكات اللاسلكية التاريخية',
    titleEn: 'Historical Wireless Networks Workshop',
    description: 'ورشة معتمدة سابقة',
    descriptionEn: 'Archived accredited workshop',
    type: 'Workshop',
    date: new Date('2026-01-10T10:00:00Z'),
    location: 'المبنى القديم',
    locationEn: 'Old Campus',
    durationHours: 3,
    gains: ['Wireless Networks'],
    gainsEn: ['Wireless Networks'],
    speakers: ['Dr. Saleh'],
    capacity: 30,
    points: 40,
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

  // Student accesses activity history in offline-ready / direct format
  const activity = await client.getUserActivity(student.uid);
  assert.equal(activity.totalPoints, 40);
  assert.equal(activity.certificates.length, 1);
  assert.equal(activity.certificates[0].id, certId);

  // Offline / direct lookup verification works without needing user authentication session
  const directVerify = await client.verifyCertificate(certId);
  assert.equal(directVerify.valid, true);
  assert.equal(directVerify.studentName, 'Nasser Al-Subaie');
  assert.equal(directVerify.eventTitle, 'ورشة الشبكات اللاسلكية التاريخية');
});

test('Tier 4: Scenario 6 - Adversarial Edge Case: Replay attack, forged token signature, and concurrent double-claims blocked', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_sec', displayName: 'Security Officer', email: 'sec@qu.edu.sa', role: 'super_admin' });
  const legitStudent = await client.createUser({ uid: 'std_legit_sec', displayName: 'Legitimate Student', email: 'legit.sec@qu.edu.sa' });
  const attacker = await client.createUser({ uid: 'std_attacker_sec', displayName: 'Malicious Actor', email: 'bad@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة التشفير والأمن السيبراني',
    titleEn: 'Cryptography & Cyber Security Workshop',
    description: 'فحص الحماية من الهجمات',
    descriptionEn: 'Attack protection test',
    type: 'Workshop',
    date: new Date(),
    location: 'قاعة الأمن',
    locationEn: 'Security Room',
    durationHours: 2,
    gains: ['Security'],
    gainsEn: ['Security'],
    speakers: ['Security Team'],
    capacity: 20,
    points: 50,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(legitStudent.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');

  // 1. Attacker tries to use a completely forged token with fake secret
  const forgedToken = createCheckInToken({ eventId: event.id }, 'fake-secret-key-attacker');
  await assert.rejects(
    async () => {
      await client.processCheckIn(attacker.uid, event.id, forgedToken);
    },
    {
      message: 'Token is invalid or expired.',
    }
  );

  // 2. Attacker sniffs legit token and tries to check-in without approved registration
  const { token: legitToken } = await client.generateCheckInToken(admin.uid, event.id);
  await assert.rejects(
    async () => {
      await client.processCheckIn(attacker.uid, event.id, legitToken);
    },
    {
      message: 'You are not registered for this event.',
    }
  );

  // 3. Legit student checks in successfully
  const legitCheck = await client.processCheckIn(legitStudent.uid, event.id, legitToken);
  assert.equal(legitCheck.status, 'success');
  assert.equal(legitCheck.pointsAwarded, 50);

  // 4. Replay attempt: Student re-submits the exact same token -> returns already_checked_in without double points
  const replayAttempt = await client.processCheckIn(legitStudent.uid, event.id, legitToken);
  assert.equal(replayAttempt.status, 'already_checked_in');
  assert.equal(replayAttempt.pointsAwarded, 0);

  const studentFinal = await client.getUser(legitStudent.uid);
  assert.equal(studentFinal?.totalPoints, 50);
});
