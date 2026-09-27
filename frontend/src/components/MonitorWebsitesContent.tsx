'use client';

import React, { useState } from 'react';
import {
  Search, Filter, ChevronDown, RefreshCw, Plus, Globe, CheckCircle,
  AlertOctagon, TrendingUp, Eye, Pause, Play, Trash2, Edit3,
  ShieldCheck, AlertTriangle, XCircle, MapPin, ExternalLink, MoreVertical
} from 'lucide-react';
import AddWebsiteModal from './AddWebsiteModal';
import MonitorWebsiteDrawer from './MonitorWebsiteDrawer';

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

/* ──────────────── SAMPLE DATA ──────────────── */
const SAMPLE_WEBSITES: MonitoredSite[] = [
  { id:'1', name:'google.com', url:'https://google.com', status:'Online', uptime:100.00, latency:42, sslStatus:'Valid', sslDaysLeft:248, region:'US-East N.Virginia', lastChecked:'12s ago', interval:'30s', ipAddress:'142.250.190.46', lastIncident:'None (Clean)', lastDeployment:'Sep 26, 2026 12:00 UTC', monitoringStarted:'Jan 15, 2026', isPaused:false },
  { id:'2', name:'github.com', url:'https://github.com', status:'Online', uptime:99.99, latency:118, sslStatus:'Valid', sslDaysLeft:42, region:'EU-West Frankfurt', lastChecked:'28s ago', interval:'1m', ipAddress:'140.82.121.4', lastIncident:'Aug 12, 2026 (Resolved 2m)', lastDeployment:'Sep 25, 2026 18:30 UTC', monitoringStarted:'Feb 01, 2026', isPaused:false },
  { id:'3', name:'amazon.in', url:'https://amazon.in', status:'Slow', uptime:95.42, latency:380, sslStatus:'Expiring Soon', sslDaysLeft:4, region:'AP-South Mumbai', lastChecked:'Just now', interval:'30s', ipAddress:'52.95.116.115', lastIncident:'Sep 27, 2026 04:12 UTC (Latency)', lastDeployment:'Sep 20, 2026 09:15 UTC', monitoringStarted:'Feb 10, 2026', isPaused:false },
  { id:'4', name:'openai.com', url:'https://openai.com', status:'Online', uptime:99.98, latency:88, sslStatus:'Valid', sslDaysLeft:190, region:'US-West California', lastChecked:'5s ago', interval:'1m', ipAddress:'104.18.7.192', lastIncident:'Jul 30, 2026 (Resolved 6m)', lastDeployment:'Sep 24, 2026 21:00 UTC', monitoringStarted:'Jan 22, 2026', isPaused:false },
  { id:'5', name:'myntra.com', url:'https://myntra.com', status:'Online', uptime:99.91, latency:135, sslStatus:'Valid', sslDaysLeft:65, region:'AP-South Mumbai', lastChecked:'18s ago', interval:'5m', ipAddress:'13.235.14.99', lastIncident:'Sep 02, 2026 (Resolved 3m)', lastDeployment:'Sep 22, 2026 11:45 UTC', monitoringStarted:'Mar 05, 2026', isPaused:false },
  { id:'6', name:'spotify.com', url:'https://spotify.com', status:'Maintenance', uptime:99.85, latency:160, sslStatus:'Valid', sslDaysLeft:120, region:'EU-Central Frankfurt', lastChecked:'2m ago', interval:'5m', ipAddress:'35.186.224.25', lastIncident:'Scheduled Maintenance Window', lastDeployment:'Sep 27, 2026 01:00 UTC', monitoringStarted:'Feb 18, 2026', isPaused:false },
  { id:'7', name:'netflix.com', url:'https://netflix.com', status:'Online', uptime:99.99, latency:92, sslStatus:'Valid', sslDaysLeft:310, region:'US-East N.Virginia', lastChecked:'8s ago', interval:'30s', ipAddress:'54.237.226.164', lastIncident:'None (Clean)', lastDeployment:'Sep 26, 2026 03:30 UTC', monitoringStarted:'Jan 01, 2026', isPaused:false },
  { id:'8', name:'flipkart.com', url:'https://flipkart.com', status:'Down', uptime:92.10, latency:0, sslStatus:'Expired', sslDaysLeft:0, region:'AP-South Mumbai', lastChecked:'4s ago', interval:'30s', ipAddress:'163.53.78.88', lastIncident:'Sep 27, 2026 14:10 UTC (Failure)', lastDeployment:'Sep 19, 2026 15:00 UTC', monitoringStarted:'Mar 12, 2026', isPaused:false },
  { id:'9', name:'medium.com', url:'https://medium.com', status:'Online', uptime:99.94, latency:105, sslStatus:'Valid', sslDaysLeft:180, region:'US-East N.Virginia', lastChecked:'15s ago', interval:'1m', ipAddress:'162.159.152.4', lastIncident:'Sep 15, 2026 (Resolved 4m)', lastDeployment:'Sep 23, 2026 08:00 UTC', monitoringStarted:'Apr 02, 2026', isPaused:false },
  { id:'10', name:'vercel.com', url:'https://vercel.com', status:'Online', uptime:99.97, latency:56, sslStatus:'Valid', sslDaysLeft:220, region:'US-West California', lastChecked:'10s ago', interval:'30s', ipAddress:'76.76.21.21', lastIncident:'None (Clean)', lastDeployment:'Sep 27, 2026 06:00 UTC', monitoringStarted:'Jan 18, 2026', isPaused:false },
];

