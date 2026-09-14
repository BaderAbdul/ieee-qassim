import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 1: Event Registration - Successful registration in Auto approval mode', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_reg1', displayName: 'Admin', email: 'reg1@qu.edu.sa', role: 'event_organizer' });
  const student = await client.createUser({ uid: 'std_reg1', displayName: 'Mona Al-Ali', email: 'mona@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة تطوير الواجهات البرمجية',
    titleEn: 'API Development Workshop',
    description: 'REST and GraphQL APIs',
    descriptionEn: 'REST and GraphQL APIs',
    type: 'Workshop',
    date: new Date(),
    location: 'معمل الحاسب',
    locationEn: 'Computer Lab',
    durationHours: 3,
    gains: ['APIs'],
    gainsEn: ['APIs'],
    speakers: ['Eng. Tariq'],
    capacity: 20,
    points: 40,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  const res = await client.registerForEvent(student.uid, event.id);
  assert.equal(res.status, 'approved');
  assert.equal(res.attendeeCount, 1);

  const regSnap = await client.db.collection('registrations').doc(`${event.id}_${student.uid}`).get();
  assert.ok(regSnap.exists);
  assert.equal(regSnap.data()?.status, 'approved');
  assert.equal(regSnap.data()?.userId, student.uid);
  assert.equal(regSnap.data()?.eventId, event.id);
});

test('Tier 1: Event Registration - Manual approval mode assigns pending status', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_reg2', displayName: 'Admin', email: 'reg2@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_reg2', displayName: 'Omar Hawsawi', email: 'omar@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'معسكر تدريبي مكثف متقدم',
    titleEn: 'Advanced Intensive Bootcamp',
    description: 'يتطلب موافقة المنظمين بعد تقييم السيرة الذاتية',
    descriptionEn: 'Requires organizer review after CV screening',
    type: 'Camp',
    date: new Date(),
    location: 'قاعة الابتكار',
    locationEn: 'Innovation Hall',
    durationHours: 15,
    gains: ['Deep Learning'],
    gainsEn: ['Deep Learning'],
    speakers: ['Prof. Ziyad'],
    capacity: 10,
    points: 100,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Manual',
  });

  const res = await client.registerForEvent(student.uid, event.id);
  assert.equal(res.status, 'pending');

  const details = await client.getEventDetails(event.id, student.uid);
  assert.equal(details.userRegistrationStatus, 'pending');
});

