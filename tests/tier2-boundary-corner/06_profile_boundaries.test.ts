import test from 'node:test';
import assert from 'node:assert/strict';
import { IEEEPlatformClient } from '../engine/platform.ts';

test('Tier 2: Profile Boundaries - Usernames with Arabic characters, special symbols, and emojis', async () => {
  const client = new IEEEPlatformClient();
  const complexName = 'م. عبد الرحمن بن سعود آل الشيخ ⚡ (IEEE Lead)';
  const student = await client.createUser({
    uid: 'std_complex_name',
    displayName: complexName,
    email: 'complex@qu.edu.sa',
    department: 'قسم الهندسة الميكانيكية والصناعية',
    universityId: '441999888',
  });

  const profile = await client.getUser(student.uid);
  assert.equal(profile?.displayName, complexName);
  assert.equal(profile?.department, 'قسم الهندسة الميكانيكية والصناعية');

  const publicProfile = await client.getPublicProfile(student.uid);
  assert.equal(publicProfile?.displayName, complexName);
});

test('Tier 2: Profile Boundaries - Brand new student has zero points and empty badge list safely', async () => {
  const client = new IEEEPlatformClient();
  const student = await client.createUser({
    uid: 'std_brand_new',
    displayName: 'New Student',
    email: 'new@qu.edu.sa',
  });

  const profile = await client.getUser(student.uid);
  assert.equal(profile?.totalPoints, 0);
  assert.deepEqual(profile?.badges, []);

  const activity = await client.getUserActivity(student.uid);
  assert.equal(activity.registrations.length, 0);
  assert.equal(activity.attendance.length, 0);
  assert.equal(activity.transactions.length, 0);
  assert.equal(activity.certificates.length, 0);
  assert.equal(activity.totalPoints, 0);
});

test('Tier 2: Profile Boundaries - Student attempt to self-elevate role to super_admin is blocked', async () => {
  const client = new IEEEPlatformClient();
  const student = await client.createUser({
    uid: 'std_privilege_escalation',
    displayName: 'Regular Student',
    email: 'escalate@qu.edu.sa',
    role: 'student',
  });

  // Student attempts to update their own role to super_admin
  await assert.rejects(
    async () => {
      await client.updateUserProfile(student.uid, student.uid, {
        role: 'super_admin',
      });
    },
    {
      message: 'Permission denied: cannot modify role or totalPoints directly.',
    }
  );

  const reloaded = await client.getUser(student.uid);
  assert.equal(reloaded?.role, 'student');
});

test('Tier 2: Profile Boundaries - Student attempt to alter totalPoints directly is blocked', async () => {
  const client = new IEEEPlatformClient();
  const student = await client.createUser({
    uid: 'std_points_cheat',
    displayName: 'Cheat Attempt',
    email: 'cheat@qu.edu.sa',
  });

  // Student attempts to directly grant themselves 10,000 points
  await assert.rejects(
    async () => {
      await client.updateUserProfile(student.uid, student.uid, {
        totalPoints: 10_000,
      });
    },
    {
      message: 'Permission denied: cannot modify role or totalPoints directly.',
    }
  );

  const reloaded = await client.getUser(student.uid);
  assert.equal(reloaded?.totalPoints, 0);
});

test('Tier 2: Profile Boundaries - Missing optional department and universityId defaults gracefully', async () => {
  const client = new IEEEPlatformClient();
  const student = await client.createUser({
    uid: 'std_minimal',
    displayName: 'Minimal Student',
    email: 'min@qu.edu.sa',
  });

  const profile = await client.getUser(student.uid);
  assert.equal(profile?.displayName, 'Minimal Student');
  assert.equal(profile?.department, undefined);
  assert.equal(profile?.universityId, undefined);

  const publicProfile = await client.getPublicProfile(student.uid);
  assert.ok(publicProfile);
  assert.equal(publicProfile?.department, undefined);
});
