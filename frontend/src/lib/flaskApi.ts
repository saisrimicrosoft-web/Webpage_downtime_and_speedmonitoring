'use client';

// Helper to get auth headers from localStorage
function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: any = new Error(data?.error || data?.errors?.general || res.statusText || 'Request failed');
    error.status = res.status;
    error.body = data;
    throw error;
  }
  return data;
}

// ── Types ──────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  created_at?: string;
}

export interface MonitorRecord {
  id: number;
  user_id: number;
  name: string;
  url: string;
  check_interval_seconds: number;
  timeout_seconds: number;
  expected_status_code: number;
  is_active: boolean;
  created_at: string;
  uptime_24h?: number;
  uptime_7d?: number;
  uptime_30d?: number;
  latest_check?: CheckRecord | null;
}

export interface CheckRecord {
  id: number;
  monitor_id: number;
  timestamp: string;
  status: 'up' | 'down';
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  ssl_days_left: number | null;
  ssl_issuer: string | null;
}

export interface IncidentRecord {
  id: number;
  monitor_id: number;
  monitor_name?: string;
  monitor_url?: string;
  started_at: string;
  resolved_at: string | null;
  cause: string | null;
  is_resolved: boolean;
  duration_minutes?: number | null;
}

export interface ProfileData {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  stats?: {
    total_monitors: number;
    total_checks: number;
    overall_uptime: number;
  };
}

export interface AlertSettings {
  id?: number;
  user_id?: number;
  email_alerts_enabled: boolean;
  alert_email: string | null;
  slow_threshold_ms: number;
  notify_on_recovery: boolean;
  notify_on_ssl_expiry: boolean;
}

// ── Auth API ────────────────────────────────────────────────────────

export const authApi = {
  async signup(name: string, email: string, password: string, confirm_password?: string) {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, confirm_password: confirm_password || password }),
    });
    return handleResponse(res);
  },

  async login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async me() {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async logout() {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// ── Monitors API ────────────────────────────────────────────────────

export const monitorsApi = {
  async list(): Promise<MonitorRecord[]> {
    const res = await fetch('/api/monitors', {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async get(id: number): Promise<MonitorRecord> {
    const res = await fetch(`/api/monitors/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async create(data: {
    url: string;
    name?: string;
    check_interval_seconds?: number;
    timeout_seconds?: number;
    expected_status_code?: number;
  }): Promise<MonitorRecord> {
    const res = await fetch('/api/monitors', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async update(id: number, data: Partial<MonitorRecord>): Promise<MonitorRecord> {
    const res = await fetch(`/api/monitors/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async delete(id: number): Promise<{ message: string }> {
    const res = await fetch(`/api/monitors/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async runCheck(id: number): Promise<CheckRecord> {
    const res = await fetch(`/api/monitors/${id}/check`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async checkAll(): Promise<{ status: string }> {
    const res = await fetch('/api/monitors/check_all', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async checks(id: number, hours: number = 24, limit: number = 200): Promise<CheckRecord[]> {
    const res = await fetch(`/api/monitors/${id}/checks?hours=${hours}&limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async incidents(id: number, hours: number = 720): Promise<IncidentRecord[]> {
    const res = await fetch(`/api/monitors/${id}/incidents?hours=${hours}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async summary(): Promise<any> {
    const res = await fetch('/api/monitors/summary', {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async history(): Promise<any> {
    const res = await fetch('/api/monitors/history', {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// ── Profile API ─────────────────────────────────────────────────────

export const profileApi = {
  async get(): Promise<ProfileData> {
    const res = await fetch('/api/profile', {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async update(data: { name?: string; avatar_url?: string | null }): Promise<ProfileData> {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async changePassword(current_password: string, new_password: string, confirm_password?: string) {
    const res = await fetch('/api/profile/password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ current_password, new_password, confirm_password: confirm_password || new_password }),
    });
    return handleResponse(res);
  },

  async getAlertSettings(): Promise<AlertSettings> {
    const res = await fetch('/api/profile/alert-settings', {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateAlertSettings(data: Partial<AlertSettings>): Promise<AlertSettings> {
    const res = await fetch('/api/profile/alert-settings', {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteAccount(confirm: boolean) {
    const res = await fetch('/api/profile/delete', {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ confirm }),
    });
    return handleResponse(res);
  },
};
