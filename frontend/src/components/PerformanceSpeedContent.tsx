'use client';

import React, { useState, useEffect } from 'react';
import {
  Search, Filter, ChevronDown, Zap, Globe, Gauge, Activity, 
  TrendingDown, TrendingUp, AlertOctagon, MapPin, Map, AlertTriangle, Play, CheckCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area, CartesianGrid } from 'recharts';
import PerformanceSpeedDrawer from './PerformanceSpeedDrawer';
import { getLatestPerUrl, CheckRow } from '@/lib/api';

export interface PerformanceSite {
  id: string;
  name: string;
  url: string;
  responseTime: number;
  loadTime: number;
  score: number;
  region: string;
  lastTested: string;
  status: 'Excellent' | 'Good' | 'Slow' | 'Critical';
  vitals: {
    lcp: number;
    fid: number;
    cls: number;
  };
}

const TREND_DATA = [
  { time: '00:00', ms: 120 }, { time: '04:00', ms: 135 }, { time: '08:00', ms: 280 },
  { time: '12:00', ms: 142 }, { time: '16:00', ms: 155 }, { time: '20:00', ms: 110 },
  { time: 'Now',   ms: 142 },
];

const ALERTS = [
  { id: 1, type: 'critical', message: 'High latency detected on flipkart.com (>600ms)', time: '3m ago' },
  { id: 2, type: 'warning', message: 'Global latency spike in AP-South region', time: '15m ago' },
  { id: 3, type: 'success', message: 'amazon.in response time recovered to normal levels', time: '1h ago' },
];

function rowToPerformanceSite(row: CheckRow): PerformanceSite {
  const ms = row.response_ms ?? 0;
  const status: PerformanceSite['status'] =
    ms < 150  ? 'Excellent' :
    ms < 400  ? 'Good'      :
    ms < 800  ? 'Slow'      : 'Critical';
  const score = Math.max(0, Math.min(100, Math.round(100 - ms / 20)));
  const loadTime = parseFloat((ms / 1000).toFixed(2));

  let name = row.url;
  try { name = new URL(row.url).hostname; } catch {}

  // Relative time from checked_at
  const diff = Math.floor((Date.now() - new Date(row.checked_at).getTime()) / 1000);
  const lastTested =
    diff < 60  ? `${diff}s ago`  :
    diff < 3600 ? `${Math.floor(diff / 60)}m ago` :
    `${Math.floor(diff / 3600)}h ago`;

  return {
    id: row.url,
    name,
    url: row.url,
    responseTime: ms,
    loadTime,
    score,
    region: 'Unknown',
    lastTested,
    status,
    vitals: {
      lcp: parseFloat((loadTime * 0.8).toFixed(1)),
      fid: Math.round(ms * 0.1),
      cls: 0.01,
    },
  };
}

