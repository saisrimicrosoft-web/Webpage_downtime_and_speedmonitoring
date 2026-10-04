'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck,
  Search, Filter, RefreshCw, ChevronDown, Globe, MapPin,
  TrendingUp, Activity, Server, AlertOctagon, ArrowUpRight,
  Check, Info, Calendar, BarChart3, Radio
} from 'lucide-react';
import { REGION_GROUPS } from './MonitorWebsitesContent';

export interface UptimeService {
  id: string;
  name: string;
  url: string;
  region: string;
  status: 'Operational' | 'Degraded' | 'Outage' | 'Maintenance';
  currentLatency: number;
  uptime24h: number;
  uptime7d: number;
  uptime30d: number;
  uptime90d: number;
  lastIncident: string;
  // Array of 45 heartbeat segments (0: down, 1: degraded, 2: operational)
  heartbeat: {
    status: 'operational' | 'degraded' | 'down';
    date: string;
    uptime: number;
    latency: number;
  }[];
}

/* ──────────────── GENERATE REALISTIC HEARTBEATS ──────────────── */
function generateHeartbeats(baseUptime: number, avgLatency: number, isCurrentlyDown = false) {
  const bars = [];
  const now = Date.now();
  const count = 48; // 48 blocks representing intervals

  for (let i = count - 1; i >= 0; i--) {
    const timeAgo = new Date(now - i * 30 * 60 * 1000);
    const timeStr = timeAgo.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = timeAgo.toLocaleDateString([], { month: 'short', day: 'numeric' });

    if (i === 0 && isCurrentlyDown) {
      bars.push({
        status: 'down' as const,
        date: `${dateStr} ${timeStr}`,
        uptime: 0,
        latency: 0,
      });
      continue;
    }

    const rand = Math.random();
    if (baseUptime < 96 && (i === 4 || i === 5 || i === 22)) {
      bars.push({
        status: 'down' as const,
        date: `${dateStr} ${timeStr}`,
        uptime: 0,
        latency: 0,
      });
    } else if (baseUptime < 99 && (i === 12 || i === 31 || rand < 0.04)) {
      bars.push({
        status: 'degraded' as const,
        date: `${dateStr} ${timeStr}`,
        uptime: 88.5,
        latency: avgLatency * 2.8,
      });
    } else {
      bars.push({
        status: 'operational' as const,
        date: `${dateStr} ${timeStr}`,
        uptime: 100,
        latency: Math.max(25, Math.round(avgLatency + (Math.random() * 20 - 10))),
      });
    }
  }
  return bars;
}

