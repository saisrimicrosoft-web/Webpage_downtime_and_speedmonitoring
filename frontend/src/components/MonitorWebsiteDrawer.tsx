'use client';

import React, { useState } from 'react';
import {
  X, Globe, ShieldCheck, MapPin, Server, Calendar, Clock, Activity,
  Play, Pause, RefreshCw, FileText, ExternalLink, AlertTriangle, XCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { MonitoredSite } from './MonitorWebsitesContent';

interface Props {
  website: MonitoredSite;
  onClose: () => void;
  onTogglePause: (id: string) => void;
}

const LATENCY_HISTORY = [
  { time: '00:00', ms: 48 }, { time: '04:00', ms: 55 }, { time: '08:00', ms: 122 },
  { time: '12:00', ms: 51 }, { time: '16:00', ms: 68 }, { time: '20:00', ms: 45 },
  { time: 'Now',   ms: 42 },
];

const INCIDENT_LOG = [
  { time: 'Sep 27, 14:10', event: 'Connection Timeout – recovered in 3m', type: 'down' },
  { time: 'Sep 25, 09:34', event: 'SSL certificate warning triggered', type: 'warn' },
  { time: 'Sep 20, 17:02', event: 'Latency spike > 400ms – auto-resolved', type: 'slow' },
  { time: 'Sep 12, 11:20', event: 'Site returned 502 for 8 minutes', type: 'down' },
];

export default function MonitorWebsiteDrawer({ website, onClose, onTogglePause }: Props) {
  const [isChecking, setIsChecking] = useState(false);
  const [checkDone, setCheckDone] = useState(false);

  const handleForceCheck = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      setCheckDone(true);
      setTimeout(() => setCheckDone(false), 3000);
    }, 1400);
  };

  const statusColor = (s: string) => {
    if (s === 'Online')      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900';
    if (s === 'Slow')        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
    if (s === 'Down')        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900 animate-pulse';
    if (s === 'Maintenance') return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900';
    return '';
  };

  const dotColor = (s: string) => {
    if (s === 'Online')      return 'bg-emerald-500 animate-pulse';
    if (s === 'Slow')        return 'bg-amber-500';
    if (s === 'Down')        return 'bg-rose-500';
    if (s === 'Maintenance') return 'bg-blue-500';
    return 'bg-zinc-400';
  };

  const incidentDot = (t: string) => {
    if (t === 'down') return 'bg-rose-500';
    if (t === 'slow') return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <aside
        className="absolute inset-y-0 right-0 w-full max-w-[420px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
        style={{ animation: 'slide-left 0.3s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-purple-50/60 to-white dark:from-zinc-900 dark:to-zinc-900 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${website.name.replace(/^www\./, '')}&sz=128`}
                  alt={website.name}
                  width={24}
                  height={24}
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center space-x-1.5">
                  <span>{website.name}</span>
                  <a href={website.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-zinc-400 hover:text-purple-600 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium truncate max-w-[220px]">{website.url}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Status row */}
          <div className="flex items-center justify-between mt-3">
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor(website.isPaused ? 'Paused' : website.status)}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${website.isPaused ? 'bg-zinc-400' : dotColor(website.status)}`}></span>
              <span>{website.isPaused ? 'Paused' : website.status}</span>
            </span>
            <span className="text-xs font-bold text-zinc-500">
              Uptime: <strong className="text-zinc-900 dark:text-white">{website.uptime}%</strong>
            </span>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-5">
          {/* Quick spec grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                <MapPin className="w-3 h-3 text-purple-500" /><span>Region</span>
              </div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">{website.region}</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                <Server className="w-3 h-3 text-blue-500" /><span>IP Address</span>
              </div>
              <p className="text-xs font-mono font-bold text-zinc-900 dark:text-white">{website.ipAddress}</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /><span>SSL Expiry</span>
              </div>
              <p className={`text-xs font-bold ${website.sslDaysLeft <= 0 ? 'text-rose-600' : website.sslDaysLeft < 14 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {website.sslDaysLeft <= 0 ? 'Expired' : `${website.sslDaysLeft} days left`}
              </p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                <Clock className="w-3 h-3 text-amber-500" /><span>Last Response</span>
              </div>
              <p className="text-xs font-mono font-bold text-zinc-900 dark:text-white">
                {website.status === 'Down' ? <span className="text-rose-500">Timeout</span> : `${website.latency}ms`}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200 dark:border-zinc-700 p-3.5 space-y-2 text-xs">
            {[
              { icon: <Calendar className="w-3.5 h-3.5 text-zinc-400" />, label: 'Last Deployment', value: website.lastDeployment },
              { icon: <Activity className="w-3.5 h-3.5 text-zinc-400" />, label: 'Monitoring Since', value: website.monitoringStarted },
              { icon: <Clock className="w-3.5 h-3.5 text-zinc-400" />, label: 'Poll Interval', value: website.interval },
              { icon: <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />, label: 'Last Incident', value: website.lastIncident },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center space-x-1.5">{icon}<span>{label}</span></span>
                <span className="font-semibold text-zinc-900 dark:text-white text-right max-w-[160px] truncate">{value}</span>
              </div>
            ))}
          </div>

          {/* 24h Latency Chart */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">24-Hour Latency</h4>
              <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">{website.latency}ms avg</span>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={LATENCY_HISTORY} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '11px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(val: number) => [`${val}ms`, 'Latency']}
                  />
                  <Line type="monotone" dataKey="ms" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2.5, fill: '#8b5cf6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incident Log */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">Recent Incidents</h4>
            <div className="space-y-2">
              {INCIDENT_LOG.map((inc, i) => (
                <div key={i} className="flex items-start space-x-3 p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${incidentDot(inc.type)}`}></div>
                  <div>
                    <p className="text-[10px] font-mono text-zinc-400">{inc.time}</p>
                    <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">{inc.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 space-y-2.5">
          {checkDone && (
            <div className="p-2.5 bg-emerald-500 text-white text-xs font-bold text-center rounded-xl" style={{ animation: 'fade-in 0.25s ease-out' }}>
              ✓ Health check triggered successfully!
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => onTogglePause(website.id)}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {website.isPaused
                ? <><Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" /><span>Resume</span></>
                : <><Pause className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /><span>Pause</span></>
              }
            </button>
            <button
              onClick={handleForceCheck}
              disabled={isChecking}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Probing...' : 'Force Check'}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => alert(`Showing logs for ${website.name}`)}
              className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" /><span>View Logs</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
