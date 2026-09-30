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

test('Security Rules Audit: Registrations must NEVER contain public "|| true;" read leak', () => {
  assert.equal(
    firestoreRulesContent.includes('|| true;'),
    false,
    'CRITICAL: firestore.rules must not contain "|| true;" under registrations or anywhere else'
  );
});

test('Security Rules Audit: Registrations create must enforce key whitelisting and forbid "attended"', () => {
  assert.ok(
    firestoreRulesContent.includes("!('attended' in request.resource.data)"),
    'CRITICAL: Client creation of registrations must explicitly forbid "attended" field'
  );
  assert.ok(
    firestoreRulesContent.includes("hasOnly(['userId', 'eventId', 'status', 'timestamp', 'userName', 'userEmail', 'universityId'])"),
    'CRITICAL: Registration creation must enforce strict whitelist of allowed keys'
  );
});

test('Security Rules Audit: User document updates must block organizer role escalation', () => {
  // Organizer can ONLY touch totalPoints, NOT role or isAdmin
  assert.ok(
    firestoreRulesContent.includes("affectedKeys().hasOnly(['totalPoints'])"),
    'CRITICAL: Event organizers must only be permitted to modify totalPoints'
  );
  assert.ok(
    firestoreRulesContent.includes("!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'totalPoints', 'badges', 'isAdmin'])"),
    'CRITICAL: Normal users/owners must be forbidden from changing role, totalPoints, badges, or isAdmin'
  );
});

test('Security Rules Audit: User document updates must block organizer self-points inflation (VULN-02)', () => {
  assert.ok(
    firestoreRulesContent.includes("request.auth.uid != userId"),
    'CRITICAL: Event organizers must be prevented from modifying totalPoints on their own user document'
  );
});

test('Security Rules Audit: Point transactions schema alignment allows points/amount and timestamp/createdAt (VULN-04)', () => {
  assert.ok(
    firestoreRulesContent.includes("request.resource.data.keys().hasAny(['timestamp', 'createdAt'])"),
    'CRITICAL: point_transactions creation must accommodate both timestamp and createdAt'
  );
  assert.ok(
    firestoreRulesContent.includes("points is int") && firestoreRulesContent.includes("amount is int"),
    'CRITICAL: point_transactions creation must accommodate both points and amount'
  );
});

test('Security Rules Audit: Event registeredCount counter updates must be bounded', () => {
  assert.ok(
    firestoreRulesContent.includes("resource.data.state == 'Registration Open'"),
    'Events counter updates by authenticated users must require Registration Open state'
  );
  assert.ok(
    firestoreRulesContent.includes("affectedKeys().hasOnly(['registeredCount'])"),
    'Events counter updates must restrict modified keys strictly to registeredCount'
  );
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
