import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 1: Event Discovery - Catalog listing returns published and open events', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_1', displayName: 'Dr. Organizer', email: 'org1@qu.edu.sa', role: 'event_organizer' });
  const student = await client.createUser({ uid: 'std_1', displayName: 'Tariq', email: 'tariq@qu.edu.sa' });

  // Create events in various states
  await client.createEvent(admin.uid, {
    title: 'ورشة الذكاء الاصطناعي',
    titleEn: 'AI Workshop',
    description: 'مقدمة في تعلم الآلة',
    descriptionEn: 'Intro to ML',
    type: 'Workshop',
    date: new Date(Date.now() + 86400000),
    location: 'معمل الحاسب 1',
    locationEn: 'Computer Lab 1',
    durationHours: 2,
    gains: ['Python', 'ML'],
    gainsEn: ['Python', 'ML'],
    speakers: ['Dr. Khalid'],
    capacity: 30,
    points: 40,
    hasCertificate: true,
    state: 'Published',
    registrationMode: 'Auto',
  });

  await client.createEvent(admin.uid, {
    title: 'معسكر الويب المتقدم',
    titleEn: 'Advanced Web Bootcamp',
    description: 'تطوير تطبيقات الويب مع Next.js',
    descriptionEn: 'Full stack development with Next.js',
    type: 'Camp',
    date: new Date(Date.now() + 172800000),
    location: 'المسرح الرئيسي',
    locationEn: 'Main Auditorium',
    durationHours: 6,
    gains: ['Next.js', 'React'],
    gainsEn: ['Next.js', 'React'],
    speakers: ['Eng. Sarah'],
    capacity: 50,
    points: 100,
    hasCertificate: true,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  const result = await client.listEvents({ actorUid: student.uid });
  assert.equal(result.totalCount, 2);
  assert.equal(result.events.length, 2);
  const titles = result.events.map(e => e.titleEn);
  assert.ok(titles.includes('AI Workshop'));
  assert.ok(titles.includes('Advanced Web Bootcamp'));
});

test('Tier 1: Event Discovery - Draft events are strictly hidden from students', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_2', displayName: 'Admin Organizer', email: 'org2@qu.edu.sa', role: 'event_organizer' });
  const student = await client.createUser({ uid: 'std_2', displayName: 'Salma', email: 'salma@qu.edu.sa' });

  // Public event
  await client.createEvent(admin.uid, {
    title: 'ندوة الأمن السيبراني',
    titleEn: 'Cybersecurity Seminar',
    description: 'حماية الشبكات والأنظمة',
    descriptionEn: 'Network & System Defense',
    type: 'Lecture',
    date: new Date(),
    location: 'قاعة 101',
    locationEn: 'Hall 101',
    durationHours: 1.5,
    gains: ['Security'],
    gainsEn: ['Security'],
    speakers: ['Eng. Fahad'],
    capacity: 40,
    points: 30,
    hasCertificate: false,
    state: 'Published',
    registrationMode: 'Auto',
  });

  // Draft event
  await client.createEvent(admin.uid, {
    title: 'هاكاثون مسودة غير معلن',
    titleEn: 'Unannounced Draft Hackathon',
    description: 'قيد التخطيط والتنسيق',
    descriptionEn: 'Under internal planning',
    type: 'Competition',
    date: new Date(Date.now() + 500000000),
    location: 'غير محدد',
    locationEn: 'TBD',
    durationHours: 12,
    gains: ['Innovation'],
    gainsEn: ['Innovation'],
    speakers: [],
    capacity: 100,
    points: 200,
    hasCertificate: true,
    state: 'Draft',
    registrationMode: 'Manual',
  });

  // Student queries catalog
  const studentView = await client.listEvents({ actorUid: student.uid });
  assert.equal(studentView.totalCount, 1);
  assert.equal(studentView.events[0].titleEn, 'Cybersecurity Seminar');

  // Organizer queries catalog
  const organizerView = await client.listEvents({ actorUid: admin.uid });
  assert.equal(organizerView.totalCount, 2);
  const titles = organizerView.events.map(e => e.titleEn);
  assert.ok(titles.includes('Unannounced Draft Hackathon'));
});

