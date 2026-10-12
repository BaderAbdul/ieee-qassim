# Mobile experience implementation — 12 October 2026

Branch: `codex/mobile-experience`. Based on production commit `26f9885`.

## Implemented

- Labelled mobile bottom navigation, an accessible More menu, visible guest sign-in, permission-aware administration entry and locale switching.
- Cairo/Inter body typography, Thmanyah Arabic headings, keyboard focus styles, reduced-motion support and bottom safe-area clearance.
- A shorter, higher-contrast footer. Suggestions now open from More/footer in a native modal rather than covering page content.
- Homepage cards no longer overlap or require a second tap. Upcoming/ongoing events appear before a separate completed-events archive. Loading and unavailable rank/activity states are explicit.
- Compact event cards and filters, readable metadata, attendance points/certificate badges, and secondary Ideas navigation. Loaded-page search, URL filters and pagination remain available.
- Event information and registration actions precede the poster on mobile. The full poster uses a contain-fit modal with a direct original-image link. Registration loading/error is separate from event loading.
- A compact account summary with wrapped names, explicit actions, optional QR expansion, and separate registration/points/certificate/rank states.
- Membership QR links use the configured HTTPS public origin and a valid locale. Common major names are translated for display without rewriting stored values.
- Registration date is labelled separately from event date. Certificate actions say View/Open certificate, retain user-click opening, and discard expired or superseded links. Account state is isolated by member/locale.
- Compact leaderboard rows, shared ranks for tied balances and a You indicator including podium members.
- Organizers can set `hideFromDiscovery` in event creation/editing. This removes an event from public discovery lists without deleting its permalink, registrations, attendance or certificates. It is not access control. Existing events lacking the flag remain listed; no title-based guesses or production-record changes were made.

## Verification

- General regression suite: **166/166 passed**. This includes simulated feature tests, static source assertions and pure-function regressions; it is not a claim of 166 live browser journeys.
- Production build and TypeScript: **passed**.
- Isolated traced server bundles: **passed**; media/platform endpoints start and reject unauthenticated requests with structured responses.
- ESLint for all changed source components/services: **passed**.
- Built API integration suite: **30/30 passed** with isolated `demo-ieee-qu` Auth/Firestore emulators. Tests exercise registration capacity/FIFO/cancellation, duplicate check-in protection, atomic points, permission boundaries, event metadata preservation and certificates.
- Arabic PDF generation runs in the integration test; Cloudinary/email responses are mocked. Provider delivery and a real phone camera are not claimed as tested here.
- Homepage browser DOM and desktop rendering were inspected locally. At 390px, the measured document width matched the viewport width. Browser input/screenshot commands subsequently timed out and the browser became unavailable; authenticated responsive interactions and poster/modal visual QA remain to be completed in the preview/manual check.

## Deployment boundaries

- Firebase Spark, Cloudinary and current hosting remain unchanged. No new services, plans, secrets, rules or indexes were added.
- No production member/event records were changed or removed during implementation.
- Preview currently lacks production-only Firebase Admin/Cloudinary credentials. It can be reviewed for public presentation, but should not be used to judge authenticated server operations or to perform production writes. Do not copy production secrets merely to enable a preview.
- Keep the production release unchanged until preview approval. A normal merge/push can publish the reviewed feature; rollback should revert that feature commit without deleting historical records.
- The pre-existing local change in `SPARK_RELEASE_REPORT.md` belongs to the user and is not part of this feature.
