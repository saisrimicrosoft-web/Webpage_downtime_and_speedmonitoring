'use client';

import React, { useState, useEffect } from 'react';
import KPIOverview from '@/components/KPIOverview';
import UrlPerformanceChart from '@/components/UrlPerformanceChart';
import UrlSelector from '@/components/UrlSelector';
import ChecksTable from '@/components/ChecksTable';
import { getGlobalKPIs, getRecentLogs, getUniqueUrls, getUrlHistory, CheckLog } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Activity, RefreshCw, Radio, Database } from 'lucide-react';

interface InitialDataProps {
  initialKpis: { uptimePercentage: number; activeIncidents: number; sslWarnings: number; totalUrls: number };
  initialLogs: CheckLog[];
  initialUrls: string[];
  initialChartUrl: string;
  initialChartData: CheckLog[];
}

export default function DashboardClient({
  initialKpis,
  initialLogs,
  initialUrls,
  initialChartUrl,
  initialChartData,
}: InitialDataProps) {
  const [kpis, setKpis] = useState(initialKpis);
  const [logs, setLogs] = useState<CheckLog[]>(initialLogs);
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [selectedUrl, setSelectedUrl] = useState<string>(initialChartUrl);
  const [chartData, setChartData] = useState<CheckLog[]>(initialChartData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch updated history when selectedUrl changes
  useEffect(() => {
    if (!selectedUrl) return;
    async function loadHistory() {
      const data = await getUrlHistory(selectedUrl);
      setChartData(data);
    }
    loadHistory();
  }, [selectedUrl]);

  // Master refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [newKpis, newLogs, newUrls] = await Promise.all([
        getGlobalKPIs(),
        getRecentLogs(50),
        getUniqueUrls(),
      ]);

      setKpis(newKpis);
      setLogs(newLogs);
      setUrls(newUrls);

      const activeUrl = selectedUrl || (newUrls.length > 0 ? newUrls[0] : '');
      if (activeUrl) {
        if (!selectedUrl) setSelectedUrl(activeUrl);
        const newChartData = await getUrlHistory(activeUrl);
        setChartData(newChartData);
      }
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Live polling interval (15 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      handleRefresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedUrl]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      {/* Header Bar */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Early Warning Monitor
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium hidden sm:block">
                Downtime & Latency Telemetry Engine
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* DB Source Badge */}
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isSupabaseConfigured
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
            }`}>
              <Database className="w-3 h-3" />
              <span>{isSupabaseConfigured ? 'Supabase DB' : 'Local Flask API'}</span>
            </span>

            {/* Live indicator toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-emerald-500' : ''}`} />
              <span>{autoRefresh ? 'Live Polling' : 'Paused'}</span>
            </button>

            {/* Manual refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Now</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards Grid */}
        <KPIOverview
          uptimePercentage={kpis.uptimePercentage}
          activeIncidents={kpis.activeIncidents}
          sslWarnings={kpis.sslWarnings}
          totalUrls={kpis.totalUrls || urls.length}
        />

        {/* URL Target Selector */}
        {urls.length > 0 && (
          <UrlSelector
            urls={urls}
            selectedUrl={selectedUrl}
            onSelectUrl={setSelectedUrl}
          />
        )}

        {/* Latency History Chart */}
        {selectedUrl ? (
          <UrlPerformanceChart data={chartData} url={selectedUrl} />
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-zinc-500 shadow-xs mb-8">
            No target URLs monitored yet. Run a check to populate metrics.
          </div>
        )}

        {/* Live Logs Table */}
        <div className="mt-8">
          <ChecksTable logs={logs} />
        </div>
      </main>
    </div>
  );
}
