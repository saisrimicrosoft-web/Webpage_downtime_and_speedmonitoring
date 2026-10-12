# Design Document — Supabase Frontend Migration

## Overview

Replace every Flask-proxied data call with direct Supabase reads. The architecture has three layers:

1. **Data Layer** (`src/lib/supabase.ts`, `src/lib/api.ts`) — Supabase client + all query functions.
2. **Component Layer** — each dashboard tab component fetches its own data slice with loading/error/empty states and a 60-second auto-refresh.
3. **Shell / Auth Layer** — `DashboardShell.tsx`, `AuthGuard.tsx`, `AuthContext.tsx`, and `middleware.ts` lose all Flask/NextAuth dependencies.

Dead code (Flask proxy, `flaskApi.ts`, NextAuth, Prisma, `bcryptjs`, `resend`) is deleted.

---

## Architecture

```
Browser
  ├── DashboardShell
  │   └── DashboardClient (60s refresh via handleRefresh)
  │       ├── KPIOverview          ← getGlobalKPIs()
  │       ├── MonitorWebsitesContent  ← getLatestPerUrl()
  │       ├── UptimeStatusContent  ← getLatestPerUrl() + getUrlHistory()
  │       ├── DowntimeAlertsContent ← getIncidents()
  │       ├── PerformanceSpeedContent ← getLatestPerUrl()
  │       └── SslCertificateContent ← getSslCertificates()
  │
  └── AuthGuard (no-op — always renders children)
      └── AuthContext (stub: always logged-in anonymous user)

src/lib/supabase.ts
  └── createClient(URL, ANON_KEY) → supabase
src/lib/api.ts
  └── supabase.from('CHECKS')... → CheckRow[]
```

---

## Component Interfaces

### `CheckRow` (canonical)

```typescript
export interface CheckRow {
  id: number;
  url: string;
  checked_at: string;        // ISO-8601 UTC
  status_code: number;
  response_ms: number;
  is_up: boolean;
  ssl_days_left: number;     // -1 for HTTP or error
}

// Backward-compat alias
export type CheckLog = CheckRow;
```

### `Incident` (derived)

```typescript
export interface Incident {
  id: string;
  url: string;
  startedAt: string;
  resolvedAt: string | null; // null = still active
  durationMs: number;
  checkCount: number;
}
```

---

## Data Layer Design

### `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const PLACEHOLDER_URL = 'https://your-supabase-project-id.supabase.co';
const PLACEHOLDER_KEY = 'your-supabase-anon-key';

export const isSupabaseConfigured =
  url.length > 0 && url !== PLACEHOLDER_URL &&
  key.length > 0 && key !== PLACEHOLDER_KEY;

