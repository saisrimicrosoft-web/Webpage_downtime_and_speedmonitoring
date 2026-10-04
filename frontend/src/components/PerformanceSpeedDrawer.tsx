'use client';

import React, { useState } from 'react';
import {
  X, Globe, MapPin, Activity, Clock, Server, Download, ShieldCheck,
  Play, RefreshCw, BarChart2, CheckCircle, AlertTriangle, AlertOctagon,
  Gauge, TrendingUp, TrendingDown, Layers, Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import type { PerformanceSite } from './PerformanceSpeedContent';

interface Props {
  website: PerformanceSite;
  onClose: () => void;
  onRunTest: (id: string) => void;
}

const HISTORY_DATA = [
  { time: '00:00', ms: 145, load: 1.2 }, { time: '04:00', ms: 152, load: 1.3 }, 
  { time: '08:00', ms: 210, load: 1.8 }, { time: '12:00', ms: 138, load: 1.1 }, 
  { time: '16:00', ms: 142, load: 1.2 }, { time: '20:00', ms: 125, load: 1.0 },
  { time: 'Now',   ms: 142, load: 1.2 },
];

export default function PerformanceSpeedDrawer({ website, onClose, onRunTest }: Props) {
  const [isTesting, setIsTesting] = useState(false);
  const [testDone, setTestDone] = useState(false);

  const handleTest = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      setTestDone(true);
      setTimeout(() => setTestDone(false), 3000);
      onRunTest(website.id);
    }, 1500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900';
      case 'Good': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900';
      case 'Slow': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
      case 'Critical': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900 animate-pulse';
      default: return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  const getDotColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'bg-emerald-500';
      case 'Good': return 'bg-blue-500';
      case 'Slow': return 'bg-amber-500';
      case 'Critical': return 'bg-rose-500';
      default: return 'bg-zinc-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm" onClick={onClose} />
      
      <aside
        className="absolute inset-y-0 right-0 w-full max-w-[460px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
        style={{ animation: 'slide-left 0.3s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
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
                </h3>
                <p className="text-[10px] text-zinc-500 font-medium">Performance Profile</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(website.status)}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(website.status)}`}></span>
              <span>{website.status}</span>
            </span>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Score</p>
                <p className="text-sm font-extrabold text-zinc-900 dark:text-white">{website.score}/100</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Load Time</p>
                <p className="text-sm font-extrabold text-zinc-900 dark:text-white">{website.loadTime}s</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-6">
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase text-zinc-500 mb-1">
                <Clock className="w-3 h-3 text-purple-500" /><span>Response Time</span>
              </div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">{website.responseTime}ms</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase text-zinc-500 mb-1">
                <MapPin className="w-3 h-3 text-blue-500" /><span>Primary Region</span>
              </div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">{website.region}</p>
            </div>
          </div>

          {/* Load Speed Breakdown */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Load Speed Breakdown</h4>
            <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-600 dark:text-zinc-400">DNS Lookup</span>
                  <span className="text-zinc-900 dark:text-white">22ms</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-600 dark:text-zinc-400">TCP Connection</span>
                  <span className="text-zinc-900 dark:text-white">45ms</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-600 dark:text-zinc-400">SSL Handshake</span>
                  <span className="text-zinc-900 dark:text-white">38ms</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-600 dark:text-zinc-400">Server Processing</span>
                  <span className="text-zinc-900 dark:text-white">125ms</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-600 dark:text-zinc-400">Content Download</span>
                  <span className="text-zinc-900 dark:text-white">850ms</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Core Web Vitals */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Core Web Vitals</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-center">
                <div className="text-[10px] font-bold text-zinc-500 mb-1">LCP</div>
                <div className={`text-sm font-extrabold ${website.vitals.lcp < 2.5 ? 'text-emerald-500' : 'text-amber-500'}`}>{website.vitals.lcp}s</div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-center">
                <div className="text-[10px] font-bold text-zinc-500 mb-1">FID</div>
                <div className={`text-sm font-extrabold ${website.vitals.fid < 100 ? 'text-emerald-500' : 'text-amber-500'}`}>{website.vitals.fid}ms</div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-center">
                <div className="text-[10px] font-bold text-zinc-500 mb-1">CLS</div>
                <div className={`text-sm font-extrabold ${website.vitals.cls < 0.1 ? 'text-emerald-500' : 'text-amber-500'}`}>{website.vitals.cls}</div>
              </div>
            </div>
          </div>

          {/* 24h Trend Chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">24-Hour Load Time Trend</h4>
            </div>
            <div className="h-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 shadow-sm">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={HISTORY_DATA} margin={{ top: 5, right: 0, bottom: 0, left: -25 }}>
                  <defs>
                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#888' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', fontSize: '11px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="load" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorLoad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 space-y-3">
          {testDone && (
            <div className="p-2.5 bg-emerald-500 text-white text-xs font-bold text-center rounded-xl animate-fade-in">
              ✓ Speed test completed successfully!
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="flex-1 flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-60"
            >
              <Zap className={`w-4 h-4 ${isTesting ? 'animate-pulse' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Run Speed Test Again'}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