test('Tier 1: Event Registration - Capacity limit enforcement assigns waitlist when full', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_reg3', displayName: 'Admin', email: 'reg3@qu.edu.sa', role: 'event_organizer' });
  const student1 = await client.createUser({ uid: 'std_cap_a', displayName: 'Student A', email: 'a@qu.edu.sa' });
  const student2 = await client.createUser({ uid: 'std_cap_b', displayName: 'Student B', email: 'b@qu.edu.sa' });

  // Event with capacity = 1
  const event = await client.createEvent(admin.uid, {
    title: 'ورشة مقعد واحد فقط',
    titleEn: 'Single Seat Workshop',
    description: 'محدودة للغاية',
    descriptionEn: 'Strictly limited',
    type: 'Workshop',
    date: new Date(),
    location: 'مكتب الابتكار',
    locationEn: 'Innovation Office',
    durationHours: 1,
    gains: ['1-on-1 Mentorship'],
    gainsEn: ['1-on-1 Mentorship'],
    speakers: ['Director'],
    capacity: 1,
    points: 50,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // 1st student claims the only seat
  const res1 = await client.registerForEvent(student1.uid, event.id);
  assert.equal(res1.status, 'approved');

  // 2nd student should be placed on waitlist
  const res2 = await client.registerForEvent(student2.uid, event.id);
  assert.equal(res2.status, 'waitlisted');

  // Verification in registrations collection
  const reg2 = (await client.db.collection('registrations').doc(`${event.id}_${student2.uid}`).get()).data();
  assert.equal(reg2?.status, 'waitlisted');
});

test('Tier 1: Event Registration - Registration rejection for closed or draft events', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_reg4', displayName: 'Admin', email: 'reg4@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_reg4', displayName: 'Layla', email: 'layla@qu.edu.sa' });

  const closedEvent = await client.createEvent(admin.uid, {
    title: 'فعالية منتهية التسجيل',
    titleEn: 'Registration Closed Event',
    description: 'تم إغلاق باب التسجيل',
    descriptionEn: 'Registration has been officially closed',
    type: 'Lecture',
    date: new Date(),
    location: '101',
    locationEn: '101',
    durationHours: 2,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 30,
    points: 20,
    hasCertificate: false,
    state: 'Registration Closed',
    registrationMode: 'Auto',
  });

  await assert.rejects(
    async () => {
      await client.registerForEvent(student.uid, closedEvent.id);
    },
    {
      message: 'Registration is not open for this event.',
    }
  );

  const draftEvent = await client.createEvent(admin.uid, {
    title: 'مسودة لم تنشر',
    titleEn: 'Draft Unpublished',
    description: 'قيد الإعداد',
    descriptionEn: 'In preparation',
    type: 'Workshop',
    date: new Date(),
    location: 'TBD',
    locationEn: 'TBD',
    durationHours: 2,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 30,
    points: 20,
    hasCertificate: false,
    state: 'Draft',
    registrationMode: 'Auto',
  });

  await assert.rejects(
    async () => {
      await client.registerForEvent(student.uid, draftEvent.id);
    },
    {
      message: 'Registration is not open for this event.',
    }
  );
});

test('Tier 1: Event Registration - Registration persistence under deterministic key with timestamp', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_reg5', displayName: 'Admin', email: 'reg5@qu.edu.sa', role: 'event_organizer' });
  const student = await client.createUser({ uid: 'std_deterministic_key', displayName: 'Walid', email: 'walid@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية مفتاح التسجيل',
    titleEn: 'Deterministic Key Event',
    description: 'تحقق من المفتاح في قاعدة البيانات',
    descriptionEn: 'Verify deterministic key in database',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 50,
    points: 10,
    hasCertificate: true,
    state: 'Published',
    registrationMode: 'Auto',
  });

  await client.registerForEvent(student.uid, event.id);

  const expectedKey = `${event.id}_${student.uid}`;
  const docRef = client.db.collection('registrations').doc(expectedKey);
  const snap = await docRef.get();

  assert.ok(snap.exists);
  const data = snap.data();
  assert.equal(data?.id, expectedKey);
  assert.equal(data?.userId, student.uid);
  assert.equal(data?.eventId, event.id);
  assert.ok(data?.timestamp instanceof Date);
});

test('Tier 1: Event Registration - Event document registeredCount is atomically incremented', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_reg6', displayName: 'Admin', email: 'reg6@qu.edu.sa', role: 'super_admin' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية فحص العداد',
    titleEn: 'Counter Verification Event',
    description: 'فحص التحديث الذري للعداد',
    descriptionEn: 'Check atomic counter updates',
    type: 'Competition',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 2,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 20,
    points: 30,
    hasCertificate: false,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // Verify initial count = 0
  let eventSnap = await client.db.collection('events').doc(event.id).get();
  assert.equal(eventSnap.data()?.registeredCount, 0);

  // Register 3 separate students
  for (let i = 1; i <= 3; i++) {
    const student = await client.createUser({
      uid: `std_counter_${i}`,
      displayName: `Student ${i}`,
      email: `student${i}@qu.edu.sa`,
    });
    const res = await client.registerForEvent(student.uid, event.id);
    assert.equal(res.attendeeCount, i);
  }

  eventSnap = await client.db.collection('events').doc(event.id).get();
  assert.equal(eventSnap.data()?.registeredCount, 3);
});
