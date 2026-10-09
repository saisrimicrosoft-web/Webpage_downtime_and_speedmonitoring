'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, RefreshCw, ExternalLink, ShieldCheck, Clock,
  AlertTriangle, CheckCircle2, XCircle, Loader2, TrendingUp, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts';
import { monitorsApi, MonitorRecord, CheckRecord, IncidentRecord } from '@/lib/flaskApi';
import { formatDistanceToNow, format } from 'date-fns';

interface Props { monitorId: number }

type Tab = '24h' | '7d' | '30d';
const TAB_HOURS: Record<Tab, number> = { '24h': 24, '7d': 168, '30d': 720 };

export default function SiteDetailView({ monitorId }: Props) {
  const [monitor,   setMonitor]   = useState<MonitorRecord | null>(null);
  const [checks,    setChecks]    = useState<CheckRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [tab,       setTab]       = useState<Tab>('24h');
  const [loading,   setLoading]   = useState(true);
  const [checking,  setChecking]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, c, i] = await Promise.all([
        monitorsApi.get(monitorId),
        monitorsApi.checks(monitorId, TAB_HOURS[tab]),
        monitorsApi.incidents(monitorId, TAB_HOURS[tab]),
      ]);
      setMonitor(m);
      setChecks(c);
      setIncidents(i);
    } catch {}
    setLoading(false);
  }, [monitorId, tab]);

  useEffect(() => { load(); }, [load]);

  async function runNow() {
    setChecking(true);
    try {
      await monitorsApi.runCheck(monitorId);
      await load();
    } catch {}
    setChecking(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!monitor) return null;

  const lc = monitor.latest_check;
  const isUp = lc?.status === 'up';

  // Chart data — last 50 checks reversed to chronological
  const chartData = [...checks].reverse().slice(-50).map(c => ({
    time:  format(new Date(c.timestamp), 'HH:mm'),
    ms:    c.response_time_ms ?? 0,
    status: c.status,
  }));

  // Uptime for current tab
  const uptimeKey: Record<Tab, keyof MonitorRecord> = { '24h': 'uptime_24h', '7d': 'uptime_7d', '30d': 'uptime_30d' };
  const uptime = (monitor[uptimeKey[tab]] as number | undefined) ?? monitor.uptime_24h ?? 0;

  const avgMs = checks.length
    ? Math.round(checks.filter(c => c.response_time_ms != null).reduce((s, c) => s + (c.response_time_ms ?? 0), 0) / checks.length)
    : null;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-sm overflow-hidden">
            <img
              src={`https://www.google.com/s2/favicons?domain=${new URL(monitor.url).hostname}&sz=64`}
              alt=""
              className="w-6 h-6 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white">{monitor.name}</h2>
              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                isUp
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>{isUp ? 'Online' : 'Down'}</span>
              </span>
              {!monitor.is_active && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-500 dark:bg-zinc-800">Paused</span>
              )}
            </div>
            <a href={monitor.url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-400 hover:text-purple-500 flex items-center space-x-1 mt-0.5">
              <span>{monitor.url}</span><ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <button
          onClick={runNow}
          disabled={checking}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition cursor-pointer"
        >
          {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Check now</span>
        </button>
      </div>

      {/* ── Time range tabs ── */}
      <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
        {(['24h', '7d', '30d'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === t
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Uptime', value: `${uptime.toFixed(2)}%`, color: uptime >= 99 ? 'text-emerald-600' : uptime >= 95 ? 'text-amber-500' : 'text-rose-500', icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'Avg Response', value: avgMs != null ? `${avgMs}ms` : '—', color: avgMs != null && avgMs < 500 ? 'text-emerald-600' : 'text-amber-500', icon: <Activity className="w-4 h-4" /> },
          { label: 'Incidents', value: String(incidents.length), color: incidents.length > 0 ? 'text-rose-500' : 'text-zinc-600 dark:text-zinc-400', icon: <AlertTriangle className="w-4 h-4" /> },
          { label: 'SSL Days', value: lc?.ssl_days_left != null ? `${lc.ssl_days_left}d` : '—', color: (lc?.ssl_days_left ?? 999) < 14 ? 'text-rose-500' : 'text-emerald-600', icon: <ShieldCheck className="w-4 h-4" /> },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center space-x-1.5 text-zinc-400 mb-2">{card.icon}<span className="text-[10px] font-semibold uppercase tracking-wide">{card.label}</span></div>
            <p className={`text-xl font-extrabold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Response time chart ── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4">Response Time</h3>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={40} unit="ms" />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [`${v}ms`, 'Response']}
              />
              <Line type="monotone" dataKey="ms" stroke="#7c3aed" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-zinc-400 text-sm">No data yet — run a check to populate</div>
        )}
      </div>

      {/* ── Check History Table ── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Check History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                {['Time', 'Status', 'Response', 'HTTP', 'SSL Days', 'Error'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {checks.slice(0, 50).map(c => (
                <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="px-4 py-2.5 font-mono text-zinc-500">
                    {formatDistanceToNow(new Date(c.timestamp), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.is_up
                      ? <span className="inline-flex items-center space-x-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /><span>Up</span></span>
                      : <span className="inline-flex items-center space-x-1 text-rose-500"><XCircle className="w-3.5 h-3.5" /><span>Down</span></span>
                    }
                  </td>
                  <td className="px-4 py-2.5 font-mono font-bold">
                    {c.response_time_ms != null
                      ? <span className={c.response_time_ms < 500 ? 'text-emerald-600' : c.response_time_ms < 1000 ? 'text-amber-500' : 'text-rose-500'}>{c.response_time_ms}ms</span>
                      : <span className="text-zinc-400">—</span>
                    }
                  </td>
                  <td className="px-4 py-2.5 font-mono text-zinc-500">{c.http_status_code ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-zinc-500">{c.ssl_days_left != null ? `${c.ssl_days_left}d` : '—'}</td>
                  <td className="px-4 py-2.5 text-zinc-400 max-w-[160px] truncate">{c.error_message || '—'}</td>
                </tr>
              ))}
              {checks.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">No checks recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Incident Log ── */}
      {incidents.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Incident Log</h3>
          </div>
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {incidents.map(inc => (
              <div key={inc.id} className="px-5 py-3.5 flex items-start justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                <div>
                  <div className="flex items-center space-x-2 mb-0.5">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${inc.status === 'open' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'}`}>
                      {inc.status === 'open' ? '● Open' : '✓ Resolved'}
                    </span>
                    <span className="text-xs text-zinc-500">{inc.duration_display}</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Started {formatDistanceToNow(new Date(inc.started_at), { addSuffix: true })}
                    {inc.resolved_at && ` · Resolved ${formatDistanceToNow(new Date(inc.resolved_at), { addSuffix: true })}`}
                  </p>
                  {inc.reason && <p className="text-[11px] text-zinc-400 mt-0.5">{inc.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