test('Tier 1: Event Discovery - Search filtering matches Arabic and English keywords accurately', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_3', displayName: 'Admin', email: 'org3@qu.edu.sa', role: 'super_admin' });

  await client.createEvent(admin.uid, {
    title: 'تطوير الروبوتات والأنظمة المدمجة',
    titleEn: 'Robotics & Embedded Systems',
    description: 'برمجة المايكروكنترولر واستخدام C++',
    descriptionEn: 'Microcontroller programming with C++',
    type: 'Workshop',
    date: new Date(),
    location: 'معمل الميكاترونكس',
    locationEn: 'Mechatronics Lab',
    durationHours: 4,
    gains: ['Robotics', 'C++'],
    gainsEn: ['Robotics', 'C++'],
    speakers: ['Dr. Nasser'],
    capacity: 25,
    points: 60,
    hasCertificate: true,
    state: 'Published',
    registrationMode: 'Auto',
  });

  await client.createEvent(admin.uid, {
    title: 'تقنيات الحوسبة السحابية',
    titleEn: 'Cloud Computing Technologies',
    description: 'مدخل إلى خدمات AWS و GCP',
    descriptionEn: 'Introduction to AWS and GCP cloud infrastructure',
    type: 'Lecture',
    date: new Date(),
    location: 'قاعة المحاضرات ب',
    locationEn: 'Lecture Hall B',
    durationHours: 2,
    gains: ['Cloud', 'DevOps'],
    gainsEn: ['Cloud', 'DevOps'],
    speakers: ['Eng. Hind'],
    capacity: 60,
    points: 30,
    hasCertificate: false,
    state: 'Published',
    registrationMode: 'Auto',
  });

  // Arabic search query
  const arabicMatch = await client.listEvents({ search: 'الروبوتات' });
  assert.equal(arabicMatch.totalCount, 1);
  assert.equal(arabicMatch.events[0].titleEn, 'Robotics & Embedded Systems');

  // English search query
  const englishMatch = await client.listEvents({ search: 'cloud' });
  assert.equal(englishMatch.totalCount, 1);
  assert.equal(englishMatch.events[0].titleEn, 'Cloud Computing Technologies');
});

test('Tier 1: Event Discovery - Filtering by event type returns only matching categories', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_4', displayName: 'Admin', email: 'org4@qu.edu.sa', role: 'event_organizer' });

  await client.createEvent(admin.uid, {
    title: 'تحدي البرمجة السريعة',
    titleEn: 'Speed Coding Challenge',
    description: 'مسابقة حل المشكلات الخوارزمية',
    descriptionEn: 'Algorithmic problem solving contest',
    type: 'Competition',
    date: new Date(),
    location: 'المدرج 2',
    locationEn: 'Amphitheater 2',
    durationHours: 3,
    gains: ['Algorithms'],
    gainsEn: ['Algorithms'],
    speakers: [],
    capacity: 40,
    points: 80,
    hasCertificate: true,
    state: 'Published',
    registrationMode: 'Auto',
  });

  await client.createEvent(admin.uid, {
    title: 'ورشة إنترنت الأشياء',
    titleEn: 'IoT Workshop',
    description: 'توصيل الحساسات بالإنترنت',
    descriptionEn: 'Connecting sensors to the internet',
    type: 'Workshop',
    date: new Date(),
    location: 'معمل الإلكترونيات',
    locationEn: 'Electronics Lab',
    durationHours: 3,
    gains: ['IoT', 'ESP32'],
    gainsEn: ['IoT', 'ESP32'],
    speakers: ['Eng. Zaid'],
    capacity: 20,
    points: 50,
    hasCertificate: true,
    state: 'Published',
    registrationMode: 'Auto',
  });

  const competitions = await client.listEvents({ type: 'Competition' });
  assert.equal(competitions.totalCount, 1);
  assert.equal(competitions.events[0].type, 'Competition');
  assert.equal(competitions.events[0].titleEn, 'Speed Coding Challenge');

  const workshops = await client.listEvents({ type: 'Workshop' });
  assert.equal(workshops.totalCount, 1);
  assert.equal(workshops.events[0].type, 'Workshop');
  assert.equal(workshops.events[0].titleEn, 'IoT Workshop');
});

