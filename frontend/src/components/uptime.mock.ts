const NOW = Date.now();

export const monitors = [
  { id: 'api',      name: 'api.pulseguard.io',      protocol: 'HTTPS', regions: 3, status: 'up',     uptime: 99.98 },
  { id: 'app',      name: 'app.acme-store.com',     protocol: 'HTTPS', regions: 2, status: 'slow',   uptime: 99.71 },
  { id: 'db',       name: 'db.acme-store.com:5432', protocol: 'TCP',   regions: 1, status: 'up',     uptime: 100   },
  { id: 'checkout', name: 'checkout.acme-store.com',protocol: 'HTTPS', regions: 2, status: 'down',   uptime: 97.42 },
  { id: 'staging',  name: 'staging.acme.dev',       protocol: 'HTTP',  regions: 0, status: 'paused', uptime: null  },
] as const;

export const incidents = {
  checkout: [
    { type: 'ongoing',  title: 'Timeout after 10s', startedAt: NOW - (14 * 60 + 22) * 1000, startedLabel: 'Started 14:02' },
    { type: 'resolved', title: 'Status 500', agoLabel: '12 days ago', durationLabel: '1h 08m' },
  ],
  api: [],
  app: [],
  db: [],
  staging: [],
};

export const historyMap = {
  api: Array(91).fill('perfect'),
  app: Array.from({ length: 91 }, (_, i) => [20, 41, 55, 70, 88].includes(i) ? 'slow' : 'perfect'),
  db: Array(91).fill('perfect'),
  checkout: Array.from({ length: 91 }, (_, i) => [5, 6, 83, 90].includes(i) ? 'down' : [24, 69, 76].includes(i) ? 'slow' : 'perfect'),
  staging: Array(91).fill('perfect'),
};
