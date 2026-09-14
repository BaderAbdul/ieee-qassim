import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 2: Registration Boundaries - Zero capacity event immediately assigns waitlisted status', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_rb1', displayName: 'Admin', email: 'rb1@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_rb1', displayName: 'Student Zero', email: 'sz@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة سعة صفر',
    titleEn: 'Zero Capacity Workshop',
    description: 'سعة صفرية',
    descriptionEn: 'Zero capacity',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 0,
    points: 10,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  const res = await client.registerForEvent(student.uid, event.id);
  assert.equal(res.status, 'waitlisted');
});

test('Tier 2: Registration Boundaries - Full capacity rejection assigns waitlisted status', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_rb2', displayName: 'Admin', email: 'rb2@qu.edu.sa', role: 'event_organizer' });
  const student1 = await client.createUser({ uid: 'std_full1', displayName: 'Student 1', email: 'f1@qu.edu.sa' });
  const student2 = await client.createUser({ uid: 'std_full2', displayName: 'Student 2', email: 'f2@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ندوة بسعة 1',
    titleEn: 'Cap 1 Seminar',
    description: 'مقعد واحد فقط',
    descriptionEn: 'Single seat only',
    type: 'Lecture',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 1,
    points: 20,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  const r1 = await client.registerForEvent(student1.uid, event.id);
  assert.equal(r1.status, 'approved');

  const r2 = await client.registerForEvent(student2.uid, event.id);
  assert.equal(r2.status, 'waitlisted');
});

test('Tier 2: Registration Boundaries - Duplicate registration prevention throws precondition error', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_rb3', displayName: 'Admin', email: 'rb3@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_dup', displayName: 'Duplicate Student', email: 'dup@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة فحص التكرار',
    titleEn: 'Duplicate Test Workshop',
    description: 'منع التسجيل المزدوج',
    descriptionEn: 'Prevent double registration',
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

  // First registration succeeds
  await client.registerForEvent(student.uid, event.id);

  // Second registration throws
  await assert.rejects(
    async () => {
      await client.registerForEvent(student.uid, event.id);
    },
    {
      message: 'You are already registered or pending for this event.',
    }
  );
});

test('Tier 2: Registration Boundaries - Re-registration after cancellation succeeds and re-claims capacity', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_rb4', displayName: 'Admin', email: 'rb4@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_re_reg', displayName: 'Re-register Student', email: 'rereg@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة إلغاء وإعادة تسجيل',
    titleEn: 'Cancel and Re-register Workshop',
    description: 'فحص دورة الإلغاء',
    descriptionEn: 'Test cancellation cycle',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 2,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 10,
    points: 30,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // 1. Initial registration
  const r1 = await client.registerForEvent(student.uid, event.id);
  assert.equal(r1.status, 'approved');

  // 2. Cancellation
  const cancelRes = await client.cancelRegistration(student.uid, event.id);
  assert.equal(cancelRes.status, 'cancelled');

  // 3. Re-registration succeeds!
  const r2 = await client.registerForEvent(student.uid, event.id);
  assert.equal(r2.status, 'approved');

  const regDoc = (await client.db.collection('registrations').doc(`${event.id}_${student.uid}`).get()).data();
  assert.equal(regDoc?.status, 'approved');
});

test('Tier 2: Registration Boundaries - Negative capacity prevention prevents invalid registrations', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_rb5', displayName: 'Admin', email: 'rb5@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_neg', displayName: 'Negative Test', email: 'neg@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية سعة سالبة غير صالحة',
    titleEn: 'Invalid Negative Capacity Event',
    description: 'سعة غير منطقية',
    descriptionEn: 'Invalid capacity',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: -5,
    points: 10,
    hasCertificate: false,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await assert.rejects(
    async () => {
      await client.registerForEvent(student.uid, event.id);
    },
    {
      message: 'Invalid event capacity.',
    }
  );
});

test('Tier 2: Registration Boundaries - Capacity recovery decrements count without going negative', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_rb6', displayName: 'Admin', email: 'rb6@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_floor', displayName: 'Floor Student', email: 'floor@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية فحص أرضية العداد',
    titleEn: 'Counter Floor Event',
    description: 'فحص عدم النزول تحت الصفر',
    descriptionEn: 'Prevent negative count',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 10,
    points: 10,
    hasCertificate: false,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);
  await client.cancelRegistration(student.uid, event.id);

  // Subsequent cancellation of already cancelled does not decrease below zero
  await client.cancelRegistration(student.uid, event.id);

  const eventSnap = await client.db.collection('events').doc(event.id).get();
  assert.equal(eventSnap.data()?.registeredCount, 0);
});
