import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 1: Certificate Verification - Issue certificates creates deterministic record for attendee', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_c1', displayName: 'Admin', email: 'c1@qu.edu.sa', role: 'event_organizer' });
  const student = await client.createUser({ uid: 'std_c1', displayName: 'Hind Al-Otaibi', email: 'hind@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة الأمن السيبراني الدفاعي',
    titleEn: 'Defensive Cyber Security Workshop',
    description: 'تأمين الشبكات والأنظمة',
    descriptionEn: 'Network and system hardening',
    type: 'Workshop',
    date: new Date(),
    location: 'معمل الأمن',
    locationEn: 'Security Lab',
    durationHours: 4,
    gains: ['Firewalls'],
    gainsEn: ['Firewalls'],
    speakers: ['Dr. Khalid'],
    capacity: 25,
    points: 50,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  await client.processCheckIn(student.uid, event.id, token);

  // Event completed
  await client.updateEventState(admin.uid, event.id, 'Completed');

  // Issue certificate
  const result = await client.issueCertificates(admin.uid, event.id, [student.uid]);
  assert.equal(result.status, 'success');
  assert.equal(result.queuedCount, 1);

  const deterministicId = `certificate_${event.id}_${student.uid}`;
  const certSnap = await client.db.collection('certificates').doc(deterministicId).get();
  assert.ok(certSnap.exists);
  const data = certSnap.data();
  assert.equal(data?.id, deterministicId);
  assert.equal(data?.userId, student.uid);
  assert.equal(data?.eventId, event.id);
  assert.equal(data?.status, 'Generating');
});

test('Tier 1: Certificate Verification - Issue certificates rejected if event not completed', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_c2', displayName: 'Admin', email: 'c2@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_c2', displayName: 'Student', email: 'c2@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية جارية لم تنته',
    titleEn: 'Still Ongoing Event',
    description: 'لم تنته الفعالية بعد',
    descriptionEn: 'Event is still ongoing',
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

  await assert.rejects(
    async () => {
      await client.issueCertificates(admin.uid, event.id, [student.uid]);
    },
    {
      message: 'Certificates can only be issued for Completed events.',
    }
  );
});

test('Tier 1: Certificate Verification - Issue certificates skips unverified or non-attended students', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_c3', displayName: 'Admin', email: 'c3@qu.edu.sa', role: 'event_organizer' });
  const attendedStudent = await client.createUser({ uid: 'std_attended', displayName: 'Present Student', email: 'pres@qu.edu.sa' });
  const absentStudent = await client.createUser({ uid: 'std_absent', displayName: 'Absent Student', email: 'abs@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة التحقق من الحضور',
    titleEn: 'Attendance Check Workshop',
    description: 'شهادات للحاضرين فقط',
    descriptionEn: 'Certificates for attendees only',
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

  // Both register, only one attends
  await client.registerForEvent(attendedStudent.uid, event.id);
  await client.registerForEvent(absentStudent.uid, event.id);

  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  await client.processCheckIn(attendedStudent.uid, event.id, token);

  await client.updateEventState(admin.uid, event.id, 'Completed');

  // Attempt to issue to both
  const result = await client.issueCertificates(admin.uid, event.id, [attendedStudent.uid, absentStudent.uid]);
  assert.equal(result.queuedCount, 1);

  // Verify certificate exists for attended, does NOT exist for absent
  const attendedCert = await client.db.collection('certificates').doc(`certificate_${event.id}_${attendedStudent.uid}`).get();
  assert.ok(attendedCert.exists);

  const absentCert = await client.db.collection('certificates').doc(`certificate_${event.id}_${absentStudent.uid}`).get();
  assert.ok(!absentCert.exists);
});

test('Tier 1: Certificate Verification - Certificate generation transitions status to Available', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_c4', displayName: 'Admin', email: 'c4@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_c4', displayName: 'Rami', email: 'rami@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'دورة الإلكترونيات',
    titleEn: 'Electronics Course',
    description: 'دوائر متكاملة',
    descriptionEn: 'Integrated circuits',
    type: 'Camp',
    date: new Date(),
    location: 'معمل 2',
    locationEn: 'Lab 2',
    durationHours: 8,
    gains: ['PCB'],
    gainsEn: ['PCB'],
    speakers: ['Eng. Sami'],
    capacity: 20,
    points: 100,
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
  const generated = await client.generateCertificateArtifact(certId);

  assert.equal(generated.status, 'Available');
  assert.ok(generated.issueDate instanceof Date);
  assert.ok(generated.storagePath.endsWith('.pdf'));
  assert.ok(generated.verificationHash);
  assert.equal(generated.attemptCount, 1);
});

test('Tier 1: Certificate Verification - Authorized student retrieves signed download URL', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_c5', displayName: 'Admin', email: 'c5@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_c5', displayName: 'Dana', email: 'dana@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة الويب السحابي',
    titleEn: 'Cloud Web Workshop',
    description: 'نشر التطبيقات السحابية',
    descriptionEn: 'Deploying cloud applications',
    type: 'Workshop',
    date: new Date(),
    location: 'قاعة 3',
    locationEn: 'Hall 3',
    durationHours: 3,
    gains: ['Cloud'],
    gainsEn: ['Cloud'],
    speakers: ['Eng. Marwan'],
    capacity: 30,
    points: 50,
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

  // Student downloads their own certificate
  const downloadResult = await client.getCertificateDownloadUrl(student.uid, certId);
  assert.equal(downloadResult.status, 'success');
  assert.ok(downloadResult.url.startsWith('https://storage.googleapis.com'));
  assert.ok(downloadResult.url.includes(certId));
});

test('Tier 1: Certificate Verification - Public verification validates certificate by ID and hash', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_c6', displayName: 'Admin', email: 'c6@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_c6', displayName: 'Ibrahim Al-Harbi', email: 'ibrahim@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'مؤتمر هندسة المستقبل',
    titleEn: 'Future Engineering Conference',
    description: 'أوراق بحثية وتقنيات حديثة',
    descriptionEn: 'Research papers & modern tech',
    type: 'Lecture',
    date: new Date(),
    location: 'المدرج الرئيسي',
    locationEn: 'Main Amphitheater',
    durationHours: 4,
    gains: ['Research'],
    gainsEn: ['Research'],
    speakers: ['Keynote Speakers'],
    capacity: 100,
    points: 60,
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

  // Public verification endpoint
  const verification = await client.verifyCertificate(certId);
  assert.equal(verification.valid, true);
  assert.equal(verification.status, 'Available');
  assert.equal(verification.studentName, 'Ibrahim Al-Harbi');
  assert.equal(verification.eventTitle, 'مؤتمر هندسة المستقبل');
  assert.ok(verification.verificationHash);
  assert.equal(typeof verification.verificationHash, 'string');
});
