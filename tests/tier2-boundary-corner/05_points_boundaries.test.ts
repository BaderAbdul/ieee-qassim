import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 2: Points Boundaries - Event with zero points awards zero points safely', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_pb1', displayName: 'Admin', email: 'pb1@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_pb1', displayName: 'Student', email: 'pb1@qu.edu.sa' });

  const zeroPointEvent = await client.createEvent(admin.uid, {
    title: 'فعالية تطوعية بدون نقاط',
    titleEn: 'Zero Points Volunteer Event',
    description: 'فعالية خيرية',
    descriptionEn: 'Charity event',
    type: 'Meetup',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 2,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 20,
    points: 0,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, zeroPointEvent.id);
  await client.updateEventState(admin.uid, zeroPointEvent.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, zeroPointEvent.id);

  const res = await client.processCheckIn(student.uid, zeroPointEvent.id, token);
  assert.equal(res.status, 'success');
  assert.equal(res.pointsAwarded, 0);

  const user = await client.getUser(student.uid);
  assert.equal(user?.totalPoints, 0);

  // Assert no corrupted 0-point transaction was created
  const txDoc = await client.db.collection('point_transactions').doc(`attendance_${zeroPointEvent.id}_${student.uid}`).get();
  assert.equal(txDoc.exists, false);
});

test('Tier 2: Points Boundaries - Massive points adjustment accumulates safely', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_pb2', displayName: 'Admin', email: 'pb2@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_pb2', displayName: 'Grand Winner', email: 'winner@qu.edu.sa' });

  const massiveAmount = 100_000;
  const res = await client.addManualPoints(admin.uid, student.uid, massiveAmount, 'National Hackathon Grand Prize');

  assert.equal(res.status, 'success');
  assert.equal(res.newTotal, 100_000);

  const user = await client.getUser(student.uid);
  assert.equal(user?.totalPoints, 100_000);
});

test('Tier 2: Points Boundaries - Negative points deduction is floored at zero', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_pb3', displayName: 'Admin', email: 'pb3@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_pb3', displayName: 'Student', email: 'pb3@qu.edu.sa' });

  // Add 30 points
  await client.addManualPoints(admin.uid, student.uid, 30, 'Initial points');

  // Deduct 100 points (exceeding balance)
  const res = await client.addManualPoints(admin.uid, student.uid, -100, 'Penalty adjustment');
  assert.equal(res.status, 'success');
  assert.equal(res.newTotal, 0);

  const user = await client.getUser(student.uid);
  assert.equal(user?.totalPoints, 0);
});

test('Tier 2: Points Boundaries - Non-admin attempt to add manual points is rejected', async () => {
  const client = new IEEEPlatformClient();
  const studentAttacker = await client.createUser({ uid: 'std_attacker', displayName: 'Attacker', email: 'att@qu.edu.sa', role: 'student' });
  const targetStudent = await client.createUser({ uid: 'std_target', displayName: 'Target', email: 'tgt@qu.edu.sa', role: 'student' });

  await assert.rejects(
    async () => {
      await client.addManualPoints(studentAttacker.uid, targetStudent.uid, 500, 'Self awarded bonus');
    },
    {
      message: 'Permission denied: Only Super Admins can add manual points.',
    }
  );
});

test('Tier 2: Points Boundaries - Point adjustment with zero or NaN amount throws error', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_pb5', displayName: 'Admin', email: 'pb5@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_pb5', displayName: 'Student', email: 'pb5@qu.edu.sa' });

  await assert.rejects(
    async () => {
      await client.addManualPoints(admin.uid, student.uid, 0, 'Zero amount');
    },
    {
      message: 'Amount must be a non-zero number.',
    }
  );

  await assert.rejects(
    async () => {
      await client.addManualPoints(admin.uid, student.uid, NaN, 'NaN amount');
    },
    {
      message: 'Amount must be a non-zero number.',
    }
  );
});
