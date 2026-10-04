'use client';

import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, XCircle, Search, Filter } from 'lucide-react';
import type { CheckLog } from '../lib/api';

interface TableProps {
  logs: CheckLog[];
}

export default function ChecksTable({ logs }: TableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'down'>('all');

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <p className="text-zinc-500 text-center py-8">No recent checks found in database.</p>
      </div>
    );
  }

  // Filter logs based on search query & status filter
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.url.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'up') return log.is_up === true;
    if (statusFilter === 'down') return log.is_up === false;
    return true;
  });

  const getStatusColor = (code: number | null) => {
    if (!code) return 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800';
    if (code >= 200 && code < 300) return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900';
    if (code >= 300 && code < 400) return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900';
    return 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900';
  };

  const getLatencyColor = (ms: number) => {
    if (ms > 1000) return 'text-rose-600 dark:text-rose-400 font-semibold';
    if (ms > 500) return 'text-amber-600 dark:text-amber-400 font-medium';
    return 'text-zinc-900 dark:text-zinc-300';
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Recent Telemetry Checks</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Real-time status updates across all configured target endpoints.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-60 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter Badges */}
          <div className="inline-flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setStatusFilter('up')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'up'
                  ? 'bg-emerald-500 text-white shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Up ({logs.filter((l) => l.is_up).length})
            </button>
            <button
              onClick={() => setStatusFilter('down')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'down'
                  ? 'bg-rose-500 text-white shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Down ({logs.filter((l) => !l.is_up).length})
            </button>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Timestamp</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">URL Target</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Health Status</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">HTTP Code</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Response Latency</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">SSL Certificate Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                    {format(parseISO(log.checked_at), 'MMM dd, HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                    {log.url}
                  </td>
                  <td className="px-6 py-4">
                    {log.is_up ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Up</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900 animate-pulse">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Down</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-mono font-semibold ${getStatusColor(log.status_code)}`}>
                      {log.status_code || 'ERR'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-xs font-mono ${getLatencyColor(log.response_ms)}`}>
                    {log.response_ms} ms
                  </td>
                  <td className="px-6 py-4">
                    {log.ssl_days_left !== null ? (
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                        log.ssl_days_left < 14
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {log.ssl_days_left} days left
                      </span>
                    ) : (
                      <span className="text-zinc-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500 text-sm">
                  No checks match the current search or status filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
