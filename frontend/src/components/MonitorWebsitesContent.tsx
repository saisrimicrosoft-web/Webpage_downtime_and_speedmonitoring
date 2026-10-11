'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, ChevronDown, RefreshCw, Plus, Globe, CheckCircle,
  AlertOctagon, TrendingUp, Eye, Pause, Play, Trash2, Edit3,
  ShieldCheck, AlertTriangle, XCircle, MapPin, ExternalLink, MoreVertical
} from 'lucide-react';
import AddWebsiteModal from './AddWebsiteModal';
import MonitorWebsiteDrawer from './MonitorWebsiteDrawer';
import { getWebsites } from '@/lib/api';
import type { Website } from '@/lib/types';

/* ──────────────── TYPES ──────────────── */
export interface MonitoredSite {
  id: string;
  name: string;
  url: string;
  status: 'Online' | 'Slow' | 'Down' | 'Maintenance';
  uptime: number;
  latency: number;
  sslStatus: string;
  sslDaysLeft: number;
  region: string;
  lastChecked: string;
  interval: string;
  ipAddress: string;
  lastIncident: string;
  lastDeployment: string;
  monitoringStarted: string;
  isPaused: boolean;
}

/* ──────────────── REGION GROUPS & DATA CENTRES ──────────────── */
export interface RegionGroup {
  group: string;
  regions: string[];
}

export const REGION_GROUPS: RegionGroup[] = [
  {
    group: '🇮🇳 India (Primary)',
    regions: [
      'India (All)',
      'India - Mumbai',
      'India - Hyderabad',
      'India - Bengaluru',
      'India - Delhi NCR',
      'India - Chennai',
      'India - Pune',
      'India - Kolkata',
    ],
  },
  {
    group: '🌏 Asia Pacific',
    regions: [
      'AP-Southeast Singapore',
      'AP-Northeast Tokyo',
      'AP-Northeast Osaka',
      'AP-Northeast Seoul',
      'AP-East Hong Kong',
      'AP-Southeast Jakarta',
      'AP-Southeast Bangkok',
      'AP-Southeast Sydney',
      'AP-Southeast Melbourne',
      'AP-Southeast Auckland',
    ],
  },
  {
    group: '🇺🇸 North America',
    regions: [
      'US-East N.Virginia',
      'US-East Ohio',
      'US-West Oregon',
      'US-West California',
      'US-Central Iowa',
      'US-South Texas',
      'CA-Central Montreal',
      'CA-West Vancouver',
      'CA-East Toronto',
    ],
  },
  {
    group: '🇪🇺 Europe',
    regions: [
      'EU-West London',
      'EU-Central Frankfurt',
      'EU-West Ireland',
      'EU-South Paris',
      'EU-West Amsterdam',
      'EU-North Stockholm',
      'EU-South Milan',
      'EU-South Madrid',
      'EU-East Warsaw',
      'EU-Central Zurich',
    ],
  },
  {
    group: '🌍 Middle East & Africa',
    regions: [
      'ME-Central UAE Dubai',
      'ME-South Bahrain',
      'ME-Central Riyadh',
      'AF-South Cape Town',
      'AF-South Johannesburg',
      'AF-North Cairo',
      'AF-West Lagos',
      'AF-East Nairobi',
    ],
  },
  {
    group: '🌎 South America',
    regions: [
      'SA-East São Paulo',
      'SA-West Santiago',
      'SA-North Bogotá',
      'SA-South Buenos Aires',
    ],
  },
];

const ALL_REGIONS = REGION_GROUPS.flatMap(g => g.regions);

/* ──────────────── HELPERS ──────────────── */

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function websiteToMonitoredSite(w: Website): MonitoredSite {
  let hostname = w.url;
  try { hostname = new URL(w.url).hostname; } catch { /* fallback */ }

  const sslExpiry = w.ssl_expiry_at ? new Date(w.ssl_expiry_at) : null;
  const sslDays = sslExpiry
    ? Math.max(0, Math.floor((sslExpiry.getTime() - Date.now()) / 86400000))
    : -1;
  const sslStatus =
    sslDays <= 0  ? 'Expired' :
    sslDays <= 14 ? 'Expiring Soon' : 'Valid';

  const status: MonitoredSite['status'] =
    !w.is_active          ? 'Maintenance' :
    w.status === 'down'   ? 'Down' :
    w.status === 'degraded' ? 'Slow' :
    w.status === 'operational' ? 'Online' :
    'Maintenance'; // 'pending'

  return {
    id:                w.id.toString(),
    name:              w.name || hostname,
    url:               w.url,
    status,
    uptime:            w.uptime_pct ?? 0,
    latency:           w.last_response_ms ?? 0,
    sslDaysLeft:       sslDays,
    sslStatus,
    region:            w.region || 'Unknown',
    lastChecked:       w.last_checked_at ? relativeTime(w.last_checked_at) : 'Never',
    interval:          `${w.check_interval_sec ?? 60}s`,
    ipAddress:         '',
    lastIncident:      w.status === 'down' ? 'Active' : 'None',
    lastDeployment:    '',
    monitoringStarted: w.created_at.split('T')[0],
    isPaused:          !w.is_active,
  };
}

