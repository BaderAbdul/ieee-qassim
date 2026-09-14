import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 1: Event Details - Retrieval of complete bilingual metadata and learning gains', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_d1', displayName: 'Admin', email: 'ad1@qu.edu.sa', role: 'super_admin' });

  const event = await client.createEvent(admin.uid, {
    title: 'مقدمة في الرؤية الحاسوبية',
    titleEn: 'Introduction to Computer Vision',
    description: 'معالجة الصور الرقمية وتطبيقات التعلم العميق باستخدام OpenCV و PyTorch',
    descriptionEn: 'Digital image processing and deep learning applications using OpenCV and PyTorch',
    coverUrl: 'https://storage.googleapis.com/covers/cv.jpg',
    type: 'Workshop',
    date: new Date('2026-10-15T13:00:00Z'),
    location: 'مبنى الهندسة - القاعة الكبرى',
    locationEn: 'Engineering Building - Grand Hall',
    durationHours: 3.5,
    gains: ['OpenCV basics', 'PyTorch CNNs', 'Object Detection'],
    gainsEn: ['OpenCV basics', 'PyTorch CNNs', 'Object Detection'],
    speakers: ['Dr. Sarah Al-Otaibi', 'Eng. Faisal Al-Harbi'],
    capacity: 45,
    points: 75,
    hasCertificate: true,
    state: 'Published',
    registrationMode: 'Auto',
  });

  const details = await client.getEventDetails(event.id);
  assert.equal(details.event.title, 'مقدمة في الرؤية الحاسوبية');
  assert.equal(details.event.titleEn, 'Introduction to Computer Vision');
  assert.equal(details.event.durationHours, 3.5);
  assert.equal(details.event.coverUrl, 'https://storage.googleapis.com/covers/cv.jpg');
  assert.equal(details.event.gains.length, 3);
  assert.ok(details.event.gains.includes('PyTorch CNNs'));
});

test('Tier 1: Event Details - Speakers roster and credentials correctly verified', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_d2', displayName: 'Admin', email: 'ad2@qu.edu.sa', role: 'event_organizer' });

  const speakersList = ['Eng. Abdullah Al-Ghamdi (IEEE Senior Member)', 'Dr. Mona Al-Shehri (AI Researcher)'];
  const event = await client.createEvent(admin.uid, {
    title: 'منتدى المهندسين',
    titleEn: 'Engineers Forum',
    description: 'نقاشات مهنية',
    descriptionEn: 'Professional discussions',
    type: 'Meetup',
    date: new Date(),
    location: 'القاعة 3',
    locationEn: 'Hall 3',
    durationHours: 2,
    gains: ['Networking'],
    gainsEn: ['Networking'],
    speakers: speakersList,
    capacity: 100,
    points: 25,
    hasCertificate: false,
    state: 'Published',
    registrationMode: 'Auto',
  });

  const details = await client.getEventDetails(event.id);
  assert.deepEqual(details.event.speakers, speakersList);
  assert.equal(details.event.speakers.length, 2);
  assert.ok(details.event.speakers[0].includes('IEEE Senior Member'));
});

test('Tier 1: Event Details - Location and session duration formatting', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_d3', displayName: 'Admin', email: 'ad3@qu.edu.sa', role: 'super_admin' });

  const event = await client.createEvent(admin.uid, {
    title: 'جلسة هندسة النظم المدمجة',
    titleEn: 'Embedded Systems Engineering Session',
    description: 'تطبيق عملي على وحدات ARM Cortex',
    descriptionEn: 'Hands-on ARM Cortex session',
    type: 'Workshop',
    date: new Date(),
    location: 'معمل هندسة الحاسب - الدور الثاني',
    locationEn: 'Computer Engineering Lab - 2nd Floor',
    durationHours: 4,
    gains: ['ARM Architecture', 'Firmware'],
    gainsEn: ['ARM Architecture', 'Firmware'],
    speakers: ['Dr. Tariq'],
    capacity: 25,
    points: 50,
    hasCertificate: true,
    state: 'Published',
    registrationMode: 'Auto',
  });

  const details = await client.getEventDetails(event.id);
  assert.equal(details.event.location, 'معمل هندسة الحاسب - الدور الثاني');
  assert.equal(details.event.locationEn, 'Computer Engineering Lab - 2nd Floor');
  assert.equal(details.event.durationHours, 4);
});

