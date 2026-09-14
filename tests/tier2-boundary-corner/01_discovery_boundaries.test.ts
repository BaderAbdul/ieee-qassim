import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 2: Discovery Boundaries - Empty or whitespace search query returns default catalog', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_b1', displayName: 'Admin', email: 'b1@qu.edu.sa', role: 'super_admin' });

  await client.createEvent(admin.uid, {
    title: 'فعالية 1',
    titleEn: 'Event 1',
    description: 'وصف 1',
    descriptionEn: 'Desc 1',
    type: 'Workshop',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 20,
    points: 10,
    hasCertificate: false,
    state: 'Published',
    registrationMode: 'Auto',
  });

  const emptySearch = await client.listEvents({ search: '' });
  assert.equal(emptySearch.totalCount, 1);

  const whitespaceSearch = await client.listEvents({ search: '    ' });
  assert.equal(whitespaceSearch.totalCount, 1);
});

test('Tier 2: Discovery Boundaries - Gibberish query returns empty results without throwing', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_b2', displayName: 'Admin', email: 'b2@qu.edu.sa', role: 'super_admin' });

  await client.createEvent(admin.uid, {
    title: 'هندسة الكهرباء',
    titleEn: 'Electrical Engineering',
    description: 'دوائر ومحولات',
    descriptionEn: 'Circuits and transformers',
    type: 'Lecture',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 2,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 30,
    points: 20,
    hasCertificate: false,
    state: 'Published',
    registrationMode: 'Auto',
  });

  const noMatch = await client.listEvents({ search: 'xyzqwertynonexistent123987' });
  assert.equal(noMatch.totalCount, 0);
  assert.equal(noMatch.events.length, 0);
});

test('Tier 2: Discovery Boundaries - Pagination offset exceeding total count returns empty array', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_b3', displayName: 'Admin', email: 'b3@qu.edu.sa', role: 'super_admin' });

  await client.createEvent(admin.uid, {
    title: 'فعالية مفردة',
    titleEn: 'Single Event',
    description: '1',
    descriptionEn: '1',
    type: 'Meetup',
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
    state: 'Published',
    registrationMode: 'Auto',
  });

  const outOfBounds = await client.listEvents({ offset: 999, limit: 10 });
  assert.equal(outOfBounds.events.length, 0);
  assert.equal(outOfBounds.totalCount, 1);
});

test('Tier 2: Discovery Boundaries - Search with Arabic text and mixed casing', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_b4', displayName: 'Admin', email: 'b4@qu.edu.sa', role: 'super_admin' });

  await client.createEvent(admin.uid, {
    title: 'الذكاء الاصطناعي التوليدي',
    titleEn: 'Generative AI & LLMs in Engineering',
    description: 'تطبيقات نماذج اللغة الكبيرة',
    descriptionEn: 'Applications of Large Language Models',
    type: 'Workshop',
    date: new Date(),
    location: 'المختبر',
    locationEn: 'Lab',
    durationHours: 3,
    gains: ['LLMs'],
    gainsEn: ['LLMs'],
    speakers: ['Speaker'],
    capacity: 40,
    points: 60,
    hasCertificate: true,
    state: 'Published',
    registrationMode: 'Auto',
  });

  // Mixed case english search
  const mixedCase = await client.listEvents({ search: 'gEnErAtIvE ai' });
  assert.equal(mixedCase.totalCount, 1);
  assert.equal(mixedCase.events[0].titleEn, 'Generative AI & LLMs in Engineering');

  // Substring Arabic search
  const arabicSub = await client.listEvents({ search: 'التوليدي' });
  assert.equal(arabicSub.totalCount, 1);
});

test('Tier 2: Discovery Boundaries - Non-matching event type filter returns empty array', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_b5', displayName: 'Admin', email: 'b5@qu.edu.sa', role: 'super_admin' });

  await client.createEvent(admin.uid, {
    title: 'ورشة عمل',
    titleEn: 'Workshop Only',
    description: 'ورشة',
    descriptionEn: 'Workshop',
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
    state: 'Published',
    registrationMode: 'Auto',
  });

  const filterCamp = await client.listEvents({ type: 'Camp' });
  assert.equal(filterCamp.totalCount, 0);
  assert.equal(filterCamp.events.length, 0);
});
