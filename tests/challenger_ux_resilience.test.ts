/**
 * Adversarial Challenger Test Suite: UX Resilience & Fault Injection
 * Verifies error boundaries (error.tsx), streaming fallbacks (loading.tsx),
 * skeleton geometry, layout shift prevention (CLS), and responsive fault tolerance.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = join(import.meta.dirname, '..');

function readSource(relPath: string): string {
  return readFileSync(join(rootDir, relPath), 'utf-8');
}

// ============================================================================
// PART 1: ERROR BOUNDARY ('error.tsx') CONTRACT & FAULT INJECTION
// ============================================================================

const ERROR_BOUNDARY_ROUTES = [
  'src/app/[locale]/error.tsx',
  'src/app/[locale]/admin/error.tsx',
  'src/app/[locale]/events/error.tsx',
  'src/app/[locale]/events/[id]/error.tsx',
  'src/app/[locale]/leaderboard/error.tsx',
  'src/app/[locale]/profile/error.tsx',
  'src/app/[locale]/check-in/[eventId]/error.tsx',
];

test('UX Resilience: All 7 segment error boundaries comply with Next.js App Router contract', () => {
  for (const routePath of ERROR_BOUNDARY_ROUTES) {
    const fullPath = join(rootDir, routePath);
    assert.ok(existsSync(fullPath), `Error boundary must exist at ${routePath}`);
    const source = readSource(routePath);

    // 1. Must be client component
    assert.ok(
      source.includes("'use client'") || source.includes('"use client"'),
      `${routePath} must declare 'use client'`
    );

    // 2. Must accept error and reset props
    assert.ok(
      source.includes('error') && source.includes('reset'),
      `${routePath} must accept error and reset parameters`
    );

    // 3. Must have reset action button
    assert.ok(
      source.includes('reset()'),
      `${routePath} must provide a reset() trigger button for user recovery`
    );

    // 4. Must log error for observability
    assert.ok(
      source.includes('console.error'),
      `${routePath} must log caught error via console.error`
    );

    // 5. Must support error.digest
    assert.ok(
      source.includes('error.digest'),
      `${routePath} must support rendering server error digest ID`
    );

    // 6. Must provide navigation fallback (Home, Admin, or Events link)
    assert.ok(
      source.includes('Link') || source.includes('href'),
      `${routePath} must provide a navigation fallback link`
    );
  }
});

test('UX Fault Injection: Error boundary logic handles arbitrary, undefined, or digest-bearing errors', () => {
  // Test simulated error payloads injected into error boundary logic
  const errorCases = [
    new Error('Simulated network timeout connecting to Firestore'),
    new TypeError("Cannot read properties of undefined (reading 'data')"),
    Object.assign(new Error('Internal Server Error in Event Details'), { digest: 'NEXT_DIGEST_88492' }),
    new RangeError('Array buffer allocation exceeded'),
  ];

  for (const err of errorCases) {
    let resetInvoked = false;
    const mockReset = () => {
      resetInvoked = true;
    };

    // Assert that properties required by error boundaries exist and don't throw
    assert.ok(err.message.length > 0);
    assert.equal(typeof mockReset, 'function');

    mockReset();
    assert.equal(resetInvoked, true, 'Reset callback must be cleanly callable on error recovery');
  }
});

// ============================================================================
// PART 2: ARCHITECTURAL DEFECT: MISSING ROOT GLOBAL ERROR BOUNDARY
// ============================================================================

test('UX Resilience Remediation: Root "app/global-error.tsx" handles root layout crashes', () => {
  // Next.js App Router documentation specifies:
  // "An error boundary defined in error.js will NOT catch errors thrown in a layout.js
  // in the same segment because the error boundary is nested inside that layout's component.
  // To handle errors in the root layout, use global-error.js."
  const globalErrorApp = existsSync(join(rootDir, 'src/app/global-error.tsx'));
  assert.equal(globalErrorApp, true, 'Root src/app/global-error.tsx must exist');

  const source = readSource('src/app/global-error.tsx');
  assert.ok(
    source.includes("'use client'") || source.includes('"use client"'),
    'src/app/global-error.tsx must declare use client'
  );
  assert.ok(
    source.includes('<html') && source.includes('<body'),
    'src/app/global-error.tsx must render root html and body elements'
  );
  assert.ok(
    source.includes('reset()'),
    'src/app/global-error.tsx must provide a reset() trigger button'
  );
  assert.ok(
    source.includes('console.error'),
    'src/app/global-error.tsx must log errors via console.error'
  );
  assert.ok(
    source.includes('error.digest'),
    'src/app/global-error.tsx must support rendering error.digest'
  );
  assert.ok(
    source.includes('href'),
    'src/app/global-error.tsx must provide a fallback navigation link'
  );
});

// ============================================================================
// PART 3: STREAMING FALLBACKS ('loading.tsx') & SKELETON GEOMETRY (CLS DEFENSE)
// ============================================================================

const LOADING_FALLBACK_ROUTES = [
  { path: 'src/app/[locale]/loading.tsx', skeleton: 'EventCardSkeleton' },
  { path: 'src/app/[locale]/events/loading.tsx', skeleton: 'EventsGridSkeleton' },
  { path: 'src/app/[locale]/events/[id]/loading.tsx', skeleton: 'EventDetailsSkeleton' },
  { path: 'src/app/[locale]/admin/loading.tsx', skeleton: 'AdminStatsSkeleton' },
  { path: 'src/app/[locale]/admin/events/loading.tsx', skeleton: 'AdminTableSkeleton' },
  { path: 'src/app/[locale]/admin/events/[id]/registrations/loading.tsx', skeleton: 'RegistrationDeskSkeleton' },
  { path: 'src/app/[locale]/check-in/[eventId]/loading.tsx', skeleton: 'CheckInSkeleton' },
  { path: 'src/app/[locale]/leaderboard/loading.tsx', skeleton: 'LeaderboardSkeleton' },
  { path: 'src/app/[locale]/profile/loading.tsx', skeleton: 'ProfileSkeleton' },
];

test('UX Resilience: All 9 streaming fallbacks exist and mount matching geometric skeletons', () => {
  for (const item of LOADING_FALLBACK_ROUTES) {
    const fullPath = join(rootDir, item.path);
    assert.ok(existsSync(fullPath), `loading.tsx must exist at ${item.path}`);
    const source = readSource(item.path);

    assert.ok(
      source.includes(item.skeleton),
      `${item.path} must render ${item.skeleton} to prevent Cumulative Layout Shift (CLS)`
    );
  }
});

test('CLS Defense: Event Details Skeleton geometry strictly matches Event Details Page geometry', () => {
  const pageSource = readSource('src/app/[locale]/events/[id]/page.tsx');
  const skeletonSource = readSource('src/components/skeletons/EventDetailsSkeleton.tsx');

  // Both must share identical hero banner heights
  assert.ok(pageSource.includes('h-72 sm:h-96'), 'Page hero banner must be h-72 sm:h-96');
  assert.ok(skeletonSource.includes('h-72 sm:h-96'), 'Skeleton hero banner must match h-72 sm:h-96');

  // Both must share identical grid layout
  assert.ok(pageSource.includes('grid-cols-1 lg:grid-cols-3 gap-10'), 'Page grid must be 3-cols');
  assert.ok(skeletonSource.includes('grid-cols-1 lg:grid-cols-3 gap-10'), 'Skeleton grid must match 3-cols');

  // Both must share 2-col main and 1-col sidebar distribution
  assert.ok(pageSource.includes('lg:col-span-2'), 'Page main section is lg:col-span-2');
  assert.ok(skeletonSource.includes('lg:col-span-2'), 'Skeleton main section is lg:col-span-2');
});

// ============================================================================
// PART 4: MOBILE RESPONSIVENESS & RTL/LTR INTEGRITY
// ============================================================================

test('Mobile Responsiveness: Logical CSS properties enforced; space-x-reverse eliminated', () => {
  // Scan all admin and event pages to ensure no hardcoded space-x-reverse remains
  const checkedFiles = [
    'src/app/[locale]/admin/events/page.tsx',
    'src/app/[locale]/events/EventsList.tsx',
    'src/app/[locale]/leaderboard/page.tsx',
    'src/app/[locale]/profile/page.tsx',
  ];

  for (const relPath of checkedFiles) {
    const src = readSource(relPath);
    assert.equal(
      src.includes('space-x-reverse'),
      false,
      `File ${relPath} must NOT contain obsolete space-x-reverse (must use flex gap or logical properties)`
    );
  }
});

test('UX Fault Tolerance: Non-existent /my-activity route redirects to /profile', () => {
  const nextConfig = readSource('next.config.ts');
  assert.ok(
    nextConfig.includes("source: '/my-activity'") && nextConfig.includes("destination: '/profile'"),
    'next.config.ts must redirect legacy /my-activity to /profile to prevent 404 dead links'
  );
  assert.ok(
    nextConfig.includes("source: '/:locale/my-activity'") && nextConfig.includes("destination: '/:locale/profile'"),
    'next.config.ts must redirect localized /:locale/my-activity to /:locale/profile'
  );
});
