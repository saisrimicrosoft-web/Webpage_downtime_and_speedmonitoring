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

export async function getProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let dbProfile: any = null;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!error && data) dbProfile = data;
    } catch {
      // Table doesn't exist yet
    }

    const metaName = user.user_metadata?.name || user.user_metadata?.full_name || '';
    const metaEmail = user.email || user.user_metadata?.email || '';
    const metaPhone = user.user_metadata?.phone || '';

    return {
      id: user.id,
      name: dbProfile?.name || metaName || (metaEmail ? metaEmail.split('@')[0] : 'User'),
      email: dbProfile?.email || metaEmail,
      phone: dbProfile?.phone || metaPhone,
      avatar_url: dbProfile?.avatar_url || user.user_metadata?.avatar_url || '',
      created_at: user.created_at,
    };
  } catch (err) {
    console.warn('getProfile error:', err);
    return null;
  }
}

export async function getSettings(): Promise<Record<string, unknown>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    let dbProfile: any = null;
    let dbSettings: any = null;

    try {
      const [{ data: profile, error: pErr }, { data: settings, error: sErr }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
      ]);
      if (!pErr && profile) dbProfile = profile;
      if (!sErr && settings) dbSettings = settings;
    } catch {
      // Ignored if tables do not exist
    }

    // Check localStorage cache
    let localCache: any = null;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`nexora_settings_${user.id}`);
        if (stored) localCache = JSON.parse(stored);
      } catch {}
    }

    const meta = user.user_metadata || {};
    const metaSettings = meta.settings || {};

    const name = dbProfile?.name || meta.name || meta.full_name || localCache?.profile?.name || (user.email ? user.email.split('@')[0] : '');
    const email = dbProfile?.email || user.email || meta.email || localCache?.profile?.email || '';
    const phone = dbProfile?.phone || meta.phone || localCache?.profile?.phone || '';

    return {
      profile: {
        name,
        email,
        phone,
      },
      appearance: {
        theme:    (typeof window !== 'undefined' && localStorage.getItem('nexora_theme') === 'Light' ? 'Light' : null)
          ?? (dbSettings?.theme === 'Light' ? 'Light' : null)
          ?? (metaSettings.theme === 'Light' ? 'Light' : null)
          ?? (localCache?.appearance?.theme === 'Light' ? 'Light' : null)
          ?? 'Dark',
        fontSize: dbSettings?.font_size ?? metaSettings.fontSize ?? localCache?.appearance?.fontSize ?? 'medium',
        language: dbSettings?.language  ?? metaSettings.language  ?? localCache?.appearance?.language  ?? 'English',
      },
      notifications: {
        email:     dbSettings?.email_notif     ?? metaSettings.emailNotif     ?? localCache?.notifications?.email     ?? true,
        push:      dbSettings?.push_notif      ?? metaSettings.pushNotif      ?? localCache?.notifications?.push      ?? false,
        marketing: dbSettings?.marketing_notif ?? metaSettings.marketingNotif ?? localCache?.notifications?.marketing ?? false,
      },
      privacy: {
        publicProfile: dbSettings?.public_profile ?? metaSettings.publicProfile ?? localCache?.privacy?.publicProfile ?? false,
        showOnline:    dbSettings?.show_online     ?? metaSettings.showOnline     ?? localCache?.privacy?.showOnline     ?? true,
      },
      security: {
        twoFactor: dbSettings?.two_factor ?? metaSettings.twoFactor ?? localCache?.security?.twoFactor ?? false,
      },
    };
  } catch (err) {
    console.warn('getSettings error:', err);
    return {};
  }
}

export async function saveSettings(data: unknown): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const payload = data as Record<string, any>;

    // 1. Update Supabase Auth user_metadata (always works)
    try {
      await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          name: payload.profile?.name ?? user.user_metadata?.name,
          phone: payload.profile?.phone ?? user.user_metadata?.phone,
          settings: {
            theme: payload.appearance?.theme,
            fontSize: payload.appearance?.fontSize,
            language: payload.appearance?.language,
            emailNotif: payload.notifications?.email,
            pushNotif: payload.notifications?.push,
            marketingNotif: payload.notifications?.marketing,
            publicProfile: payload.privacy?.publicProfile,
            showOnline: payload.privacy?.showOnline,
            twoFactor: payload.security?.twoFactor,
          },
        },
      });
    } catch (authErr) {
      console.warn('Failed to update user_metadata in auth:', authErr);
    }

    // 2. Persist in localStorage for instant retrieval
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`nexora_settings_${user.id}`, JSON.stringify(payload));
        if (payload.profile) {
          localStorage.setItem(`nexora_profile_${user.id}`, JSON.stringify(payload.profile));
        }
      } catch {}
    }

    // 3. Sync to Supabase tables if they exist
    try {
      if (payload.profile) {
        await supabase.from('profiles').upsert({
          id:    user.id,
          name:  payload.profile.name,
          email: payload.profile.email,
          phone: payload.profile.phone ?? '',
        });
      }

      await supabase.from('user_settings').upsert({
        user_id:         user.id,
        theme:           payload.appearance?.theme     ?? 'Dark',
        font_size:       payload.appearance?.fontSize ?? 'medium',
        language:        payload.appearance?.language ?? 'English',
        email_notif:     payload.notifications?.email     ?? true,
        push_notif:      payload.notifications?.push      ?? false,
        marketing_notif: payload.notifications?.marketing ?? false,
        public_profile:  payload.privacy?.publicProfile ?? false,
        show_online:     payload.privacy?.showOnline     ?? true,
        two_factor:      payload.security?.twoFactor     ?? false,
      });
    } catch {
      // Gracefully ignore if tables don't exist yet
    }

    return true;
  } catch (err) {
    console.error('saveSettings error:', err);
    return false;
  }
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
