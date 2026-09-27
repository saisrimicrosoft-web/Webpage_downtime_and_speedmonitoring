'use client';

import React from 'react';
import { Globe, CheckCircle, AlertOctagon, TrendingUp, ArrowUpRight } from 'lucide-react';

export default function HealthSummaryCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Card 1: Total Websites */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total Websites
          </span>
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white">48</h3>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center mt-1">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              <span>+3 Added This Week</span>
            </p>
          </div>

          {/* Mini Sparkline SVG */}
          <div className="w-20 h-10 text-purple-500 opacity-80">
            <svg viewBox="0 0 100 40" className="w-full h-full stroke-current fill-none stroke-2">
              <path d="M0 30 Q25 10 50 25 T100 5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Card 2: Online Websites */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Online Websites
          </span>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white">46</h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
              95.8% Healthy
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-2 rounded-full w-[95.8%] transition-all duration-1000"></div>
          </div>
        </div>
      </div>

      {/* Card 3: Offline / Degraded */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Offline / Degraded
          </span>
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">1 Down</span>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <span className="text-2xl font-extrabold text-amber-500">1 Slow</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 flex items-center">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping mr-1.5 inline-block"></span>
              2 Issues Requiring Attention
            </p>
          </div>
        </div>
      </div>

      {/* Card 4: Average Uptime */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Average Uptime
          </span>
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white">99.984%</h3>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">
              Last 30 Days SLA Average
            </p>
          </div>

          {/* Green Trend Chart SVG */}
          <div className="w-20 h-10 text-emerald-500 opacity-90">
            <svg viewBox="0 0 100 40" className="w-full h-full stroke-current fill-none stroke-2">
              <path d="M0 35 L20 28 L40 32 L60 15 L80 20 L100 5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
