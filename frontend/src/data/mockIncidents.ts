export interface IncidentTimelineEvent {
  id: string;
  time: string;
  status: 'Detected' | 'Alerted' | 'Acknowledged' | 'Fixing' | 'Resolved';
  message: string;
}

export interface RegionStatus {
  name: string;
  status: 'OK' | 'FAILING';
  responseTime: number;
  httpCode: number | string;
}

export interface Incident {
  id: string;
  siteName: string;
  status: 'ACTIVE' | 'RESOLVED';
  detectedAt: Date;
  resolvedAt?: Date;
  errorType: string;
  regions: RegionStatus[];
  events: IncidentTimelineEvent[];
  notes?: string;
  severity: 'Critical' | 'Major' | 'Minor';
}

export const MOCK_INCIDENT: Incident = {
  id: 'inc-123',
  siteName: 'shop.acme.com',
  status: 'ACTIVE',
  severity: 'Critical',
  detectedAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
  errorType: 'HTTP 503 Service Unavailable',
  regions: [
    { name: 'Mumbai', status: 'OK', responseTime: 120, httpCode: 200 },
    { name: 'Singapore', status: 'OK', responseTime: 85, httpCode: 200 },
    { name: 'Frankfurt', status: 'FAILING', responseTime: 5000, httpCode: 503 },
    { name: 'Virginia', status: 'FAILING', responseTime: 5000, httpCode: 503 },
    { name: 'São Paulo', status: 'OK', responseTime: 210, httpCode: 200 },
    { name: 'Sydney', status: 'OK', responseTime: 150, httpCode: 200 },
  ],
  events: [
    { id: 'evt-1', time: new Date(Date.now() - 1000 * 60 * 15).toISOString(), status: 'Detected', message: 'HTTP 503 errors spiking across EU and US East.' },
    { id: 'evt-2', time: new Date(Date.now() - 1000 * 60 * 14).toISOString(), status: 'Alerted', message: 'PagerDuty alert sent to on-call engineer.' },
  ]
};

export const MOCK_SITES_TIMELINE = [
  { site: 'shop.acme.com', incidents: [{ start: new Date(Date.now() - 1000 * 60 * 60 * 2), end: new Date(), severity: 'Critical' }] },
  { site: 'api.acme.com', incidents: [{ start: new Date(Date.now() - 1000 * 60 * 60 * 12), end: new Date(Date.now() - 1000 * 60 * 60 * 11), severity: 'Minor' }] },
  { site: 'blog.acme.com', incidents: [] },
  { site: 'docs.acme.com', incidents: [{ start: new Date(Date.now() - 1000 * 60 * 60 * 18), end: new Date(Date.now() - 1000 * 60 * 60 * 15), severity: 'Major' }] },
];