interface Props {
  onOpenAddModal: () => void;
}

export default function MonitorWebsitesContent({ onOpenAddModal }: Props) {
  const [websites, setWebsites] = useState<MonitoredSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'down' | 'slow' | 'maintenance'>('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [selectedSite, setSelectedSite] = useState<MonitoredSite | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const rows = await getWebsites();
      setWebsites((rows as Website[]).map(websiteToMonitoredSite));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load website data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Counts
  const onlineCount = websites.filter(s => s.status === 'Online').length;
  const offlineCount = websites.filter(s => s.status === 'Down').length;
  const slowCount = websites.filter(s => s.status === 'Slow').length;
  const maintenanceCount = websites.filter(s => s.status === 'Maintenance').length;
  const avgUptime = websites.length > 0
    ? (websites.reduce((sum, s) => sum + s.uptime, 0) / websites.length).toFixed(3)
    : '0.000';

  // Regions for filter dropdown — full global list
  const regions = ALL_REGIONS;

  // Filtered list
  const filtered = websites.filter(site => {
    const matchSearch =
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.url.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (statusFilter === 'online') return site.status === 'Online';
    if (statusFilter === 'down') return site.status === 'Down';
    if (statusFilter === 'slow') return site.status === 'Slow';
    if (statusFilter === 'maintenance') return site.status === 'Maintenance';
    if (regionFilter !== 'all') {
      if (regionFilter === 'India (All)' || regionFilter === 'India') {
        const lower = site.region.toLowerCase();
        return lower.includes('india') || lower.includes('mumbai') || lower.includes('bengaluru') || lower.includes('bangalore') || lower.includes('delhi') || lower.includes('hyderabad') || lower.includes('chennai') || lower.includes('pune') || lower.includes('kolkata') || lower.includes('ap-south');
      }
      const norm = (s: string) => s.toLowerCase().replace(/[\(\)\-\s\.\/]/g, '');
      return norm(site.region).includes(norm(regionFilter)) || norm(regionFilter).includes(norm(site.region));
    }
    return true;
  });

  const handleTogglePause = (id: string) => {
    setWebsites(prev => prev.map(s => s.id === id ? { ...s, isPaused: !s.isPaused } : s));
    if (selectedSite?.id === id) setSelectedSite(prev => prev ? { ...prev, isPaused: !prev.isPaused } : null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this monitored website?')) {
      setWebsites(prev => prev.filter(s => s.id !== id));
      if (selectedSite?.id === id) setSelectedSite(null);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchData();
  };

  /* ─── STATUS BADGE ─── */
  const StatusBadge = ({ status, isPaused }: { status: string; isPaused: boolean }) => {
    if (isPaused) return (
      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span><span>Paused</span>
      </span>
    );
    const map: Record<string, { dot: string; bg: string; text: string; border: string }> = {
      Online:      { dot:'bg-emerald-500', bg:'bg-emerald-50 dark:bg-emerald-950/40', text:'text-emerald-700 dark:text-emerald-400', border:'border-emerald-200/80 dark:border-emerald-900' },
      Slow:        { dot:'bg-amber-500',   bg:'bg-amber-50 dark:bg-amber-950/40',     text:'text-amber-700 dark:text-amber-400',     border:'border-amber-200/80 dark:border-amber-900' },
      Down:        { dot:'bg-rose-500',    bg:'bg-rose-50 dark:bg-rose-950/40',       text:'text-rose-700 dark:text-rose-400',       border:'border-rose-200/80 dark:border-rose-900' },
      Maintenance: { dot:'bg-blue-500',    bg:'bg-blue-50 dark:bg-blue-950/40',       text:'text-blue-700 dark:text-blue-400',       border:'border-blue-200/80 dark:border-blue-900' },
    };
    const c = map[status] || map.Online;
    return (
      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${c.bg} ${c.text} ${c.border} ${status === 'Down' ? 'animate-pulse' : ''}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'Online' ? 'animate-pulse' : ''}`}></span>
        <span>{status}</span>
      </span>
    );
  };

  /* ─── SSL BADGE ─── */
  const SslBadge = ({ days }: { days: number }) => {
    if (days <= 0) return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
        <XCircle className="w-3 h-3" /><span>Expired</span>
      </span>
    );
    if (days < 14) return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
        <AlertTriangle className="w-3 h-3" /><span>Expiring {days}d</span>
      </span>
    );
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60">
        <ShieldCheck className="w-3 h-3" /><span>Valid ({days}d)</span>
      </span>
    );
  };

  /* ─── FAVICON ICON ─── */
  const faviconCache = React.useRef<Record<string, string>>({});

  const getFaviconUrl = (url: string): string => {
    if (faviconCache.current[url]) return faviconCache.current[url];
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      const src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      faviconCache.current[url] = src;
      return src;
    } catch {
      return '';
    }
  };

  const WebsiteFavicon = ({ site }: { site: MonitoredSite }) => {
    const [failed, setFailed] = React.useState(false);
    const src = getFaviconUrl(site.url);
    return (
      <div className="w-8 h-8 rounded-full bg-white border border-[#E5E7EB] shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
        {!failed && src ? (
          <img
            src={src}
            alt={site.name}
            width={20}
            height={20}
            loading="lazy"
            onError={() => setFailed(true)}
            className="w-5 h-5 object-contain"
          />
        ) : (
          <Globe className="w-4 h-4 text-zinc-400" />
        )}
      </div>
    );
  };

  /* ─── LOADING STATE ─── */
  if (loading) return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-500">Loading website data…</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 py-6">

        {/* ═══ ERROR BANNER ═══ */}
        {error && (
          <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between">
            <p className="text-sm text-rose-700 dark:text-rose-400 font-medium">{error}</p>
            <button onClick={fetchData} className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* ═══ TOOLBAR ═══ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Monitor Websites</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
              Manage monitored websites, probes, SSL certificates and alert rules.
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search website..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-56 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-medium"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="down">Down</option>
                <option value="slow">Slow</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>

            {/* Region filter */}
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <select
                value={regionFilter}
                onChange={e => setRegionFilter(e.target.value)}
                className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer max-w-[200px] truncate"
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

            {/* Add button */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-purple-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Website</span>
            </button>
          </div>
        </div>

        {/* ═══ COMPACT SUMMARY CARDS ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Websites */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs flex items-center space-x-3">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Monitored</p>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-white">{websites.length}</p>
            </div>
          </div>

          {/* Online */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Online Health</p>
              <div className="flex items-baseline space-x-1.5">
                <p className="text-xl font-extrabold text-zinc-900 dark:text-white">{onlineCount}</p>
                <span className="text-[10px] font-semibold text-emerald-600">Online</span>
              </div>
            </div>
          </div>

          {/* Offline / Degraded */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs flex items-center space-x-3">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Offline / Degraded</p>
              <div className="flex items-center space-x-2">
                <span className="text-base font-extrabold text-rose-600">{offlineCount} Down</span>
                <span className="text-zinc-300">·</span>
                <span className="text-base font-extrabold text-amber-500">{slowCount} Slow</span>
              </div>
            </div>
          </div>

          {/* Average Uptime */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Average Uptime</p>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-white">{avgUptime}%</p>
            </div>
          </div>
        </div>

        {/* ═══ WEBSITES TABLE ═══ */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
          {/* Table sub-header */}
          <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Showing {filtered.length} of {websites.length} websites
              </span>
              {statusFilter !== 'all' && (
                <button onClick={() => setStatusFilter('all')} className="text-[10px] font-semibold text-purple-600 hover:underline cursor-pointer">
                  Clear filter
                </button>
              )}
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Website</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Uptime %</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Response Time</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Region</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Last Checked</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Interval</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {websites.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-500 text-sm">
                      No websites yet — click "Add Website" to start monitoring.
                    </td>
                  </tr>
                ) : filtered.length > 0 ? filtered.map(site => (
                  <tr
                    key={site.id}
                    onClick={() => setSelectedSite(site)}
                    className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors cursor-pointer group"
                  >
                    {/* Website */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        <WebsiteFavicon site={site} />
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-white text-xs group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{site.name}</p>
                          <p className="text-[10px] text-zinc-400 truncate max-w-[140px]">{site.url}</p>
                        </div>
                      </div>
                    </td>
                    {/* Uptime */}
                    <td className="px-5 py-3.5 font-bold font-mono">
                      <span className={site.uptime >= 99.9 ? 'text-emerald-600' : site.uptime >= 95 ? 'text-amber-600' : 'text-rose-600'}>
                        {site.uptime.toFixed(2)}%
                      </span>
                    </td>
                    {/* Latency */}
                    <td className="px-5 py-3.5 font-bold font-mono text-zinc-900 dark:text-zinc-100">
                      {site.status === 'Down' ? <span className="text-rose-500">Timeout</span> : `${site.latency}ms`}
                    </td>
                    {/* Region */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium text-[11px]">{site.region}</span>
                      </div>
                    </td>
                    {/* Last Checked */}
                    <td className="px-5 py-3.5 text-zinc-500 font-mono text-[11px]">{site.lastChecked}</td>
                    {/* Interval */}
                    <td className="px-5 py-3.5 text-zinc-500 font-mono text-[11px]">{site.interval}</td>
                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1">
                        <button onClick={() => setSelectedSite(site)} title="View Details" className="p-1.5 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleTogglePause(site.id)} title={site.isPaused ? 'Resume' : 'Pause'} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer">
                          {site.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleDelete(site.id)} title="Delete" className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-500 text-sm">
                      No websites match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ DETAILS DRAWER ═══ */}
      {selectedSite && (
        <MonitorWebsiteDrawer
          website={selectedSite}
          onClose={() => setSelectedSite(null)}
          onTogglePause={handleTogglePause}
        />
      )}
    </>
  );
}
