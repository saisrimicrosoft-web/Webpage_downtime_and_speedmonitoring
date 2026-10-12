'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck,
  Search, Filter, RefreshCw, ChevronDown, Globe, MapPin,
  TrendingUp, Activity, Server, AlertOctagon, ArrowUpRight,
  Check, Info, Calendar, BarChart3, Radio, Flag
} from 'lucide-react';
import { REGION_GROUPS } from './MonitorWebsitesContent';
import { getLatestPerUrl, getUrlHistory, CheckRow } from '@/lib/api';
import HeartbeatRow from './HeartbeatRow';

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
  // Array of 48 heartbeat segments
  heartbeat: {
    status: 'operational' | 'degraded' | 'down';
    date: string;
    uptime: number;
    latency: number;
  }[];
}

/* ──────────────── ROW → UptimeService MAPPER ──────────────── */
function rowToUptimeService(row: CheckRow, history: CheckRow[]): UptimeService {
  // Build heartbeat from history (48 bars, newest first → reverse for display oldest→newest)
  const heartbeat = history.slice().reverse().map(h => ({
    status: !h.is_up ? 'down' as const
           : h.response_ms > 2000 ? 'degraded' as const
           : 'operational' as const,
    date: new Date(h.checked_at).toLocaleString(),
    uptime: h.is_up ? 100 : 0,
    latency: h.response_ms ?? 0,
  }));

  const opCount = heartbeat.filter(b => b.status === 'operational').length;
  const total = heartbeat.length || 1;
  const uptimePct = (opCount / total) * 100;

  let hostname = row.url;
  try { hostname = new URL(row.url).hostname; } catch {}

  const status: UptimeService['status'] =
    !row.is_up          ? 'Outage'
    : row.response_ms > 2000 ? 'Degraded'
    : 'Operational';

  return {
    id: row.url,
    name: hostname,
    url: row.url,
    region: 'Unknown',
    status,
    currentLatency: row.response_ms ?? 0,
    uptime24h: uptimePct,
    uptime7d:  uptimePct,
    uptime30d: uptimePct,
    uptime90d: uptimePct,
    lastIncident: row.is_up ? 'No recent incidents' : 'Currently down',
    heartbeat,
  };
}

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
  const [services, setServices] = useState<UptimeService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Operational' | 'Degraded' | 'Outage'>('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('90d');
  const [hoveredBar, setHoveredBar] = useState<{ serviceId: string; date: string; uptime: number; latency: number } | null>(null);
  const [selectedService, setSelectedService] = useState<UptimeService | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const latest = await getLatestPerUrl();
      const result: UptimeService[] = await Promise.all(
        latest.map(async (row) => {
          const history = await getUrlHistory(row.url, 48);
          return rowToUptimeService(row, history);
        })
      );
      setServices(result);
      setLoading(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load uptime data';
      setError(msg);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

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

  const avgUptime90d = services.length === 0
    ? '0.00'
    : (services.reduce((acc, s) => acc + s.uptime90d, 0) / services.length).toFixed(2);

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
    fetchData().finally(() => setIsRefreshing(false));
  };

  if (loading) return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-500">Loading uptime data…</p>
      </div>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      {/* ═══ HEADER & GLOBAL SLA STATUS ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 flex-wrap gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_16px_rgba(255,255,255,0.4)]">
              Uptime Status & System Availability
            </h1>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-950/60 text-purple-300 border border-purple-500/40 shadow-xs">
              <Radio className="w-3.5 h-3.5 animate-pulse text-purple-400" />
              <span>Telemetry Live</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white font-medium mt-1.5 leading-relaxed drop-shadow-xs">
            Continuous availability probes across <span className="text-emerald-300 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-400/30">India</span>, <span className="text-cyan-300 font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-400/30">Asia Pacific</span>, <span className="text-purple-300 font-bold bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-400/30">Europe</span> & <span className="text-amber-300 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-400/30">Americas</span> with SLA compliance tracker.
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
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {services.length > 0 ? (operationalCount / services.length * 100).toFixed(0) : 0}% of infrastructure
          </p>
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
            {REGION_GROUPS.flatMap(g => g.regions).find(r => r.value === regionFilter)?.flag ? (
              <span className="text-sm absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none leading-none select-none">
                {REGION_GROUPS.flatMap(g => g.regions).find(r => r.value === regionFilter)?.flag}
              </span>
            ) : (
              <Flag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            )}
            <select
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              className="appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer max-w-[210px] truncate"
            >
              <option value="all">All Regions</option>
              {REGION_GROUPS.map(group => (
                <optgroup key={group.group} label={group.group} className="font-bold text-zinc-900 dark:text-zinc-100">
                  {group.regions.map(r => (
                    <option key={r.value} value={r.value} className="font-normal text-zinc-700 dark:text-zinc-300">
                      {r.flag} {r.label}
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

      {/* ═══ SERVICE HEARTBEAT TELEMETRY & AVAILABILITY ═══ */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Section header */}
        <div className="px-4 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-zinc-100">
              Service Heartbeat Telemetry &amp; Availability
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Live ECG heartbeat · hover any point to view latency &amp; timestamp · click to see 91-day detail
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Streaming indicator */}
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
              </span>
              streaming
            </span>
            <span className="text-xs font-bold text-zinc-500">
              Showing {filtered.length} of {services.length} endpoints
            </span>
          </div>
        </div>

        {error && (
          <div className="m-4 p-3 bg-rose-950/20 border border-rose-900 rounded-xl flex items-center justify-between">
            <p className="text-sm text-rose-400 font-medium">{error}</p>
            <button onClick={fetchData} className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer">Retry</button>
          </div>
        )}

        <div className="divide-y divide-zinc-800">
          {filtered.length > 0 ? (
            filtered.map(service => (
              <HeartbeatRow
                key={service.id}
                service={service}
                isSelected={selectedService?.id === service.id}
                onSelect={() => setSelectedService(prev => prev?.id === service.id ? null : service)}
                timeframe={timeframe}
                hoveredBar={hoveredBar}
                onHoverBar={setHoveredBar}
              />
            ))
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No endpoints match the current filters.
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
              className="p-3.5 rounded-xl border border-white/12 bg-zinc-900/90 hover:border-purple-400/50 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{probe.name}</span>
                </span>
                <span className={`w-2 h-2 rounded-full ${probe.status === 'Operational' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`}></span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div>
                  <p className="text-[10px] text-zinc-300 font-semibold uppercase tracking-wider">Uptime SLA</p>
                  <p className="text-xs font-mono font-black text-emerald-400">{probe.uptime}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-zinc-300 font-semibold uppercase tracking-wider">Mean Ping</p>
                  <p className="text-xs font-mono font-black text-white">{probe.latency}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RECENT INCIDENT HISTORY & ROOT CAUSE LOG ═══ */}
      <div className="bg-zinc-900/90 border border-white/12 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-extrabold text-white mb-3 flex items-center space-x-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span>Recent Outage & Incident Log</span>
        </h3>
        <div className="space-y-2.5">
          {services.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center py-4">No incidents recorded yet.</p>
          ) : (
            services
              .filter(s => s.status !== 'Operational')
              .concat(services.filter(s => s.status === 'Operational'))
              .slice(0, 6)
              .map((service, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-zinc-900/90 text-xs shadow-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      service.status === 'Outage' ? 'bg-rose-500 animate-pulse' :
                      service.status === 'Degraded' ? 'bg-amber-500' : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                    }`} />
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img
                        src={getFavicon(service.url)}
                        alt=""
                        width={14}
                        height={14}
                        loading="lazy"
                        className="w-3.5 h-3.5 object-contain"
                        onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs">{service.name}</span>
                      <p className="text-[11px] text-zinc-300 mt-0.5">{service.lastIncident}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      service.status === 'Outage'
                        ? 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                        : service.status === 'Degraded'
                        ? 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {service.status}
                    </span>
                    <p className="text-[10px] text-zinc-300 font-mono font-bold mt-0.5">{service.currentLatency > 0 ? `${service.currentLatency}ms` : '—'}</p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
