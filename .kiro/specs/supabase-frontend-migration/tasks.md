# Implementation Plan: Supabase Frontend Migration

## Overview

Migrate the Nexora Next.js 16 frontend from Flask-proxied data to direct Supabase reads. Tasks follow the exact order specified: data layer first, then per-component rewrites, then dead-code removal, then auth stubs. Each task builds on the previous so there is no orphaned code.

---

## Tasks

- [x] 1. Rewrite the Supabase client and api.ts data layer
  - [x] 1.1 Rewrite `src/lib/supabase.ts` with real Supabase client
    - Replace the stub export with `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)`
    - Export `supabase` (the client) and `isSupabaseConfigured` (boolean — `true` only when both env vars are present and not equal to placeholder values)
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Rewrite `src/lib/api.ts` with Supabase-backed functions
    - Define and export `CheckRow` interface matching the CHECKS table schema
    - Implement `getLatestPerUrl()`: fetch all rows from `.from('CHECKS')` ordered by `checked_at DESC`, deduplicate in JS (keep first per url)
    - Implement `getUrlHistory(url, limit=90)`: query CHECKS for one URL, ordered DESC, with limit
    - Implement `getIncidents()`: fetch all rows ordered by `(url ASC, checked_at DESC)`, group by URL, scan for consecutive `is_up=false` runs, return `Incident[]`
    - Implement `getSslCertificates()`: call `getLatestPerUrl()`, map each row to `SslCertData` (derive status from `ssl_days_left`: `<= 0` → expired, `<= 14` → expiring, else valid)
    - Implement `getGlobalKPIs()`: call `getLatestPerUrl()`, compute `totalSites`, `upCount`, `downCount`, `avgResponseMs`, `sslWarnings` (count where `ssl_days_left >= 0 && <= 14`), `uptimePercentage`, `activeIncidents`
    - Retain `CheckLog` type alias, `getRecentLogs`, `getUniqueUrls`, `SslCertData`, `SslHistoryPoint` exports for backward compat; update their implementations to use Supabase
    - Throw `Error(supabaseError.message)` whenever a Supabase call returns an error object
    - Remove all fallback mock/hardcoded data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [ ]* 1.3 Write property test for getLatestPerUrl deduplication
    - **Property 1: getLatestPerUrl deduplication invariant**
    - Generate arrays of CheckRow with repeated URLs; verify exactly one row per URL is returned and it is the latest by `checked_at`
    - **Validates: Requirements 2.2**

  - [ ]* 1.4 Write property test for getIncidents run derivation
    - **Property 2: Incident run non-overlap**
    - Generate CheckRow arrays with various is_up patterns; verify incidents cover contiguous false-runs and checkCount totals are consistent
    - **Validates: Requirements 2.4**

  - [ ]* 1.5 Write property test for getSslCertificates status derivation
    - **Property 3: SSL status derivation**
    - For any integer ssl_days_left, verify the derived status follows the `<= 0` / `<= 14` / else thresholds
    - **Validates: Requirements 2.5**

  - [ ]* 1.6 Write property test for getGlobalKPIs aggregate consistency
    - **Property 4: KPI sslWarnings count correctness**
    - **Property 8: KPI aggregate consistency**
    - For any CheckRow array, verify sslWarnings count, upCount + downCount === totalSites, uptimePercentage formula
    - **Validates: Requirements 2.6**

- [x] 2. Checkpoint — data layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Replace mock data in MonitorWebsitesContent
  - [x] 3.1 Remove `SAMPLE_WEBSITES` and add Supabase fetch
    - Add `websites`, `loading`, `error` state
    - Add `useEffect` that calls `getLatestPerUrl()` on mount, maps results via `rowToMonitoredSite()`, sets state; clears interval on unmount
    - Implement `rowToMonitoredSite(row: CheckRow): MonitoredSite` (url→url, hostname→name, is_up→status, response_ms→latency, ssl_days_left→sslDaysLeft, 'Unknown'→region, '60s'→interval, url→id, relative time→lastChecked)
    - Add loading spinner (show while `loading === true`)
    - Add error banner with Retry button (show when `error !== null`)
    - Add empty state "No data yet — add websites to start monitoring" (show when `websites.length === 0`)
    - Set up 60-second `setInterval` refresh
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 3.2 Write property test for rowToMonitoredSite mapping
    - **Property 5: CheckRow to MonitoredSite mapping**
    - For any CheckRow, verify status, latency, sslDaysLeft, id fields map correctly
    - **Validates: Requirements 3.5**

