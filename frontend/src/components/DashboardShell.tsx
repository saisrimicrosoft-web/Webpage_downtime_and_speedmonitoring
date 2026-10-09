'use client';

/**
 * DashboardShell — loads the existing monitoring dashboard client-side.
 * Shown when no individual monitor is selected in the user sidebar.
 * Preserves all existing charts, KPI cards, and tables without modification.
 */

import React, { useState, useEffect } from 'react';
import { getGlobalKPIs, getRecentLogs, getUniqueUrls, getUrlHistory, CheckLog } from '@/lib/api';
import { monitorsApi, MonitorRecord } from '@/lib/flaskApi';
import { Activity, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues (the component uses useState/useEffect)
const DashboardClient = dynamic(() => import('./DashboardClient'), { ssr: false });

const EMPTY_KPIS = { uptimePercentage: 100, activeIncidents: 0, sslWarnings: 0, totalUrls: 0 };

export default function DashboardShell() {
  const [ready, setReady]     = useState(false);
  const [kpis,  setKpis]      = useState(EMPTY_KPIS);
  const [logs,  setLogs]      = useState<CheckLog[]>([]);
  const [urls,  setUrls]      = useState<string[]>([]);
  const [monitors, setMonitors] = useState<MonitorRecord[]>([]);
  const [chartUrl,  setChartUrl]  = useState('');
  const [chartData, setChartData] = useState<CheckLog[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [k, l, u, mList] = await Promise.all([
          getGlobalKPIs(), getRecentLogs(50), getUniqueUrls(), monitorsApi.list().catch(() => [])
        ]);
        setKpis(k); setLogs(l); setUrls(u); setMonitors(mList);
        if (u.length > 0) {
          setChartUrl(u[0]);
          const cd = await getUrlHistory(u[0]);
          setChartData(cd);
        }
      } catch {}
      setReady(true);
    }
    load();
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center space-x-2 text-zinc-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading dashboard…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardClient
      initialKpis={kpis}
      initialLogs={logs}
      initialUrls={urls}
      initialMonitors={monitors}
      initialChartUrl={chartUrl}
      initialChartData={chartData}
    />
  );
}
