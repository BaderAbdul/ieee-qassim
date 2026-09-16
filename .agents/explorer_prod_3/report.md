# Comprehensive UX, Vibe Polish & Dynamic Route Fallbacks Audit
**Milestone 4 / Acceptance Criterion 4: Production Readiness Review**
**Auditor**: Explorer 3 (UX, Vibe Polish & Dynamic Route Fallbacks Specialist)  
**Date**: September 17, 2026  
**Target Repository**: IEEE Qassim University Student Branch Platform (`BaderAbdul/ieee-qassim`)

---

## 1. Executive Summary

This forensic audit evaluates the IEEE Qassim Engineering Community Platform for **Acceptance Criterion 4 (Milestone 4: UX & Vibe Polish)** in anticipation of 300+ concurrent students for production launch.

### Core Findings Summary
1. **Total Absence of Route Fallbacks**:
   - There are **0 `loading.tsx`** and **0 `error.tsx`** files across all routes in `src/app/[locale]/`.
   - Any server component delay freezes client navigation without visual feedback; any uncaught render error or network failure crashes Next.js into unstyled system error pages.
2. **Zero Skeleton Components**:
   - The repository contains **no skeleton components** (`Skeleton.tsx`, `EventCardSkeleton`, etc.).
   - Loading states rely entirely on generic spinning circles (`LoadingSpinner`, `<Loader2 className="animate-spin">`, or raw SVG spinners) which causes extreme **Cumulative Layout Shift (CLS)** when data resolves.
3. **Broken Navigation Links**:
   - `src/app/[locale]/page.tsx` (line 259) and `src/app/[locale]/check-in/[eventId]/page.tsx` (lines 136 & 158) navigate to `/my-activity`.
   - **The route `/my-activity` does not exist**, causing instant 404 navigation errors for students completing check-in or clicking from the homepage. The correct route is `/profile`.
4. **Duplicate Layout Rendering on `/structure`**:
   - `src/app/[locale]/structure/page.tsx` explicitly imports and renders `<Navbar />` and `<Footer />` inside its own page markup, despite `src/app/[locale]/layout.tsx` already wrapping all `[locale]` routes with `<Navbar />` and `<Footer />`.
   - This results in two stacked navigation bars and two stacked footers on the `/structure` page.
5. **Localization Hardcoding Bugs**:
   - `src/app/[locale]/leaderboard/page.tsx` hardcodes `const isAr = true;`, ignoring the actual locale parameter and forcing Arabic titles and strings on `/en/leaderboard`.
   - `src/components/layout/Navbar.tsx` (line 160) hardcodes Arabic string `"تسجيل"` for the mobile button, ignoring English locale.
   - `src/app/[locale]/admin/layout.tsx` and `src/app/[locale]/admin/events/page.tsx` use Tailwind `space-x-reverse` unconditionally, causing flipped/awkward spacing when viewed in LTR English.

---

## 2. Route-by-Route Forensic Matrix

