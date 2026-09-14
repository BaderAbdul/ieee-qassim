import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 2: Certificate Boundaries - Duplicate certificate issuance is idempotent', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_cb7_1', displayName: 'Admin', email: 'cb7_1@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_cb7_1', displayName: 'Student', email: 's7@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة التحقق من الشهادة',
    titleEn: 'Certificate Idempotency Event',
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
    points: 20,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  await client.processCheckIn(student.uid, event.id, token);
  await client.updateEventState(admin.uid, event.id, 'Completed');

  // 1st issue call
  const firstIssue = await client.issueCertificates(admin.uid, event.id, [student.uid]);
  assert.equal(firstIssue.queuedCount, 1);

  // 2nd issue call - idempotent skip
  const secondIssue = await client.issueCertificates(admin.uid, event.id, [student.uid]);
  assert.equal(secondIssue.queuedCount, 0);
});

test('Tier 2: Certificate Boundaries - Unauthorized student cannot download another student certificate', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_cb7_2', displayName: 'Admin', email: 'cb7_2@qu.edu.sa', role: 'super_admin' });
  const legitimateOwner = await client.createUser({ uid: 'std_legit', displayName: 'Legitimate Owner', email: 'legit@qu.edu.sa' });
  const unauthorizedStudent = await client.createUser({ uid: 'std_snooper', displayName: 'Snooper', email: 'snoop@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية الشهادة الخاصة',
    titleEn: 'Private Certificate Event',
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
    points: 20,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(legitimateOwner.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  await client.processCheckIn(legitimateOwner.uid, event.id, token);
  await client.updateEventState(admin.uid, event.id, 'Completed');

  await client.issueCertificates(admin.uid, event.id, [legitimateOwner.uid]);
  const certId = `certificate_${event.id}_${legitimateOwner.uid}`;
  await client.generateCertificateArtifact(certId);

  // Snooper student attempts to download legitimate student's certificate
  await assert.rejects(
    async () => {
      await client.getCertificateDownloadUrl(unauthorizedStudent.uid, certId);
    },
    {
      message: 'You do not have permission to access this certificate.',
    }
  );
});

test('Tier 2: Certificate Boundaries - Download URL throws if certificate status is not Available', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_cb7_3', displayName: 'Admin', email: 'cb7_3@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_generating', displayName: 'Student', email: 'gen@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية قيد التوليد',
    titleEn: 'Generating Status Event',
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
    points: 20,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  await client.processCheckIn(student.uid, event.id, token);
  await client.updateEventState(admin.uid, event.id, 'Completed');

  // Issue cert, but do NOT call generateCertificateArtifact so status remains Generating
  await client.issueCertificates(admin.uid, event.id, [student.uid]);
  const certId = `certificate_${event.id}_${student.uid}`;

  await assert.rejects(
    async () => {
      await client.getCertificateDownloadUrl(student.uid, certId);
    },
    {
      message: 'Certificate is not available. Current status: Generating',
    }
  );
});

test('Tier 2: Certificate Boundaries - Revoked certificate blocks downloads and flags status as Revoked', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_cb7_4', displayName: 'Admin', email: 'cb7_4@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_revoked', displayName: 'Revoked Student', email: 'rev@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية إلغاء الشهادة',
    titleEn: 'Revocation Test Event',
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
    points: 20,
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

  // Revoke the certificate
  await client.revokeCertificate(admin.uid, certId, 'Academic integrity violation');

  // Verify download is blocked
  await assert.rejects(
    async () => {
      await client.getCertificateDownloadUrl(student.uid, certId);
    },
    {
      message: 'Certificate is not available. Current status: Revoked',
    }
  );

  // Verify public check returns invalid and Revoked
  const check = await client.verifyCertificate(certId);
  assert.equal(check.valid, false);
  assert.equal(check.status, 'Revoked');
});

test('Tier 2: Certificate Boundaries - Public verification of non-existent certificate returns Not Issued', async () => {
  const client = new IEEEPlatformClient();
  const check = await client.verifyCertificate('certificate_nonexistent_99999');

  assert.equal(check.valid, false);
  assert.equal(check.status, 'Not Issued');
});

test('Tier 2: Certificate Boundaries - Certificate issuance with nonexistent student returns queuedCount zero', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_cb7_5', displayName: 'Admin', email: 'cb7_5@qu.edu.sa', role: 'super_admin' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية مكتملة بدون حضور',
    titleEn: 'Completed Empty Event',
    description: '1',
    descriptionEn: '1',
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
    state: 'Completed',
    registrationMode: 'Auto',
  });

  const res = await client.issueCertificates(admin.uid, event.id, ['ghost_student_id_123']);
  assert.equal(res.status, 'success');
  assert.equal(res.queuedCount, 0);
});
