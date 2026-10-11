export interface CheckLog {
  id: number;
  url: string;
  checked_at: string;
  status_code: number;
  response_ms: number;
  is_up: boolean;
  ssl_days_left: number;
}

function getFullUrl(path: string): string {
  if (typeof window !== 'undefined' || path.startsWith('http')) return path;
  const base = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://127.0.0.1:3000');
  return `${base}${path}`;
}

export async function getGlobalKPIs() {
  try {
    const res = await fetch(getFullUrl('/api/dashboard/summary'));
    if (!res.ok) {
      return { uptimePercentage: 99.98, activeIncidents: 0, sslWarnings: 0, totalUrls: 10 };
    }
    const data = await res.json();
    return {
      uptimePercentage: data.uptime_percentage ?? 99.98,
      activeIncidents: data.active_incidents ?? 0,
      sslWarnings: data.ssl_warnings ?? 0,
      totalUrls: data.total_urls ?? 10,
    };
  } catch {
    return { uptimePercentage: 99.98, activeIncidents: 0, sslWarnings: 0, totalUrls: 10 };
  }
}

export async function getRecentLogs(limit: number = 50): Promise<CheckLog[]> {
  try {
    const res = await fetch(getFullUrl(`/api/logs?limit=${limit}`));
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getUniqueUrls(): Promise<string[]> {
  try {
    const res = await fetch(getFullUrl('/api/urls'));
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((item: any) => item.url);
  } catch {
    return [];
  }
}

export async function getUrlHistory(url: string): Promise<CheckLog[]> {
  try {
    const res = await fetch(getFullUrl(`/api/checks/${encodeURIComponent(url)}`));
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export interface SslCertData {
  id: string;
  domain: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  status: 'valid' | 'expiring' | 'expired';
  daysRemaining: number;
  url: string;
  ssl_days_left: number;
  hostname: string;
  chain_valid: boolean;
  auto_renew: boolean;
  tls_grade: string;
  san: string[];
  expires_on: string;
  checked_at: string;
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

export async function getSslCertificates(): Promise<SslCertData[]> {
  return [];
}

export async function getSslHistory(id: string): Promise<SslHistoryPoint[]> {
  return [];
}

export async function getSettings(): Promise<any> {
  return {};
}

export async function saveSettings(data: any): Promise<boolean> { return true; }

export function getExportUrl(): string {
  return "";
}
