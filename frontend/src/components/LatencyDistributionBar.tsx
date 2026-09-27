'use client';

import React from 'react';
import { Gauge } from 'lucide-react';

export default function LatencyDistributionBar() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Gauge className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            Global Latency Distribution Breakdown
          </h3>
        </div>
        <span className="text-xs text-zinc-500 font-medium">
          48 Endpoints Evaluated
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Tier 1: <100ms */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl p-3.5 text-center transition-all hover:scale-[1.02]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
            &lt;100ms
          </p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-300 mt-1">
            32 Sites
          </p>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/70 mt-0.5">Ultra Fast (66.7%)</p>
        </div>

        {/* Tier 2: 100-250ms */}
        <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl p-3.5 text-center transition-all hover:scale-[1.02]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
            100-250ms
          </p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-300 mt-1">
            12 Sites
          </p>
          <p className="text-[10px] text-blue-700/80 dark:text-blue-400/70 mt-0.5">Normal (25.0%)</p>
        </div>

        {/* Tier 3: 250-500ms */}
        <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl p-3.5 text-center transition-all hover:scale-[1.02]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
            250-500ms
          </p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-300 mt-1">
            3 Sites
          </p>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-400/70 mt-0.5">Moderate (6.25%)</p>
        </div>

        {/* Tier 4: >500ms */}
        <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-xl p-3.5 text-center transition-all hover:scale-[1.02]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400">
            &gt;500ms
          </p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-300 mt-1">
            1 Site
          </p>
          <p className="text-[10px] text-rose-700/80 dark:text-rose-400/70 mt-0.5">Degraded (2.08%)</p>
        </div>
      </div>
    </div>
  );
}
