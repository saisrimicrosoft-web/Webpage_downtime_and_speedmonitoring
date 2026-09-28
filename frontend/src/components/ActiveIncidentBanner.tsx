'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Incident } from '@/data/mockIncidents';

interface Props {
  incident: Incident | null;
  onAcknowledge: () => void;
  onEscalate: () => void;
}

export default function ActiveIncidentBanner({ incident, onAcknowledge, onEscalate }: Props) {
  const [elapsed, setElapsed] = useState<string>('00:00:00');

  useEffect(() => {
    if (!incident || incident.status === 'RESOLVED') return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(incident.detectedAt).getTime()) / 1000);
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [incident]);

  if (!incident || incident.status === 'RESOLVED') {
    return (
      <div className="w-full bg-zinc-900 border border-emerald-500/30 rounded-xl p-6 flex items-center gap-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-50 animate-pulse"></div>
          <CheckCircle2 className="w-10 h-10 text-emerald-500 relative z-10" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">All systems operational</h2>
          <p className="text-zinc-400 text-sm">No active incidents detected. Last incident resolved 3 hours ago.</p>
        </div>
      </div>
    );
  }

  const failingCount = incident.regions.filter(r => r.status === 'FAILING').length;

  return (
    <div className="w-full bg-zinc-900 border border-rose-500/50 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_20px_rgba(244,63,94,0.15)] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 animate-pulse"></div>
      
      <div className="flex items-center gap-4 w-full md:w-auto">
        <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6 text-rose-500" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="text-rose-500 font-bold text-xs tracking-widest uppercase">Active Incident</span>
          </div>
          <h2 className="text-xl font-bold text-white leading-tight">{incident.siteName} is down</h2>
          <p className="text-zinc-400 text-sm">{incident.errorType} · {failingCount} of {incident.regions.length} regions failing</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full md:w-auto">
        <div className="font-mono text-3xl font-bold text-rose-500 tracking-wider [text-shadow:0_0_10px_rgba(244,63,94,0.5)]">
          {elapsed}
        </div>
        <div className="text-zinc-500 text-xs uppercase tracking-widest mt-1">Time since detected</div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
        <button onClick={onAcknowledge} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-semibold transition-colors text-sm border border-zinc-700">
          Acknowledge
        </button>
        <button onClick={onEscalate} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold transition-colors text-sm shadow-[0_0_15px_rgba(244,63,94,0.4)]">
          Escalate
        </button>
      </div>
    </div>
  );
}