const SAMPLE_SERVICES: UptimeService[] = [
  {
    id: '1',
    name: 'google.com',
    url: 'https://google.com',
    region: 'India - Mumbai',
    status: 'Operational',
    currentLatency: 38,
    uptime24h: 100.00,
    uptime7d: 100.00,
    uptime30d: 99.99,
    uptime90d: 99.99,
    lastIncident: 'Clean (No incidents in 90 days)',
    heartbeat: generateHeartbeats(99.99, 38),
  },
  {
    id: '2',
    name: 'amazon.in',
    url: 'https://amazon.in',
    region: 'India - Mumbai',
    status: 'Degraded',
    currentLatency: 380,
    uptime24h: 98.40,
    uptime7d: 97.20,
    uptime30d: 98.15,
    uptime90d: 97.90,
    lastIncident: 'High response latency detected 12m ago',
    heartbeat: generateHeartbeats(97.9, 380),
  },
  {
    id: '3',
    name: 'flipkart.com',
    url: 'https://flipkart.com',
    region: 'India - Delhi NCR',
    status: 'Outage',
    currentLatency: 0,
    uptime24h: 92.10,
    uptime7d: 94.50,
    uptime30d: 95.80,
    uptime90d: 96.20,
    lastIncident: 'Connection Timeout – Gateway 504 (Active)',
    heartbeat: generateHeartbeats(94.5, 520, true),
  },
  {
    id: '4',
    name: 'myntra.com',
    url: 'https://myntra.com',
    region: 'India - Bengaluru',
    status: 'Operational',
    currentLatency: 112,
    uptime24h: 99.95,
    uptime7d: 99.90,
    uptime30d: 99.88,
    uptime90d: 99.85,
    lastIncident: 'Auto-recovered from blip 4d ago',
    heartbeat: generateHeartbeats(99.85, 112),
  },
  {
    id: '5',
    name: 'vercel.com',
    url: 'https://vercel.com',
    region: 'India - Hyderabad',
    status: 'Operational',
    currentLatency: 52,
    uptime24h: 100.00,
    uptime7d: 99.99,
    uptime30d: 99.98,
    uptime90d: 99.97,
    lastIncident: 'Clean (No incidents)',
    heartbeat: generateHeartbeats(99.98, 52),
  },
  {
    id: '6',
    name: 'github.com',
    url: 'https://github.com',
    region: 'EU-Central Frankfurt',
    status: 'Operational',
    currentLatency: 118,
    uptime24h: 99.99,
    uptime7d: 99.95,
    uptime30d: 99.92,
    uptime90d: 99.90,
    lastIncident: 'Webhook delivery delay resolved 8d ago',
    heartbeat: generateHeartbeats(99.92, 118),
  },
  {
    id: '7',
    name: 'openai.com',
    url: 'https://openai.com',
    region: 'US-West California',
    status: 'Operational',
    currentLatency: 84,
    uptime24h: 99.98,
    uptime7d: 99.94,
    uptime30d: 99.89,
    uptime90d: 99.82,
    lastIncident: 'API rate limiter spike 14d ago',
    heartbeat: generateHeartbeats(99.85, 84),
  },
  {
    id: '8',
    name: 'spotify.com',
    url: 'https://spotify.com',
    region: 'EU-West London',
    status: 'Operational',
    currentLatency: 130,
    uptime24h: 99.88,
    uptime7d: 99.82,
    uptime30d: 99.80,
    uptime90d: 99.75,
    lastIncident: 'Scheduled Maintenance Window 2d ago',
    heartbeat: generateHeartbeats(99.80, 130),
  },
  {
    id: '9',
    name: 'netflix.com',
    url: 'https://netflix.com',
    region: 'US-East Ohio',
    status: 'Operational',
    currentLatency: 88,
    uptime24h: 100.00,
    uptime7d: 100.00,
    uptime30d: 99.99,
    uptime90d: 99.99,
    lastIncident: 'Clean (No incidents)',
    heartbeat: generateHeartbeats(99.99, 88),
  },
  {
    id: '10',
    name: 'medium.com',
    url: 'https://medium.com',
    region: 'AP-Southeast Singapore',
    status: 'Operational',
    currentLatency: 95,
    uptime24h: 99.92,
    uptime7d: 99.89,
    uptime30d: 99.85,
    uptime90d: 99.81,
    lastIncident: 'DNS propagation check 19d ago',
    heartbeat: generateHeartbeats(99.85, 95),
  },
];

/* ──────────────── REGIONAL PROBE STATS ──────────────── */
const REGIONAL_PROBES = [
  { name: 'India - Mumbai', country: '🇮🇳 India', status: 'Operational', uptime: '100.00%', latency: '34ms', activeProbes: 4 },
  { name: 'India - Hyderabad', country: '🇮🇳 India', status: 'Operational', uptime: '99.99%', latency: '39ms', activeProbes: 3 },
  { name: 'India - Bengaluru', country: '🇮🇳 India', status: 'Operational', uptime: '99.98%', latency: '42ms', activeProbes: 3 },
  { name: 'India - Delhi NCR', country: '🇮🇳 India', status: 'Degraded', uptime: '97.45%', latency: '185ms', activeProbes: 4 },
  { name: 'AP-Southeast Singapore', country: '🇸🇬 Singapore', status: 'Operational', uptime: '99.99%', latency: '68ms', activeProbes: 3 },
  { name: 'EU-Central Frankfurt', country: '🇩🇪 Germany', status: 'Operational', uptime: '99.96%', latency: '115ms', activeProbes: 3 },
  { name: 'US-East N.Virginia', country: '🇺🇸 United States', status: 'Operational', uptime: '99.97%', latency: '82ms', activeProbes: 4 },
  { name: 'EU-West London', country: '🇬🇧 United Kingdom', status: 'Operational', uptime: '99.95%', latency: '108ms', activeProbes: 2 },
];

