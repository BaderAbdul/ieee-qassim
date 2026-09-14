# Task for Reviewer 2: Architecture, Security Rules & Cloud Functions Report Verification

## Identity
- Role: Reviewer (teamwork_preview_reviewer)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/reviewer_2

## Objective
Independently audit and review the architecture, security rules, and backend integration:
1. Review `firestore.rules` and `storage.rules`: verify privilege escalation prevention on user create, leaderboard query permissions, registration cancellation capacity permissions, and certificate download security.
2. Review event capacity management and registration cancellation transaction in `src/app/[locale]/events/[id]/page.tsx` and check-in `<Suspense>` wrap in `src/app/[locale]/check-in/[eventId]/page.tsx`.
3. Review `/home/bader/Documents/IEEE QU SITE/CLOUD_FUNCTIONS_REPORT.md` for completeness, technical accuracy, security rationale, and operational guidelines.
4. Verify that no duplicate database or backend architectures were introduced.
5. Execute verification commands:
   - `npm run lint`
   - `npm run build`
   - `npm test`
6. Issue your objective review verdict (APPROVE / VETO) with detailed observations.

## Output Requirements
Write your review report to `/home/bader/Documents/IEEE QU SITE/.agents/reviewer_2/review.md` and send a handoff message when done.
