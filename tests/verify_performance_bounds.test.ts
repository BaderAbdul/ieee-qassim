import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = join(import.meta.dirname, '..');

function readSource(relPath: string): string {
  return readFileSync(join(rootDir, relPath), 'utf-8');
}

test('Performance Bounds: Homepage enforces limit() on events query', () => {
  const content = readSource('src/app/[locale]/page.tsx');
  assert.match(
    content,
    /limit\(\s*\d+\s*\)/,
    'Homepage events query must include limit() to prevent downloading all events'
  );
});

test('Performance Bounds: Events catalog page enforces limit() on queries', () => {
  const content = readSource('src/app/[locale]/events/page.tsx');
  assert.match(
    content,
    /limit\(\s*\d+\s*\)/,
    'Events catalog query must include limit() to prevent unbounded full-table scans'
  );
});

test('Performance Bounds: Admin Dashboard uses getCountFromServer for O(1) aggregations', () => {
  const content = readSource('src/app/[locale]/admin/page.tsx');
  assert.ok(
    content.includes('getCountFromServer'),
    'Admin dashboard must use getCountFromServer for users, registrations, and certificates'
  );
  assert.ok(
    content.includes("getCountFromServer(collection(db, 'users'))"),
    'Admin dashboard must count users with getCountFromServer'
  );
  assert.ok(
    content.includes("getCountFromServer(collection(db, 'registrations'))"),
    'Admin dashboard must count registrations with getCountFromServer'
  );
  assert.ok(
    content.includes("getCountFromServer(collection(db, 'certificates'))"),
    'Admin dashboard must count certificates with getCountFromServer'
  );
});

test('Performance Bounds: Admin Registrations Desk eliminates sequential N+1 network waterfall', () => {
  const content = readSource('src/app/[locale]/admin/events/[id]/registrations/page.tsx');
  
  // Verify sequential loop over snap.docs with await getDoc is eliminated
  const hasSequentialLoop = /for\s*\(\s*const\s+\w+\s+of\s+snap\.docs\s*\)\s*\{[^}]*await\s+getDoc/s.test(content);
  assert.equal(
    hasSequentialLoop,
    false,
    'Admin registrations desk must NOT perform sequential await getDoc in a for-loop'
  );

  assert.ok(
    content.includes('Promise.all'),
    'Admin registrations desk must use parallel Promise.all for fetching missing user records'
  );
});

test('Performance Bounds: Admin Certificates Desk parallelizes attendee user fetching', () => {
  const content = readSource('src/app/[locale]/admin/events/[id]/certificates/page.tsx');
  
  const hasSequentialLoop = /for\s*\(\s*const\s+uid\s+of\s+userIds\s*\)\s*\{[^}]*await\s+getDoc/s.test(content);
  assert.equal(
    hasSequentialLoop,
    false,
    'Admin certificates desk must NOT sequentially await getDoc for each attendee'
  );

  assert.ok(
    content.includes('Promise.all'),
    'Admin certificates desk must use Promise.all to fetch attendee user profiles concurrently'
  );
});

test('Performance Bounds: User Profile page computes rank using getCountFromServer', () => {
  const content = readSource('src/app/[locale]/profile/page.tsx');
  assert.ok(
    content.includes('getCountFromServer'),
    'Profile page must compute community rank via getCountFromServer aggregation'
  );
  assert.ok(
    content.includes("where('totalPoints', '>', myPoints)"),
    'Profile rank calculation must count users with strictly higher points'
  );
});

test('Performance Bounds: Composite indexes defined in firestore.indexes.json', () => {
  const indexesJson = JSON.parse(readSource('firestore.indexes.json'));
  const indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string; order: string }> }> = indexesJson.indexes;

  // Check events state + date index
  const hasEventsDateIndex = indexes.some(
    idx => idx.collectionGroup === 'events' &&
    idx.fields.some(f => f.fieldPath === 'state') &&
    idx.fields.some(f => f.fieldPath === 'date')
  );
  assert.ok(hasEventsDateIndex, 'firestore.indexes.json must contain events (state, date) composite index');

  // Check registrations eventId + timestamp index
  const hasRegTimestampIndex = indexes.some(
    idx => idx.collectionGroup === 'registrations' &&
    idx.fields.some(f => f.fieldPath === 'eventId') &&
    idx.fields.some(f => f.fieldPath === 'timestamp')
  );
  assert.ok(hasRegTimestampIndex, 'firestore.indexes.json must contain registrations (eventId, timestamp) composite index');

  // Check pending_checkins eventId + status + timestamp index
  const hasPendingCheckinIndex = indexes.some(
    idx => idx.collectionGroup === 'pending_checkins' &&
    idx.fields.some(f => f.fieldPath === 'eventId') &&
    idx.fields.some(f => f.fieldPath === 'status')
  );
  assert.ok(hasPendingCheckinIndex, 'firestore.indexes.json must contain pending_checkins composite index');
});
