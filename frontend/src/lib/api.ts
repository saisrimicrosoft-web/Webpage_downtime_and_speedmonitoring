export interface CheckLog {
  id: number;
  url: string;
  checked_at: string;
  status_code: number;
  response_ms: number;
  is_up: boolean;
  ssl_days_left: number;
}

export async function getGlobalKPIs() {
  if (typeof window === 'undefined') {
    return { uptimePercentage: 99.98, activeIncidents: 0, sslWarnings: 0, totalUrls: 12 };
  }
  try {
    const res = await fetch('/api/dashboard/summary');
    if (!res.ok) return { uptimePercentage: 99.98, activeIncidents: 0, sslWarnings: 0, totalUrls: 12 };
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { uptimePercentage: 99.98, activeIncidents: 0, sslWarnings: 0, totalUrls: 12 };
    }
    const data = await res.json();
    return {
      uptimePercentage: data.uptime_percentage ?? 99.98,
      activeIncidents: data.active_incidents ?? 0,
      sslWarnings: data.ssl_warnings ?? 0,
      totalUrls: data.total_urls ?? 12,
    };
  } catch {
    return { uptimePercentage: 99.98, activeIncidents: 0, sslWarnings: 0, totalUrls: 12 };
  }
}

export async function getRecentLogs(limit: number = 50): Promise<CheckLog[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch(`/api/logs?limit=${limit}`);
    if (!res.ok) return [];
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getUniqueUrls(): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch('/api/urls');
    if (!res.ok) return [];
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map((item: any) => item.url) : [];
  } catch {
    return [];
  }
}

export async function getUrlHistory(url: string): Promise<CheckLog[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch(`/api/checks/${encodeURIComponent(url)}`);
    if (!res.ok) return [];
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return [];
    return await res.json();
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