- [x] 4. Replace mock data in UptimeStatusContent
  - [x] 4.1 Remove `SAMPLE_SERVICES`, `generateHeartbeats` and add Supabase fetch
    - Add `services`, `loading`, `error` state
    - Add `useEffect` that calls `getLatestPerUrl()` then for each URL calls `getUrlHistory(url, 48)`; builds `UptimeService[]` from results
    - Map each `CheckRow` in history to a heartbeat bar: `!is_up` → `'down'`, `response_ms > 2000` → `'degraded'`, else `'operational'`
    - Compute uptime percentages from the heartbeat array
    - Add loading state, error banner with Retry, empty state
    - Set up 60-second `setInterval` refresh
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 4.2 Write property test for heartbeat status thresholds
    - **Property 6: Heartbeat status thresholds**
    - For any (is_up, response_ms) pair, verify the derived bar status
    - **Validates: Requirements 4.2**

- [x] 5. Replace mock incident in DowntimeAlertsContent
  - [x] 5.1 Remove `MOCK_INCIDENT` import and add Supabase fetch
    - Remove `import { MOCK_INCIDENT } from '@/data/mockIncidents'`
    - Add `incident`, `loading`, `error` state (incident type is `Incident | null`)
    - Add `useEffect` that calls `getIncidents()`, picks first incident with `resolvedAt === null` as active
    - When `incident === null`: render "No active incidents" empty state
    - When `incident !== null`: map the api `Incident` to the shape expected by `ActiveIncidentBanner`, `RegionRadar`, `LiveFeed`, and render the full workflow UI
    - Add loading state and error banner with Retry
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Replace mock data in PerformanceSpeedContent
  - [x] 6.1 Remove `SAMPLE_PERFORMANCE` and add Supabase fetch
    - Add `sites`, `loading`, `error` state
    - Add `useEffect` that calls `getLatestPerUrl()` on mount, maps results to `PerformanceSite[]`; 60-second interval refresh
    - Map `CheckRow` → `PerformanceSite`: derive status from `response_ms` thresholds (`< 150` Excellent, `< 400` Good, `< 800` Slow, else Critical); `score = Math.max(0, Math.min(100, Math.round(100 - response_ms / 20)))`; `loadTime = response_ms / 1000`; synthetic `vitals`; `region = 'Unknown'`; `lastTested` = relative time
    - Recompute summary card values (avg, fastest, slowest) from live `sites` array
    - Add loading state, error banner with Retry, empty state
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 6.2 Write property test for performance status thresholds
    - **Property 7: Performance status thresholds**
    - For any response_ms integer, verify status boundary correctness
    - **Validates: Requirements 6.2**

- [x] 7. Checkpoint — all tabs using live data
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Migrate DashboardClient and DashboardShell
  - [x] 8.1 Rewrite `DashboardShell.tsx`
    - Remove `import { monitorsApi, MonitorRecord } from '@/lib/flaskApi'`
    - Remove `monitorsApi.list()` call; remove `monitors` state
    - Pass no `initialMonitors` prop to `DashboardClient` (or pass empty `CheckRow[]` if the prop stays)
    - _Requirements: 7.1, 7.2_

  - [x] 8.2 Rewrite `DashboardClient.tsx` dashboard tab
    - Remove `import { monitorsApi, MonitorRecord } from '@/lib/flaskApi'`
    - Remove all state for the inline "Add Website Bar" (`addUrl`, `addName`, `addInterval`, `addLoading`, `addError`, `addSuccess`, `addUrlInputRef`) and remove the bar JSX entirely
    - Replace `monitorsApi.list()` in `handleRefresh` with `getLatestPerUrl()`; store results as `CheckRow[]`
    - Adapt the monitored websites table to render `CheckRow` fields (`url`, `is_up`, `response_ms`, `ssl_days_left`, `checked_at`)
    - Remove `monitorsApi.update()` / `delete()` action buttons from the table (or replace with disabled stubs)
    - Make the `AddWebsiteModal`'s `onSave` a no-op (just close the modal)
    - Change auto-refresh interval from `15000` to `60000`
    - Add a comment block: "NOTE: The Python engine reads URLs from urls.json on disk. Adding a website here does NOT automatically add it to the engine's monitoring list. To add a new URL to monitoring, manually add it to urls.json and restart the engine."
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 8.3 Add comment to `AddWebsiteModal.tsx`
    - Add the same NOTE comment near the `handleSubmit` function explaining the Python engine / `urls.json` relationship
    - _Requirements: 7.8_

