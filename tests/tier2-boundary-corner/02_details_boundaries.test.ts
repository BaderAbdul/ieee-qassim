import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 2: Details Boundaries - Zero capacity event displays as immediately full', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_db1', displayName: 'Admin', email: 'db1@qu.edu.sa', role: 'super_admin' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية صفرية السعة',
    titleEn: 'Zero Capacity Event',
    description: 'فعالية مغلقة مسبقاً',
    descriptionEn: 'Pre-filled event',
    type: 'Meetup',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 0,
    points: 10,
    hasCertificate: false,
    state: 'Registration Open',
    registrationMode: 'Auto',
  });

  const details = await client.getEventDetails(event.id);
  assert.equal(details.isFull, true);
  assert.equal(details.availableSeats, 0);
  assert.equal(details.attendeeCount, 0);
});

test('Tier 2: Details Boundaries - Non-existent event ID cleanly throws Event not found', async () => {
  const client = new IEEEPlatformClient();
  await assert.rejects(
    async () => {
      await client.getEventDetails('non_existent_event_id_99999');
    },
    {
      message: 'Event not found.',
    }
  );
});

test('Tier 2: Details Boundaries - Empty speakers and gains lists handle without undefined errors', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_db2', displayName: 'Admin', email: 'db2@qu.edu.sa', role: 'super_admin' });

  const event = await client.createEvent(admin.uid, {
    title: 'فعالية بدون متحدثين',
    titleEn: 'Event Without Speakers',
    description: 'فعالية ذاتية',
    descriptionEn: 'Self-guided',
    type: 'Challenge',
    date: new Date(),
    location: 'أونلاين',
    locationEn: 'Online',
    durationHours: 2,
    gains: [],
    gainsEn: [],
    speakers: [],
    capacity: 50,
    points: 25,
    hasCertificate: false,
    state: 'Published',
    registrationMode: 'Auto',
  });

  const details = await client.getEventDetails(event.id);
  assert.ok(Array.isArray(details.event.speakers));
  assert.equal(details.event.speakers.length, 0);
  assert.ok(Array.isArray(details.event.gains));
  assert.equal(details.event.gains.length, 0);
});

test('Tier 2: Details Boundaries - Massive string description handles without truncation error', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_db3', displayName: 'Admin', email: 'db3@qu.edu.sa', role: 'super_admin' });

  const massiveDescription = 'IEEE Qassim Engineering Community '.repeat(500); // 17,500 characters
  const event = await client.createEvent(admin.uid, {
    title: 'فعالية بوصف ضخم',
    titleEn: 'Massive Description Event',
    description: massiveDescription,
    descriptionEn: massiveDescription,
    type: 'Lecture',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 1,
    gains: ['Long Read'],
    gainsEn: ['Long Read'],
    speakers: ['Author'],
    capacity: 20,
    points: 10,
    hasCertificate: false,
    state: 'Published',
    registrationMode: 'Auto',
  });

  const details = await client.getEventDetails(event.id);
  assert.equal(details.event.description.length, massiveDescription.length);
  assert.equal(details.event.description, massiveDescription);
});

test('Tier 2: Details Boundaries - Fractional duration hours handle correctly', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'org_db4', displayName: 'Admin', email: 'db4@qu.edu.sa', role: 'super_admin' });

  const event = await client.createEvent(admin.uid, {
    title: 'جلسة توجيهية سريعة',
    titleEn: 'Lightning Orientation Session',
    description: 'جلسة لمدة نصف ساعة',
    descriptionEn: '30-minute quick orientation',
    type: 'Meetup',
    date: new Date(),
    location: '1',
    locationEn: '1',
    durationHours: 0.5,
    gains: ['Quick Intro'],
    gainsEn: ['Quick Intro'],
    speakers: ['Advisor'],
    capacity: 30,
    points: 10,
    hasCertificate: false,
    state: 'Published',
    registrationMode: 'Auto',
  });

  const details = await client.getEventDetails(event.id);
  assert.equal(details.event.durationHours, 0.5);
});