export default function PerformanceSpeedContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('24h');
  const [selectedSite, setSelectedSite] = useState<PerformanceSite | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [sites, setSites] = useState<PerformanceSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const rows = await getLatestPerUrl();
      setSites(rows.map(rowToPerformanceSite));
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const doFetch = async () => {
      try {
        const rows = await getLatestPerUrl();
        if (!cancelled) {
          setSites(rows.map(rowToPerformanceSite));
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? 'Failed to load performance data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    doFetch();
    const id = setInterval(doFetch, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgResponseTime = sites.length > 0 ? Math.round(sites.reduce((s, x) => s + x.responseTime, 0) / sites.length) : 0;
  const fastestResponseTime = sites.length > 0 ? Math.min(...sites.map(s => s.responseTime)) : 0;
  const slowestResponseTime = sites.length > 0 ? Math.max(...sites.map(s => s.responseTime)) : 0;
  const avgScore = sites.length > 0 ? Math.round(sites.reduce((s, x) => s + x.score, 0) / sites.length) : 0;

  const handleRunGlobalTest = () => {
    setIsTesting(true);
    setTimeout(() => setIsTesting(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Excellent': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900';
      case 'Good': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900';
      case 'Slow': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
      case 'Critical': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900 animate-pulse';
      default: return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-rose-500';
  };

  const WebsiteFavicon = ({ url, name }: { url: string; name: string }) => {
    const [failed, setFailed] = React.useState(false);
    const domain = React.useMemo(() => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return name;
      }
    }, [url, name]);
    const src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    return (
      <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
        {!failed ? (
          <img
            src={src}
            alt={name}
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

  if (loading) return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-500">Loading performance data…</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between">
            <p className="text-sm text-rose-700 dark:text-rose-400 font-medium">{error}</p>
            <button onClick={fetchData} className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer">Retry</button>
          </div>
        )}
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Performance Speed</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium max-w-xl">
              Monitor website loading speed, response time, Core Web Vitals, and performance across global regions.
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search websites..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-medium"
              />
            </div>
            <div className="relative">
              <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value)}
                className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
            <button
              onClick={handleRunGlobalTest}
              disabled={isTesting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Run Speed Test'}</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Avg Response Time</p>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-white flex items-baseline gap-1">
                {avgResponseTime} <span className="text-xs font-semibold text-zinc-500">ms</span>
              </p>
            </div>
            <div className="w-16 h-8 opacity-70">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TREND_DATA}>
                  <Area type="monotone" dataKey="ms" stroke="#8b5cf6" fill="#c4b5fd" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
             <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Fastest Website</p>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-white flex items-baseline gap-1">
                {fastestResponseTime} <span className="text-xs font-semibold text-zinc-500">ms</span>
              </p>
            </div>
            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800">
              Excellent
            </span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Slowest Website</p>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-white flex items-baseline gap-1">
                {slowestResponseTime} <span className="text-xs font-semibold text-zinc-500">ms</span>
              </p>
            </div>
            <span className="px-2 py-1 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold rounded-lg border border-amber-200 dark:border-amber-800">
              Warning
            </span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Performance Score</p>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-white">{avgScore}/100</p>
            </div>
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-zinc-200 dark:text-zinc-800" />
                <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray="100" strokeDashoffset={100 - avgScore} className="text-purple-500" />
              </svg>
              <span className="absolute text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                {avgScore >= 90 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 50 ? 'C' : 'D'}
              </span>
            </div>
          </div>
        </div>

        {/* Charts & Map Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Response Time Trend</h2>
              <span className="text-xs font-medium text-zinc-500">{timeFilter === '24h' ? 'Last 24 Hours' : 'Historical'}</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-zinc-800" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={val => `${val}ms`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="ms" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorMs)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Alerts & Distribution */}
          <div className="space-y-4 flex flex-col">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex-1">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">Performance Alerts</h2>
              <div className="space-y-3">
                {ALERTS.map(alert => (
                  <div key={alert.id} className="flex items-start space-x-2">
                    {alert.type === 'critical' && <AlertOctagon className="w-4 h-4 text-rose-500 mt-0.5" />}
                    {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />}
                    {alert.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />}
                    <div>
                      <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-tight">{alert.message}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex-1">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Latency Distribution</h2>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>&lt; 100ms</span>
                  <span className="font-bold text-zinc-900 dark:text-white">4 sites</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400"><span className="w-2 h-2 rounded-full bg-blue-500"></span>100-200ms</span>
                  <span className="font-bold text-zinc-900 dark:text-white">2 sites</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400"><span className="w-2 h-2 rounded-full bg-amber-500"></span>200-500ms</span>
                  <span className="font-bold text-zinc-900 dark:text-white">1 site</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400"><span className="w-2 h-2 rounded-full bg-rose-500"></span>&gt; 500ms</span>
                  <span className="font-bold text-zinc-900 dark:text-white">1 site</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Map Placeholder */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
           <div className="absolute top-4 left-5">
             <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Global Performance Map</h2>
             <p className="text-[10px] text-zinc-500">Real-time latency from 18 edge locations</p>
           </div>
           
           <Map className="w-16 h-16 text-zinc-200 dark:text-zinc-800 mb-2" />
           <p className="text-sm font-medium text-zinc-400 dark:text-zinc-600 max-w-sm text-center">Interactive world map visualization rendering engine active. Showing regions: India, Singapore, London, Frankfurt, Tokyo, Sydney, New York.</p>
           
           {/* Fake map pins */}
           <div className="absolute top-1/3 left-1/4 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
           <div className="absolute top-1/2 left-2/3 w-3 h-3 bg-blue-500 rounded-full animate-ping opacity-75 delay-75"></div>
           <div className="absolute top-2/3 left-3/4 w-3 h-3 bg-amber-500 rounded-full animate-ping opacity-75 delay-150"></div>
           <div className="absolute top-1/4 left-3/4 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75 delay-300"></div>
        </div>

        {/* Website Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Website Performance Metrics</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Website</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Response Time</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Load Time</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Score</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Core Web Vitals (L/F/C)</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Region</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Last Tested</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredSites.map(site => (
                  <tr 
                    key={site.id} 
                    onClick={() => setSelectedSite(site)}
                    className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        <WebsiteFavicon url={site.url} name={site.name} />
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-white text-xs group-hover:text-purple-600 dark:group-hover:text-purple-400">{site.name}</p>
                          <p className="text-[10px] text-zinc-400">{site.url}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-bold font-mono text-zinc-900 dark:text-zinc-100">{site.responseTime}ms</td>
                    <td className="px-5 py-3.5 font-bold font-mono text-zinc-900 dark:text-zinc-100">{site.loadTime}s</td>
                    <td className={`px-5 py-3.5 font-extrabold ${getScoreColor(site.score)}`}>{site.score}</td>
                    <td className="px-5 py-3.5 font-mono text-[10px] text-zinc-500">
                      {site.vitals.lcp}s / {site.vitals.fid}ms / {site.vitals.cls}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 text-[11px]">{site.region}</td>
                    <td className="px-5 py-3.5 text-zinc-500 font-mono text-[11px]">{site.lastTested}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(site.status)}`}>
                        {site.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredSites.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-zinc-500 text-sm">
                      {sites.length === 0 ? 'No data yet — add URLs to urls.json and start the Python engine to begin monitoring.' : 'No websites found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {selectedSite && (
        <PerformanceSpeedDrawer 
          website={selectedSite} 
          onClose={() => setSelectedSite(null)}
          onRunTest={(id) => console.log('Running test for', id)}
        />
      )}
    </>
  );
}