export default function UptimeStatusContent() {
  const [services, setServices] = useState<UptimeService[]>(SAMPLE_SERVICES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Operational' | 'Degraded' | 'Outage'>('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('90d');
  const [hoveredBar, setHoveredBar] = useState<{ serviceId: string; date: string; uptime: number; latency: number } | null>(null);
  const [selectedService, setSelectedService] = useState<UptimeService | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Favicon helper
  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return '';
    }
  };

  // KPI Calculations
  const operationalCount = services.filter(s => s.status === 'Operational').length;
  const degradedCount = services.filter(s => s.status === 'Degraded').length;
  const outageCount = services.filter(s => s.status === 'Outage').length;

  const avgUptime90d = (
    services.reduce((acc, s) => acc + s.uptime90d, 0) / services.length
  ).toFixed(2);

  const avgLatency = Math.round(
    services.filter(s => s.currentLatency > 0).reduce((acc, s) => acc + s.currentLatency, 0) /
    (services.filter(s => s.currentLatency > 0).length || 1)
  );

  // Filtered services
  const filtered = useMemo(() => {
    return services.filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.url.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (statusFilter !== 'all' && s.status !== statusFilter) return false;

      if (regionFilter !== 'all') {
        if (regionFilter === 'India (All)' || regionFilter === 'India') {
          const l = s.region.toLowerCase();
          return l.includes('india') || l.includes('mumbai') || l.includes('delhi') || l.includes('bengaluru') || l.includes('hyderabad');
        }
        const norm = (str: string) => str.toLowerCase().replace(/[\(\)\-\s\.\/]/g, '');
        return norm(s.region).includes(norm(regionFilter)) || norm(regionFilter).includes(norm(s.region));
      }

      return true;
    });
  }, [services, searchQuery, statusFilter, regionFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      {/* ═══ HEADER & GLOBAL SLA STATUS ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Uptime Status & System Availability
            </h1>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Telemetry Live</span>
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            Continuous availability probes across India, Asia Pacific, Europe & Americas with SLA compliance tracker.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Timeframe pill selector */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
            {(['24h', '7d', '30d', '90d'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeframe === t
                    ? 'bg-white dark:bg-zinc-700 text-purple-600 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            className={`p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-purple-600 hover:border-purple-300 transition-all cursor-pointer shadow-xs ${
              isRefreshing ? 'animate-spin text-purple-600' : ''
            }`}
            title="Refresh Uptime Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ═══ OVERALL STATUS BANNER ═══ */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        outageCount > 0
          ? 'bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border-rose-200 dark:border-rose-900/50'
          : degradedCount > 0
          ? 'bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-transparent border-amber-200 dark:border-amber-900/50'
          : 'bg-gradient-to-r from-emerald-500/10 via-purple-500/5 to-transparent border-emerald-200 dark:border-emerald-900/50'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className={`p-2.5 rounded-xl text-white shadow-md flex-shrink-0 ${
              outageCount > 0 ? 'bg-rose-500' : degradedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}>
              {outageCount > 0 ? (
                <AlertOctagon className="w-6 h-6 animate-pulse" />
              ) : degradedCount > 0 ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                  {outageCount > 0
                    ? `${outageCount} Service Experiencing Outage`
                    : degradedCount > 0
                    ? 'Partial System Degradation Detected'
                    : 'All Monitored Services Operational'}
                </h2>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    outageCount > 0 ? 'bg-rose-400' : degradedCount > 0 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    outageCount > 0 ? 'bg-rose-500' : degradedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}></span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Probes actively pinging from 8 global data centres. Primary region: India (Mumbai, Hyderabad, Bengaluru, Delhi NCR).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6 border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-zinc-800 pt-3 sm:pt-0 sm:pl-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">90-Day Avg Uptime</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{avgUptime90d}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Mean Latency</p>
              <p className="text-lg font-black text-zinc-900 dark:text-white">{avgLatency}ms</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Target SLA</p>
              <p className="text-lg font-black text-purple-600 dark:text-purple-400">99.90%</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 4 COMPACT KPI CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Fully Operational</span>
            <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2">{operationalCount}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{(operationalCount / services.length * 100).toFixed(0)}% of infrastructure</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Degraded Latency</span>
            <span className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2">{degradedCount}</p>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">High response times</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Outages</span>
            <span className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-lg">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2">{outageCount}</p>
          <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Requires immediate action</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">SLA Compliance</span>
            <span className="p-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2">99.94%</p>
          <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Within 3-Nines Budget</p>
        </div>
      </div>

      {/* ═══ FILTER TOOLBAR ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search websites or endpoints..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-56"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Operational">Operational</option>
              <option value="Degraded">Degraded</option>
              <option value="Outage">Outage</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>

          {/* Region filter with India at the top! */}
          <div className="relative">
            <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              className="appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer max-w-[200px] truncate"
            >
              <option value="all">All Regions</option>
              {REGION_GROUPS.map(group => (
                <optgroup key={group.group} label={group.group} className="font-bold text-zinc-900 dark:text-zinc-100">
                  {group.regions.map(r => (
                    <option key={r} value={r} className="font-normal text-zinc-700 dark:text-zinc-300">
                      {r}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px] text-zinc-500 font-medium">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
            <span>Operational</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
            <span>Degraded</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
            <span>Outage</span>
          </span>
        </div>
      </div>

      {/* ═══ SERVICES HEARTBEAT LIST (DATADOG / BETTER UPTIME STYLE) ═══ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              Service Heartbeat Telemetry & Availability
            </h3>
            <p className="text-[11px] text-zinc-400">
              Each bar represents a 30-minute health probe window. Hover over any bar to view exact latency & timestamp.
            </p>
          </div>
          <span className="text-xs font-bold text-zinc-400">
            Showing {filtered.length} of {services.length} endpoints
          </span>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {filtered.length > 0 ? (
            filtered.map(service => {
              const currentUptime =
                timeframe === '24h'
                  ? service.uptime24h
                  : timeframe === '7d'
                  ? service.uptime7d
                  : timeframe === '30d'
                  ? service.uptime30d
                  : service.uptime90d;

              const statusBadge =
                service.status === 'Operational'
                  ? { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900', dot: 'bg-emerald-500' }
                  : service.status === 'Degraded'
                  ? { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900', dot: 'bg-amber-500' }
                  : { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-900', dot: 'bg-rose-500 animate-pulse' };

              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className="p-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-850/50 transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2.5">
                    {/* Website Identity */}
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src={getFavicon(service.url)}
                          alt={service.name}
                          width={18}
                          height={18}
                          loading="lazy"
                          className="w-4.5 h-4.5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-purple-600 transition-colors">
                            {service.name}
                          </h4>
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}></span>
                            <span>{service.status}</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] text-zinc-400 font-mono">{service.url}</span>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span className="inline-flex items-center space-x-1 text-[10px] text-zinc-500 font-medium">
                            <MapPin className="w-2.5 h-2.5 text-rose-500" />
                            <span>{service.region}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats & Current Response */}
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-zinc-400">Response</p>
                        <p className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {service.status === 'Outage' ? <span className="text-rose-500">Timeout</span> : `${service.currentLatency}ms`}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-zinc-400">{timeframe} Uptime</p>
                        <p className={`text-xs font-mono font-black ${
                          currentUptime >= 99.9 ? 'text-emerald-600' : currentUptime >= 96 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {currentUptime.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Heartbeat Bar Grid */}
                  <div className="pt-1.5">
                    <div className="flex items-center justify-between gap-0.5 sm:gap-1">
                      {service.heartbeat.map((bar, idx) => {
                        const bg =
                          bar.status === 'operational'
                            ? 'bg-emerald-500 hover:bg-emerald-400'
                            : bar.status === 'degraded'
                            ? 'bg-amber-500 hover:bg-amber-400'
                            : 'bg-rose-500 hover:bg-rose-400';

                        return (
                          <div
                            key={idx}
                            onMouseEnter={() => setHoveredBar({ serviceId: service.id, ...bar })}
                            onMouseLeave={() => setHoveredBar(null)}
                            className={`flex-1 h-7 rounded-[2px] transition-all cursor-pointer ${bg} hover:scale-y-125`}
                            title={`${bar.date} — ${bar.uptime}% (${bar.latency}ms)`}
                          />
                        );
                      })}
                    </div>

                    {/* Timestamp Range Legend */}
                    <div className="flex items-center justify-between text-[10px] font-medium text-zinc-400 mt-1.5">
                      <span>{timeframe === '24h' ? '24 hours ago' : timeframe === '7d' ? '7 days ago' : timeframe === '30d' ? '30 days ago' : '90 days ago'}</span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {hoveredBar && hoveredBar.serviceId === service.id ? (
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {hoveredBar.date}: {hoveredBar.uptime}% uptime • {hoveredBar.latency}ms
                          </span>
                        ) : (
                          'Overall Availability: ' + currentUptime.toFixed(2) + '%'
                        )}
                      </span>
                      <span>Today</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-zinc-400 text-xs">
              No websites match the selected filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* ═══ REGIONAL DATA CENTRES & PROBE UPTIME ═══ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center space-x-2">
              <Globe className="w-4 h-4 text-purple-600" />
              <span>Multi-Region Probe Health & Latency</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Synthetic probes running distributed health checks from 8 strategic worldwide locations.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-900">
            All Probes Green
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {REGIONAL_PROBES.map(probe => (
            <div
              key={probe.name}
              className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 hover:border-purple-300 dark:hover:border-purple-800 transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200 flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span>{probe.name}</span>
                </span>
                <span className={`w-2 h-2 rounded-full ${probe.status === 'Operational' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div>
                  <p className="text-[10px] text-zinc-400 font-semibold">Uptime SLA</p>
                  <p className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">{probe.uptime}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-zinc-400 font-semibold">Mean Ping</p>
                  <p className="text-xs font-mono font-black text-zinc-900 dark:text-white">{probe.latency}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RECENT INCIDENT HISTORY & ROOT CAUSE LOG ═══ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white mb-3 flex items-center space-x-2">
          <Activity className="w-4 h-4 text-purple-600" />
          <span>Recent Outage & Incident Log</span>
        </h3>
        <div className="space-y-2.5">
          {[
            { site: 'flipkart.com', time: '14 minutes ago', status: 'Ongoing', type: 'Gateway 504 Timeout', impact: 'High', region: 'India - Delhi NCR' },
            { site: 'amazon.in', time: '1 hour ago', status: 'Degraded', type: 'Response latency spiked to 380ms', impact: 'Moderate', region: 'India - Mumbai' },
            { site: 'myntra.com', time: '4 days ago', status: 'Resolved', type: 'TCP Handshake Delay (Recovered in 2m)', impact: 'Minor', region: 'India - Bengaluru' },
            { site: 'github.com', time: '8 days ago', status: 'Resolved', type: 'Webhook delivery delay resolved', impact: 'Minor', region: 'EU-Central Frankfurt' },
          ].map((inc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-xs"
            >
              <div className="flex items-center space-x-3">
                <span className={`w-2 h-2 rounded-full ${
                  inc.status === 'Ongoing' ? 'bg-rose-500 animate-pulse' : inc.status === 'Degraded' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-zinc-900 dark:text-white">{inc.site}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">({inc.region})</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{inc.type}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                  inc.status === 'Ongoing'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                    : inc.status === 'Degraded'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                }`}>
                  {inc.status}
                </span>
                <p className="text-[10px] text-zinc-400 mt-0.5">{inc.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
