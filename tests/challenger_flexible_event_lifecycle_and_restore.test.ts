import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from './engine/platform.ts';

test('Event Lifecycle: Flexible transitions allow Coming Soon (Published), Reopening, and Full Restoration from Archived', async () => {
  const client = new IEEEPlatformClient();

  const admin = await client.createUser({
    uid: 'organizer_lifecycle_admin',
    displayName: 'Event Director',
    email: 'director@ieeequ.org',
    role: 'event_organizer',
  });

  // 1. Create standard workshop event as Draft
  const workshop = await client.createEvent(admin.uid, {
    title: 'ورشة إنترنت الأشياء المتقدمة',
    titleEn: 'Advanced IoT Workshop',
    description: 'تطبيقات عملية على الدوائر الإلكترونية والبرمجة المدمجة',
    descriptionEn: 'Hands-on practical IoT workshop',
    type: 'Workshop',
    requiresRegistration: true,
    date: new Date('2026-11-20T10:00:00Z'),
    location: 'معمل الإلكترونيات',
    locationEn: 'Electronics Lab',
    durationHours: 3,
    capacity: 40,
    points: 25,
    hasCertificate: true,
    registrationMode: 'Auto',
    state: 'Draft',
  });

  assert.equal(workshop.state, 'Draft');

  // 2. Draft -> Published (قريبًا / لم يفتح التسجيل بعد)
  await client.updateEventState(admin.uid, workshop.id, 'Published');
  let details = await client.getEventDetails(workshop.id, admin.uid);
  assert.equal(details.event.state, 'Published');

  // 3. Published -> Registration Open
  await client.updateEventState(admin.uid, workshop.id, 'Registration Open');
  details = await client.getEventDetails(workshop.id, admin.uid);
  assert.equal(details.event.state, 'Registration Open');

  // 4. Registration Open -> Ongoing
  await client.updateEventState(admin.uid, workshop.id, 'Ongoing');
  details = await client.getEventDetails(workshop.id, admin.uid);
  assert.equal(details.event.state, 'Ongoing');

  // 5. Ongoing -> Completed
  await client.updateEventState(admin.uid, workshop.id, 'Completed');
  details = await client.getEventDetails(workshop.id, admin.uid);
  assert.equal(details.event.state, 'Completed');

  // 6. Completed -> Ongoing (Reopen for attendance corrections if needed)
  await client.updateEventState(admin.uid, workshop.id, 'Ongoing');
  details = await client.getEventDetails(workshop.id, admin.uid);
  assert.equal(details.event.state, 'Ongoing');

  // 7. Ongoing -> Completed -> Archived
  await client.updateEventState(admin.uid, workshop.id, 'Completed');
  await client.updateEventState(admin.uid, workshop.id, 'Archived');
  details = await client.getEventDetails(workshop.id, admin.uid);
  assert.equal(details.event.state, 'Archived');

  // 8. Full Restoration: Archived -> Registration Open
  await client.updateEventState(admin.uid, workshop.id, 'Registration Open');
  details = await client.getEventDetails(workshop.id, admin.uid);
  assert.equal(details.event.state, 'Registration Open');
  assert.equal(details.event.title, 'ورشة إنترنت الأشياء المتقدمة');
  assert.equal(details.event.points, 25);

  // 9. Archived -> Ongoing Restoration
  await client.updateEventState(admin.uid, workshop.id, 'Archived');
  await client.updateEventState(admin.uid, workshop.id, 'Ongoing');
  details = await client.getEventDetails(workshop.id, admin.uid);
  assert.equal(details.event.state, 'Ongoing');
});

test('Booth & Walk-in events default to Ongoing and can be archived and restored without losing data', async () => {
  const client = new IEEEPlatformClient();

  const admin = await client.createUser({
    uid: 'organizer_booth_admin',
    displayName: 'Booth Manager',
    email: 'booth_admin@ieeequ.org',
    role: 'event_organizer',
  });

  // Create Booth event without prior registration
  const booth = await client.createEvent(admin.uid, {
    title: 'جناح الروبوتات والذكاء الاصطناعي',
    titleEn: 'AI & Robotics Booth',
    description: 'تجربة حية للروبوتات بدون تسجيل مسبق',
    descriptionEn: 'Walk-in hands-on robotics demo',
    type: 'Booth',
    requiresRegistration: false,
    date: new Date('2026-11-25T08:00:00Z'),
    location: 'بهو كلية الحاسب',
    locationEn: 'College of Computing Atrium',
    durationHours: 6,
    capacity: 200,
    isUnlimitedCapacity: true,
    points: 10,
    hasCertificate: false,
    registrationMode: 'Auto',
    state: 'Ongoing',
  });

  assert.equal(booth.state, 'Ongoing');

  // Register a student attendance
  const student = await client.createUser({
    uid: 'student_robotics_fan',
    displayName: 'فهد التميمي',
    email: 'fahad@qu.edu.sa',
    universityId: '442001122',
    role: 'student',
  });

  const overrideResult = await client.manualAttendanceOverride(admin.uid, student.uid, booth.id);
  assert.equal(overrideResult.status, 'success');

  // Sync attendance count
  await client.syncEventAttendance(admin.uid, booth.id);

  // Check attendance logged
  let details = await client.getEventDetails(booth.id, admin.uid);
  assert.equal(details.event.attendanceCount, 1);

  // Archive event
  await client.updateEventState(admin.uid, booth.id, 'Archived');
  details = await client.getEventDetails(booth.id, admin.uid);
  assert.equal(details.event.state, 'Archived');

  // Restore event back to Ongoing
  await client.updateEventState(admin.uid, booth.id, 'Ongoing');
  details = await client.getEventDetails(booth.id, admin.uid);
  assert.equal(details.event.state, 'Ongoing');
  assert.equal(details.event.attendanceCount, 1);
  assert.equal(details.event.title, 'جناح الروبوتات والذكاء الاصطناعي');

  // Verify student points and attendance still intact
  const studentProfile = await client.getUser(student.uid);
  assert.equal(studentProfile?.totalPoints, 10);
});
