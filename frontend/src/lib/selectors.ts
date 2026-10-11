// Pure selector functions. Import these in every component that needs metrics.
// Never compute metrics inside components.

import type { Website, Check, Incident, SslCert } from './types';

// ── Dashboard KPIs ────────────────────────────────────────────────────────────

export function selectGlobalUptime(websites: Website[]): number {
  if (websites.length === 0) return 0;
  const sum = websites.reduce((acc, w) => acc + (w.uptime_pct ?? 0), 0);
  return parseFloat((sum / websites.length).toFixed(3));
}

export function selectOpenIncidents(incidents: Incident[]): Incident[] {
  return incidents.filter(i => i.status === 'open');
}

export function selectSslWarnings(websites: Website[]): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 14);
  return websites.filter(w => {
    if (!w.ssl_expiry_at) return false;
    return new Date(w.ssl_expiry_at) <= cutoff;
  }).length;
}

export function selectKPIs(websites: Website[], incidents: Incident[]) {
  return {
    totalSites:        websites.length,
    uptimePercentage:  selectGlobalUptime(websites),
    activeIncidents:   selectOpenIncidents(incidents).length,
    sslWarnings:       selectSslWarnings(websites),
    upCount:           websites.filter(w => w.status === 'operational').length,
    downCount:         websites.filter(w => w.status === 'down').length,
    degradedCount:     websites.filter(w => w.status === 'degraded').length,
    avgResponseMs:     websites.length === 0 ? 0 :
      Math.round(websites.filter(w => w.last_response_ms != null)
        .reduce((s, w) => s + (w.last_response_ms ?? 0), 0) /
        (websites.filter(w => w.last_response_ms != null).length || 1)),
  };
}

// ── Per-website heartbeat (last N checks) ────────────────────────────────────

export function selectHeartbeat(checks: Check[], websiteId: number, limit = 48) {
  return checks
    .filter(c => c.website_id === websiteId)
    .slice(0, limit)
    .reverse()
    .map(c => ({
      status:  !c.is_up ? 'down' : (c.latency_ms ?? 0) > 1500 ? 'degraded' : 'operational',
      date:    new Date(c.checked_at).toLocaleString(),
      latency: c.latency_ms ?? 0,
    }));
}

// ── SSL cert view ─────────────────────────────────────────────────────────────

export function selectSslStatus(cert: SslCert | null): 'valid' | 'expiring' | 'expired' {
  if (!cert || cert.days_remaining == null) return 'expired';
  if (cert.days_remaining <= 0)  return 'expired';
  if (cert.days_remaining <= 14) return 'expiring';
  return 'valid';
}

// ── Uptime status derived from website list ───────────────────────────────────

export function selectAvgUptime90d(websites: Website[]): string {
  return selectGlobalUptime(websites).toFixed(2);
}

export function selectMeanLatency(websites: Website[]): number {
  const active = websites.filter(w => w.last_response_ms != null);
  if (active.length === 0) return 0;
  return Math.round(active.reduce((s, w) => s + (w.last_response_ms ?? 0), 0) / active.length);
}

// ── SSL Certificate selectors ─────────────────────────────────────────────────

import type { SslCertExtended, SslStatus, SslGrade } from './types';

export function selectSslRowStatus(cert: SslCert | SslCertExtended | null, url: string): SslStatus {
  if (!url.startsWith('https')) return 'no_ssl';
  if (!cert) return 'invalid';
  const days = cert.days_remaining;
  if (days === null || days === undefined) return 'invalid';
  if (days <= 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'expiring';
  return 'valid';
}

export function selectSslGrade(cert: SslCertExtended | null): SslGrade {
  if (!cert) return 'F';
  const days = cert.days_remaining ?? 0;
  if (days <= 0)                              return 'F';
  if (cert.hostname_match === false)          return 'F';
  if (cert.is_self_signed === true)           return 'F';
  if (cert.chain_valid === false)             return 'F';
  const tls = cert.tls_version ?? '';
  if (tls && !tls.includes('1.3') && !tls.includes('1.2')) return 'C';
  if (days <= 7)                              return 'D';
  if (days <= 30)                             return 'B';
  return 'A';
}

export function selectSslGradeReasons(cert: SslCertExtended | null): string[] {
  if (!cert) return ['No certificate data'];
  const reasons: string[] = [];
  const days = cert.days_remaining ?? 0;
  if (days <= 0)                     reasons.push('Certificate expired');
  if (cert.hostname_match === false) reasons.push('Hostname mismatch');
  if (cert.is_self_signed === true)  reasons.push('Self-signed certificate');
  if (cert.chain_valid === false)    reasons.push('Broken certificate chain');
  const tls = cert.tls_version ?? '';
  if (tls && !tls.includes('1.3') && !tls.includes('1.2')) reasons.push(`Outdated TLS: ${tls}`);
  if (days > 0 && days <= 7)        reasons.push(`Expires in ${days} day${days !== 1 ? 's' : ''}`);
  if (days > 7 && days <= 30)       reasons.push(`Expiring soon: ${days} days`);
  if (reasons.length === 0)          reasons.push('All checks passed');
  return reasons;
}

export function selectSslSummary(websites: Website[], sslCerts: SslCert[]) {
  const certByWebsite = new Map<number, SslCert>();
  for (const c of sslCerts) certByWebsite.set(c.website_id, c);

  let total = 0, valid = 0, expiringSoon = 0, expiredOrInvalid = 0;
  for (const w of websites) {
    if (!w.url.startsWith('https')) continue;
    total++;
    const cert = certByWebsite.get(w.id);
    const status = selectSslRowStatus(cert ?? null, w.url);
    if (status === 'valid') valid++;
    else if (status === 'expiring' || status === 'critical') expiringSoon++;
    else expiredOrInvalid++;
  }
  return { total, valid, expiringSoon, expiredOrInvalid };
}
