# Original User Request

## 2026-09-16T21:16:07Z

Prepare the IEEE Qassim platform (Next.js/Firebase) for a production launch to handle 300+ students. Secure Firestore rules, optimize SSR and query performance, test the complete user journey, and polish the UX.

Core Requirements & Acceptance Criteria:
1. Security & Data Integrity:
   - Audit and rewrite `firestore.rules` to explicitly deny unauthorized writes and secure admin routes. Enforce strict type checking and ownership rules for user data and events.
   - Acceptance: Script or agent-as-judge confirms `firestore.rules` blocks writes to `users` collection by anyone other than owner or admin. Admin routes (`/admin/*`) redirect or block non-admin users effectively.
2. Performance & Scalability:
   - Review all Server Components and database queries. Ensure queries for events and users (especially admin dashboard and homepage) do not trigger full collection scans (O(N) reads) and can handle 300+ concurrent users efficiently.
   - Acceptance: Verification script or QA agent verifies fetching homepage and registrations dashboard uses `limit()` or pagination (O(1) / bounded reads).
3. End-to-End User Journey QA:
   - Validate the entire lifecycle: Event Creation -> Student Registration -> Admin Bulk Approval -> QR Check-in -> Certificate Generation. Identify and fix any bugs that prevent this flow from completing.
   - Acceptance: Automated script successfully simulates creating an event, registering a mock user, updating status to `attended`, and generating a certificate record in Firestore without runtime errors.
4. UX and Vibe Polish:
   - Add robust fallback loading states (e.g. skeletons) and Error Boundaries for all major data-fetching components to ensure a premium mobile experience.
   - Acceptance: QA agent confirms presence of React `<Suspense>` boundaries or `loading.tsx` files for dynamic routes.
