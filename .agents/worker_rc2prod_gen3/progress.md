# Progress — Worker Gen3

Last visited: 2026-09-30T14:58:20Z

## Status
Starting investigation and reviewing execution plan & discovery handoffs.

## Checklist
- [ ] 0. Review discovery handoffs & plan
- [ ] 1. Waitlist FIFO Auto-Promotion & Indexes
  - [ ] Refactor `functions/src/triggers/onRegistrationCancelled.ts` with `db.runTransaction()`
  - [ ] Add composite indexes in `firestore.indexes.json`
- [ ] 2. Attendance Token & Point Deduplication
  - [ ] Deduplicate points in `functions/src/submitCheckIn.ts`
  - [ ] Support `amount` & `points` in `functions/src/onPointTransactionCreated.ts`
  - [ ] Add checkinToken generation UI in `src/app/[locale]/admin/events/[id]/checkin-desk/page.tsx`
  - [ ] Fix `handleAwardPoints` in `src/app/[locale]/admin/events/[id]/registrations/page.tsx`
- [ ] 3. Broken Routes & Missing Not-Found Pages
  - [ ] Fix link in `src/app/[locale]/events/[id]/page.tsx`
  - [ ] Fix link in `src/app/[locale]/admin/events/page.tsx`
  - [ ] Create `src/app/not-found.tsx` and `src/app/[locale]/not-found.tsx`
- [ ] 4. Mail Queue & Environment Configuration
  - [ ] Guard `RESEND_API_KEY` in `functions/src/workers/processMailQueue.ts`
  - [ ] Create `.env.example`
- [ ] 5. Fix ESLint Errors
  - [ ] Unescaped entities in `src/app/[locale]/admin/page.tsx`
  - [ ] Type fixes in `src/app/[locale]/admin/structure/page.tsx` and `src/components/ui/DigitalMemberCard.tsx`
  - [ ] Verify `npm run lint` passes with 0 errors
- [ ] 6. Test Harness Alignment & Verification
  - [ ] Update `tests/verify_e2e_journey.test.ts`
  - [ ] Update `tests/verify_remediations.test.ts`
  - [ ] Run `cd functions && npm run build`
  - [ ] Run `npm run build`, `npm run lint`, `npx tsc --noEmit`, `npm test`
- [ ] 7. Handoff & Completion
