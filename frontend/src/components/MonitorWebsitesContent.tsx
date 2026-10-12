'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, ChevronDown, RefreshCw, Plus, Globe, CheckCircle,
  AlertOctagon, TrendingUp, Eye, Pause, Play, Trash2, Edit3,
  ShieldCheck, AlertTriangle, XCircle, MapPin, ExternalLink, MoreVertical, Flag
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
export interface RegionItem {
  value: string;
  label: string;
  flag: string;
}

export interface RegionGroup {
  group: string;
  regions: RegionItem[];
}

export const REGION_GROUPS: RegionGroup[] = [
  {
    group: '🇮🇳 India (Primary)',
    regions: [
      { value: 'India (All)', label: 'India (All)', flag: '🇮🇳' },
      { value: 'India - Mumbai', label: 'India - Mumbai', flag: '🇮🇳' },
      { value: 'India - Hyderabad', label: 'India - Hyderabad', flag: '🇮🇳' },
      { value: 'India - Bengaluru', label: 'India - Bengaluru', flag: '🇮🇳' },
      { value: 'India - Delhi NCR', label: 'India - Delhi NCR', flag: '🇮🇳' },
      { value: 'India - Chennai', label: 'India - Chennai', flag: '🇮🇳' },
      { value: 'India - Pune', label: 'India - Pune', flag: '🇮🇳' },
      { value: 'India - Kolkata', label: 'India - Kolkata', flag: '🇮🇳' },
    ],
  },
  {
    group: '🇸🇬 🇯🇵 🇦🇺 Asia Pacific',
    regions: [
      { value: 'AP-Southeast Singapore', label: 'Singapore (AP-Southeast)', flag: '🇸🇬' },
      { value: 'AP-Northeast Tokyo', label: 'Japan - Tokyo (AP-Northeast)', flag: '🇯🇵' },
      { value: 'AP-Northeast Osaka', label: 'Japan - Osaka (AP-Northeast)', flag: '🇯🇵' },
      { value: 'AP-Northeast Seoul', label: 'South Korea - Seoul (AP-Northeast)', flag: '🇰🇷' },
      { value: 'AP-East Hong Kong', label: 'Hong Kong (AP-East)', flag: '🇭🇰' },
      { value: 'AP-Southeast Jakarta', label: 'Indonesia - Jakarta (AP-Southeast)', flag: '🇮🇩' },
      { value: 'AP-Southeast Bangkok', label: 'Thailand - Bangkok (AP-Southeast)', flag: '🇹🇭' },
      { value: 'AP-Southeast Sydney', label: 'Australia - Sydney (AP-Southeast)', flag: '🇦🇺' },
      { value: 'AP-Southeast Melbourne', label: 'Australia - Melbourne (AP-Southeast)', flag: '🇦🇺' },
      { value: 'AP-Southeast Auckland', label: 'New Zealand - Auckland (AP-Southeast)', flag: '🇳🇿' },
    ],
  },
  {
    group: '🇺🇸 🇨🇦 North America',
    regions: [
      { value: 'US-East N.Virginia', label: 'USA - N. Virginia (US-East)', flag: '🇺🇸' },
      { value: 'US-East Ohio', label: 'USA - Ohio (US-East)', flag: '🇺🇸' },
      { value: 'US-West Oregon', label: 'USA - Oregon (US-West)', flag: '🇺🇸' },
      { value: 'US-West California', label: 'USA - California (US-West)', flag: '🇺🇸' },
      { value: 'US-Central Iowa', label: 'USA - Iowa (US-Central)', flag: '🇺🇸' },
      { value: 'US-South Texas', label: 'USA - Texas (US-South)', flag: '🇺🇸' },
      { value: 'CA-Central Montreal', label: 'Canada - Montreal (CA-Central)', flag: '🇨🇦' },
      { value: 'CA-West Vancouver', label: 'Canada - Vancouver (CA-West)', flag: '🇨🇦' },
      { value: 'CA-East Toronto', label: 'Canada - Toronto (CA-East)', flag: '🇨🇦' },
    ],
  },
  {
    group: '🇪🇺 Europe',
    regions: [
      { value: 'EU-West London', label: 'UK - London (EU-West)', flag: '🇬🇧' },
      { value: 'EU-Central Frankfurt', label: 'Germany - Frankfurt (EU-Central)', flag: '🇩🇪' },
      { value: 'EU-West Ireland', label: 'Ireland - Dublin (EU-West)', flag: '🇮🇪' },
      { value: 'EU-South Paris', label: 'France - Paris (EU-South)', flag: '🇫🇷' },
      { value: 'EU-West Amsterdam', label: 'Netherlands - Amsterdam (EU-West)', flag: '🇳🇱' },
      { value: 'EU-North Stockholm', label: 'Sweden - Stockholm (EU-North)', flag: '🇸🇪' },
      { value: 'EU-South Milan', label: 'Italy - Milan (EU-South)', flag: '🇮🇹' },
      { value: 'EU-South Madrid', label: 'Spain - Madrid (EU-South)', flag: '🇪🇸' },
      { value: 'EU-East Warsaw', label: 'Poland - Warsaw (EU-East)', flag: '🇵🇱' },
      { value: 'EU-Central Zurich', label: 'Switzerland - Zurich (EU-Central)', flag: '🇨🇭' },
    ],
  },
  {
    group: '🇦🇪 🇿🇦 Middle East & Africa',
    regions: [
      { value: 'ME-Central UAE Dubai', label: 'UAE - Dubai (ME-Central)', flag: '🇦🇪' },
      { value: 'ME-South Bahrain', label: 'Bahrain (ME-South)', flag: '🇧🇭' },
      { value: 'ME-Central Riyadh', label: 'Saudi Arabia - Riyadh (ME-Central)', flag: '🇸🇦' },
      { value: 'AF-South Cape Town', label: 'South Africa - Cape Town (AF-South)', flag: '🇿🇦' },
      { value: 'AF-South Johannesburg', label: 'South Africa - Johannesburg (AF-South)', flag: '🇿🇦' },
      { value: 'AF-North Cairo', label: 'Egypt - Cairo (AF-North)', flag: '🇪🇬' },
      { value: 'AF-West Lagos', label: 'Nigeria - Lagos (AF-West)', flag: '🇳🇬' },
      { value: 'AF-East Nairobi', label: 'Kenya - Nairobi (AF-East)', flag: '🇰🇪' },
    ],
  },
  {
    group: '🇧🇷 🇨🇱 South America',
    regions: [
      { value: 'SA-East São Paulo', label: 'Brazil - São Paulo (SA-East)', flag: '🇧🇷' },
      { value: 'SA-West Santiago', label: 'Chile - Santiago (SA-West)', flag: '🇨🇱' },
      { value: 'SA-North Bogotá', label: 'Colombia - Bogotá (SA-North)', flag: '🇨🇴' },
      { value: 'SA-South Buenos Aires', label: 'Argentina - Buenos Aires (SA-South)', flag: '🇦🇷' },
    ],
  },
];

