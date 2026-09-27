'use client';

import React, { useState } from 'react';
import { X, Globe, ShieldCheck, MapPin, Server, Calendar, Clock, Activity, Play, Pause, RefreshCw, FileText, ExternalLink, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface WebsiteItem {
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

interface DrawerProps {
  website: WebsiteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onTogglePause?: (id: string) => void;
}

const SAMPLE_LATENCY_DATA = [
  { time: '00:00', latency: 45 },
  { time: '04:00', latency: 52 },
  { time: '08:00', latency: 120 },
  { time: '12:00', latency: 48 },
  { time: '16:00', latency: 65 },
  { time: '20:00', latency: 44 },
  { time: 'Now', latency: 42 },
];

export default function WebsiteDetailsDrawer({ website, isOpen, onClose, onTogglePause }: DrawerProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [checkSuccess, setCheckSuccess] = useState(false);

  if (!isOpen || !website) return null;

  const handleForceCheck = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      setCheckSuccess(true);
      setTimeout(() => setCheckSuccess(false), 3000);
    }, 1200);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Online':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Online</span>
          </span>
        );
      case 'Slow':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Slow (Degraded)</span>
          </span>
        );
      case 'Down':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Down (Critical)</span>
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Maintenance</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/50 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={onClose} />

      <aside className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-left">
          {/* Header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-purple-50/50 via-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-900 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                  {website.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center">
                    <span>{website.name}</span>
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-zinc-400 hover:text-purple-600 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium truncate max-w-[200px]">
                    {website.url}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between">
              {getStatusBadge(website.status)}
              <span className="text-xs font-bold text-zinc-500">
                Uptime: <strong className="text-zinc-900 dark:text-white">{website.uptime}%</strong>
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 flex-1">
            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center space-x-1.5 text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-purple-500" />
                  <span>Hosting Region</span>
                </div>
                <p className="text-xs font-extrabold text-zinc-900 dark:text-white mt-1">
                  {website.region}
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center space-x-1.5 text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
                  <Server className="w-3.5 h-3.5 text-blue-500" />
                  <span>IP Address</span>
                </div>
                <p className="text-xs font-mono font-bold text-zinc-900 dark:text-white mt-1">
                  {website.ipAddress || '142.250.190.46'}
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center space-x-1.5 text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>SSL Expiry</span>
                </div>
                <p className="text-xs font-extrabold text-zinc-900 dark:text-white mt-1">
                  {website.sslDaysLeft} days remaining
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center space-x-1.5 text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Last Incident</span>
                </div>
                <p className="text-xs font-extrabold text-zinc-900 dark:text-white mt-1 truncate">
                  {website.lastIncident || 'None (Clean)'}
                </p>
              </div>
            </div>

            {/* Additional Spec Timestamps */}
            <div className="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                  Last Deployment
                </span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {website.lastDeployment || 'Sep 25, 2026 14:20 UTC'}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center">
                  <Activity className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                  Monitoring Started
                </span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {website.monitoringStarted || 'Jan 10, 2026'}
                </span>
              </div>
            </div>

            {/* Response Time Mini Chart */}
            <div className="bg-white dark:bg-zinc-850 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  24-Hour Latency Profile
                </h4>
                <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">
                  Avg {website.latency}ms
                </span>
              </div>

              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={SAMPLE_LATENCY_DATA}>
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} hide />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', fontSize: '11px', border: 'none' }}
                      formatter={(val: number) => [`${val} ms`, 'Latency']}
                    />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#8b5cf6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 sticky bottom-0 space-y-2.5">
            {checkSuccess && (
              <div className="p-2.5 bg-emerald-500 text-white text-xs font-bold text-center rounded-xl animate-fade-in">
                ✓ Health Check Triggered Successfully!
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onTogglePause && onTogglePause(website.id)}
                className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {website.isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                    <span>Resume Monitoring</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Pause Monitoring</span>
                  </>
                )}
              </button>

              <button
                onClick={handleForceCheck}
                disabled={isChecking}
                className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Probing...' : 'Force Check'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => alert(`Showing telemetry logs for ${website.name}`)}
                className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Logs</span>
              </button>

              <button
                onClick={onClose}
                className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