| Route Path | Type | Current Loading State | Missing Files | CLS Risk | Critical Observations |
|------------|------|-----------------------|---------------|----------|-----------------------|
| `/` (Homepage) | Server Component (`force-dynamic`) | None (browser freezes on prior page until SSR resolves) | `loading.tsx`, `error.tsx` | High | Client component `HeroUserCards` fetches firestore on mount; cards overlap on narrow screens (<=360px). Broken `/my-activity` link on line 259. |
| `/events` | Server Component (`force-dynamic`) | None during SSR | `loading.tsx`, `error.tsx` | Medium | Good empty state in `EventsList.tsx`, but page navigation has no skeleton. Needs `loading.tsx` with 6-card event grid skeleton. |
| `/events/[id]` | Client Component (`'use client'`) | Centered spinner (`min-h-[70vh]`) | `loading.tsx`, `error.tsx` | Critical | Severe CLS: whole page shifts from center spinner to 2-column layout + hero banner. Needs `EventDetailsSkeleton`. |
| `/events/ideas` | Client Component | Small yellow spinner | `loading.tsx`, `error.tsx` | Medium | Needs ideas cards skeleton. Good empty state. |
| `/profile` | Client Component | Centered spinner (`min-h-[70vh]`) + tab spinners | `loading.tsx`, `error.tsx` | Critical | Performs 5 sequential Firestore queries. Renders `{loading ? '...' : totalPoints}`. Severe layout shifts on card, stats, badges, and tabs. |
| `/profile/pass` | Client Component | Fullscreen dark blue spinner | `loading.tsx`, `error.tsx` | Low | Self-contained pass view. |
| `/leaderboard` | Client Component | Centered yellow spinner | `loading.tsx`, `error.tsx` | High | Hardcoded `isAr = true`. Missing translation namespace. Needs `LeaderboardSkeleton` with 8 user row skeletons. |
| `/check-in/[eventId]` | Client Component (`<Suspense>`) | `<Loader2 className="animate-spin" />` | `loading.tsx`, `error.tsx` | Low | Has `<Suspense>`, but links to broken `/my-activity`. Needs card skeleton fallback. |
| `/structure` | Server Component (`force-dynamic`) | None during SSR | `loading.tsx`, `error.tsx` | High | Duplicate `<Navbar />` and `<Footer />` rendered inside page! |
| `/complete-profile` | Client Component | None until form mounts | `loading.tsx`, `error.tsx` | Low | Onboarding profile completion form. |
| `/admin` | Client Component | Purple spinner | `loading.tsx`, `error.tsx` | High | Fetches 4 collections. Needs 4 stat card skeletons + homepage settings form skeleton. |
| `/admin/layout.tsx` | Client Component (Layout) | Purple spinner | `loading.tsx`, `error.tsx` | Medium | Hardcoded `space-x-reverse` in LTR mode. Should use `gap-3`. |
| `/admin/events` | Client Component | Small purple spinner in table | `loading.tsx`, `error.tsx` | High | Needs table skeleton with 5 rows. Hardcoded `space-x-reverse`. |
| `/admin/events/create` | Client Component (Form) | None | `loading.tsx`, `error.tsx` | Low | Form page. |
| `/admin/events/[id]/edit` | Client Component (Form) | Purple spinner | `loading.tsx`, `error.tsx` | Medium | Form pre-populates event data. |
| `/admin/events/[id]/registrations` | Client Component | Purple spinner | `loading.tsx`, `error.tsx` | Critical | High data volume (300+ students). N+1 query loop fetching each user doc. Needs `RegistrationDeskSkeleton`. |
| `/admin/events/[id]/qr` | Client Component | Purple spinner | `loading.tsx`, `error.tsx` | Medium | Dynamic QR display with 20s token rotation. |
| `/admin/events/[id]/certificates` | Client Component | Plain text `"Loading..."` | `loading.tsx`, `error.tsx` | High | Needs table skeleton. Plain text loading is unstyled. |
| `/admin/check-in` | Client Component | Purple spinner | `loading.tsx`, `error.tsx` | Medium | Ongoing events list. |
| `/admin/users` | Client Component | Purple spinner in table | `loading.tsx`, `error.tsx` | High | User management and manual point adjust modal. Needs table skeleton. |
| `/admin/ideas` | Client Component | Purple spinner | `loading.tsx`, `error.tsx` | Medium | Admin ideas moderation list. |
| `/admin/structure` | Client Component | Purple spinner | `loading.tsx`, `error.tsx` | Medium | Committees and members structure editor. |

---

## 3. Detailed UX & Vibe Defect Analysis

### 3.1 Broken Route Link (`/my-activity`)
- **Location 1**: `src/app/[locale]/page.tsx`, line 259:
  ```tsx
  <Link href="/my-activity" className="...">
  ```
- **Location 2**: `src/app/[locale]/check-in/[eventId]/page.tsx`, line 136 and 158:
  ```tsx
  <Link href="/my-activity" className="...">
    {t('viewActivity')}
  </Link>
  ```
- **Issue**: There is no `src/app/[locale]/my-activity` route. Clicking this button triggers a Next.js 404 not-found error.
- **Fix**: Point both links to `/profile` (or create a rewrite / dedicated page). User activity, attendance history, point transactions, and certificates are located on `/profile`.

### 3.2 Duplicate Navbar and Footer on `/structure`
- **Location**: `src/app/[locale]/structure/page.tsx`, lines 4-5, 30, 51:
  ```tsx
  import Navbar from '@/components/layout/Navbar';
  import Footer from '@/components/layout/Footer';
  ...
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <main className="flex-grow pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        ...
      </main>
      <Footer />
    </div>
  );
  ```
