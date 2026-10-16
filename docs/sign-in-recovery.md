# Sign-in and session recovery

User reports: returning to the home page looking signed out, or a white screen after Google sign-in that recovered on refresh. The exact production/device failures were not available to reproduce. Code review found several weaknesses matching those symptoms, now addressed:

- Removed the forced `browserLocalPersistence` call. The installed Firebase SDK's `getAuth` already selects IndexedDB, local or session storage and falls back to memory when storage is unavailable. A browser rejecting localStorage must not prevent the auth observer from attaching.
- Auth observation starts without awaiting `getRedirectResult`. A stale redirect failure cannot erase a valid restored or popup session. Redirect errors remain visible when the user is genuinely signed out.
- Session/profile callbacks carry a generation. Callbacks, transaction results and failures from a previous account or unmounted provider cannot replace the current account. Duplicate notifications for the same account do not clear the loaded profile.
- An empty local profile cache does not create a replacement profile. Creation only follows server-confirmed absence, runs once, preserves existing profiles/roles transactionally, and resolves the loading state without waiting for another snapshot. A later subscription update wins over an older creation result.
- Login modules are prepared during startup. Google popup opening happens directly in the click handler, before awaiting imports. Repeated clicks are ignored while a login is active. Cancellation leaves the user on the original page.
- Only a blocked popup may fall back to redirect, and only when `authDomain` matches the current site host. Network, authorization and storage errors do not automatically send the user through another redirect. With cross-domain helpers, a blocked popup shows a retry/allow-popup message instead of silently losing the session.
- Same-origin redirect attempts preserve a validated path, query, locale and hash, expire after 15 minutes, and recover the original destination after the profile is ready. Unsafe/external destinations are rejected. Profile setup also preserves `returnTo`, including for super admins.
- Startup/profile loading has a 15-second watchdog and a visible retry that does not sign the user out. Layout/session exceptions have an independent bilingual recovery boundary. Root route errors use the installed Next.js `retry()` API to re-fetch content, rather than only clearing error state.

## Deployment checks

Deploy the web app with the existing Firebase credentials. Popup sign-in does not require changing Firebase projects, weakening browser protections, or altering account data.

If automatic redirect fallback is desired, configure same-origin auth helpers first: set the site's domain as `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, proxy `/__/auth/*` to the project's Firebase Hosting auth helper (the repository already has a rewrite), authorize the domain in Firebase Authentication, and add the corresponding `https://<site-domain>/__/auth/handler` redirect URI to the Google OAuth client. Do not change only the environment variable without the matching console configuration. Verify each production hostname users actually use.

Firebase's authoritative guidance: https://firebase.google.com/docs/auth/web/redirect-best-practices.

Check popup success/cancellation/blocking, Safari/Chrome privacy settings, existing and first-time accounts, profile setup returning to an event QR, and session restoration after refresh on production. An entirely storage-disabled browser cannot retain a session across full page reloads; the in-memory fallback keeps the current page usable.

## Validation

Eight focused tests passed: session restore, stale account callbacks, server-confirmed profile creation, creation/subscription races, timeout recovery, popup fallback policy, redirect destination validation, and Firebase Admin signing-key runtime compatibility. TypeScript, targeted lint, and the production build were checked with placeholder public Firebase settings.

The local demo browser verified fresh email sign-in updates account UI without refreshing, profile navigation, sign-out, persisted-session reload, QR attendance and feedback submission, and profile setup returning automatically to the original `/ar/profile` destination. The emulator's Google popup was not exposed as a controllable tab in the embedded browser, so end-to-end Google/provider behavior on the affected devices is not claimed as verified. Preview: `sign-in-session-preview.jpg`.