test('Tier 1: Event Discovery - Date-based ordering sorts events in descending order', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_5', displayName: 'Admin', email: 'org5@qu.edu.sa', role: 'super_admin' });

  const pastDate = new Date(Date.now() - 86400000);
  const futureDate = new Date(Date.now() + 86400000);

  await client.createEvent(admin.uid, {
    title: 'فعالية ماضية',
    titleEn: 'Past Event',
    description: 'سابق',
    descriptionEn: 'Past',
    type: 'Lecture',
    date: pastDate,
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 10,
    points: 10,
    hasCertificate: false,
    state: 'Completed',
    registrationMode: 'Auto',
  });

  await client.createEvent(admin.uid, {
    title: 'فعالية مستقبلية',
    titleEn: 'Future Event',
    description: 'قادم',
    descriptionEn: 'Upcoming',
    type: 'Lecture',
    date: futureDate,
    location: '2',
    locationEn: '2',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 10,
    points: 10,
    hasCertificate: false,
    state: 'Published',
    registrationMode: 'Auto',
  });

  const sortedDesc = await client.listEvents({ sortBy: 'date', sortOrder: 'desc' });
  assert.equal(sortedDesc.events[0].titleEn, 'Future Event');
  assert.equal(sortedDesc.events[1].titleEn, 'Past Event');

  const sortedAsc = await client.listEvents({ sortBy: 'date', sortOrder: 'asc' });
  assert.equal(sortedAsc.events[0].titleEn, 'Past Event');
  assert.equal(sortedAsc.events[1].titleEn, 'Future Event');
});

test('Tier 1: Event Discovery - Pagination limit and offset correctly partition catalog', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_6', displayName: 'Admin', email: 'org6@qu.edu.sa', role: 'super_admin' });

  for (let i = 1; i <= 5; i++) {
    await client.createEvent(admin.uid, {
      title: `فعالية رقم ${i}`,
      titleEn: `Event Number ${i}`,
      description: `وصف ${i}`,
      descriptionEn: `Desc ${i}`,
      type: 'Workshop',
      date: new Date(Date.now() + i * 10000),
      location: `قاعة ${i}`,
      locationEn: `Hall ${i}`,
      durationHours: 2,
      gains: [],
      gainsEn: [],
      speakers: [],
      capacity: 20,
      points: 20,
      hasCertificate: false,
      state: 'Published',
      registrationMode: 'Auto',
    });
  }

  const page1 = await client.listEvents({ limit: 2, offset: 0, sortBy: 'title', sortOrder: 'asc' });
  assert.equal(page1.events.length, 2);
  assert.equal(page1.totalCount, 5);

  const page2 = await client.listEvents({ limit: 2, offset: 2, sortBy: 'title', sortOrder: 'asc' });
  assert.equal(page2.events.length, 2);

  const page3 = await client.listEvents({ limit: 2, offset: 4, sortBy: 'title', sortOrder: 'asc' });
  assert.equal(page3.events.length, 1);

  // Verify non-overlapping items between page 1 and page 2
  const idsPage1 = page1.events.map(e => e.id);
  const idsPage2 = page2.events.map(e => e.id);
  for (const id of idsPage1) {
    assert.ok(!idsPage2.includes(id));
  }
});
