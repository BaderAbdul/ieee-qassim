## 2026-09-30T14:40:34Z
You are Worker 1 (Remediation Worker - gen2 replacement).
Your working directory is: /home/bader/Documents/IEEE QU SITE/.agents/worker_rc2prod_remediation_gen2
Initialize your working directory and maintain your progress in progress.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

TASK:
You are assigned to implement core journey and backend operational remediations discovered during Milestone 1:

1. Double Points Bug Fix:
   - In functions/src/submitCheckIn.ts: Remove the duplicate direct increment of users.totalPoints in the transaction (lines ~119-122). Ensure point_transactions creation remains the single source of truth for point increments handled by onPointTransactionCreated. Ensure point_transactions doc includes both { amount: pointsToAward, points: pointsToAward, timestamp: serverTimestamp(), createdAt: serverTimestamp() } so it satisfies all schemas.
   - In functions/src/onPointTransactionCreated.ts: Accept both `amount` and `points` (`const amount = data.amount ?? data.points;`) and handle safely.

2. Waitlist Auto-Promotion & Missing Indexes:
   - In firestore.indexes.json: Add the two missing composite indexes:
     a) registrations: eventId ASC, status ASC, timestamp ASC
     b) mail: status ASC, nextAttemptAt ASC
   - In functions/src/triggers/onRegistrationCancelled.ts: Ensure promotion logic is robust and uses transaction/batch properly without race conditions.

3. Fix Broken 404 Links:
   - In src/app/[locale]/events/[id]/page.tsx: Line ~462 links to `/check-in/${event.id}` (deleted route). Change to localized `/${locale}/events/${event.id}/checkin` (or proper next-intl link to `/events/${event.id}/checkin`).
   - In src/app/[locale]/admin/events/page.tsx: Line ~159 links to `/admin/events/${event.id}/qr` (deleted route). Change to localized `/${locale}/admin/events/${event.id}/checkin-desk`.

4. Fix Registration Desk Points Mismatch:
   - In src/app/[locale]/admin/events/[id]/registrations/page.tsx: In handleAwardPoints (line ~199), provide both `timestamp: serverTimestamp()` and `createdAt: serverTimestamp()`, and `points: pointsAmount` and `amount: pointsAmount`.

5. Fix Mail Queue Worker Top-Level Error:
   - In functions/src/workers/processMailQueue.ts: Move the RESEND_API_KEY check inside the handler instead of throwing at top-level module load when FUNCTIONS_EMULATOR !== 'true'.

6. Create Missing Next.js Not Found Pages:
   - Create src/app/[locale]/not-found.tsx and src/app/not-found.tsx with appropriate IEEE Qassim theme, RTL/LTR support, and return-home action.

7. Create .env.example:
   - Create comprehensive .env.example documenting all client variables (NEXT_PUBLIC_FIREBASE_*), server admin variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY), and Cloud Functions secrets (JWT_SECRET, RESEND_API_KEY, SENDER_EMAIL).

8. Fix ESLint Errors:
   - src/app/[locale]/admin/page.tsx:224: Fix unescaped quote.
   - Fix explicit `any` in src/app/[locale]/admin/structure/page.tsx and src/components/ui/DigitalMemberCard.tsx.

9. Update Stale Test Paths:
   - In tests/verify_e2e_journey.test.ts and tests/verify_remediations.test.ts: Update tests looking for old deleted file `src/app/[locale]/admin/events/[id]/qr/page.tsx` to reference `src/app/[locale]/admin/events/[id]/checkin-desk/page.tsx`.
   - Ensure waitlist verification in tests recognizes the backend trigger onRegistrationCancelled.ts.

10. Automated Verification:
   - Run `npm run build` in root and in `functions/`.
   - Run `npm run lint`.
   - Run `npx tsc --noEmit`.
   - Run `npm test`.
   - Ensure all build and tests pass cleanly.

Deliver a detailed handoff report in:
/home/bader/Documents/IEEE QU SITE/.agents/worker_rc2prod_remediation_gen2/handoff.md
Once complete, send a message to parent with a summary and verification commands output.
