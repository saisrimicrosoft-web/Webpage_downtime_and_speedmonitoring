'use client';

import React, { useState } from 'react';
import { Search, RefreshCw, MoreVertical, Pause, Play, Edit3, Trash2, Eye, ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Globe, Clock, ShieldAlert } from 'lucide-react';

export interface WebsiteItem {
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
  ipAddress?: string;
  lastIncident?: string;
  lastDeployment?: string;
  monitoringStarted?: string;
  isPaused?: boolean;
}

interface WebsitesTableProps {
  websites: WebsiteItem[];
  onSelectWebsite: (site: WebsiteItem) => void;
  onTogglePause: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export default function WebsitesTable({
  websites,
  onSelectWebsite,
  onTogglePause,
  onDelete,
  onRefresh,
}: WebsitesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'degraded' | 'down' | 'ssl'>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filter calculation
  const filteredWebsites = websites.filter((site) => {
    const matchesSearch =
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.url.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'online') return site.status === 'Online';
    if (statusFilter === 'degraded') return site.status === 'Slow' || site.status === 'Maintenance';
    if (statusFilter === 'down') return site.status === 'Down';
    if (statusFilter === 'ssl') return site.sslDaysLeft < 14;

    return true;
  });

  const getStatusBadge = (status: string, isPaused?: boolean) => {
    if (isPaused) {
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
          <span>Paused</span>
        </span>
      );
    }

    switch (status) {
      case 'Online':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Online</span>
          </span>
        );
      case 'Slow':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Slow</span>
          </span>
        );
      case 'Down':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Down</span>
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Maintenance</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getSslBadge = (daysLeft: number) => {
    if (daysLeft <= 0) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
          <XCircle className="w-3 h-3 text-rose-500" />
          <span>Expired</span>
        </span>
      );
    }
    if (daysLeft < 14) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          <span>Expiring in {daysLeft}d</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60">
        <ShieldCheck className="w-3 h-3 text-emerald-500" />
        <span>Valid ({daysLeft}d)</span>
      </span>
    );
  };

  // Favicon initial background colors
  const getFaviconBg = (name: string) => {
    const colors = [
      'bg-purple-600',
      'bg-blue-600',
      'bg-indigo-600',
      'bg-emerald-600',
      'bg-amber-600',
      'bg-rose-600',
      'bg-teal-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden mb-12">
      {/* Filter Tabs Header */}
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            All (48)
          </button>

          <button
            onClick={() => setStatusFilter('online')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'online'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Online (46)
          </button>

          <button
            onClick={() => setStatusFilter('degraded')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'degraded'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Degraded (1)
          </button>

          <button
            onClick={() => setStatusFilter('down')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'down'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Down (1)
          </button>

          <button
            onClick={() => setStatusFilter('ssl')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ssl'
                ? 'bg-purple-800 text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            SSL Warnings (2)
          </button>
        </div>

        {/* Right Search & Refresh Controls */}
        <div className="flex items-center space-x-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          <button
            onClick={onRefresh}
            title="Refresh Table Data"
            className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Website & Favicon</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Uptime %</th>
              <th className="px-6 py-4">Response Time</th>
              <th className="px-6 py-4">SSL Certificate</th>
              <th className="px-6 py-4">Node Region</th>
              <th className="px-6 py-4">Last Checked</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-medium">
            {filteredWebsites.length > 0 ? (
              filteredWebsites.map((site) => (
                <tr
                  key={site.id}
                  onClick={() => onSelectWebsite(site)}
                  className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors cursor-pointer group"
                >
                  {/* Website & Favicon */}
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs flex items-center justify-center flex-shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${site.name.replace(/^www\./, '')}&sz=128`}
                          alt={site.name}
                          width={20}
                          height={20}
                          loading="lazy"
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-extrabold text-zinc-900 dark:text-white text-xs group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {site.name}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                          {site.url}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">{getStatusBadge(site.status, site.isPaused)}</td>

                  {/* Uptime % */}
                  <td className="px-6 py-4 font-bold font-mono">
                    <span
                      className={
                        site.uptime >= 99.9
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : site.uptime >= 95.0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {site.uptime.toFixed(2)}%
                    </span>
                  </td>

                  {/* Latency + Sparkline */}
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {site.status === 'Down' ? '0ms' : `${site.latency}ms`}
                      </span>
                      {/* Mini inline SVG latency curve */}
                      <svg className="w-12 h-5 stroke-current fill-none stroke-2 text-purple-500 opacity-80" viewBox="0 0 50 20">
                        <path d={site.status === 'Slow' ? "M0 10 L15 18 L30 5 L50 15" : "M0 15 Q25 5 50 12"} />
                      </svg>
                    </div>
                  </td>

                  {/* SSL Status */}
                  <td className="px-6 py-4">{getSslBadge(site.sslDaysLeft)}</td>

                  {/* Region */}
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 font-semibold">
                    {site.region}
                  </td>

                  {/* Last Checked */}
                  <td className="px-6 py-4 text-zinc-500 font-mono">{site.lastChecked}</td>

                  {/* Action Menu */}
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => onSelectWebsite(site)}
                        className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-purple-100 text-zinc-700 dark:text-zinc-300 hover:text-purple-700 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        View
                      </button>

                      <button
                        onClick={() => onTogglePause(site.id)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                        title={site.isPaused ? 'Resume Monitoring' : 'Pause Monitoring'}
                      >
                        {site.isPaused ? (
                          <Play className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Pause className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </button>

                      <button
                        onClick={() => onDelete(site.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete Website"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-zinc-500 text-sm">
                  No websites match the search or filter query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
