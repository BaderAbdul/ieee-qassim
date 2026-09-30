## 2026-09-30T14:58:02Z
You are Worker Gen3 for the IEEE QASSIM platform production readiness project.
Your dedicated working directory is:
/home/bader/Documents/IEEE QU SITE/.agents/worker_rc2prod_gen3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Discovery:
Milestone 1 was completed by Explorers 1, 2, 3:
- /home/bader/Documents/IEEE QU SITE/.agents/explorer_rc2prod_1/handoff.md
- /home/bader/Documents/IEEE QU SITE/.agents/explorer_rc2prod_2/handoff.md
- /home/bader/Documents/IEEE QU SITE/.agents/explorer_rc2prod_3/handoff.md
Execution Plan:
- /home/bader/Documents/IEEE QU SITE/.agents/orchestrator_rc2prod_gen3/plan.md

Your Responsibilities:
1. Waitlist FIFO Auto-Promotion & Capacity Race Condition Remediation:
   - In `functions/src/triggers/onRegistrationCancelled.ts`:
     Refactor to run inside `db.runTransaction()`.
     Within the transaction, read the event doc.
     Query the earliest waitlisted registration: `.where('eventId', '==', eventId).where('status', '==', 'waitlisted').orderBy('timestamp', 'asc').limit(1)`.
     If found, promote it atomically: set registration status to 'approved' (or 'pending' if eventData.registrationMode === 'Manual').
     Ensure registeredCount accurately reflects approved attendees and does not oversubscribe or allow queue-jumping.
   - In `firestore.indexes.json`:
     Add the missing composite indexes:
     - `registrations`: `(eventId ASC, status ASC, timestamp ASC)`
     - `mail`: `(status ASC, nextAttemptAt ASC)`

2. Attendance Token Generation & Point Deduplication:
   - In `functions/src/submitCheckIn.ts`:
     Deduplicate point awarding! Currently it increments `user.totalPoints` synchronously in the transaction AND writes a `point_transactions` doc, which triggers `onPointTransactionCreated.ts` to increment `totalPoints` again.
     Fix: Remove the direct `totalPoints` increment from `submitCheckIn.ts` OR align with `onPointTransactionCreated.ts` so that points are never awarded twice for the same check-in.
   - In `functions/src/onPointTransactionCreated.ts`:
     Support both `amount` and `points`: `const amount = typeof data.amount === 'number' ? data.amount : data.points;`.
     If neither is a valid number, log and return early.
   - In `src/app/[locale]/admin/events/[id]/checkin-desk/page.tsx`:
     Add UI action for organizers to generate or regenerate `checkinToken` (e.g. random token saved to `events/{id}.checkinToken`) if missing, so the displayed QR code and self-check-in link work out-of-the-box for newly created events.
   - In `src/app/[locale]/admin/events/[id]/registrations/page.tsx`:
     Fix `handleAwardPoints`: ensure the payload includes both `points: pointsAmount` and `amount: pointsAmount`, and uses `timestamp: serverTimestamp()`.

3. Broken Routes & Missing Not-Found Pages:
   - In `src/app/[locale]/events/[id]/page.tsx:462`:
     Fix broken link: change `/check-in/${event.id}` to `/events/${event.id}/checkin`.
   - In `src/app/[locale]/admin/events/page.tsx:159`:
     Fix broken link: change `/admin/events/${event.id}/qr` to `/admin/events/${event.id}/checkin-desk`.
   - Missing `not-found.tsx`:
     Create `src/app/not-found.tsx` and `src/app/[locale]/not-found.tsx` with clean bilingual (Arabic & English) styling, IEEE Qassim branding, RTL/LTR awareness, and navigation buttons back to safety.

4. Mail Queue & Environment Configuration:
   - In `functions/src/workers/processMailQueue.ts`:
     Guard `RESEND_API_KEY`: Move the API key check inside the event handler instead of throwing at top-level module load time.
   - Create `.env.example` documenting all required client and server environment variables (`NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `JWT_SECRET`, `RESEND_API_KEY`, `SENDER_EMAIL`).

5. Fix All ESLint Errors (Milestone 4):
   - In `src/app/[locale]/admin/page.tsx:224`: escape unescaped quotes/entities (`&apos;`, `&quot;`).
   - In `src/app/[locale]/admin/structure/page.tsx` & `src/components/ui/DigitalMemberCard.tsx`: replace `any` with proper TypeScript interfaces/types.
   - Ensure `npm run lint` finishes with 0 errors.

6. Test Harness Alignment & Comprehensive Verification:
   - In `tests/verify_e2e_journey.test.ts` & `tests/verify_remediations.test.ts`:
     Update stale path references that were looking for `qr/page.tsx` to `checkin-desk/page.tsx`.
     Update waitlist query assertions to recognize the Cloud Function trigger in `functions/src/triggers/onRegistrationCancelled.ts`.
   - Run compilation and tests:
     1. `cd functions && npm run build && cd ..`
     2. `npm run build`
     3. `npm run lint`
     4. `npx tsc --noEmit`
     5. `npm test`
   - All must pass cleanly!

7. Deliver Handoff:
   - Write `/home/bader/Documents/IEEE QU SITE/.agents/worker_rc2prod_gen3/handoff.md` with complete evidence, build/test logs, changed files, and verification steps.
   - Update `progress.md`.
   - Send completion message to parent.
