# Requirements Document

## Introduction

Migrate the Nexora Next.js 16 frontend from a Flask-proxied backend to read monitoring data directly from a Supabase `CHECKS` table. The Python engine (`monitor_engine.py`) continues to write check results independently; the frontend becomes a pure read-only Supabase consumer. Dead dependencies (NextAuth, Prisma, Flask proxy) are removed and the auth layer is replaced with a no-op stub so the dashboard is always accessible.

## Glossary

- **CHECKS Table**: The Supabase table `public."CHECKS"` with columns `id`, `url`, `checked_at`, `status_code`, `response_ms`, `is_up`, `ssl_days_left`.
- **CheckRow**: TypeScript interface that exactly mirrors the CHECKS table schema.
- **Supabase Client**: The `@supabase/supabase-js` browser client initialised from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Python Engine**: `monitor_engine.py` — reads `urls.json` on disk and writes results to the CHECKS table. The frontend does NOT control it.
- **Dead Code**: Flask proxy rewrite, `flaskApi.ts`, NextAuth, Prisma, `bcryptjs`, `resend`, and all API routes that served these systems.
- **Auto-refresh**: A `setInterval` polling loop that refetches Supabase data every 60 seconds in the browser.
- **Empty State**: UI shown when the CHECKS table contains no rows.
- **Error State**: UI shown when a Supabase query throws a network or API error.
- **Loading State**: UI shown while an async fetch is in flight.

---

## Requirements

### Requirement 1 — Supabase Client Module

**User Story:** As a frontend developer, I want a real Supabase client module, so that all data-fetching code has a single, correctly configured entry point.

#### Acceptance Criteria