- [x] 9. Remove dead code
  - [x] 9.1 Delete `src/lib/flaskApi.ts`
    - _Requirements: 8.1_

  - [x] 9.2 Remove Flask proxy rewrite from `next.config.ts`
    - Change `rewrites()` to return `[]` (empty array)
    - _Requirements: 8.2_

  - [x] 9.3 Delete dead API route directories
    - Delete `src/app/api/auth/` (contains `[...nextauth]/route.ts`)
    - Delete `src/app/api/checks/`
    - Delete `src/app/api/dashboard/`
    - Delete `src/app/api/logs/`
    - Delete `src/app/api/settings/`
    - Delete `src/app/api/urls/`
    - Keep `src/app/api/register/`, `forgot-password/`, `reset-password/`, `verify-email/`
    - _Requirements: 8.3, 8.4_

  - [x] 9.4 Remove dead dependencies from `package.json`
    - Remove `next-auth`, `@prisma/client`, `prisma`, `@auth/prisma-adapter`, `bcryptjs`, `resend`
    - Delete the `prisma/` directory (contains `schema.prisma`)
    - _Requirements: 8.5, 8.6, 8.7_

- [x] 10. Simplify auth layer
  - [x] 10.1 Rewrite `src/context/AuthContext.tsx` as a no-op stub
    - Remove `import { authApi, AuthUser } from '@/lib/flaskApi'`
    - Export a stub `AuthProvider` that always provides an anonymous user (`{ id: 0, name: 'Guest', email: '', avatar_url: null, created_at: '' }`) and no-op `login`, `logout`, `refresh`
    - _Requirements: 9.1_

  - [x] 10.2 Rewrite `src/components/AuthGuard.tsx` to bypass auth
    - Remove `useAuth`, `useRouter` imports and all redirect logic
    - Simply return `<>{children}</>`
    - _Requirements: 9.2_

  - [x] 10.3 Rewrite `src/middleware.ts` to remove NextAuth
    - Remove `import { auth } from "@/lib/auth"` (or equivalent NextAuth import)
    - Import only `{ NextResponse } from 'next/server'` and `type { NextRequest } from 'next/server'`
    - Export a default function that always returns `NextResponse.next()`
    - Keep the same `config.matcher` array
    - _Requirements: 8.8, 9.2_

- [x] 11. Final checkpoint — full build verification
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests require a test framework (e.g. `fast-check` + `vitest`); run with `--run` flag to avoid watch mode
- All TypeScript must compile with zero errors before marking the final checkpoint done
- `SslCertificateContent` requires no changes — it already calls `getSslCertificates()` from api.ts
- Do NOT change any className, layout, or JSX structure outside the explicit instructions above
- After completing task 9.4, run `npm install` (or `npm install --legacy-peer-deps`) to remove uninstalled packages from the lockfile

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "1.5", "1.6"] },
    { "id": 3, "tasks": ["3.1", "4.1", "5.1", "6.1", "8.1"] },
    { "id": 4, "tasks": ["3.2", "4.2", "6.2", "8.2"] },
    { "id": 5, "tasks": ["8.3", "9.1", "9.2", "9.3", "9.4"] },
    { "id": 6, "tasks": ["10.1", "10.2", "10.3"] }
  ]
}
```