const ALL_REGIONS = REGION_GROUPS.flatMap(g => g.regions.map(r => r.value));

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

function getRegionFlag(regionName: string): string {
  if (!regionName) return '🚩';
  const all = REGION_GROUPS.flatMap(g => g.regions);
  const found = all.find(r =>
    r.value.toLowerCase() === regionName.toLowerCase() ||
    r.label.toLowerCase() === regionName.toLowerCase() ||
    regionName.toLowerCase().includes(r.value.toLowerCase()) ||
    r.value.toLowerCase().includes(regionName.toLowerCase())
  );
  if (found) return found.flag;
  if (/india|mumbai|delhi|bengaluru|bangalore|hyderabad|chennai|pune|kolkata/i.test(regionName)) return '🇮🇳';
  if (/singapore/i.test(regionName)) return '🇸🇬';
  if (/tokyo|osaka|japan/i.test(regionName)) return '🇯🇵';
  if (/seoul|korea/i.test(regionName)) return '🇰🇷';
  if (/hong kong/i.test(regionName)) return '🇭🇰';
  if (/jakarta|indonesia/i.test(regionName)) return '🇮🇩';
  if (/bangkok|thailand/i.test(regionName)) return '🇹🇭';
  if (/sydney|melbourne|australia/i.test(regionName)) return '🇦🇺';
  if (/auckland|new zealand/i.test(regionName)) return '🇳🇿';
  if (/virginia|ohio|oregon|california|iowa|texas|us/i.test(regionName)) return '🇺🇸';
  if (/montreal|vancouver|toronto|canada/i.test(regionName)) return '🇨🇦';
  if (/london|uk/i.test(regionName)) return '🇬🇧';
  if (/frankfurt|germany/i.test(regionName)) return '🇩🇪';
  if (/ireland|dublin/i.test(regionName)) return '🇮🇪';
  if (/paris|france/i.test(regionName)) return '🇫🇷';
  if (/amsterdam|netherlands/i.test(regionName)) return '🇳🇱';
  if (/stockholm|sweden/i.test(regionName)) return '🇸🇪';
  if (/milan|italy/i.test(regionName)) return '🇮🇹';
  if (/madrid|spain/i.test(regionName)) return '🇪🇸';
  if (/warsaw|poland/i.test(regionName)) return '🇵🇱';
  if (/zurich|switzerland/i.test(regionName)) return '🇨🇭';
  if (/dubai|uae/i.test(regionName)) return '🇦🇪';
  if (/bahrain/i.test(regionName)) return '🇧🇭';
  if (/riyadh|saudi/i.test(regionName)) return '🇸🇦';
  if (/cape town|johannesburg|south africa/i.test(regionName)) return '🇿🇦';
  if (/cairo|egypt/i.test(regionName)) return '🇪🇬';
  if (/lagos|nigeria/i.test(regionName)) return '🇳🇬';
  if (/nairobi|kenya/i.test(regionName)) return '🇰🇪';
  if (/são paulo|sao paulo|brazil/i.test(regionName)) return '🇧🇷';
  if (/santiago|chile/i.test(regionName)) return '🇨🇱';
  if (/bogotá|bogota|colombia/i.test(regionName)) return '🇨🇴';
  if (/buenos aires|argentina/i.test(regionName)) return '🇦🇷';
  return '🚩';
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
  const selectedRegion = REGION_GROUPS.flatMap(g => g.regions).find(r => r.value === regionFilter);
  const selectedRegionFlag = selectedRegion?.flag;

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
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_16px_rgba(255,255,255,0.4)]">
              Monitor Websites
            </h1>
            <p className="text-xs sm:text-sm text-white font-medium mt-1.5 leading-relaxed drop-shadow-xs">
              Manage <span className="text-purple-300 font-bold bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-400/30">monitored websites</span>, <span className="text-cyan-300 font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-400/30">probes</span>, <span className="text-emerald-300 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-400/30">SSL certificates</span>, and alert rules.
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
              <input
                type="text"
                placeholder="Search website..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-56 bg-zinc-900/90 border border-purple-500/40 hover:border-purple-400/70 focus:border-purple-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-400/60 font-medium shadow-md shadow-purple-950/40 transition-all"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                className="appearance-none bg-zinc-900/90 border border-purple-500/40 hover:border-purple-400/70 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-400/60 cursor-pointer shadow-md shadow-purple-950/40 transition-all"
              >
                <option value="all" className="bg-zinc-900 text-white">All Status</option>
                <option value="online" className="bg-zinc-900 text-white">Online</option>
                <option value="down" className="bg-zinc-900 text-white">Down</option>
                <option value="slow" className="bg-zinc-900 text-white">Slow</option>
                <option value="maintenance" className="bg-zinc-900 text-white">Maintenance</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 pointer-events-none" />
            </div>

            {/* Region filter */}
            <div className="relative">
              {selectedRegionFlag ? (
                <span className="text-sm absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none leading-none select-none">
                  {selectedRegionFlag}
                </span>
              ) : (
                <Flag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-300 pointer-events-none" />
              )}
              <select
                value={regionFilter}
                onChange={e => setRegionFilter(e.target.value)}
                className="appearance-none bg-zinc-900/90 border border-purple-500/40 hover:border-purple-400/70 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-400/60 cursor-pointer max-w-[210px] truncate shadow-md shadow-purple-950/40 transition-all"
              >
                <option value="all" className="bg-zinc-900 text-white font-semibold">All Regions</option>
                {REGION_GROUPS.map(group => (
                  <optgroup key={group.group} label={group.group} className="font-bold text-purple-300 bg-zinc-900">
                    {group.regions.map(r => (
                      <option key={r.value} value={r.value} className="font-normal text-white bg-zinc-900">
                        {r.flag} {r.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 pointer-events-none" />
            </div>

            {/* Refresh button — placed a little bit away from all region tab */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh websites list"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-900/90 hover:bg-zinc-800 border border-purple-500/40 hover:border-purple-300 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-950/40 cursor-pointer active:scale-95 disabled:opacity-50 ml-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-300 ${loading ? 'animate-spin' : ''}`} />
              <span className="tracking-wide">Refresh</span>
            </button>

            {/* Add button */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-[0_0_24px_rgba(147,51,234,0.65)] hover:shadow-[0_0_30px_rgba(168,85,247,0.85)] border border-purple-300/60 hover:border-white transition-all cursor-pointer active:scale-95 ml-1"
            >
              <Plus className="w-4 h-4 text-white stroke-[3]" />
              <span className="tracking-wide">Add Website</span>
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
                        <span className="text-sm leading-none flex-shrink-0" title={site.region}>
                          {getRegionFlag(site.region)}
                        </span>
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
