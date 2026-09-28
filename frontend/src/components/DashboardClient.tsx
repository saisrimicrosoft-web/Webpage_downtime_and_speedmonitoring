'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout, { NavPage } from '@/components/DashboardLayout';
import KPIOverview from '@/components/KPIOverview';
import UrlPerformanceChart from '@/components/UrlPerformanceChart';
import UrlSelector from '@/components/UrlSelector';
import ChecksTable from '@/components/ChecksTable';
import MonitorWebsitesContent from '@/components/MonitorWebsitesContent';
import PerformanceSpeedContent from '@/components/PerformanceSpeedContent';
import DowntimeAlertsContent from '@/components/DowntimeAlertsContent';
import AddWebsiteModal from '@/components/AddWebsiteModal';
import { getGlobalKPIs, getRecentLogs, getUniqueUrls, getUrlHistory, CheckLog } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  Activity, RefreshCw, Radio, Database, Clock, Gauge, TrendingUp,
  ShieldCheck, BarChart3, FileText, Users, Settings, BellRing
} from 'lucide-react';

interface InitialDataProps {
  initialKpis: { uptimePercentage: number; activeIncidents: number; sslWarnings: number; totalUrls: number };
  initialLogs: CheckLog[];
  initialUrls: string[];
  initialChartUrl: string;
  initialChartData: CheckLog[];
}

/* ─── Placeholder screens for nav items not yet built ─── */
function PlaceholderScreen({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs text-center p-12">
        <div className="p-4 bg-purple-50 dark:bg-purple-950/30 text-purple-500 rounded-2xl mb-4">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-zinc-800 dark:text-white mb-2">{title}</h2>
        <p className="text-sm text-zinc-500 max-w-xs">
          This section is under construction. Check back soon for full analytics and management features.
        </p>
        <div className="mt-6 px-4 py-2 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 text-xs font-semibold rounded-full border border-purple-200 dark:border-purple-800">
          Coming soon
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient({
  initialKpis,
  initialLogs,
  initialUrls,
  initialChartUrl,
  initialChartData,
}: InitialDataProps) {
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Dashboard data state
  const [kpis, setKpis] = useState(initialKpis);
  const [logs, setLogs] = useState<CheckLog[]>(initialLogs);
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [selectedUrl, setSelectedUrl] = useState<string>(initialChartUrl);
  const [chartData, setChartData] = useState<CheckLog[]>(initialChartData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch history when URL changes
  useEffect(() => {
    if (!selectedUrl) return;
    getUrlHistory(selectedUrl).then(setChartData);
  }, [selectedUrl]);

  // Master refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [newKpis, newLogs, newUrls] = await Promise.all([
        getGlobalKPIs(), getRecentLogs(50), getUniqueUrls(),
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

  // Auto-polling (15s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(handleRefresh, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedUrl]);

  /* ─── Render active page content ─── */
  const renderPageContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {/* Dashboard header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Website Monitoring Dashboard
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium max-w-xl">
                  Monitor uptime, downtime, response time, SSL health, and website performance in real time across 18 edge locations worldwide.
                </p>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                {/* Live polling toggle */}
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    autoRefresh
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-emerald-500' : ''}`} />
                  <span>{autoRefresh ? 'Live Polling · 30s interval' : 'Polling Paused'}</span>
                </button>
                {/* Sync button */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
              </div>
            </div>

            {/* Data source badge */}
            <div className="mb-5">
              <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isSupabaseConfigured
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              }`}>
                <Database className="w-3 h-3" />
                <span>{isSupabaseConfigured ? 'Supabase DB Sync Active' : 'Local Flask API Mode'}</span>
              </span>
            </div>

            {/* KPI Cards */}
            <KPIOverview
              uptimePercentage={kpis.uptimePercentage}
              activeIncidents={kpis.activeIncidents}
              sslWarnings={kpis.sslWarnings}
              totalUrls={kpis.totalUrls || urls.length}
            />

            {/* URL Selector */}
            {urls.length > 0 && (
              <UrlSelector urls={urls} selectedUrl={selectedUrl} onSelectUrl={setSelectedUrl} />
            )}

            {/* Performance Chart */}
            {selectedUrl ? (
              <UrlPerformanceChart data={chartData} url={selectedUrl} />
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-zinc-500 shadow-xs mb-8">
                No target URLs monitored yet. Run a check to populate metrics.
              </div>
            )}

            {/* Checks Table */}
            <div className="mt-8">
              <ChecksTable logs={logs} />
            </div>
          </div>
        );

      case 'monitor-websites':
        return <MonitorWebsitesContent onOpenAddModal={() => setIsAddModalOpen(true)} />;

      case 'uptime-status':
        return <PlaceholderScreen title="Uptime Status" icon={<Clock className="w-8 h-8" />} />;

      case 'downtime-alerts':
        return <DowntimeAlertsContent />;

      case 'performance-speed':
        return <PerformanceSpeedContent />;

      case 'ssl-certificate':
        return <PlaceholderScreen title="SSL Certificate" icon={<ShieldCheck className="w-8 h-8" />} />;

      case 'analytics':
        return <PlaceholderScreen title="Analytics" icon={<BarChart3 className="w-8 h-8" />} />;

      case 'reports':
        return <PlaceholderScreen title="Reports" icon={<FileText className="w-8 h-8" />} />;

      case 'notification-center':
        return <PlaceholderScreen title="Notification Center" icon={<BellRing className="w-8 h-8" />} />;

      case 'team-members':
        return <PlaceholderScreen title="Team Members" icon={<Users className="w-8 h-8" />} />;

      case 'settings':
        return <PlaceholderScreen title="Settings" icon={<Settings className="w-8 h-8" />} />;

      default:
        return null;
    }
  };

  return (
    <>
      <DashboardLayout
        activePage={activePage}
        onNavigate={setActivePage}
        onOpenAddModal={activePage === 'monitor-websites' ? () => setIsAddModalOpen(true) : undefined}
      >
        {renderPageContent()}
      </DashboardLayout>

      {/* Global Add Website Modal */}
      <AddWebsiteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(data) => {
          console.log('New website saved:', data);
          setIsAddModalOpen(false);
        }}
      />
    </>
  );
}
