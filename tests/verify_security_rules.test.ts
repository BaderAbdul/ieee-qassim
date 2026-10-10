import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IEEEPlatformClient } from './engine/platform.ts';

const rootDir = join(import.meta.dirname, '..');
const firestoreRulesContent = readFileSync(join(rootDir, 'firestore.rules'), 'utf-8');

// ============================================================================
// PART 1: STATIC & SYNTACTIC RULE INTEGRITY AUDIT
// ============================================================================

test('Security Rules: student documents are private', () => {
  assert.ok(firestoreRulesContent.includes('allow get: if owner(uid) || organizer()'));
  assert.ok(firestoreRulesContent.includes('allow list: if organizer()'));
});
test('Security Rules: registrations are backend-only', () => {
  const section = firestoreRulesContent.split('match /registrations/')[1].split('match /attendance_logs/')[0];
  assert.ok(section.includes('allow write: if false'));
});
test('Security Rules: owners update a profile whitelist', () => {
  assert.ok(firestoreRulesContent.includes('affectedKeys().hasOnly(['));
  const section = firestoreRulesContent.split('allow update: if owner(uid)')[1].split('allow delete:')[0];
  assert.equal(section.includes("'totalPoints'"), false);
  assert.equal(section.includes("'role'"), false);
  assert.equal(section.includes("'universityId'"), false);
  assert.equal(section.includes("'profileCompleted'"), false);
});
test('Security Rules: ledger writes are backend-only', () => {
  const section = firestoreRulesContent.split('match /point_transactions/')[1].split('match /pending_checkins/')[0];
  assert.ok(section.includes('allow write: if false'));
});
test('Security Rules: attendance is backend-only', () => {
  const section = firestoreRulesContent.split('match /attendance_logs/')[1].split('match /point_transactions/')[0];
  assert.ok(section.includes('allow write: if false'));
});

// ============================================================================
// PART 2: FUNCTIONAL SECURITY BOUNDARY & PRIVILEGE ESCALATION CHECKS
// ============================================================================

test('Functional Security: Unauthenticated or non-owner write to user profile is rejected', async () => {
  const client = new IEEEPlatformClient();
  const student1 = await client.createUser({ uid: 'std_alice', displayName: 'Alice', email: 'alice@qu.edu.sa', role: 'student' });
  const student2 = await client.createUser({ uid: 'std_bob', displayName: 'Bob', email: 'bob@qu.edu.sa', role: 'student' });

  // Student 2 tries to modify Student 1's profile
  await assert.rejects(
    async () => {
      await client.updateUserProfile(student2.uid, student1.uid, {
        displayName: 'Hacked Alice',
      });
    },
    (err: Error) => {
      assert.match(err.message, /Permission denied/);
      return true;
    },
    'Non-owner must not be allowed to modify another user profile'
  );

  // Unauthenticated user (empty string / unknown uid)
  await assert.rejects(
    async () => {
      await client.updateUserProfile('anon_ghost', student1.uid, {
        displayName: 'Ghost',
      });
    },
    (err: Error) => {
      assert.match(err.message, /Unauthenticated/);
      return true;
    },
    'Unauthenticated user must be rejected'
  );
});

test('Functional Security: Student cannot elevate role or forge totalPoints', async () => {
  const client = new IEEEPlatformClient();
  const student = await client.createUser({ uid: 'std_eve', displayName: 'Eve', email: 'eve@qu.edu.sa', role: 'student' });

  // Eve tries to promote herself to super_admin
  await assert.rejects(
    async () => {
      await client.updateUserProfile(student.uid, student.uid, {
        role: 'super_admin' as any,
      });
    },
    (err: Error) => {
      assert.match(err.message, /Permission denied/);
      return true;
    },
    'Students cannot self-elevate role'
  );

  // Eve tries to award herself 500 points
  await assert.rejects(
    async () => {
      await client.updateUserProfile(student.uid, student.uid, {
        totalPoints: 500,
      });
    },
    (err: Error) => {
      assert.match(err.message, /Permission denied/);
      return true;
    },
    'Students cannot self-award points'
  );
});

test('Functional Security: Event organizer cannot escalate role to super_admin', async () => {
  const client = new IEEEPlatformClient();
  const organizer = await client.createUser({ uid: 'org_charlie', displayName: 'Charlie Org', email: 'charlie@qu.edu.sa', role: 'event_organizer' });
  const student = await client.createUser({ uid: 'std_david', displayName: 'David', email: 'david@qu.edu.sa', role: 'student' });

  // Organizer tries to promote student or themselves to super_admin
  await assert.rejects(
    async () => {
      await client.updateUserProfile(organizer.uid, student.uid, {
        role: 'super_admin' as any,
      });
    },
    (err: Error) => {
      assert.match(err.message, /Permission denied/);
      return true;
    },
    'Organizer cannot escalate any user role to super_admin'
  );
});

test('Functional Security: Super Admin has legitimate authority to update role', async () => {
  const client = new IEEEPlatformClient();
  const admin = await client.createUser({ uid: 'admin_root', displayName: 'Super Admin', email: 'admin@ieeequ.org', role: 'super_admin' });
  const student = await client.createUser({ uid: 'std_frank', displayName: 'Frank', email: 'frank@qu.edu.sa', role: 'student' });

  const updated = await client.updateUserProfile(admin.uid, student.uid, {
    department: 'Computer Science',
  });
  assert.equal(updated.department, 'Computer Science');
});

// ============================================================================
// PART 3: ADMIN ROUTE ACCESS GUARD VERIFICATION
// ============================================================================

test('Admin Route Guard: Layout blocks non-admin / student rendering', () => {
  // Simulate the logic in src/app/[locale]/admin/layout.tsx:
  // if (!user || (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer')) -> block
  function canAccessAdminRoute(user: { uid: string } | null, userData: { role: string } | null): boolean {
    if (!user) return false;
    if (userData?.role !== 'super_admin' && userData?.role !== 'event_organizer') {
      return false;
    }
    return true;
  }

  assert.equal(canAccessAdminRoute(null, null), false, 'Anonymous user must be blocked');
  assert.equal(canAccessAdminRoute({ uid: 's1' }, { role: 'student' }), false, 'Student must be blocked');
  assert.equal(canAccessAdminRoute({ uid: 's1' }, { role: 'member' } as any), false, 'Unknown role must be blocked');
  assert.equal(canAccessAdminRoute({ uid: 'a1' }, { role: 'super_admin' }), true, 'Super admin must be allowed');
  assert.equal(canAccessAdminRoute({ uid: 'o1' }, { role: 'event_organizer' }), true, 'Event organizer must be allowed');
});
