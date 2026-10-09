import React from 'react';
import { Activity, AlertTriangle, ShieldAlert, Globe } from 'lucide-react';

interface KPIProps {
  uptimePercentage: number;
  activeIncidents: number;
  sslWarnings: number;
  totalUrls?: number;
}

export default function KPIOverview({ uptimePercentage, activeIncidents, sslWarnings, totalUrls = 0 }: KPIProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Global Uptime Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex items-center space-x-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
          <Activity className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">Global Uptime</p>
          <p className="text-xl xl:text-2xl font-bold text-zinc-900 dark:text-white mt-1 truncate tracking-tight">
            {uptimePercentage.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Active Incidents Card */}
      <div className={`bg-white dark:bg-zinc-900 border rounded-xl p-6 shadow-sm flex items-center space-x-4 transition-colors ${
        activeIncidents > 0 
          ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10' 
          : 'border-zinc-200 dark:border-zinc-800'
      }`}>
        <div className={`p-3 rounded-lg ${
          activeIncidents > 0 
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
        }`}>
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Active Incidents</p>
          <p className={`text-2xl font-bold mt-1 ${activeIncidents > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}>
            {activeIncidents}
          </p>
        </div>
      </div>

      {/* SSL Warnings Card */}
      <div className={`bg-white dark:bg-zinc-900 border rounded-xl p-6 shadow-sm flex items-center space-x-4 transition-colors ${
        sslWarnings > 0 
          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' 
          : 'border-zinc-200 dark:border-zinc-800'
      }`}>
        <div className={`p-3 rounded-lg ${
          sslWarnings > 0 
            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' 
            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
        }`}>
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">SSL Warnings (&lt; 14d)</p>
          <p className={`text-2xl font-bold mt-1 ${sslWarnings > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-900 dark:text-white'}`}>
            {sslWarnings}
          </p>
        </div>
      </div>

      {/* Monitored URLs Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex items-center space-x-4">
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
          <Globe className="w-7 h-7" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Monitored Targets</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {totalUrls}
          </p>
        </div>
      </div>
    </div>
  );
}
