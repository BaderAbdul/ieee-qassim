# Task for Reviewer 1: Frontend UI/UX, RTL/LTR & Engineering Profile Verification

## Identity
- Role: Reviewer (teamwork_preview_reviewer)
- Working Directory: /home/bader/Documents/IEEE QU SITE/.agents/reviewer_1

## Objective
Independently audit and review the frontend implementation and user experience:
1. Review `src/app/[locale]/layout.tsx`, `Navbar.tsx`, `Footer.tsx`, and `page.tsx` for navigation consistency, persistent header/footer, and language switcher (`ar` <-> `en`).
2. Review the Engineering Profile page (`src/app/[locale]/profile/page.tsx`) against requirements: student info, engineering major, gamification points, badges progression, attendance history, verified certificates, loading/empty states.
3. Review bilingual dictionaries `messages/ar.json` and `messages/en.json` for key parity and absence of hardcoded text in components.
4. Review RTL (Arabic) and LTR (English) compliance: Tailwind logical properties (`me-`, `ms-`, `text-start`, `text-end`, `start-`, `end-`) and font loading (Cairo, Inter).
5. Verify clean omission of Teams, Projects, and Challenges.
6. Execute verification commands:
   - `npm run lint`
   - `npm run build`
   - `npm test`
7. Issue your objective review verdict (APPROVE / VETO) with detailed observations.

## Output Requirements
Write your review report to `/home/bader/Documents/IEEE QU SITE/.agents/reviewer_1/review.md` and send a handoff message when done.