- **Issue**: Root localized layout (`src/app/[locale]/layout.tsx` lines 74-81) already renders `<Navbar />` and `<Footer />` for all subpages:
  ```tsx
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main className="flex-grow">{children}</main>
    <Footer />
    <IdeaFloatingButton />
  </div>
  ```
- **Fix**: Remove `<Navbar />` and `<Footer />` imports and JSX tags from `structure/page.tsx`.

### 3.3 Localization Hardcoding
- **Location 1**: `src/app/[locale]/leaderboard/page.tsx`, line 12:
  ```tsx
  const isAr = true; // Temporary, should use locale hook if needed
  ```
  **Fix**: Change to `const locale = useLocale(); const isAr = locale === 'ar';`. Add a `Leaderboard` namespace to `messages/ar.json` and `messages/en.json`.
- **Location 2**: `src/components/layout/Navbar.tsx`, line 160:
  ```tsx
  <span className="sm:hidden">تسجيل</span>
  ```
  **Fix**: Change to `<span className="sm:hidden">{t('login')}</span>` so English users see "Sign In" rather than Arabic "تسجيل".

### 3.4 LTR Layout Inversions (`space-x-reverse`)
- **Location 1**: `src/app/[locale]/admin/layout.tsx`, lines 63 & 75:
  ```tsx
  className="flex items-center space-x-3 space-x-reverse px-4 py-3..."
  ```
- **Location 2**: `src/app/[locale]/admin/events/page.tsx`, line 154:
  ```tsx
  className="flex items-center space-x-3 space-x-reverse"
  ```
- **Issue**: In Tailwind CSS, `space-x-reverse` inverts margin directions. When the page is viewed in English (LTR), the margin is placed on the wrong side, causing icons and labels to collide.
- **Fix**: Replace `space-x-3 space-x-reverse` with modern `gap-3`, which natively works identically across RTL and LTR without directional hacks.

### 3.5 HeroUserCards Mobile Overlap
- In `src/app/[locale]/HeroUserCards.tsx`, 3 absolute cards (`top-0`, `top-20`, `top-40`) are positioned within an `h-[320px]` container.
- On screens <=360px wide, the cards tightly stack and collide. Giving mobile cards responsive padding and relative vertical spacing ensures readability across mobile devices.

---

## 4. Architecture Plan for Skeletons, `loading.tsx`, and `error.tsx`

To satisfy **Acceptance Criterion 4**, the implementer must create reusable skeleton primitives, implement route-level `loading.tsx` and `error.tsx`, and replace spinners inside client components.

```
src/
├── components/
│   └── skeletons/
│       ├── Skeleton.tsx                    # Base animated pulse primitive
│       ├── EventCardSkeleton.tsx           # Exact replica of EventCard
│       ├── EventsGridSkeleton.tsx          # 6-card event grid + filter bar skeleton
│       ├── EventDetailsSkeleton.tsx        # Event details page skeleton (banner, 2 cols, sticky CTA)
│       ├── DigitalMemberCardSkeleton.tsx   # Digital member card with avatar & QR box
│       ├── ProfileSkeleton.tsx             # Profile page (card, 4 stats, badges, tabs)
│       ├── LeaderboardSkeleton.tsx         # Trophy header + 8 ranked user rows
│       ├── AdminStatsSkeleton.tsx          # 4 admin overview stat cards
│       ├── AdminTableSkeleton.tsx          # Responsive table skeleton with rows & actions
│       ├── RegistrationDeskSkeleton.tsx    # 3 stat cards + registration table with checkboxes
│       └── CheckInSkeleton.tsx             # Check-in card with badge and CTA skeleton
├── app/
    └── [locale]/
        ├── loading.tsx                     # Root localized loading fallback (Hero & stats skeleton)
        ├── error.tsx                       # Root localized error boundary with retry and reset
        ├── not-found.tsx                   # 404 localized fallback
        ├── events/
        │   ├── loading.tsx                 # EventsGridSkeleton fallback
        │   ├── error.tsx                   # Events error boundary
        │   └── [id]/
        │       ├── loading.tsx             # EventDetailsSkeleton fallback
        │       └── error.tsx               # Event details error boundary
        ├── profile/
        │   ├── loading.tsx                 # ProfileSkeleton fallback
        │   └── error.tsx                   # Profile error boundary
        ├── leaderboard/
        │   ├── loading.tsx                 # LeaderboardSkeleton fallback
        │   └── error.tsx                   # Leaderboard error boundary
        ├── check-in/
        │   └── [eventId]/
        │       ├── loading.tsx             # CheckInSkeleton fallback
        │       └── error.tsx               # Check-in error boundary
        └── admin/
            ├── loading.tsx                 # AdminStatsSkeleton + table skeleton
            ├── error.tsx                   # Admin diagnostic error boundary
            └── events/
                ├── loading.tsx             # Admin events table skeleton
                └── [id]/
                    └── registrations/
                        ├── loading.tsx     # RegistrationDeskSkeleton fallback
                        └── error.tsx       # Registration desk error boundary
```

