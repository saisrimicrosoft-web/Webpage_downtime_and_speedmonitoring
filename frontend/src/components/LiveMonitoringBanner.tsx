'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Zap, CheckCircle2, Globe2 } from 'lucide-react';

export default function LiveMonitoringBanner() {
  const [countdown, setCountdown] = useState(14);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 15 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-4 sm:p-5 shadow-lg mb-8 relative overflow-hidden">
      {/* Background Subtle Wave Overlay */}
      <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
        <Globe2 className="w-64 h-64 text-white" />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        {/* Banner Title & Status */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center p-3 bg-white/15 backdrop-blur-md rounded-xl shadow-inner">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 bg-white/20 rounded-md">
                Live Status
              </span>
              <span className="text-xs text-emerald-100 font-medium hidden sm:inline">
                Global Edge Probe Network
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
              All Systems Operational Across 5 Continents
            </h2>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
          {/* Metric 1 */}
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <div>
              <p className="text-[10px] text-emerald-100 uppercase font-semibold">Uptime Today</p>
              <p className="text-sm font-extrabold text-white">99.982%</p>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="flex items-center space-x-2.5 border-l border-white/15 pl-3">
            <ShieldCheck className="w-4 h-4 text-emerald-200" />
            <div>
              <p className="text-[10px] text-emerald-100 uppercase font-semibold">Incidents Resolved</p>
              <p className="text-sm font-extrabold text-white">12 Resolved</p>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="flex items-center space-x-2.5 border-l border-white/15 pl-3">
            <Zap className="w-4 h-4 text-emerald-200" />
            <div>
              <p className="text-[10px] text-emerald-100 uppercase font-semibold">Avg Latency</p>
              <p className="text-sm font-extrabold text-white">142ms</p>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="flex items-center space-x-2.5 border-l border-white/15 pl-3">
            <Clock className="w-4 h-4 text-emerald-200 animate-pulse" />
            <div>
              <p className="text-[10px] text-emerald-100 uppercase font-semibold">Next Poll</p>
              <p className="text-sm font-extrabold text-white">{countdown}s</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
