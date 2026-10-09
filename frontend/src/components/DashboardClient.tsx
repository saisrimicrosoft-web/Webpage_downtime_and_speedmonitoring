'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout, { NavPage } from '@/components/DashboardLayout';
import KPIOverview from '@/components/KPIOverview';
import MonitorWebsitesContent from '@/components/MonitorWebsitesContent';
import DowntimeAlertsContent from '@/components/DowntimeAlertsContent';
import UptimeStatusContent from '@/components/UptimeStatusContent';
import SslCertificateContent from '@/components/SslCertificateContent';
import SettingsContent from '@/components/SettingsContent';
import { getGlobalKPIs, getRecentLogs, getUniqueUrls, getUrlHistory, CheckLog } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  Activity, RefreshCw, Radio, Database, Clock, Gauge, TrendingUp,
  ShieldCheck, FileText, Settings, Plus, CheckCircle, X, Trash2, Pause, Play, Loader2, Globe, History
} from 'lucide-react';
import { monitorsApi, MonitorRecord } from '@/lib/flaskApi';

interface InitialDataProps {
  initialKpis: { uptimePercentage: number; activeIncidents: number; sslWarnings: number; totalUrls: number };
  initialLogs: CheckLog[];
  initialUrls: string[];
  initialMonitors: MonitorRecord[];
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
  initialMonitors,
  initialChartUrl,
  initialChartData,
}: InitialDataProps) {
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Dashboard data state
  const [kpis, setKpis] = useState(initialKpis);
  const [logs, setLogs] = useState<CheckLog[]>(initialLogs);
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [monitors, setMonitors] = useState<MonitorRecord[]>(initialMonitors);
  const [selectedUrl, setSelectedUrl] = useState<string>(initialChartUrl);
  const [chartData, setChartData] = useState<CheckLog[]>(initialChartData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Add Website state
  const [addUrl, setAddUrl] = useState('');
  const [addName, setAddName] = useState('');
  const [addInterval, setAddInterval] = useState(30);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const addUrlInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch history when URL changes
  useEffect(() => {
    if (!selectedUrl) return;
    getUrlHistory(selectedUrl).then(setChartData);
  }, [selectedUrl]);

  // Master refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [newKpis, newLogs, newUrls, mList] = await Promise.all([
        getGlobalKPIs(), getRecentLogs(50), getUniqueUrls(), monitorsApi.list().catch(() => [])
      ]);
      setKpis(newKpis);
      setLogs(newLogs);
      setUrls(newUrls);
      setMonitors(mList);
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
                {/* Add Website header button */}
                <button
                  onClick={() => {
                    addUrlInputRef.current?.focus();
                    addUrlInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="inline-flex items-center space-x-2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-purple-500/25 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Website</span>
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

            {/* Add Website Bar */}
            <div className="mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  ref={addUrlInputRef}
                  type="text"
                  placeholder="https://example.com"
                  value={addUrl}
                  onChange={e => { setAddUrl(e.target.value); setAddError(null); setAddSuccess(false); }}
                  className="flex-1 w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
                <input
                  type="text"
                  placeholder="Display name (optional)"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  className="w-full sm:w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
                <select
                  value={addInterval}
                  onChange={e => setAddInterval(Number(e.target.value))}
                  className="w-full sm:w-auto bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                  <option value={300}>5m</option>
                </select>
                <button
                  onClick={async () => {
                    setAddError(null);
                    setAddSuccess(false);
                    const url = addUrl.trim();
                    if (!url) { setAddError("URL is required"); return; }
                    if (!url.startsWith('http://') && !url.startsWith('https://')) { setAddError("URL must start with http:// or https://"); return; }
                    if (monitors.some(m => m.url === url)) { setAddError("This URL is already being monitored"); return; }
                    
                    setAddLoading(true);
                    try {
                      await monitorsApi.create({ url, name: addName.trim() || undefined, check_interval_seconds: addInterval });
                      setAddUrl('');
                      setAddName('');
                      setAddInterval(30);
                      setAddSuccess(true);
                      handleRefresh();
                      setTimeout(() => setAddSuccess(false), 3000);
                    } catch (err: any) {
                      setAddError(err.message || 'Failed to add website');
                    }
                    setAddLoading(false);
                  }}
                  disabled={addLoading}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Add Website</span>
                </button>
              </div>
              {addError && <p className="text-rose-500 text-xs mt-2 font-medium">{addError}</p>}
              {addSuccess && <p className="text-emerald-500 text-xs mt-2 font-medium flex items-center space-x-1"><CheckCircle className="w-3.5 h-3.5" /><span>Website added successfully!</span></p>}
            </div>

            {/* KPI Cards */}
            <KPIOverview
              uptimePercentage={kpis.uptimePercentage}
              activeIncidents={kpis.activeIncidents}
              sslWarnings={kpis.sslWarnings}
              totalUrls={kpis.totalUrls || urls.length}
            />

            {/* Monitored Sites List */}
            <div className="mt-8 mb-12">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Monitored Websites</h2>
              {monitors.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-6 h-6 text-zinc-400" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No websites yet</h3>
                  <p className="text-xs text-zinc-500 mt-1 mb-4">Add your first website above to start monitoring.</p>
                  <button onClick={() => {
                    addUrlInputRef.current?.focus();
                    addUrlInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }} className="text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer">
                    + Add Website
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto shadow-xs">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        <th className="px-4 py-3">Website</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Response</th>
                        <th className="px-4 py-3">SSL</th>
                        <th className="px-4 py-3">Last Checked</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {monitors.map(m => {
                        const lc = m.latest_check;
                        return (
                          <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={`https://www.google.com/s2/favicons?domain=${new URL(m.url).hostname}&sz=64`}
                                  alt=""
                                  loading="lazy"
                                  className="w-5 h-5 object-contain rounded-full bg-white border border-zinc-200 dark:border-zinc-700"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <div>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[200px]">{m.name}</p>
                                  <p className="text-[10px] text-zinc-500 truncate max-w-[200px]">{m.url}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {!lc ? <span className="text-xs text-zinc-400">Pending</span> : (
                                lc.status === 'up' 
                                  ? <span className="inline-flex items-center space-x-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full text-[10px] font-bold"><CheckCircle className="w-3 h-3"/><span>UP</span></span>
                                  : <span className="inline-flex items-center space-x-1 text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full text-[10px] font-bold"><X className="w-3 h-3"/><span>DOWN</span></span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              {lc?.response_time_ms ? `${lc.response_time_ms}ms` : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {lc?.ssl_days_left != null ? (
                                <span className={lc.ssl_days_left < 14 ? 'text-amber-500 font-bold' : 'text-zinc-600 dark:text-zinc-400'}>{lc.ssl_days_left} days</span>
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-[11px] text-zinc-500">
                              {lc?.timestamp ? new Date(lc.timestamp).toLocaleTimeString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={async () => {
                                    await monitorsApi.update(m.id, { is_active: !m.is_active });
                                    handleRefresh();
                                  }}
                                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                  title={m.is_active ? "Pause" : "Resume"}
                                >
                                  {m.is_active ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>}
                                </button>
                                <button
                                  onClick={async () => {
                                    if(confirm('Delete this monitor?')) {
                                      await monitorsApi.delete(m.id);
                                      handleRefresh();
                                    }
                                  }}
                                  className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

      case 'monitor-websites':
        return <MonitorWebsitesContent onOpenAddModal={() => setIsAddModalOpen(true)} />;

      case 'uptime-status':
        return <UptimeStatusContent />;

      case 'downtime-alerts':
        return <DowntimeAlertsContent />;

      case 'ssl-certificate':
        return <SslCertificateContent />;

      case 'reports':
        return <PlaceholderScreen title="Reports" icon={<FileText className="w-8 h-8" />} />;

      case 'settings':
        return <SettingsContent />;

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
    </>
  );
}
