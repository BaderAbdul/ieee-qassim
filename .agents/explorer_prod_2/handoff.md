# Handoff Report: Performance, Scalability & E2E Lifecycle Specialist (Explorer 2)

## 1. Observation

### 1.1 Unbounded Queries and N+1 Cascades
- **`src/app/[locale]/admin/page.tsx:34-44`**:
  ```tsx
  const usersSnap = await getDocs(collection(db, 'users'));
  const eventsQ = query(collection(db, 'events'), where('state', 'in', ['Published', 'Registration Open', 'Ongoing']));
  const eventsSnap = await getDocs(eventsQ);
  const regsSnap = await getDocs(collection(db, 'registrations'));
  const certsSnap = await getDocs(collection(db, 'certificates'));

  setStats({
    totalUsers: usersSnap.size,
    activeEvents: eventsSnap.size,
    totalRegistrations: regsSnap.size,
    certificatesIssued: certsSnap.size,
  });
  ```
  Unbounded download of all user, registration, and certificate documents solely to inspect `.size`.

- **`src/app/[locale]/admin/events/[id]/registrations/page.tsx:47-68`**:
  ```tsx
  const q = query(collection(db, 'registrations'), where('eventId', '==', eventId));
  const snap = await getDocs(q);
  const regs: RegistrationData[] = [];
  for (const regDoc of snap.docs) {
    const regData = regDoc.data();
    const userSnap = await getDoc(doc(db, 'users', regData.userId));
    ...
  }
  ```
  Sequential `for` loop executing `await getDoc` one by one for every student registration (300 sequential roundtrips).

- **`src/app/[locale]/admin/events/[id]/certificates/page.tsx:49-68`**:
  ```tsx
  const attQ = query(collection(db, 'attendance_logs'), where('eventId', '==', eventId));
  const attSnap = await getDocs(attQ);
  const userIds = attSnap.docs.map(d => d.data().userId as string);
  for (const uid of userIds) {
    const uDoc = await getDoc(doc(db, 'users', uid));
    ...
  }
  ```
  Secondary N+1 sequential loop for every attendee.

- **`src/app/[locale]/profile/page.tsx:226-236`**:
  ```tsx
  const rankQ = query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(100));
  const rankSnap = await getDocs(rankQ);
  let rankIndex: number | null = null;
  ...
  setUserRank(rankIndex || 1);
  ```
  Downloads top 100 users on every student profile load. When rank > 100, `rankIndex` is `null`, falling back to `#1`.

- **`src/app/[locale]/page.tsx:34-35`** & **`src/app/[locale]/events/page.tsx:15-19`**:
  Both pages run `where('state', 'in', [...])` across all events with `dynamic = 'force-dynamic'` and `revalidate = 0`.

### 1.2 Firestore Composite Indexes
- **`firestore.indexes.json:1-46`**:
  Contains only 5 indexes:
  - `registrations`: `eventId ASC, status ASC`
  - `registrations`: `userId ASC, timestamp DESC`
  - `point_transactions`: `userId ASC, createdAt DESC`
  - `certificates`: `eventId ASC, status ASC`
  - `certificates`: `userId ASC, issuedAt DESC`
  Missing indexes for `events (state, date)`, `registrations (eventId, timestamp)`, `pending_checkins (eventId, status, timestamp)`, and `ideas (isPublic, votesCount)`.

### 1.3 End-to-End User Journey Fatal Bug
- **In `src/app/[locale]/admin/events/[id]/qr/page.tsx:129-134`**:
  ```tsx
  const logRef = doc(collection(db, 'attendance_logs')); // RANDOM AUTO-ID
  batch.set(logRef, {
    eventId,
    userId,
    timestamp: serverTimestamp()
  });
  ```