/* ──────────────── COMPONENT ──────────────── */
interface Props {
  onOpenAddModal: () => void;
}

export default function MonitorWebsitesContent({ onOpenAddModal }: Props) {
  const [websites, setWebsites] = useState<MonitoredSite[]>(SAMPLE_WEBSITES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'down' | 'slow' | 'maintenance'>('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [selectedSite, setSelectedSite] = useState<MonitoredSite | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Counts
  const onlineCount = websites.filter(s => s.status === 'Online').length;
  const offlineCount = websites.filter(s => s.status === 'Down').length;
  const slowCount = websites.filter(s => s.status === 'Slow').length;
  const maintenanceCount = websites.filter(s => s.status === 'Maintenance').length;
  const avgUptime = (websites.reduce((sum, s) => sum + s.uptime, 0) / websites.length).toFixed(3);

  // Regions for filter dropdown
  const regions = [...new Set(websites.map(s => s.region))];

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
    if (regionFilter !== 'all') return site.region === regionFilter;
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

  const handleRefresh = () => {
    setWebsites(prev => prev.map(s => ({
      ...s,
      lastChecked: 'Just now',
      latency: s.status === 'Down' ? 0 : Math.max(30, s.latency + Math.floor(Math.random() * 20) - 10),
    })));
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

  /* ─── FAVICON BG ─── */
  const faviconColors = ['bg-purple-600','bg-blue-600','bg-indigo-600','bg-emerald-600','bg-amber-600','bg-rose-600','bg-teal-600','bg-cyan-600'];
  const getFaviconBg = (name: string) => faviconColors[name.charCodeAt(0) % faviconColors.length];

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
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
                className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
              >
                <option value="all">All Regions</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
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
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Uptime %</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Response Time</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">SSL</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Region</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Last Checked</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Interval</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.length > 0 ? filtered.map(site => (
                  <tr
                    key={site.id}
                    onClick={() => setSelectedSite(site)}
                    className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors cursor-pointer group"
                  >
                    {/* Website */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg ${getFaviconBg(site.name)} text-white flex items-center justify-center font-bold text-[10px] uppercase shadow-xs group-hover:scale-105 transition-transform`}>
                          {site.name.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-white text-xs group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{site.name}</p>
                          <p className="text-[10px] text-zinc-400 truncate max-w-[140px]">{site.url}</p>
                        </div>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3.5"><StatusBadge status={site.status} isPaused={site.isPaused} /></td>
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
                    {/* SSL */}
                    <td className="px-5 py-3.5"><SslBadge days={site.sslDaysLeft} /></td>
                    {/* Region */}
                    <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 font-medium text-[11px]">{site.region}</td>
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
                    <td colSpan={9} className="px-5 py-12 text-center text-zinc-500 text-sm">
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