test('Tier 1: Event Details - Real-time capacity computation and seats remaining', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_d4', displayName: 'Admin', email: 'ad4@qu.edu.sa', role: 'event_organizer' });
  const student1 = await client.createUser({ uid: 'std_cap1', displayName: 'Ahmed', email: 'a@qu.edu.sa' });
  const student2 = await client.createUser({ uid: 'std_cap2', displayName: 'Basim', email: 'b@qu.edu.sa' });

  const capacity = 3;
  const event = await client.createEvent(admin.uid, {
    title: 'ندوة محدودة المقاعد',
    titleEn: 'Limited Capacity Seminar',
    description: 'ندوة خاصة لعدد محدود',
    descriptionEn: 'Exclusive small group seminar',
    type: 'Lecture',
    date: new Date(),
    location: 'غرفة الاجتماعات',
    locationEn: 'Meeting Room',
    durationHours: 1,
    gains: ['Discussion'],
    gainsEn: ['Discussion'],
    speakers: ['Dr. Saleh'],
    capacity,
    points: 20,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // Initially empty
  let details = await client.getEventDetails(event.id);
  assert.equal(details.attendeeCount, 0);
  assert.equal(details.availableSeats, 3);
  assert.equal(details.isFull, false);

  // Student 1 registers
  await client.registerForEvent(student1.uid, event.id);
  details = await client.getEventDetails(event.id);
  assert.equal(details.attendeeCount, 1);
  assert.equal(details.availableSeats, 2);
  assert.equal(details.isFull, false);

  // Student 2 registers
  await client.registerForEvent(student2.uid, event.id);
  details = await client.getEventDetails(event.id);
  assert.equal(details.attendeeCount, 2);
  assert.equal(details.availableSeats, 1);
  assert.equal(details.isFull, false);
});

test('Tier 1: Event Details - Dynamic CTA state accurately reflects user registration', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_d5', displayName: 'Admin', email: 'ad5@qu.edu.sa', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_cta', displayName: 'Nora', email: 'nora@qu.edu.sa' });

  const event = await client.createEvent(admin.uid, {
    title: 'ورشة التصميم الهندسي',
    titleEn: 'Engineering Design Workshop',
    description: 'AutoCAD & SolidWorks',
    descriptionEn: 'AutoCAD & SolidWorks',
    type: 'Workshop',
    date: new Date(),
    location: 'معمل التصميم',
    locationEn: 'Design Studio',
    durationHours: 2,
    gains: ['CAD'],
    gainsEn: ['CAD'],
    speakers: ['Eng. Reem'],
    capacity: 20,
    points: 40,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  // Before registration: null status
  const beforeReg = await client.getEventDetails(event.id, student.uid);
  assert.equal(beforeReg.userRegistrationStatus, null);
  assert.equal(beforeReg.isRegistrationOpen, true);

  // After registration: approved status
  await client.registerForEvent(student.uid, event.id);
  const afterReg = await client.getEventDetails(event.id, student.uid);
  assert.equal(afterReg.userRegistrationStatus, 'approved');

  // After cancellation: cancelled status
  await client.cancelRegistration(student.uid, event.id);
  const afterCancel = await client.getEventDetails(event.id, student.uid);
  assert.equal(afterCancel.userRegistrationStatus, 'cancelled');
});

test('Tier 1: Event Details - Certificate eligibility indicator correctly flagged', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_d6', displayName: 'Admin', email: 'ad6@qu.edu.sa', role: 'event_organizer' });

  const certEvent = await client.createEvent(admin.uid, {
    title: 'دورة معتمدة بشهادة',
    titleEn: 'Accredited Course With Certificate',
    description: 'شهادة حضور معتمدة لجميع الحاضرين',
    descriptionEn: 'Accredited certificate of attendance for attendees',
    type: 'Camp',
    date: new Date(),
    location: 'المدرج 1',
    locationEn: 'Auditorium 1',
    durationHours: 10,
    gains: ['Certified Skills'],
    gainsEn: ['Certified Skills'],
    speakers: ['Prof. Ibrahim'],
    capacity: 50,
    points: 150,
    hasCertificate: true,
    state: 'Published',
    registrationMode: 'Auto',
  });

  const nonCertEvent = await client.createEvent(admin.uid, {
    title: 'لقاء تعريفي قصير',
    titleEn: 'Short Orientation Meetup',
    description: 'لقاء مفتوح للترحيب بالطلاب المستجدين',
    descriptionEn: 'Casual welcome meetup for freshman students',
    type: 'Meetup',
    date: new Date(),
    location: 'بهو الكلية',
    locationEn: 'College Atrium',
    durationHours: 1,
    gains: ['Welcome Pack'],
    gainsEn: ['Welcome Pack'],
    speakers: ['Student Club Officers'],
    capacity: 100,
    points: 15,
    hasCertificate: false,
    state: 'Published',
    registrationMode: 'Auto',
  });

  const detailsWithCert = await client.getEventDetails(certEvent.id);
  assert.equal(detailsWithCert.event.hasCertificate, true);

  const detailsWithoutCert = await client.getEventDetails(nonCertEvent.id);
  assert.equal(detailsWithoutCert.event.hasCertificate, false);
});
