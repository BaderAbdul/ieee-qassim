import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IEEEPlatformClient } from './engine/platform.ts';

const rootDir = join(import.meta.dirname, '..');

function readSource(relPath: string): string {
  return readFileSync(join(rootDir, relPath), 'utf-8');
}

// ============================================================================
// PART 1: CODE INTEGRITY VERIFICATION (FATAL BUG ELIMINATION)
// ============================================================================

test('E2E Integrity: QR Host uses deterministic attendance log doc ID matching Cloud Function', () => {
  const qrSource = readSource('src/app/[locale]/admin/events/[id]/qr/page.tsx');
  
  // Must NOT use random doc ID doc(collection(db, 'attendance_logs'))
  assert.equal(
    qrSource.includes("doc(collection(db, 'attendance_logs'))"),
    false,
    'FATAL BUG CHECK: QR page must NOT use auto-generated random doc ID for attendance logs'
  );

  // Must use deterministic ID `${eventId}_${userId}`
  assert.ok(
    qrSource.includes("doc(db, 'attendance_logs', `${eventId}_${userId}`)"),
    'QR page must create attendance log with deterministic document ID `${eventId}_${userId}`'
  );
});

test('E2E Integrity: QR Host updates registration status to "attended"', () => {
  const qrSource = readSource('src/app/[locale]/admin/events/[id]/qr/page.tsx');
  assert.ok(
    qrSource.includes("status: 'attended'"),
    'QR check-in must update registration status to "attended"'
  );
});

test('E2E Integrity: QR Host does not create unmanaged duplicate certificates', () => {
  const qrSource = readSource('src/app/[locale]/admin/events/[id]/qr/page.tsx');
  assert.equal(
    qrSource.includes("doc(collection(db, 'certificates'))"),
    false,
    'QR page must not create unmanaged duplicate certificates'
  );
});

// ============================================================================
// PART 2: COMPLETE 5-STAGE END-TO-END USER JOURNEY SIMULATION
// ============================================================================

test('E2E User Journey: Creation -> Registration -> Approval -> QR Check-in -> Certificate Generation', async () => {
  const client = new IEEEPlatformClient();

  // STAGE 1: Event Creation & Publishing
  const admin = await client.createUser({
    uid: 'admin_e2e',
    displayName: 'Eng. Bader',
    email: 'admin@ieeequ.org',
    role: 'super_admin'
  });

  const event = await client.createEvent(admin.uid, {
    title: 'معسكر الحوسبة السحابية وهندسة النظم',
    titleEn: 'Cloud Computing & Systems Engineering Bootcamp',
    description: 'معسكر تدريبي مكثف لطلاب كلية الهندسة والحاسب',
    descriptionEn: 'Intensive engineering bootcamp for students',
    type: 'Camp',
    date: new Date('2026-10-20T10:00:00Z'),
    location: 'بهو كلية الهندسة',
    locationEn: 'College of Engineering Lobby',
    durationHours: 8,
    capacity: 2, // Small capacity to test waitlist & approval
    points: 75,
    hasCertificate: true,
    registrationMode: 'Manual', // Test manual approval path
    state: 'Draft',
  });

  assert.equal(event.registeredCount, 0);

  // Publish and Open Registration
  await client.updateEventState(admin.uid, event.id, 'Registration Open');
  const openedDetails = await client.getEventDetails(event.id);
  assert.equal(openedDetails.event.state, 'Registration Open');

  // STAGE 2: Student Registration
  const student1 = await client.createUser({
    uid: 'std_e2e_1',
    displayName: 'سارة القحطاني',
    email: 'sara@qu.edu.sa',
    universityId: '441001234',
    role: 'student'
  });

  const student2 = await client.createUser({
    uid: 'std_e2e_2',
    displayName: 'خالد العنزي',
    email: 'khaled@qu.edu.sa',
    universityId: '441005678',
    role: 'student'
  });

  // Both register under Manual mode -> status: pending
  const reg1 = await client.registerForEvent(student1.uid, event.id);
  assert.equal(reg1.status, 'pending');

  const reg2 = await client.registerForEvent(student2.uid, event.id);
  assert.equal(reg2.status, 'pending');

  // Check event registration count
  const eventDetailsAfterRegs = await client.getEventDetails(event.id);
  assert.equal(eventDetailsAfterRegs.event.registeredCount, 2);

  // STAGE 3: Admin Approval
  await client.db.collection('registrations').doc(`${event.id}_${student1.uid}`).update({ status: 'approved' });
  await client.db.collection('registrations').doc(`${event.id}_${student2.uid}`).update({ status: 'approved' });

  const reg1Snap = await client.db.collection('registrations').doc(`${event.id}_${student1.uid}`).get();
  assert.equal(reg1Snap.data()?.status, 'approved');

  const reg2Snap = await client.db.collection('registrations').doc(`${event.id}_${student2.uid}`).get();
  assert.equal(reg2Snap.data()?.status, 'approved');

  // STAGE 4: Event Session (Ongoing) & QR Check-in
  await client.updateEventState(admin.uid, event.id, 'Ongoing');

  // Admin generates QR check-in token while Ongoing
  const { token } = await client.generateCheckInToken(admin.uid, event.id, 60);
  assert.ok(token);

  // Students scan and check in
  const checkIn1 = await client.processCheckIn(student1.uid, event.id, token);
  assert.equal(checkIn1.status, 'success');
  assert.equal(checkIn1.pointsAwarded, 75);

  const checkIn2 = await client.processCheckIn(student2.uid, event.id, token);
  assert.equal(checkIn2.status, 'success');
  assert.equal(checkIn2.pointsAwarded, 75);

  // Verify attendance logs exist with DETERMINISTIC ID `${eventId}_${userId}`
  const log1Snap = await client.db.collection('attendance_logs').doc(`${event.id}_${student1.uid}`).get();
  assert.ok(log1Snap.exists, 'Deterministic attendance log must exist for student 1');
  assert.equal(log1Snap.data()?.userId, student1.uid);
  assert.equal(log1Snap.data()?.eventId, event.id);

  const log2Snap = await client.db.collection('attendance_logs').doc(`${event.id}_${student2.uid}`).get();
  assert.ok(log2Snap.exists, 'Deterministic attendance log must exist for student 2');

  // Verify points were distributed to student accounts
  const updatedStudent1 = await client.getUser(student1.uid);
  assert.equal(updatedStudent1?.totalPoints, 75);

  // STAGE 5: Event Completion & Certificate Generation
  await client.updateEventState(admin.uid, event.id, 'Completed');

  // Issue certificates
  const issueResult = await client.issueCertificates(admin.uid, event.id, [student1.uid, student2.uid]);
  assert.equal(issueResult.queuedCount, 2);

  // Verify certificate record for student 1
  const certId1 = `certificate_${event.id}_${student1.uid}`;
  const cert1Snap = await client.db.collection('certificates').doc(certId1).get();
  assert.ok(cert1Snap.exists, 'Certificate record must exist');
  assert.equal(cert1Snap.data()?.userId, student1.uid);
  assert.equal(cert1Snap.data()?.eventId, event.id);

  // Finalize certificate artifact
  const generatedCert = await client.generateCertificateArtifact(certId1);
  assert.equal(generatedCert.status, 'Available');

  // Public verification of issued certificate
  const verification = await client.verifyCertificate(certId1);
  assert.equal(verification.valid, true);
  assert.equal(verification.studentName, student1.displayName);
  assert.equal(verification.eventTitle, event.title);
});
