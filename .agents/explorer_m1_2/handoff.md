# Handoff Report: Explorer 2 (Architecture, Firebase, Rules & Cloud Functions Audit)

## 1. Observation
- **Privilege Escalation in `firestore.rules:27`**:
  `match /users/{userId} { allow create: if isOwner(userId); ... }`.
  No check exists for `role` or `totalPoints` upon initial document creation.
- **Leaderboard Read Failure in `firestore.rules:25` & `src/app/[locale]/leaderboard/page.tsx:28`**:
  `allow read: if isOwner(userId) || isEventOrganizer();` blocks non-organizer students from executing collection queries (`getDocs(query(collection(db, 'users'), orderBy('totalPoints', 'desc')))`).
- **Runtime Crash in `functions/src/generateCertificate.ts:34-35`**:
  `const fontRegularPath = path.join(__dirname, '../../src/assets/fonts/Cairo-Regular.ttf');`
  Resolves to `<root>/src/assets/fonts/` at runtime from `functions/lib/`, which does not exist, causing uncaught `ENOENT` failure during PDF certificate generation.
- **Build Failure in `functions/` and Root `next build`**:
  `npm --prefix functions run build` fails with 85 type errors due to missing `firebase-functions` and `firebase-admin` in `functions/node_modules`.
  Root `tsconfig.json` includes `**/*.ts` without excluding `functions/`, causing root `next build` to fail typechecking.
- **Capacity Counter Leak in `src/app/[locale]/events/[id]/page.tsx:108-117`**:
  Cancelling a registration sets `status: 'cancelled'` but does not decrement `events/{eventId}.registeredCount`.
- **Storage Rules (`storage.rules:5`)**:
  `allow read, write: if false;` applies to all paths. Certificate access is 100% dependent on backend signed URL generation (`getCertificateDownloadUrl`).

## 2. Logic Chain
1. *Privilege Escalation*: Because `firestore.rules` checks only `isOwner(userId)` on `create`, any newly registered student calling `setDoc(userRef, { role: 'super_admin' })` passes evaluation. Once `role` is `'super_admin'`, helper functions `isSuperAdmin()` and `isEventOrganizer()` return true across all collections.
2. *Leaderboard Denial*: In Cloud Firestore, security rules evaluate queries against the rule applied to all possible returned documents. Because non-admin users cannot read other users' documents, Firestore rejects the unconstrained `users` query with `permission-denied`.
3. *Font Path Crash*: Puppeteer executes inside Cloud Functions using files compiled into `functions/lib/`. Because `__dirname` is `functions/lib/`, moving two levels up points to the repository root instead of `functions/`. Consequently, `fs.readFileSync(fontRegularPath)` throws an unhandled error.
4. *Next.js Build Failure*: Root `tsconfig.json` glob `"**/*.ts"` matches `functions/src/**/*.ts`. Because `firebase-functions` is not in root `node_modules`, type checking fails during `next build`.
5. *Capacity Exhaustion*: The event registration transaction locks on `registeredCount >= capacity`. Since cancellations never decrement `registeredCount`, cancelled spots remain counted as occupied, eventually blocking registrations indefinitely.

## 3. Caveats
- Firebase Auth Blocking functions (`authBlocking.ts`) were examined statically; they require Firebase Authentication with Identity Platform enabled in Google Cloud Console.
- Resend email delivery was tested against simulated emulator mock mode; production delivery requires setting the `RESEND_API_KEY` secret.
- No other network or external database dependencies were uncovered beyond Firebase and Resend.

## 4. Conclusion
The IEEE Qassim Platform has a coherent distributed architecture (transactions, deterministic IDs, immutable audit ledgers, signed URLs), but requires immediate remediation of:
1. `firestore.rules` to prevent `super_admin` self-escalation and restore leaderboard access.
2. Font file path resolution and font asset copying in `functions/`.
3. Root `tsconfig.json` exclusion of `functions/` to restore `next build` success.
4. Event capacity decrementing logic upon registration cancellation.
A detailed analysis is documented in `report.md`.

## 5. Verification Method
1. **Verify Privilege Escalation Risk**:
   Inspect `firestore.rules` lines 26–29 using `view_file` to confirm lack of field restrictions on `create`.
2. **Verify Font Path Issue**:
   Inspect `functions/src/generateCertificate.ts` lines 34–37 and note path traversal relative to `functions/lib/`.
3. **Verify Build Error**:
   Run `npm --prefix functions run build` or `npm run build` to observe typecheck failure on `functions/src/*.ts`.
4. **Verify Capacity Leak**:
   Inspect `handleCancelRegistration` in `src/app/[locale]/events/[id]/page.tsx` lines 102–123 to confirm absence of `events.registeredCount` decrement.