1. THE System SHALL export a `supabase` constant created by `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)` from `@supabase/supabase-js`.
2. THE System SHALL export a boolean `isSupabaseConfigured` that is `true` when both environment variables are non-empty strings not equal to their placeholder defaults.
3. WHEN `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is absent or equals a placeholder, THE System SHALL set `isSupabaseConfigured` to `false`.

---

### Requirement 2 — api.ts Data Layer Rewrite

**User Story:** As a frontend component, I want a unified api.ts that queries Supabase directly, so that all dashboard tabs get consistent live data without fallback mocks.

#### Acceptance Criteria

1. THE System SHALL define and export a `CheckRow` interface with fields: `id: number`, `url: string`, `checked_at: string`, `status_code: number`, `response_ms: number`, `is_up: boolean`, `ssl_days_left: number`.
2. THE System SHALL export `getLatestPerUrl(): Promise<CheckRow[]>` that fetches all rows from `CHECKS` ordered by `checked_at DESC`, then deduplicates in JS to return exactly one (the latest) row per distinct `url`.
3. THE System SHALL export `getUrlHistory(url: string, limit?: number): Promise<CheckRow[]>` that returns up to `limit` rows (default 90) for the given `url`, ordered by `checked_at DESC`.
4. THE System SHALL export `getIncidents(): Promise<Incident[]>` that derives consecutive `is_up = false` runs grouped by URL from the CHECKS table and returns `{ id, url, startedAt, resolvedAt, durationMs, checkCount }[]`.
5. THE System SHALL export `getSslCertificates(): Promise<SslCertData[]>` that maps the latest row per URL from `getLatestPerUrl()` to the `SslCertData` shape, deriving `hostname` from the URL, `status` as `'valid'|'expiring'|'expired'`, and populating `daysRemaining` from `ssl_days_left`.
6. THE System SHALL export `getGlobalKPIs()` that computes and returns `{ totalSites, upCount, downCount, avgResponseMs, sslWarnings, uptimePercentage, activeIncidents }` from `getLatestPerUrl()` results, where `sslWarnings` counts rows with `ssl_days_left >= 0 && ssl_days_left <= 14`.
7. THE System SHALL retain the `CheckLog` type alias (equal to `CheckRow`) and the existing `getRecentLogs`, `getUniqueUrls`, `SslCertData`, `SslHistoryPoint` exports for backward compatibility.
8. IF a Supabase query returns an error object, THEN THE System SHALL throw an `Error` with the Supabase error message so callers can display an error state.
9. THE System SHALL query the table using `.from('CHECKS')` (exact case as required by PostgREST).
10. THE System SHALL NOT include any fallback mock or hardcoded sample data in any exported function.

---

### Requirement 3 — MonitorWebsitesContent Live Data

**User Story:** As a dashboard user, I want the Monitor Websites tab to show real check data, so that I see the actual status of my monitored URLs.

#### Acceptance Criteria

1. WHEN the MonitorWebsitesContent component mounts, THE System SHALL call `getLatestPerUrl()` and map results to `MonitoredSite` objects for display.
2. WHILE data is being fetched, THE System SHALL display a loading spinner in place of the website table.
3. IF `getLatestPerUrl()` throws an error, THEN THE System SHALL display an error banner with a Retry button.
4. IF `getLatestPerUrl()` returns an empty array, THEN THE System SHALL display a "No data yet — add websites to start monitoring" empty state.
5. THE System SHALL map `CheckRow` fields to `MonitoredSite`: `url` → `url`, URL hostname → `name`, `is_up` → `status` (`'Online'` or `'Down'`), `response_ms` → `latency`, `ssl_days_left` → `sslDaysLeft`, `checked_at` relative time → `lastChecked`, `'Unknown'` → `region`, `'60s'` → `interval`, `url` → `id`.
6. WHILE the component is mounted, THE System SHALL refresh data every 60 seconds via `setInterval` and clear the interval on unmount.
7. THE System SHALL NOT render the `SAMPLE_WEBSITES` constant or any hardcoded site data.

---

### Requirement 4 — UptimeStatusContent Live Data

**User Story:** As a dashboard user, I want the Uptime Status tab to show real heartbeat bars, so that I can see historical uptime patterns from actual check data.

#### Acceptance Criteria

1. WHEN the UptimeStatusContent component mounts, THE System SHALL call `getLatestPerUrl()` and then `getUrlHistory(url, 48)` for each URL to build heartbeat data.
2. THE System SHALL map each `CheckRow` in the history to a heartbeat bar where `is_up = false` → `'down'`, `response_ms > 2000` → `'degraded'`, otherwise → `'operational'`.
3. WHILE data is being fetched, THE System SHALL display a loading state.
4. IF an error occurs, THE System SHALL display an error banner with a Retry button.
5. IF no URLs are found, THE System SHALL display an empty state message.
6. WHILE the component is mounted, THE System SHALL refresh data every 60 seconds.
7. THE System SHALL NOT render `SAMPLE_SERVICES`, `generateHeartbeats`, or any hardcoded uptime data.

---

### Requirement 5 — DowntimeAlertsContent Live Incidents

**User Story:** As a dashboard user, I want the Downtime Alerts tab to show real incidents, so that I can respond to actual outages rather than mock data.

#### Acceptance Criteria

1. WHEN DowntimeAlertsContent mounts, THE System SHALL call `getIncidents()` and use the first active incident (if any) to populate the incident state.
2. IF no active incidents exist, THEN THE System SHALL display a "No active incidents" empty state instead of the full incident workflow UI.
3. WHILE data is being fetched, THE System SHALL display a loading state.
4. IF `getIncidents()` throws an error, THEN THE System SHALL display an error banner with a Retry button.
5. THE System SHALL NOT import or use `MOCK_INCIDENT` from `@/data/mockIncidents`.

---

### Requirement 6 — PerformanceSpeedContent Live Data

**User Story:** As a dashboard user, I want the Performance Speed tab to display real response time data, so that I can identify slow websites from actual measurements.

#### Acceptance Criteria

1. WHEN PerformanceSpeedContent mounts, THE System SHALL call `getLatestPerUrl()` and map results to `PerformanceSite` objects.
2. THE System SHALL derive `status` from `response_ms`: `< 150` → `'Excellent'`, `< 400` → `'Good'`, `< 800` → `'Slow'`, else → `'Critical'`.
3. THE System SHALL compute `avgResponseMs`, fastest site, and slowest site from live data for the summary cards.
4. WHILE data is being fetched, THE System SHALL display a loading state.
5. IF an error occurs, THE System SHALL display an error banner with a Retry button.
6. IF the array is empty, THE System SHALL display an empty state.
7. WHILE the component is mounted, THE System SHALL refresh data every 60 seconds.
8. THE System SHALL NOT render `SAMPLE_PERFORMANCE` or any hardcoded performance data.

---

### Requirement 7 — DashboardClient and DashboardShell Migration

**User Story:** As a dashboard user, I want the main dashboard page to use real Supabase data, so that KPI cards and the site table reflect live monitoring results.

#### Acceptance Criteria

1. THE System SHALL remove all imports of `monitorsApi` and `MonitorRecord` from `@/lib/flaskApi` in `DashboardClient.tsx` and `DashboardShell.tsx`.
2. THE System SHALL replace `monitorsApi.list()` calls with `getLatestPerUrl()` from `@/lib/api`.
3. THE System SHALL adapt the monitored websites table to use `CheckRow` fields instead of `MonitorRecord` fields.
4. THE System SHALL remove the "Add Website Bar" inline form (URL input + name input + interval select + Add button) from the dashboard page.
5. THE System SHALL keep the `AddWebsiteModal` button and its `onSave` handler as-is.
6. THE System SHALL replace the 15-second auto-refresh interval with a 60-second interval.
7. THE System SHALL replace the `monitorsApi.create()`/`delete()`/`update()` calls with no-ops or remove them entirely.
8. THE System SHALL add a comment in `AddWebsiteModal.tsx` and `DashboardClient.tsx` explaining that the Python engine reads from `urls.json` and adding a URL here does not add it to the engine's monitoring list.

---

### Requirement 8 — Dead Code Removal

**User Story:** As a developer, I want all Flask, NextAuth, and Prisma dependencies removed, so that the codebase is lean and the build has no unused dependency warnings.

#### Acceptance Criteria

1. THE System SHALL delete `src/lib/flaskApi.ts`.
2. THE System SHALL remove the Flask proxy rewrite rule from `next.config.ts` (the file remains but returns no rewrites or an empty array).
3. THE System SHALL delete the following API route directories: `src/app/api/auth/`, `src/app/api/checks/`, `src/app/api/dashboard/`, `src/app/api/logs/`, `src/app/api/settings/`, `src/app/api/urls/`.
4. THE System SHALL retain the following API route directories if they exist: `src/app/api/register/`, `src/app/api/forgot-password/`, `src/app/api/reset-password/`, `src/app/api/verify-email/`.
5. WHERE `next-auth` is a dependency, THE System SHALL remove it from `package.json`.
6. WHERE `@prisma/client`, `prisma`, `@auth/prisma-adapter` are dependencies, THE System SHALL remove them from `package.json` and delete the `prisma/` directory.
7. WHERE `bcryptjs` and `resend` are used only by deleted auth routes, THE System SHALL remove them from `package.json`.
8. THE System SHALL simplify `src/middleware.ts` to import only from `next/server` (not `next-auth`) and return `NextResponse.next()` for all requests.

---

### Requirement 9 — Auth Stub (No-op Auth)

**User Story:** As a dashboard user, I want to access the dashboard without login, so that there is no authentication gate blocking the monitoring data.

#### Acceptance Criteria

1. THE System SHALL update `src/context/AuthContext.tsx` to remove the `authApi` import from `@/lib/flaskApi` and instead export a stub context that always presents a logged-in anonymous user.
2. THE System SHALL update `src/components/AuthGuard.tsx` to always render its `children` without redirecting to `/login`.
3. THE System SHALL NOT break the visual structure of login or signup pages — they may remain as visual stubs.

---

### Requirement 10 — Loading, Empty, and Error States (All Tabs)

**User Story:** As a dashboard user, I want consistent feedback on each tab while data loads or when errors occur, so that I always know the current state of the application.

#### Acceptance Criteria

1. WHILE fetching data, EACH tab component SHALL display a spinner or skeleton placeholder.
2. IF the CHECKS table is empty, THEN EACH tab component SHALL display "No data yet — add websites to start monitoring".
3. IF a Supabase error occurs, THEN EACH tab component SHALL display an error banner with a Retry button that re-runs the fetch.
4. THE System SHALL NOT fall back to hardcoded sample data under any error or empty condition.