---

## 5. Precise Code Implementation Blueprints

### 5.1 Base Primitive: `src/components/skeletons/Skeleton.tsx`
```tsx
import React from 'react';

export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`}
      {...props}
    />
  );
}
```

### 5.2 Event Card Skeleton: `src/components/skeletons/EventCardSkeleton.tsx`
```tsx
import React from 'react';
import { Skeleton } from './Skeleton';

export function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      {/* Banner */}
      <div className="h-48 w-full relative bg-slate-200 animate-pulse flex-shrink-0">
        <div className="absolute top-4 end-4">
          <Skeleton className="h-6 w-24 rounded-full bg-slate-300" />
        </div>
        <div className="absolute bottom-4 start-4 space-y-2">
          <Skeleton className="h-4 w-16 rounded bg-slate-300" />
          <Skeleton className="h-6 w-48 rounded bg-slate-300" />
        </div>
      </div>

      {/* Body */}
      <div className="p-6 flex flex-col flex-grow space-y-4">
        <div className="space-y-2 flex-grow">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Metadata Rows */}
        <div className="space-y-2.5 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-44" />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5.3 Event Details Skeleton: `src/components/skeletons/EventDetailsSkeleton.tsx`
```tsx
import React from 'react';
import { Skeleton } from './Skeleton';

export function EventDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-24">
      {/* Hero Banner */}
      <div className="w-full h-72 sm:h-96 bg-slate-800 relative animate-pulse flex flex-col justify-end">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full space-y-4">
          <Skeleton className="h-6 w-32 rounded-full bg-slate-700" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full bg-slate-700" />
            <Skeleton className="h-5 w-24 rounded-full bg-slate-700" />
          </div>
          <Skeleton className="h-10 sm:h-14 w-3/4 rounded-xl bg-slate-700" />
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main 2 cols */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 space-y-4">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-12 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 space-y-6">
              <div className="space-y-5">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3.5">
                    <Skeleton className="h-10 w-10 rounded-2xl" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
              <Skeleton className="h-14 w-full rounded-2xl mt-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5.4 Profile Skeleton: `src/components/skeletons/ProfileSkeleton.tsx`
```tsx
import React from 'react';
import { Skeleton } from './Skeleton';

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Digital Member Card Skeleton */}
        <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-10 border border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 animate-pulse">
          <div className="flex flex-col md:flex-row items-center gap-6 flex-1">
            <Skeleton className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-slate-800" />
            <div className="space-y-3 text-center md:text-start">
              <Skeleton className="h-4 w-28 bg-slate-800" />
              <Skeleton className="h-8 w-48 bg-slate-800" />
              <Skeleton className="h-4 w-36 bg-slate-800" />
              <div className="flex gap-2 justify-center md:justify-start pt-2">
                <Skeleton className="h-9 w-24 rounded-xl bg-slate-800" />
                <Skeleton className="h-9 w-24 rounded-xl bg-slate-800" />
              </div>
            </div>
          </div>
          <Skeleton className="w-36 h-36 rounded-3xl bg-slate-800" />
        </div>

        {/* 4 Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-2xl flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Badges Row */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 space-y-4">
          <Skeleton className="h-6 w-44" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Tabs & Items */}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden p-6 space-y-4">
          <div className="flex gap-4 border-b pb-4">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
          </div>
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5.5 Leaderboard Skeleton: `src/components/skeletons/LeaderboardSkeleton.tsx`
```tsx
import React from 'react';
import { Skeleton } from './Skeleton';

export function LeaderboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <Skeleton className="h-20 w-20 rounded-3xl" />
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-5 w-96 max-w-full rounded-lg" />
        </div>

        {/* User Rows */}
        <div className="bg-white rounded-3xl border border-gray-100 divide-y divide-gray-100 overflow-hidden shadow-sm">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="p-4 sm:p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <Skeleton className="h-12 w-12 rounded-2xl flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="text-end space-y-1">
                <Skeleton className="h-6 w-16 ms-auto" />
                <Skeleton className="h-3 w-10 ms-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 5.6 Admin Overview Skeleton: `src/components/skeletons/AdminStatsSkeleton.tsx`
```tsx
import React from 'react';
import { Skeleton } from './Skeleton';

