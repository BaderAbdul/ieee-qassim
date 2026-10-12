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
const pastDate = Timestamp.fromMillis(Date.now() - 2 * 86400000);
await db.collection('events').doc('demo-completed').set({ title: 'لقاء المجتمع التجريبي', titleEn: 'Demo community meetup', description: 'فعالية مكتملة لاختبار عرض الحضور والشهادات في الحساب المحلي.', descriptionEn: 'Completed fixture for local attendance and certificate interface checks.', type: 'Meetup', state: 'Completed', date: pastDate, durationHours: 1, capacity: 50, registeredCount: 1, attendanceCount: 1, points: 25, hasCertificate: true, registrationMode: 'Auto', location: 'أونلاين', locationEn: 'Online', coverUrl: '/logo.png', createdAt: pastDate, updatedAt: Timestamp.now() });
await db.collection('registrations').doc('demo-completed_student').set({ eventId: 'demo-completed', userId: 'student', status: 'attended', timestamp: pastDate });
await db.collection('attendance_logs').doc('demo-completed_student').set({ eventId: 'demo-completed', userId: 'student', timestamp: pastDate });
await db.collection('point_transactions').doc('attendance_demo-completed_student').set({ userId: 'student', amount: 25, source: 'attendance', reason: 'حضور اللقاء التجريبي', sourceEventId: 'demo-completed', createdBy: 'organizer', createdAt: pastDate });
await db.collection('certificates').doc('certificate_demo-completed_student').set({ eventId: 'demo-completed', userId: 'student', status: 'Available', studentName: 'الطالب التجريبي', eventTitle: 'لقاء المجتمع التجريبي', eventType: 'Meetup', attendanceDate: pastDate, issueDate: pastDate, createdAt: pastDate, updatedAt: Timestamp.now(), externalUrl: 'https://certificate.example.test/demo-student', attemptCount: 0, issuedBy: 'organizer' });
await db.collection('events').doc('demo-link-only').set({ title: 'اختبار عبر الرابط فقط', titleEn: 'Link-only test', description: 'لا يظهر في القوائم العامة؛ الرابط المباشر يبقى متاحًا.', type: 'Other', state: 'Published', hideFromDiscovery: true, date: Timestamp.fromMillis(Date.now() + 3600000), durationHours: 1, capacity: 10, registeredCount: 0, attendanceCount: 0, points: 0, hasCertificate: false, registrationMode: 'Auto', location: 'معاينة محلية', createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
const batch = db.batch();
for (let i = 0; i < 123; i++) {
  const uid = `member-${String(i).padStart(3, '0')}`;
  batch.set(db.collection('users').doc(uid), { role: 'student', displayName: `عضو تجريبي ${i}`, email: `${uid}@example.test`, totalPoints: 0, profileCompleted: true });
  batch.set(db.collection('registrations').doc(`demo-workshop_${uid}`), { eventId: 'demo-workshop', userId: uid, userName: `عضو تجريبي ${i}`, userEmail: `${uid}@example.test`, status: 'approved', timestamp: Timestamp.fromMillis(Date.now() - 100000 + i * 100) });
}
await batch.commit();
await db.collection('settings').doc('homepage').set({ heroTitle: 'اكتشف. شارك. تطوّر.', heroSubtitleAr: 'المعاينة المحلية بأعضاء وفعاليات تجريبية.', heroSubtitleEn: 'Local preview with demo members and events.', showStructure: true, committees: [], structureRevision: 0 });
console.log('Local demo seeded: 125 members, 124 registrations, completed certificate and link-only event, no production access.');
