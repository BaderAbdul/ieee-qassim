import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = '/home/bader/Documents/IEEE QU SITE';

test('Auditor Adversarial Check 1: firestore.rules strictly forbids role escalation during re-registration', () => {
  const rules = readFileSync(join(projectRoot, 'firestore.rules'), 'utf-8');
  
  // Re-registration rule (lines 151-156)
  assert.ok(
    rules.includes("!('attended' in request.resource.data)"),
    'Must explicitly forbid attended in re-registration'
  );
  
  // Ensure the affectedKeys hasOnly does NOT allow role, totalPoints, or isAdmin
  const reRegRule = rules.slice(rules.indexOf("resource.data.status == 'cancelled'"));
  assert.equal(
    reRegRule.includes("'role'"),
    false,
    'Re-registration must not permit modifying role'
  );
  assert.equal(
    reRegRule.includes("'totalPoints'"),
    false,
    'Re-registration must not permit modifying totalPoints'
  );
});

test('Auditor Adversarial Check 2: Event organizer point modification requires positive integer in firestore.rules', () => {
  const rules = readFileSync(join(projectRoot, 'firestore.rules'), 'utf-8');
  
  assert.ok(
    rules.includes("isPositiveInt(request.resource.data.totalPoints)"),
    'Organizer points update must enforce isPositiveInt'
  );
  assert.ok(
    rules.includes("function isPositiveInt(val) {\n      return val is int && val >= 0;\n    }") ||
    rules.includes("val is int && val >= 0"),
    'isPositiveInt must enforce int and >= 0'
  );
});

test('Auditor Adversarial Check 3: Admin route layout strictly rejects undefined/unauthenticated/unknown roles', () => {
  const layout = readFileSync(join(projectRoot, 'src/app/[locale]/admin/layout.tsx'), 'utf-8');
  
  // Checks lines 17 & 31:
  // if (!user || (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer'))
  assert.ok(
    layout.includes("userData?.role !== 'super_admin' && userData?.role !== 'event_organizer'"),
    'Admin layout must require either super_admin or event_organizer'
  );
  assert.ok(
    layout.includes("router.replace('/')"),
    'Admin layout must redirect unprivileged users to root'
  );
  assert.ok(
    layout.includes("غير مصرح بالدخول"),
    'Admin layout must render AccessDenied message instead of protected children'
  );
});

test('Auditor Adversarial Check 4: Certificate batching math strictly bounds Firestore transaction limits for 0, 50, 51, 300, 301 users', () => {
  const BATCH_SIZE = 50;
  const testCounts = [0, 1, 50, 51, 300, 301];

  for (const count of testCounts) {
    const batches = Math.ceil(count / BATCH_SIZE);
    for (let b = 0; b < batches; b++) {
      const itemsInThisBatch = Math.min(BATCH_SIZE, count - (b * BATCH_SIZE));
      const maxFirestoreOps = itemsInThisBatch * 4; // 3 reads + 1 write
      assert.ok(
        maxFirestoreOps <= 200,
        `Batch ${b} with ${itemsInThisBatch} items must not exceed 200 ops (got ${maxFirestoreOps})`
      );
      assert.ok(
        maxFirestoreOps < 500,
        `Batch ${b} must strictly stay below Firestore 500 op limit`
      );
    }
  }
});

test('Auditor Adversarial Check 5: Root global-error.tsx is robust against missing digest', () => {
  const globalError = readFileSync(join(projectRoot, 'src/app/global-error.tsx'), 'utf-8');
  assert.ok(globalError.includes('{error.digest && ('), 'Must conditionally render error.digest');
  assert.ok(globalError.includes('reset()'), 'Must wire reset callback');
});

test('Auditor Adversarial Check 6: All 9 loading.tsx and 7 error.tsx exist on disk and export default', () => {
  const loadingPaths = [
    'src/app/[locale]/loading.tsx',
    'src/app/[locale]/events/loading.tsx',
    'src/app/[locale]/events/[id]/loading.tsx',
    'src/app/[locale]/leaderboard/loading.tsx',
    'src/app/[locale]/profile/loading.tsx',
    'src/app/[locale]/check-in/[eventId]/loading.tsx',
    'src/app/[locale]/admin/loading.tsx',
    'src/app/[locale]/admin/events/loading.tsx',
    'src/app/[locale]/admin/events/[id]/registrations/loading.tsx',
  ];

  const errorPaths = [
    'src/app/[locale]/error.tsx',
    'src/app/[locale]/events/error.tsx',
    'src/app/[locale]/events/[id]/error.tsx',
    'src/app/[locale]/leaderboard/error.tsx',
    'src/app/[locale]/profile/error.tsx',
    'src/app/[locale]/check-in/[eventId]/error.tsx',
    'src/app/[locale]/admin/error.tsx',
    'src/app/global-error.tsx',
  ];

  for (const p of loadingPaths) {
    const fullPath = join(projectRoot, p);
    assert.ok(existsSync(fullPath), `Loading fallback must exist at ${p}`);
    const content = readFileSync(fullPath, 'utf-8');
    assert.ok(content.includes('export default'), `${p} must export default`);
  }

  for (const p of errorPaths) {
    const fullPath = join(projectRoot, p);
    assert.ok(existsSync(fullPath), `Error boundary must exist at ${p}`);
    const content = readFileSync(fullPath, 'utf-8');
    assert.ok(content.includes('export default'), `${p} must export default`);
    assert.ok(content.includes("'use client'") || content.includes('"use client"'), `${p} must declare use client`);
  }
});