export function AdminStatsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-xl flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 space-y-6">
          <Skeleton className="h-7 w-48" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-gray-100 space-y-6">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
```

### 5.7 Registration Desk Skeleton: `src/components/skeletons/RegistrationDeskSkeleton.tsx`
```tsx
import React from 'react';
import { Skeleton } from './Skeleton';

export function RegistrationDeskSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-64 rounded-xl" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### 5.8 Root Localized Error Boundary: `src/app/[locale]/error.tsx`
```tsx
'use client';

import React, { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const t = useTranslations('Common');

  useEffect(() => {
    console.error('Unhandled app error in segment:', error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center border border-gray-100 shadow-xl shadow-blue-900/5 space-y-6">
        <div className="h-20 w-20 rounded-3xl bg-red-50 text-red-600 mx-auto flex items-center justify-center shadow-inner">
          <AlertCircle className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black font-cairo text-slate-900">
            {isAr ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            {isAr 
              ? 'نعتذر عن هذا الخلل. يمكنك إعادة المحاولة أو العودة للصفحة الرئيسية.' 
              : 'An unexpected error occurred while loading this page. Please try again or return home.'}
          </p>
          {error.digest && (
            <p className="text-xs text-slate-400 font-mono pt-1">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-blue-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{t('retry')}</span>
          </button>
          
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-6 rounded-xl transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>{isAr ? 'الرئيسية' : 'Home'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### 5.9 Events Route Fallback: `src/app/[locale]/events/loading.tsx`
```tsx
import React from 'react';
import { EventsGridSkeleton } from '@/components/skeletons/EventsGridSkeleton';

export default function EventsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto space-y-10">
        <EventsGridSkeleton />
      </div>
    </div>
  );
}
```

---

## 6. Verification Method & Acceptance Sign-off Matrix

| Criterion / Check | Validation Command or Check | Expected Result |
|-------------------|-----------------------------|-----------------|
| **Zero missing `loading.tsx` files** | `find src/app/[locale] -name loading.tsx` | Found at `/`, `/events`, `/events/[id]`, `/profile`, `/leaderboard`, `/admin`, `/admin/events`, `/admin/events/[id]/registrations` |
| **Zero missing `error.tsx` files** | `find src/app/[locale] -name error.tsx` | Found at `[locale]/error.tsx`, `events/error.tsx`, `events/[id]/error.tsx`, `profile/error.tsx`, `admin/error.tsx` |
| **Zero Dead `/my-activity` Links** | `grep -rn "my-activity" src/app/` | 0 occurrences. All occurrences replaced with `/profile` |
| **No Duplicate Layout on `/structure`** | `grep -rn "import Navbar" src/app/[locale]/` | Only 1 match in `[locale]/layout.tsx` |
| **No Hardcoded `isAr = true` in Leaderboard** | `grep -rn "isAr = true" src/app/` | 0 occurrences |
| **No Hardcoded `space-x-reverse` in LTR** | `grep -rn "space-x-reverse" src/app/[locale]/admin` | 0 occurrences (replaced with `gap-3`) |
| **Build and TypeScript Check** | `npm run build` | Clean exit (0 errors), all dynamic segments compile with static/dynamic streaming |
| **Simulated 300+ Students Registration Desk** | Navigate to `/admin/events/[id]/registrations` on slow 3G | Shows `RegistrationDeskSkeleton` immediately without blocking navigation |

---
**Explorer 3 Audit Verdict**: Ready for implementation. All findings, specifications, and file blueprints are prepared to satisfy Acceptance Criterion 4 in full.
