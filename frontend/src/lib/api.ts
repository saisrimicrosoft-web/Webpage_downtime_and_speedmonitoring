import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckRow {
  id: number;
  url: string;
  checked_at: string;
  status_code: number;
  response_ms: number;
  is_up: boolean;
  ssl_days_left: number;
}

// Backward-compat alias
export type CheckLog = CheckRow;

export interface Incident {
  id: string;
  url: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMs: number;
  checkCount: number;
}

export interface SslCertData {
  id: string;
  url: string;
  hostname: string;
  domain: string;
  ssl_days_left: number;
  daysRemaining: number;
  status: 'valid' | 'expiring' | 'expired';
  checked_at: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  chain_valid: boolean;
  auto_renew: boolean;
  tls_grade: string;
  san: string[];
  expires_on: string;
  tls_version: string;
  cipher: string;
  key_size: number;
  region: string;
}

export interface SslHistoryPoint {
  date: string;
  daysRemaining: number;
  checked_at: string;
  ssl_days_left: number;
}

// ─── Core Queries ─────────────────────────────────────────────────────────────

/**
 * Returns the latest check for each distinct URL.
 * Fetches all rows ordered by checked_at DESC and deduplicates in JS
 * (Supabase free tier doesn't support DISTINCT ON).
 */
export async function getLatestPerUrl(): Promise<CheckRow[]> {
  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .order('checked_at', { ascending: false });
  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  return (data ?? []).filter((row: CheckRow) => {
    if (seen.has(row.url)) return false;
    seen.add(row.url);
    return true;
  });
}

/**
 * Returns up to `limit` recent checks for a single URL, ordered newest first.
 */
export async function getUrlHistory(url: string, limit = 90): Promise<CheckRow[]> {
  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .eq('url', url)
    .order('checked_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Returns up to `limit` recent checks for a single URL for the heatmap (91-day grid).
 * Ordered newest first. Use this only for the heartbeat detail panel.
 */
export async function getUrlHistory91Days(url: string): Promise<CheckRow[]> {
  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .eq('url', url)
    .order('checked_at', { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Derives consecutive is_up=false runs (incidents) from all checks.
 * Groups rows by URL, scans DESC, groups consecutive false rows into incidents.
 */
export async function getIncidents(): Promise<Incident[]> {
  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .order('url', { ascending: true })
    .order('checked_at', { ascending: false });
  if (error) throw new Error(error.message);

  const rows: CheckRow[] = data ?? [];

  // Group by URL
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
          // Resolved: the current up-row happened after the run
          incidents.push(buildIncident(url, run, row.checked_at));
          run = [];
        }
      }
    }
    // Still-active run (no up-row after it)
    if (run.length > 0) {
      incidents.push(buildIncident(url, run, null));
    }
  }

  return incidents;
}

function buildIncident(url: string, run: CheckRow[], resolvedAt: string | null): Incident {
  // run is sorted DESC: run[0] = most recent, run[last] = oldest
  const startedAt = run[run.length - 1].checked_at;
  const latestAt  = run[0].checked_at;
  const durationMs = new Date(latestAt).getTime() - new Date(startedAt).getTime();
  return {
    id: `${url}-${startedAt}`,
    url,
    startedAt,
    resolvedAt,
    durationMs,
    checkCount: run.length,
  };
}

/**
 * Returns SSL certificate data for each monitored URL (latest check per URL).
 */
export async function getSslCertificates(): Promise<SslCertData[]> {
  const latest = await getLatestPerUrl();
  return latest.map((row): SslCertData => {
    const days = row.ssl_days_left ?? -1;
    const status: 'valid' | 'expiring' | 'expired' =
      days <= 0  ? 'expired'  :
      days <= 14 ? 'expiring' : 'valid';

    let hostname = row.url;
    try { hostname = new URL(row.url).hostname; } catch {}

    return {
      id:           String(row.id),
      url:          row.url,
      hostname,
      domain:       hostname,
      ssl_days_left: days,
      daysRemaining: days,
      status,
      checked_at:   row.checked_at,
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

/**
 * Returns global KPI values computed from the latest check per URL.
 */
export async function getGlobalKPIs() {
  const rows = await getLatestPerUrl();
  const total    = rows.length;
  const upCount  = rows.filter(r => r.is_up).length;
  const downCount = total - upCount;
  const sslWarnings = rows.filter(r => r.ssl_days_left >= 0 && r.ssl_days_left <= 14).length;
  const avgResponseMs = total > 0
    ? Math.round(rows.reduce((s, r) => s + (r.response_ms ?? 0), 0) / total)
    : 0;
  const uptimePercentage = total > 0 ? (upCount / total) * 100 : 100;

  return {
    totalSites:       total,
    upCount,
    downCount,
    avgResponseMs,
    sslWarnings,
    uptimePercentage,
    activeIncidents:  downCount,
    // Legacy shape aliases used by KPIOverview / DashboardClient
    totalUrls:        total,
  };
}

// ─── Backward-compat helpers (used by DashboardShell / chart features) ────────

export async function getRecentLogs(limit = 50): Promise<CheckLog[]> {
  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .order('checked_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getUniqueUrls(): Promise<string[]> {
  const latest = await getLatestPerUrl();
  return latest.map(r => r.url);
}

// ─── Stub functions (kept for import compatibility) ────────────────────────────

export async function getSslHistory(_id: string): Promise<SslHistoryPoint[]> {
  return [];
}

export async function getSettings(): Promise<Record<string, unknown>> {
  return {};
}

export async function saveSettings(_data: unknown): Promise<boolean> {
  return true;
}

// ─── New website-table queries ─────────────────────────────────────────────

export async function getWebsites() {
  const { data, error } = await supabase
    .from('websites')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getWebsiteChecks(websiteId: number, limit = 90) {
  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .eq('website_id', websiteId)
    .order('checked_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRealIncidents() {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('started_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSslCerts() {
  const { data, error } = await supabase
    .from('ssl_certs')
    .select('*');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function getExportUrl(): string {
  return '';
}
