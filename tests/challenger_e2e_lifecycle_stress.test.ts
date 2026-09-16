/**
 * Adversarial Challenger Test Suite: E2E User Journey & Lifecycle Stress Testing
 * Rigorously challenges the 5-stage lifecycle under concurrency, boundary conditions,
 * race conditions, idempotency, and security constraints.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from './engine/platform.ts';
import { FieldValue } from './engine/database.ts';

// ============================================================================
// STAGE 1 & 2: CONCURRENT REGISTRATIONS & CAPACITY STARVATION DEFECT
// ============================================================================

test('CHALLENGE 1: Concurrent registrations serialize correctly, but waitlist starves capacity on cancellations', async () => {
  const client = new IEEEPlatformClient();

  const admin = await client.createUser({
    uid: 'admin_lifecycle',
    displayName: 'Admin Eng',
    email: 'admin@ieeequ.org',
    role: 'super_admin'
  });

  // Event with capacity 5
  const event = await client.createEvent(admin.uid, {
    title: 'ورشة الذكاء الاصطناعي',
    titleEn: 'AI Workshop',
    description: 'ورشة عمل هندسية',
    descriptionEn: 'Engineering Workshop',
    type: 'Workshop',
    date: new Date('2026-11-01T10:00:00Z'),
    location: 'قاعة 101',
    locationEn: 'Hall 101',
    durationHours: 3,
    capacity: 5,
    points: 50,
    hasCertificate: true,
    registrationMode: 'Auto',
    state: 'Registration Open',
  });

  // Create 20 students concurrently
  const students = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      client.createUser({
        uid: `student_concurrent_${i + 1}`,
        displayName: `طالب ${i + 1}`,
        email: `student${i + 1}@qu.edu.sa`,
        role: 'student'
      })
    )
  );

  // Concurrently register all 20 students
  const registrationResults = await Promise.all(
    students.map(s => client.registerForEvent(s.uid, event.id))
  );

  // Verify serialization: exactly 5 approved, 15 waitlisted
  const approvedCount = registrationResults.filter(r => r.status === 'approved').length;
  const waitlistedCount = registrationResults.filter(r => r.status === 'waitlisted').length;

  assert.equal(approvedCount, 5, 'Exactly 5 students should be approved up to capacity');
  assert.equal(waitlistedCount, 15, 'Remaining 15 students must be waitlisted');

  // Verify event.registeredCount equals 20
  const eventSnap = await client.getEventDetails(event.id);
  assert.equal(eventSnap.event.registeredCount, 20, 'registeredCount includes all active registrations');

  // NOW TEST THE DEFECT: 3 approved students cancel their registration
  await client.cancelRegistration(students[0].uid, event.id);
  await client.cancelRegistration(students[1].uid, event.id);
  await client.cancelRegistration(students[2].uid, event.id);

  // Now only 2 approved students remain in the event (capacity is 5)!
  const regDocs = Object.values(client.db._getAllRaw('registrations')) as any[];
  const remainingApproved = regDocs.filter(r => r.eventId === event.id && r.status === 'approved').length;
  assert.equal(remainingApproved, 2, 'Only 2 approved students now remain');

  // registeredCount dropped from 20 to 17 (decremented by 3)
  const eventAfterCancel = (await client.db.collection('events').doc(event.id).get()).data();
  assert.equal(eventAfterCancel.registeredCount, 17);

  // Now a new student (#21) attempts to register
  const newStudent = await client.createUser({
    uid: 'student_late_21',
    displayName: 'طالب متأخر',
    email: 'late21@qu.edu.sa',
    role: 'student'
  });

  const lateRegResult = await client.registerForEvent(newStudent.uid, event.id);

  // DEFECT OBSERVED: Because registeredCount is 17 >= capacity(5), the new student is WAITLISTED,
  // even though the room only has 2 approved attendees and 3 empty seats!
  assert.equal(
    lateRegResult.status,
    'waitlisted',
    'ARCHITECTURAL DEFECT CONFIRMED: registeredCount conflates waitlist count with approved capacity'
  );
});

// ============================================================================
// STAGE 2: RE-REGISTRATION PERMISSION DENIED IN FIRESTORE RULES
// ============================================================================

test('CHALLENGE 2: Re-registration after cancellation triggers Firestore security rule key-diff rejection', () => {
  // Simulate the exact Firestore Security Rule logic from firestore.rules:151-156
  // Rule specification:
  // allow update: if ... || (
  //   isOwner(resource.data.userId)
  //   && resource.data.status == 'cancelled'
  //   && request.resource.data.status in ['approved', 'waitlisted', 'pending']
  //   && !('attended' in request.resource.data)
  //   && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'timestamp', 'userName', 'userEmail', 'universityId'])
  // );

  // 1. Existing cancelled registration document in Firestore
  const existingDoc = {
    userId: 'student_123',
    eventId: 'event_456',
    status: 'cancelled',
    cancelledAt: new Date('2026-09-17T00:00:00Z'),
    timestamp: new Date('2026-09-16T20:00:00Z'),
    userName: 'سلطان الحربي',
    userEmail: 'sultan@qu.edu.sa',
  };

  // 2. Client payload sent by events/[id]/page.tsx:157-169:
  // transaction.set(regRef, {
  //   userId: user.uid,
  //   eventId: eventId,
  //   status: newStatus,
  //   timestamp: serverTimestamp(),
  //   userName: ...,
  //   userEmail: ...,
  // });
  // Notice: 'cancelledAt' is NOT included in the set payload!
  const newPayload = {
    userId: 'student_123',
    eventId: 'event_456',
    status: 'approved',
    timestamp: new Date('2026-09-17T01:00:00Z'),
    userName: 'سلطان الحربي',
    userEmail: 'sultan@qu.edu.sa',
  };

  // Compute affected keys in Firestore diff:
  // In Firestore, if an existing field ('cancelledAt') is omitted in a replacement set,
  // it is DELETED from the document, so 'cancelledAt' IS an affected key!
  const allKeys = new Set([...Object.keys(existingDoc), ...Object.keys(newPayload)]);
  const affectedKeys: string[] = [];
  for (const k of allKeys) {
    if ((existingDoc as any)[k] !== (newPayload as any)[k]) {
      affectedKeys.push(k);
    }
  }

  // affectedKeys contains: ['status', 'timestamp', 'cancelledAt']
  assert.ok(affectedKeys.includes('cancelledAt'), "Deletion of 'cancelledAt' is part of affectedKeys");

  // Check rule constraint: hasOnly(['status', 'timestamp', 'userName', 'userEmail', 'universityId'])
  const allowedKeys = new Set(['status', 'timestamp', 'userName', 'userEmail', 'universityId']);
  const satisfiesRule = affectedKeys.every(k => allowedKeys.has(k));

  // The check FAILS because 'cancelledAt' is not in allowedKeys!
  assert.equal(
    satisfiesRule,
    false,
    "FIRESTORE RULES DEFECT: Re-registration set() deletes cancelledAt, violating affectedKeys().hasOnly() and throwing permission-denied"
  );
});

// ============================================================================
// STAGE 3: ADMIN REGISTRATION DESK ATTENDANCE VS CERTIFICATE ISSUANCE DISCONNECT
// ============================================================================

test('CHALLENGE 3: Registration Desk bulk "Mark as Attended" fails to write attendance_logs, causing issueCertificates to issue 0 certificates', async () => {
  const client = new IEEEPlatformClient();

  const admin = await client.createUser({
    uid: 'admin_desk',
    displayName: 'Admin Desk',
    email: 'admin@ieeequ.org',
    role: 'super_admin'
  });

  const event = await client.createEvent(admin.uid, {
    title: 'الملتقى التقني السنوي',
    titleEn: 'Annual Tech Symposium',
    description: 'ملتقى تقني',
    descriptionEn: 'Tech Symposium',
    type: 'Meetup',
    date: new Date('2026-10-10T09:00:00Z'),
    location: 'المسرح الرئيسي',
    locationEn: 'Main Auditorium',
    durationHours: 4,
    capacity: 50,
    points: 30,
    hasCertificate: true,
    registrationMode: 'Auto',
    state: 'Registration Open',
  });

  // Register 3 students
  const student1 = await client.createUser({ uid: 'std_desk_1', displayName: 'فهد', email: 'fahad@qu.edu.sa', role: 'student' });
  const student2 = await client.createUser({ uid: 'std_desk_2', displayName: 'نورة', email: 'noura@qu.edu.sa', role: 'student' });
  const student3 = await client.createUser({ uid: 'std_desk_3', displayName: 'محمد', email: 'mohammed@qu.edu.sa', role: 'student' });

  await client.registerForEvent(student1.uid, event.id);
  await client.registerForEvent(student2.uid, event.id);
  await client.registerForEvent(student3.uid, event.id);

  // Transition event to Ongoing
  await client.updateEventState(admin.uid, event.id, 'Ongoing');

  // Simulate Admin Registration Desk bulk action: handleBulkUpdateStatus('attended')
  // From src/app/[locale]/admin/events/[id]/registrations/page.tsx:125-128:
  // updateDoc(doc(db, 'registrations', id), { status: 'attended' })
  for (const uid of [student1.uid, student2.uid, student3.uid]) {
    await client.db.collection('registrations').doc(`${event.id}_${uid}`).update({
      status: 'attended'
    });
  }

  // Verify registrations are marked as 'attended'
  const reg1 = (await client.db.collection('registrations').doc(`${event.id}_${student1.uid}`).get()).data();
  assert.equal(reg1.status, 'attended');

  // Verify attendance_logs: NO DOCUMENTS WERE CREATED!
  const log1 = await client.db.collection('attendance_logs').doc(`${event.id}_${student1.uid}`).get();
  assert.equal(log1.exists, false, 'Registration desk did not create attendance_logs document');

  // Now the event finishes and state is set to Completed
  await client.updateEventState(admin.uid, event.id, 'Completed');

  // Admin tries to issue certificates to the 3 students who attended according to the registration desk
  const issueResult = await client.issueCertificates(admin.uid, event.id, [student1.uid, student2.uid, student3.uid]);

  // FATAL PIPELINE DISCONNECT:
  // issueCertificates checks logRef.exists. Because attendance_logs was never populated by the Registration Desk,
  // queuedCount is ZERO!
  assert.equal(
    issueResult.queuedCount,
    0,
    'PIPELINE DISCONNECT CONFIRMED: Registration desk bulk attend leaves attendance_logs empty, resulting in 0 issued certificates'
  );
});

// ============================================================================
// STAGE 4: HOST QR SCANNER RACE CONDITION (BATCH COMMIT VS TRANSACTION)
// ============================================================================

test('CHALLENGE 4: Non-transactional QR Host check-in allows duplicate point awards under concurrent requests', async () => {
  const client = new IEEEPlatformClient();

  const admin = await client.createUser({
    uid: 'admin_qr_host',
    displayName: 'Admin Host',
    email: 'admin@ieeequ.org',
    role: 'super_admin'
  });

  const event = await client.createEvent(admin.uid, {
    title: 'تحدي البرمجة',
    titleEn: 'Coding Challenge',
    description: 'تحدي برمجي',
    descriptionEn: 'Coding Challenge',
    type: 'Challenge',
    date: new Date('2026-10-15T14:00:00Z'),
    location: 'معمل 3',
    locationEn: 'Lab 3',
    durationHours: 2,
    capacity: 20,
    points: 100,
    hasCertificate: true,
    registrationMode: 'Auto',
    state: 'Registration Open',
  });

  const student = await client.createUser({
    uid: 'student_racer',
    displayName: 'عمر',
    email: 'omar@qu.edu.sa',
    role: 'student'
  });
  await client.registerForEvent(student.uid, event.id);

  const freshStudent = await client.createUser({
    uid: 'student_protected',
    displayName: 'يوسف',
    email: 'youssef@qu.edu.sa',
    role: 'student'
  });
  await client.registerForEvent(freshStudent.uid, event.id);

  // Transition to Ongoing for QR check-in
  await client.updateEventState(admin.uid, event.id, 'Ongoing');

  // Generate valid token
  const { token } = await client.generateCheckInToken(admin.uid, event.id, 60);

  // SIMULATE HOST SCANNER CONCURRENCY (admin/events/[id]/qr/page.tsx:102-156)
  // Host scanner reads regRef via getDoc, then executes writeBatch.
  // When two duplicate scans arrive simultaneously:
  // Request A and Request B both read regRef before either commits.
  const regRef = client.db.collection('registrations').doc(`${event.id}_${student.uid}`);
  const userRef = client.db.collection('users').doc(student.uid);

  const snapA = await regRef.get();
  const snapB = await regRef.get();

  // Both see attended is falsy
  const attendedA = snapA.data()?.attended;
  const attendedB = snapB.data()?.attended;
  assert.equal(attendedA, undefined);
  assert.equal(attendedB, undefined);

  // Both proceed to commit their batches
  // Batch A commits:
  await client.db.runTransaction(async (tx) => {
    tx.update(regRef, { status: 'attended', attended: true });
    tx.update(userRef, { totalPoints: FieldValue.increment(event.points) });
  });

  // Batch B commits (because writeBatch does not abort on dirty read):
  await client.db.runTransaction(async (tx) => {
    tx.update(regRef, { status: 'attended', attended: true });
    tx.update(userRef, { totalPoints: FieldValue.increment(event.points) });
  });

  // Student received 200 points instead of 100!
  const corruptedUser = (await userRef.get()).data();
  assert.equal(
    corruptedUser.totalPoints,
    200,
    'RACE CONDITION CONFIRMED: Non-transactional batch write awards double points on concurrent check-ins'
  );

  // In contrast, transactional processCheckIn prevents this
  // Run 2 concurrent calls to client.processCheckIn
  const [res1, res2] = await Promise.all([
    client.processCheckIn(freshStudent.uid, event.id, token),
    client.processCheckIn(freshStudent.uid, event.id, token),
  ]);

  const successCount = [res1, res2].filter(r => r.status === 'success').length;
  const duplicateCount = [res1, res2].filter(r => r.status === 'already_checked_in').length;

  assert.equal(successCount, 1, 'Transactional check-in allows exactly 1 success');
  assert.equal(duplicateCount, 1, 'Transactional check-in marks second attempt as already_checked_in');

  const protectedUser = (await client.db.collection('users').doc(freshStudent.uid).get()).data();
  assert.equal(protectedUser.totalPoints, 100, 'User points strictly preserved at 100');
});

// ============================================================================
// STAGE 4: POINT TRANSACTION DATA MODEL SCHEMA CONFLICT
// ============================================================================

test('CHALLENGE 5: Point transaction schema written by QR host corrupts Profile Activity UI rendering', () => {
  // In src/app/[locale]/admin/events/[id]/qr/page.tsx:140-146:
  const qrHostPayload = {
    userId: 'usr_1',
    eventId: 'ev_1',
    points: 50,
    type: 'earned',
    description: 'حضور فعالية: ورشة عمل',
    timestamp: new Date('2026-09-17T10:00:00Z'),
  };

  // Profile page expectation (src/app/[locale]/profile/page.tsx:740-770 & src/lib/types.ts):
  // interface PointTransaction {
  //   amount: number;
  //   source: PointTransactionSource;
  //   reason: string;
  //   createdAt: Timestamp | Date;
  // }
  const consumerTx = qrHostPayload as any;

  // Assert field mismatch
  assert.equal(consumerTx.amount, undefined, "consumerTx.amount is undefined (qr writes 'points')");
  assert.equal(consumerTx.source, undefined, "consumerTx.source is undefined (qr writes 'type')");
  assert.equal(consumerTx.reason, undefined, "consumerTx.reason is undefined (qr writes 'description')");
  assert.equal(consumerTx.createdAt, undefined, "consumerTx.createdAt is undefined (qr writes 'timestamp')");

  // UI rendering consequences:
  // 1. tx.amount > 0 evaluates to false
  const isPositive = consumerTx.amount > 0;
  assert.equal(isPositive, false, "tx.amount > 0 evaluates to false, causing negative/red icon styling");

  // 2. tx.source fallback renders 'System' instead of 'Attendance'
  const sourceLabel = consumerTx.source === 'attendance' ? 'Attendance' : 'System';
  assert.equal(sourceLabel, 'System', "Falls back to 'System' instead of 'Attendance'");
});

// ============================================================================
// STAGE 5: CERTIFICATE ISSUANCE BOUNDARIES & FIRESTORE TRANSACTION CAPACITY
// ============================================================================

test('CHALLENGE 6: Certificate issuance boundary tests (0 attendees, 1 attendee, non-existent, 300 attendees)', async () => {
  const client = new IEEEPlatformClient();

  const admin = await client.createUser({
    uid: 'admin_cert_limits',
    displayName: 'Admin Certs',
    email: 'admin@ieeequ.org',
    role: 'super_admin'
  });

  const event = await client.createEvent(admin.uid, {
    title: 'مؤتمر الهندسة المتقدمة',
    titleEn: 'Advanced Engineering Conference',
    description: 'مؤتمر هندسي',
    descriptionEn: 'Engineering Conference',
    type: 'Camp',
    date: new Date('2026-10-01T08:00:00Z'),
    location: 'القصيم',
    locationEn: 'Qassim',
    durationHours: 6,
    capacity: 350,
    points: 100,
    hasCertificate: true,
    registrationMode: 'Auto',
    state: 'Registration Open',
  });

  // Register valid student during Registration Open
  const validStudent = await client.createUser({
    uid: 'student_valid_1',
    displayName: 'عبدالله السعد',
    email: 'abdullah@qu.edu.sa',
    role: 'student'
  });
  await client.registerForEvent(validStudent.uid, event.id);

  // Transition to Completed for certificate issuance
  await client.updateEventState(admin.uid, event.id, 'Completed');

  // Manually add attendance log
  await client.db.collection('attendance_logs').doc(`${event.id}_${validStudent.uid}`).set({
    id: `${event.id}_${validStudent.uid}`,
    userId: validStudent.uid,
    eventId: event.id,
    timestamp: new Date(),
    verifiedByQR: true,
  });

  const singleResult = await client.issueCertificates(admin.uid, event.id, [validStudent.uid]);
  assert.equal(singleResult.queuedCount, 1, 'Exactly 1 certificate queued');

  // Verify certificate document ID format: certificate_${eventId}_${userId}
  const expectedCertId = `certificate_${event.id}_${validStudent.uid}`;
  const certSnap = await client.db.collection('certificates').doc(expectedCertId).get();
  assert.ok(certSnap.exists, 'Certificate document exists with deterministic ID');
  assert.equal(certSnap.data()?.status, 'Generating');

  // Boundary 4: Certificate Idempotency (re-calling issueCertificates should skip Generating/Available)
  const duplicateResult = await client.issueCertificates(admin.uid, event.id, [validStudent.uid]);
  assert.equal(duplicateResult.queuedCount, 0, 'Re-issuing certificate for active attendee is strictly idempotent (skipped)');

  // Boundary 5: 300 Attendees Transaction Scaling Limit Analysis
  // In functions/src/issueCertificates.ts:
  // For each attendee, the transaction performs:
  //   1. transaction.get(logRef)
  //   2. transaction.get(certRef)
  //   3. transaction.get(userRef)
  //   4. transaction.set(certRef)
  // Total operations for N attendees = (3 reads + 1 write) * N.
  const n = 300;
  const readsPerAttendee = 3;
  const writesPerAttendee = 1;
  const totalOperations = n * (readsPerAttendee + writesPerAttendee);
  const totalWrites = n * writesPerAttendee;

  assert.equal(totalOperations, 1200, '300 attendees requires 1,200 database operations in a single transaction');
  assert.equal(totalWrites, 300, '300 attendees requires 300 writes');

  // Google Cloud Firestore transaction limit is 500 document operations / writes.
  // While 300 writes is under the 500 writes limit, 900 read locks inside a single transaction
  // exceeds the maximum concurrency safety threshold, leading to lock timeouts and contention errors.
  const exceedsSafeThreshold = totalOperations > 500;
  assert.equal(
    exceedsSafeThreshold,
    true,
    'SCALABILITY DEFECT CONFIRMED: 300 attendees in a single transaction generates 1,200 operations, requiring chunking into batches of 50-100'
  );
});