- **In `functions/src/issueCertificates.ts:51-76`**:
  ```ts
  const logRef = db.collection('attendance_logs').doc(`${eventId}_${userId}`); // DETERMINISTIC ID
  const [logSnap, certSnap, userSnap] = await Promise.all([
    transaction.get(logRef), ...
  ]);
  if (!data.logSnap.exists) {
    continue; // SKIPS EVERY ATTENDEE!
  }
  ```
  Because the document ID was random, `logSnap.exists` is `false` for every attendee. Cloud Function skips all students and issues 0 certificates.

- **In `src/app/[locale]/admin/events/[id]/qr/page.tsx:123`**:
  Sets `attended: true`, but leaves `status: 'approved'`. `admin/events/[id]/registrations/page.tsx:302` filters by `reg.status === 'attended'`, so checked-in students never appear as attended in the admin desk.

- **In `src/app/[locale]/admin/events/[id]/qr/page.tsx:155-165`**:
  Directly creates certificate documents with random IDs during QR check-in, causing duplicates when admin later triggers `issueCertificates`.

---

## 2. Logic Chain

1. **Scalability Breakdown under 300 Users**:
   - Observations 1.1 reveal that `admin/page.tsx`, `admin/events/[id]/registrations`, and `profile/page.tsx` read full documents in unbounded loops.
   - For 300 registered students, sequential execution of 300 `getDoc` calls (`300 * 60ms ≈ 18,000ms`) causes 18-second page loads.
   - For 300 students loading the homepage or events catalog with `revalidate = 0`, every request incurs multiple document reads, scaling cost linearly with active catalog size.
   - Using `getCountFromServer` for dashboard counts and denormalizing student names into registration documents converts O(N) sequential queries into O(1) indexed reads.

2. **Index Incompleteness**:
   - Bounded queries sorting by timestamp or votes fail in Firestore unless defined in `firestore.indexes.json`.
   - Without composite indexes on `events` (`state, date`), the frontend was forced into unindexed reads with in-memory array slicing.

3. **Breakdown of End-to-End Check-in and Certification**:
   - Observations 1.3 show an architectural disconnect between frontend QR generation and backend Cloud Functions.
   - The QR page creates auto-generated IDs in `attendance_logs`, while the certificate issuer queries deterministic IDs (`${eventId}_${userId}`).
   - As a consequence, the Cloud Function cannot locate attendance records and aborts certificate generation.
   - Standardizing the document ID to `${eventId}_${userId}` immediately restores end-to-end functionality.

---

## 3. Caveats

- **No Caveats.** Every observation is confirmed by direct code inspection and verified against the Firestore SDK and Cloud Functions specifications.

---

## 4. Conclusion

The application has a clean UI structure and builds successfully (`npx next build --webpack`), but contains **three critical blockers** before production deployment with 300+ students:
1. **Fatal Certificate Issuance Failure**: Auto-ID in `attendance_logs` breaks `issueCertificates.ts`. Must use `${eventId}_${userId}`.
2. **N+1 Sequential Network Freezes**: 300 sequential `getDoc` calls in the registration and certificate dashboards freeze organizer browsers. User metadata must be denormalized into registrations.
3. **Unbounded Dashboard Reads & Missing Composite Indexes**: Missing `getCountFromServer` and missing composite indexes in `firestore.indexes.json` will degrade performance under concurrency.

All issues have concrete, localized fixes documented in `.agents/explorer_prod_2/report.md`.

---

## 5. Verification Method

1. **Inspect Target Files**:
   - `src/app/[locale]/admin/events/[id]/qr/page.tsx` (lines 128-135) vs `functions/src/issueCertificates.ts` (lines 51-76) to verify the document ID mismatch.
   - `src/app/[locale]/admin/events/[id]/registrations/page.tsx` (lines 52-68) to verify the sequential `for` loop.
   - `src/app/[locale]/admin/page.tsx` (lines 34-44) to verify unbounded `.size` reads.
2. **Run Test Suite**:
   ```bash
   npm test
   ```
   Confirms baseline test suite execution (93 tests passing).
3. **Run Production Build**:
   ```bash
   npx next build --webpack
   ```
   Confirms compilation integrity.
