import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

async function runTests() {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-ieee-qu-site',
    firestore: {
      rules: readFileSync(resolve(__dirname, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });

  const studentContext = testEnv.authenticatedContext('student1', { email: 'student1@qu.edu.sa', role: 'student' });
  const adminContext = testEnv.authenticatedContext('admin1', { email: 'admin1@qu.edu.sa', role: 'super_admin' });
  const organizerContext = testEnv.authenticatedContext('organizer1', { email: 'org1@qu.edu.sa', role: 'event_organizer' });

  // Test 1: Students cannot modify totalPoints
  console.log('Test 1: Students cannot modify totalPoints directly');
  await assertFails(studentContext.firestore().collection('users').doc('student1').update({
    totalPoints: 1000
  }));
  console.log('✅ Passed');

  // Test 2: Students cannot create point transactions
  console.log('Test 2: Students cannot create point transactions');
  await assertFails(studentContext.firestore().collection('point_transactions').doc('tx1').set({
    userId: 'student1',
    amount: 50,
    source: 'manual_adjustment',
    reason: 'Hacked the points'
  }));
  console.log('✅ Passed');
  
  // Test 3: Admins cannot create point transactions directly (must go through Cloud Functions)
  console.log('Test 3: Admins cannot create point transactions directly');
  await assertFails(adminContext.firestore().collection('point_transactions').doc('tx2').set({
    userId: 'student1',
    amount: 50,
    source: 'manual_adjustment',
    reason: 'Awarded points'
  }));
  console.log('✅ Passed');

  // Test 4: Organizers can read point transactions
  console.log('Test 4: Organizers can read point transactions');
  await assertSucceeds(organizerContext.firestore().collection('point_transactions').get());
  console.log('✅ Passed');

  console.log('All security tests passed!');
  process.exit(0);
}

runTests().catch(console.error);
