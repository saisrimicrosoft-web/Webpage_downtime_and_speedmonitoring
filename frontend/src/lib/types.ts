// Shared types matching the Supabase database schema exactly.
// Every component imports from here — no local type redefinitions.

export type WebsiteStatus = 'pending' | 'operational' | 'degraded' | 'down';
export type IncidentStatus = 'open' | 'resolved';
export type IncidentType   = 'down' | 'degraded' | 'ssl_expiry';

export interface Website {
  id:                 number;
  name:               string;
  url:                string;
  region:             string;
  check_interval_sec: number;
  status:             WebsiteStatus;
  uptime_pct:         number;
  last_response_ms:   number | null;
  last_checked_at:    string | null;
  ssl_expiry_at:      string | null;
  is_active:          boolean;
  created_at:         string;
}

export interface Check {
  id:          number;
  website_id:  number;
  url:         string;
  status_code: number | null;
  latency_ms:  number | null;
  is_up:       boolean;
  error:       string | null;
  region:      string;
  checked_at:  string;
}

export interface Incident {
  id:          number;
  website_id:  number;
  url:         string;
  type:        IncidentType;
  started_at:  string;
  resolved_at: string | null;
  status:      IncidentStatus;
  details:     string | null;
}

export interface SslCert {
  id:              number;
  website_id:      number;
  url:             string;
  issuer:          string | null;
  valid_from:      string | null;
  expires_at:      string | null;
  days_remaining:  number | null;
  last_checked_at: string;
}

// Extended SSL cert with full certificate details
export interface SslCertExtended extends SslCert {
  subject_cn:           string | null;
  san_list:             string[] | null;
  serial_number:        string | null;
  fingerprint_sha256:   string | null;
  signature_algorithm:  string | null;
  key_type:             string | null;
  key_size:             number | null;
  tls_version:          string | null;
  chain_valid:          boolean | null;
  hostname_match:       boolean | null;
  is_self_signed:       boolean | null;
  previous_fingerprint: string | null;
}

export type SslEventType = 'renewed' | 'expiring' | 'expired' | 'invalid' | 'chain_error';

export interface SslEvent {
  id:         number;
  website_id: number;
  type:       SslEventType;
  message:    string | null;
  created_at: string;
}

export type SslStatus = 'valid' | 'expiring' | 'critical' | 'expired' | 'invalid' | 'no_ssl';
export type SslGrade  = 'A' | 'B' | 'C' | 'D' | 'F';

// Shape returned by POST /api/websites
export interface CreateWebsitePayload {
  name:               string;
  url:                string;
  region?:            string;
  check_interval_sec?: number;
}
