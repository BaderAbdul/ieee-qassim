import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';
import { createCheckInToken } from '../engine/crypto.ts';

test('Tier 2: Check-in Boundaries - Expired check-in token throws invalid or expired error', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_cb1', displayName: 'Admin', email: 'cb1@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_cb1', displayName: 'Student', email: 'cb1@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة فحص انتهاء الرمز',
    titleEn: 'Token Expiry Workshop',
    description: 'فحص الرمز المنتهي',
    descriptionEn: 'Check expired token',
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

  // Create a token expired 10 seconds ago
  const expiredToken = createCheckInToken({ eventId: event.id, expiresInSec: -10 });

  await assert.rejects(
    async () => {
      await client.processCheckIn(student.uid, event.id, expiredToken);
    },
    {
      message: 'Token is invalid or expired.',
    }
  );
});

test('Tier 2: Check-in Boundaries - Mismatched event ID in token throws Token does not match the event', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_cb2', displayName: 'Admin', email: 'cb2@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_cb2', displayName: 'Student', email: 'cb2@qu.edu.sa' });

  const event1 = await client.createEvent(admin.uid, {
    title: 'فعالية أ',
    titleEn: 'Event A',
    description: 'A',
    descriptionEn: 'A',
    type: 'Lecture',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 20,
    points: 20,
    hasCertificate: false,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  const event2 = await client.createEvent(admin.uid, {
    title: 'فعالية ب',
    titleEn: 'Event B',
    description: 'B',
    descriptionEn: 'B',
    type: 'Lecture',
    date: new Date(),
    location: '2',
    locationEn: '2',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 20,
    points: 20,
    hasCertificate: false,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event1.id);
  await client.registerForEvent(student.uid, event2.id);

  await client.updateEventState(admin.uid, event1.id, 'Ongoing');
  await client.updateEventState(admin.uid, event2.id, 'Ongoing');

  // Token created for event2
  const { token: tokenForEvent2 } = await client.generateCheckInToken(admin.uid, event2.id);

  // Attempt to check into event1 with token for event2
  await assert.rejects(
    async () => {
      await client.processCheckIn(student.uid, event1.id, tokenForEvent2);
    },
    {
      message: 'Token does not match the event.',
    }
  );
});

test('Tier 2: Check-in Boundaries - Malformed or tampered token signature throws Token is invalid or expired', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_cb3', displayName: 'Admin', email: 'cb3@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_cb3', displayName: 'Student', email: 'cb3@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة فحص التلاعب بالرمز',
    titleEn: 'Tampered Token Workshop',
    description: 'فحص التلاعب',
    descriptionEn: 'Check tampering',
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
    hasCertificate: false,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');

  const { token } = await client.generateCheckInToken(admin.uid, event.id);
  // Tamper with the signature portion
  const tamperedToken = token.slice(0, -4) + 'abcd';

  await assert.rejects(
    async () => {
      await client.processCheckIn(student.uid, event.id, tamperedToken);
    },
    {
      message: 'Token is invalid or expired.',
    }
  );
});

test('Tier 2: Check-in Boundaries - Check-in attempt on non-ongoing event is rejected', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_cb4', displayName: 'Admin', email: 'cb4@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_cb4', displayName: 'Student', email: 'cb4@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية مكتملة',
    titleEn: 'Completed Event',
    description: 'انتهت',
    descriptionEn: 'Completed',
    type: 'Lecture',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 20,
    points: 20,
    hasCertificate: false,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  // Transition directly to Completed without Ongoing
  await client.updateEventState(admin.uid, event.id, 'Completed');

  // Token manually created
  const token = createCheckInToken({ eventId: event.id });

  await assert.rejects(
    async () => {
      await client.processCheckIn(student.uid, event.id, token);
    },
    {
      message: 'Event is not currently accepting attendance.',
    }
  );
});

test('Tier 2: Check-in Boundaries - Rapid concurrent duplicate check-ins award points exactly once', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_cb5', displayName: 'Admin', email: 'cb5@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_rapid', displayName: 'Rapid Student', email: 'rapid@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة الحضور المتزامن السريع',
    titleEn: 'Concurrent Check-in Workshop',
    description: 'فحص التزامن',
    descriptionEn: 'Concurrency check',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 2,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 20,
    points: 50,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.updateEventState(admin.uid, event.id, 'Ongoing');
  const { token } = await client.generateCheckInToken(admin.uid, event.id);

  // Trigger multiple check-in calls concurrently
  const [res1, res2, res3] = await Promise.all([
    client.processCheckIn(student.uid, event.id, token),
    client.processCheckIn(student.uid, event.id, token),
    client.processCheckIn(student.uid, event.id, token),
  ]);

  const statuses = [res1.status, res2.status, res3.status];
  const successCount = statuses.filter(s => s === 'success').length;
  const alreadyCheckedInCount = statuses.filter(s => s === 'already_checked_in').length;

  assert.equal(successCount, 1);
  assert.equal(alreadyCheckedInCount, 2);

  const user = await client.getUser(student.uid);
  assert.equal(user?.totalPoints, 50);
});