export const supabase = createClient(url || PLACEHOLDER_URL, key || PLACEHOLDER_KEY);
```

### `src/lib/api.ts` — key functions

**`getLatestPerUrl()`**
```typescript
export async function getLatestPerUrl(): Promise<CheckRow[]> {
  const { data, error } = await supabase
    .from('CHECKS')
    .select('*')
    .order('checked_at', { ascending: false });
  if (error) throw new Error(error.message);

  // Deduplicate: keep first occurrence (latest) per url
  const seen = new Set<string>();
  return (data ?? []).filter(row => {
    if (seen.has(row.url)) return false;
    seen.add(row.url);
    return true;
  });
}
```

**`getUrlHistory(url, limit = 90)`**
```typescript
export async function getUrlHistory(url: string, limit = 90): Promise<CheckRow[]> {
  const { data, error } = await supabase
    .from('CHECKS')
    .select('*')
    .eq('url', url)
    .order('checked_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
```

**`getIncidents()`** — pure algorithm on fetched rows
```typescript
export async function getIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase
    .from('CHECKS')
    .select('*')
    .order('url',        { ascending: true })
    .order('checked_at', { ascending: false });
  if (error) throw new Error(error.message);

  const rows: CheckRow[] = data ?? [];
  const byUrl = new Map<string, CheckRow[]>();
  for (const row of rows) {
    if (!byUrl.has(row.url)) byUrl.set(row.url, []);
    byUrl.get(row.url)!.push(row);
  }

  const incidents: Incident[] = [];
  for (const [url, urlRows] of byUrl) {
    let run: CheckRow[] = [];
    for (const row of urlRows) {
      if (!row.is_up) {
        run.push(row);
      } else {
        if (run.length > 0) {
          incidents.push(buildIncident(url, run));
          run = [];
        }
      }
    }
    if (run.length > 0) {
      incidents.push(buildIncident(url, run)); // active (no resolution)
    }
  }
  return incidents;
}

function buildIncident(url: string, run: CheckRow[]): Incident {
  // run is sorted DESC so run[0] is most recent, run[last] is oldest
  const startedAt  = run[run.length - 1].checked_at;
  const resolvedAt = null; // still ongoing (no up-row after the run)
  const durationMs = new Date(run[0].checked_at).getTime() -
                     new Date(startedAt).getTime();
  return {
    id: `${url}-${startedAt}`,
    url,
    startedAt,
    resolvedAt,
    durationMs,
    checkCount: run.length,
  };
}
```

> Note: When a run is terminated by an `is_up = true` row, `resolvedAt` is set to that row's `checked_at`. The implementation above marks all non-terminated runs as active. A full resolved-incident version sets `resolvedAt` to the adjacent up row's timestamp.

**`getSslCertificates()`**
```typescript
export async function getSslCertificates(): Promise<SslCertData[]> {
  const latest = await getLatestPerUrl();
  return latest.map(row => {
    const days = row.ssl_days_left;
    const status: 'valid' | 'expiring' | 'expired' =
      days <= 0   ? 'expired'  :
      days <= 14  ? 'expiring' : 'valid';
    let hostname = row.url;
    try { hostname = new URL(row.url).hostname; } catch {}
    return {
      id:           String(row.id),
      url:          row.url,
      hostname,
      ssl_days_left: days,
      daysRemaining: days,
      status,
      checked_at:   row.checked_at,
      // Remaining SslCertData fields — sensible defaults
      domain:       hostname,
      issuer:       '',
      validFrom:    '',
      validTo:      '',
      chain_valid:  true,
      auto_renew:   false,
      tls_grade:    '',
      san:          [],
      expires_on:   '',
      tls_version:  '',
      cipher:       '',
      key_size:     0,
      region:       'Unknown',
    };
  });
}
```

**`getGlobalKPIs()`**
```typescript
export async function getGlobalKPIs() {
  const rows = await getLatestPerUrl();
  const total = rows.length;
  const upCount   = rows.filter(r => r.is_up).length;
  const downCount = total - upCount;
  const sslWarnings = rows.filter(r => r.ssl_days_left >= 0 && r.ssl_days_left <= 14).length;
  const avgResponseMs = total > 0
    ? Math.round(rows.reduce((s, r) => s + r.response_ms, 0) / total)
    : 0;
  return {
    totalSites:       total,
    upCount,
    downCount,
    avgResponseMs,
    sslWarnings,
    uptimePercentage: total > 0 ? (upCount / total) * 100 : 100,
    activeIncidents:  downCount,
    // Legacy KPI shape aliases for KPIOverview component
    totalUrls:        total,
    activeIncidents_:  downCount,
  };
}
```

---

## Component Mapping

### MonitorWebsitesContent

Remove `SAMPLE_WEBSITES`. Add state: `websites: MonitoredSite[]`, `loading: boolean`, `error: string | null`.

```typescript
useEffect(() => {
  let cancelled = false;
  const fetch = async () => {
    try {
      const rows = await getLatestPerUrl();
      if (!cancelled) setWebsites(rows.map(rowToMonitoredSite));
    } catch (e: any) {
      if (!cancelled) setError(e.message);
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
  fetch();
  const id = setInterval(fetch, 60_000);
  return () => { cancelled = true; clearInterval(id); };
}, []);
```

`rowToMonitoredSite(row: CheckRow): MonitoredSite`:
- `id` = `row.url`
- `name` = hostname extracted from `row.url`
- `url` = `row.url`
- `status` = `row.is_up ? 'Online' : 'Down'`
- `uptime` = `row.is_up ? 100 : 0`
- `latency` = `row.response_ms`
- `sslDaysLeft` = `row.ssl_days_left`
- `sslStatus` = derived from `ssl_days_left`
- `region` = `'Unknown'`
- `lastChecked` = relative time from `row.checked_at` (e.g. "2m ago")
- `interval` = `'60s'`
- `ipAddress`, `lastIncident`, `lastDeployment`, `monitoringStarted` = `''` / sensible defaults
- `isPaused` = `false`

### UptimeStatusContent

Remove `SAMPLE_SERVICES`, `generateHeartbeats`. Build `UptimeService[]` from `getLatestPerUrl()` + per-URL `getUrlHistory(url, 48)`.

Heartbeat bar derivation per `CheckRow`:
```typescript
const barStatus = !row.is_up ? 'down'
  : row.response_ms > 2000   ? 'degraded'
  : 'operational';
```

Uptime percentages: compute from the heartbeat array (count operational / total).

### DowntimeAlertsContent

```typescript
const [incident, setIncident] = useState<Incident | null>(null);

useEffect(() => {
  getIncidents().then(list => {
    const active = list.find(i => i.resolvedAt === null);
    setIncident(active ?? null);
  }).catch(setError).finally(() => setLoading(false));
}, []);
```

When `incident === null` after loading: render empty state.
When `incident !== null`: render existing incident workflow UI with a synthetic `Incident` shape (mapped from `api.Incident` to `mockIncidents.Incident` shape for component compatibility, or refactor DowntimeAlertsContent to accept the new shape).

### PerformanceSpeedContent

Remove `SAMPLE_PERFORMANCE`. Map `CheckRow` → `PerformanceSite`:
- `status`: `response_ms < 150` → `'Excellent'`, `< 400` → `'Good'`, `< 800` → `'Slow'`, else → `'Critical'`
- `score`: `Math.max(0, Math.min(100, Math.round(100 - (response_ms / 20))))`
- `loadTime`: `response_ms / 1000`
- `vitals`: derived synthetic values (lcp = loadTime * 0.8, fid = response_ms * 0.1, cls = 0.01)
- `region`: `'Unknown'`
- `lastTested`: relative time from `checked_at`

Summary cards compute: `avg = mean(response_ms)`, `fastest = min`, `slowest = max`.

### DashboardClient / DashboardShell

- Remove `monitorsApi`, `MonitorRecord` imports.
- Remove inline "Add Website Bar" form (all the state for `addUrl`, `addName`, `addInterval`, `addLoading`, `addError`, `addSuccess`, and `addUrlInputRef`).
- `DashboardShell`: remove `monitorsApi.list()` — call only `getGlobalKPIs()`, `getRecentLogs()`, `getUniqueUrls()` (the latter two remain for the chart URL/history feature).
- `DashboardClient`: replace `monitorsApi.list()` call in `handleRefresh` with `getLatestPerUrl()`; the monitors table now reads from `CheckRow[]`.
- Change auto-refresh from `15000` to `60000`.
- The `AddWebsiteModal`'s `onSave` becomes a no-op (or shows a toast explaining to update `urls.json`).
- Add comment in both files about the Python engine / `urls.json`.

---

## Auth and Middleware Stubs

### `src/context/AuthContext.tsx`

```typescript
'use client';
import React, { createContext, useContext } from 'react';

interface AuthState {
  user: { id: number; name: string; email: string; avatar_url: string | null; created_at: string } | null;
  token: string | null;
  loading: boolean;
  login:   (token: string, user: any) => void;
  logout:  () => Promise<void>;
  refresh: () => Promise<void>;
}

const ANON_USER = { id: 0, name: 'Guest', email: '', avatar_url: null, created_at: '' };

const AuthContext = createContext<AuthState>({
  user: ANON_USER, token: 'stub', loading: false,
  login: () => {}, logout: async () => {}, refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{
      user: ANON_USER, token: 'stub', loading: false,
      login: () => {}, logout: async () => {}, refresh: async () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
```

### `src/components/AuthGuard.tsx`

```typescript
'use client';
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

---

## Dead Code Removal Plan

| Item | Action |
|---|---|
| `src/lib/flaskApi.ts` | Delete |
| `src/app/api/auth/` | Delete entire directory |
| `src/app/api/checks/` | Delete |
| `src/app/api/dashboard/` | Delete |
| `src/app/api/logs/` | Delete |
| `src/app/api/settings/` | Delete |
| `src/app/api/urls/` | Delete |
| `src/app/api/register/`, `forgot-password/`, `reset-password/`, `verify-email/` | Keep |
| `next.config.ts` rewrites | Remove Flask proxy rule (return `[]`) |
| `package.json` | Remove `next-auth`, `@prisma/client`, `prisma`, `@auth/prisma-adapter`, `bcryptjs`, `resend` |
| `prisma/` directory | Delete |

---

## Error Handling

Every async function in `api.ts`:
- Throws `Error(supabaseError.message)` on Supabase error.
- Components catch with `try/catch` in `useEffect` and set `error` state.
- Error UI: red banner with message + Retry button that calls the fetch function again.
- Loading UI: `Loader2` spinner (already used in the codebase) centred in the content area, or skeleton placeholders where richer loading states exist (SSL tab already has skeleton cards).

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: getLatestPerUrl deduplication invariant

For any array of `CheckRow` objects (with possible duplicate `url` values), calling the deduplication logic used by `getLatestPerUrl()` SHALL return an array where every `url` value appears exactly once, and the retained row for each URL is the one with the greatest `checked_at` timestamp.

**Validates: Requirements 2.2**

---

### Property 2: Incident run non-overlap

For any array of `CheckRow` objects grouped and processed by `getIncidents()`, every returned `Incident` SHALL cover a contiguous run of `is_up = false` rows, and the total `checkCount` across all incidents for a given URL SHALL be less than or equal to the number of `is_up = false` rows for that URL.

**Validates: Requirements 2.4**

---

### Property 3: SSL status derivation

For any `CheckRow` with a given `ssl_days_left` value, `getSslCertificates()` SHALL derive `status` as `'expired'` when `ssl_days_left <= 0`, `'expiring'` when `0 < ssl_days_left <= 14`, and `'valid'` when `ssl_days_left > 14`.

**Validates: Requirements 2.5**

---

### Property 4: KPI sslWarnings count correctness

For any array of `CheckRow` objects, `getGlobalKPIs()` SHALL return `sslWarnings` equal to the count of rows where `ssl_days_left >= 0 && ssl_days_left <= 14`, and `uptimePercentage` equal to `(upCount / total) * 100` when `total > 0`.

**Validates: Requirements 2.6**

---

### Property 5: CheckRow to MonitoredSite mapping

For any `CheckRow`, the `rowToMonitoredSite` mapping function SHALL produce a `MonitoredSite` where `status` is `'Online'` if and only if `row.is_up` is `true`, and `'Down'` otherwise; `latency` equals `row.response_ms`; `sslDaysLeft` equals `row.ssl_days_left`; and `id` equals `row.url`.

**Validates: Requirements 3.5**

---

### Property 6: Heartbeat status thresholds

For any `CheckRow`, the heartbeat bar derivation function SHALL return `'down'` when `is_up` is `false`, `'degraded'` when `is_up` is `true` and `response_ms > 2000`, and `'operational'` when `is_up` is `true` and `response_ms <= 2000`.

**Validates: Requirements 4.2**

---

### Property 7: Performance status thresholds

For any `CheckRow`, the performance status derivation function SHALL return `'Excellent'` when `response_ms < 150`, `'Good'` when `150 <= response_ms < 400`, `'Slow'` when `400 <= response_ms < 800`, and `'Critical'` when `response_ms >= 800`.

**Validates: Requirements 6.2**

---

### Property 8: KPI aggregate consistency

For any non-empty array of `CheckRow` objects, `getGlobalKPIs()` SHALL return `upCount + downCount === totalSites`, `upCount === rows.filter(r => r.is_up).length`, and `downCount === rows.filter(r => !r.is_up).length`.

**Validates: Requirements 2.6, 6.3**
