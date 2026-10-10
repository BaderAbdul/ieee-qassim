import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') throw new Error('Explicit local demo emulators are required.');
initializeApp({ projectId: 'demo-ieee-qu' });
const db = getFirestore();
for (const [uid, role, name] of [['organizer', 'super_admin', 'المنظم التجريبي'], ['student', 'student', 'الطالب التجريبي']]) {
  try { await getAuth().createUser({ uid, email: `${uid}@example.test`, password: 'demo-local-password', displayName: name }); }
  catch (error) { if (error.code !== 'auth/uid-already-exists') throw error; }
  await db.collection('users').doc(uid).set({ role, email: `${uid}@example.test`, displayName: name, arabicFullName: name, firstName: 'بدر', fatherName: 'عبدالله', familyName: 'التجريبي', isQassimStudent: false, profileCompleted: true, totalPoints: uid === 'student' ? 25 : 0, createdAt: Timestamp.now() });
}
await db.collection('public_profiles').doc('student').set({ arabicFullName: 'الطالب التجريبي', role: 'student', totalPoints: 25 });
await db.collection('events').doc('demo-workshop').set({ title: 'ورشة الأنظمة الذكية', titleEn: 'Intelligent systems workshop', description: 'تطبيقات عملية في البرمجة والأنظمة الذكية، مع تمارين بإشراف الفريق.', descriptionEn: 'Hands-on programming and intelligent systems exercises with the team.', type: 'Workshop', state: 'Registration Open', date: Timestamp.fromMillis(Date.now() + 86400000), durationHours: 2, capacity: 200, registeredCount: 123, attendanceCount: 0, points: 10, hasCertificate: true, registrationMode: 'Auto', location: 'جامعة القصيم', locationEn: 'Qassim University', gains: ['تطبيق عملي', 'تعاون الفريق'], gainsEn: ['Hands-on experience', 'Teamwork'], speakers: ['فريق IEEE'], createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
const batch = db.batch();
for (let i = 0; i < 123; i++) {
  const uid = `member-${String(i).padStart(3, '0')}`;
  batch.set(db.collection('users').doc(uid), { role: 'student', displayName: `عضو تجريبي ${i}`, email: `${uid}@example.test`, totalPoints: 0, profileCompleted: true });
  batch.set(db.collection('registrations').doc(`demo-workshop_${uid}`), { eventId: 'demo-workshop', userId: uid, userName: `عضو تجريبي ${i}`, userEmail: `${uid}@example.test`, status: 'approved', timestamp: Timestamp.fromMillis(Date.now() - 100000 + i * 100) });
}
await batch.commit();
await db.collection('settings').doc('homepage').set({ heroTitle: 'اكتشف. شارك. تطوّر.', heroSubtitleAr: 'المعاينة المحلية بأعضاء وفعاليات تجريبية.', heroSubtitleEn: 'Local preview with demo members and events.', showStructure: true, committees: [], structureRevision: 0 });
console.log('Local demo seeded: 125 members, 123 registrations, no production access.');
