'use client';

import React, { useState } from 'react';
import DashboardLayout, { NavPage } from '@/components/DashboardLayout';
import KPIOverview from '@/components/KPIOverview';
import MonitorWebsitesContent from '@/components/MonitorWebsitesContent';
import DowntimeAlertsContent from '@/components/DowntimeAlertsContent';
import UptimeStatusContent from '@/components/UptimeStatusContent';
import SslCertificateContent from '@/components/SslCertificateContent';
import ReportsContent from '@/components/ReportsContent';
import SettingsContent from '@/components/SettingsContent';
import AddWebsiteModal from '@/components/AddWebsiteModal';
import { useMonitoring } from '@/lib/store';
import { selectKPIs } from '@/lib/selectors';
import { Globe, Database, RefreshCw, Radio, Plus, CheckCircle, X, Loader2 } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function DashboardClient() {
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [savedToast, setSavedToast] = useState('');

  // Check URL query param ?page=settings on load
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('page') as NavPage | null;
      const validPages: NavPage[] = [
        'dashboard',
        'monitor-websites',
        'uptime-status',
        'downtime-alerts',
        'ssl-certificate',
        'reports',
        'settings'
      ];
      if (p && validPages.includes(p)) {
        setActivePage(p);
      }
    }
  }, []);

  const handlePageChange = (page: NavPage) => {
    setActivePage(page);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (page === 'dashboard') {
        url.searchParams.delete('page');
      } else {
        url.searchParams.set('page', page);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const store = useMonitoring();
  const kpis  = selectKPIs(store.websites, store.incidents);

  const handleAddSave = async (site: any) => {
    try {
      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:               site.name,
          url:                site.url,
          region:             site.regions?.[0] ?? 'India - Mumbai',
          check_interval_sec: site.pollingInterval === 'Every 30 Seconds' ? 30
                             : site.pollingInterval === '5 Minutes'       ? 300
                             : site.pollingInterval === '15 Minutes'      ? 900
                             : site.pollingInterval === '30 Minutes'      ? 1800
                             : 60,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSavedToast(`Error: ${json.error}`);
      } else {
        setSavedToast(`"${json.name}" added — monitoring started!`);
        store.refresh();
      }
    } catch {
      setSavedToast('Failed to add website. Check your connection.');
    }
    setTimeout(() => setSavedToast(''), 6000);
    setIsAddModalOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_16px_rgba(255,255,255,0.4)]">
                  Website Monitoring Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-white font-medium mt-1.5 leading-relaxed drop-shadow-xs">
                  Monitor{' '}
                  <span className="text-emerald-300 font-bold inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 rounded-md shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    uptime
                  </span>
                  ,{' '}
                  <span className="text-rose-300 font-bold inline-flex items-center bg-rose-500/20 border border-rose-400/40 px-1.5 py-0.5 rounded-md shadow-xs">
                    downtime
                  </span>
                  ,{' '}
                  <span className="text-amber-300 font-bold inline-flex items-center bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 rounded-md shadow-xs">
                    response time
                  </span>
                  ,{' '}
                  <span className="text-cyan-300 font-bold inline-flex items-center bg-cyan-500/20 border border-cyan-400/40 px-1.5 py-0.5 rounded-md shadow-xs">
                    SSL health
                  </span>
                  , and website performance in{' '}
                  <span className="text-purple-300 font-bold">real time</span>.
                </p>
              </div>
              <div className="flex items-center flex-wrap gap-2.5">
                <button
                  onClick={() => store.refresh()}
                  disabled={store.loading}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white border border-purple-300/40 hover:border-white rounded-xl text-xs font-bold transition-all shadow-[0_0_18px_rgba(147,51,234,0.45)] disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-white ${store.loading ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-[0_0_24px_rgba(147,51,234,0.65)] hover:shadow-[0_0_30px_rgba(168,85,247,0.85)] border border-purple-300/60 hover:border-white transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 text-white stroke-[3]" />
                  <span className="tracking-wide">Add Website</span>
                </button>
              </div>
            </div>

            <div className="mb-6">
              <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-xs ${
                isSupabaseConfigured
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-emerald-900/30'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-amber-900/30'
              }`}>
                {isSupabaseConfigured ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                ) : (
                  <Database className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span className="tracking-wide">
                  {isSupabaseConfigured ? 'Supabase Realtime Active' : 'Configure NEXT_PUBLIC_SUPABASE_URL in .env.local'}
                </span>
              </span>
            </div>

            <KPIOverview
              uptimePercentage={kpis.uptimePercentage}
              activeIncidents={kpis.activeIncidents}
              sslWarnings={kpis.sslWarnings}
              totalUrls={kpis.totalSites}
            />

            <div className="mt-8 mb-12">
              <h2 className="text-lg font-extrabold text-white mb-4 flex items-center gap-2 drop-shadow-xs">
                <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"></span>
                <span>Monitored Websites</span>
              </h2>
              {store.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : store.websites.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-6 h-6 text-zinc-400" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No websites yet</h3>
                  <p className="text-xs text-zinc-500 mt-1 mb-4">Click "Add Website" to start monitoring.</p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /><span>Add Website</span>
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
                        <th className="px-4 py-3">Uptime</th>
                        <th className="px-4 py-3">Last Checked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {store.websites.map(w => {
                        let hostname = w.url;
                        try { hostname = new URL(w.url).hostname; } catch {}
                        const statusColor = w.status === 'operational' ? 'text-emerald-600' :
                                            w.status === 'degraded'    ? 'text-amber-500' :
                                            w.status === 'down'        ? 'text-rose-500' :
                                            'text-zinc-400';
                        return (
                          <tr key={w.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
                                  alt=""
                                  loading="lazy"
                                  className="w-5 h-5 object-contain rounded-full bg-white border border-zinc-200 dark:border-zinc-700"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <div>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[200px]">{w.name}</p>
                                  <p className="text-[10px] text-zinc-500 truncate max-w-[200px]">{w.url}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor} bg-current/10`}>
                                {w.status === 'operational' ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                <span className="capitalize">{w.status}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              {w.last_response_ms != null ? `${w.last_response_ms}ms` : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono font-bold">
                              <span className={
                                w.uptime_pct >= 99.9 ? 'text-emerald-600' :
                                w.uptime_pct >= 95   ? 'text-amber-500'   : 'text-rose-500'
                              }>{w.uptime_pct.toFixed(2)}%</span>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-zinc-500">
                              {w.last_checked_at ? new Date(w.last_checked_at).toLocaleTimeString() : '—'}
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
        return <ReportsContent />;
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
        onNavigate={handlePageChange}
        openIncidentCount={kpis.activeIncidents}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      >
        {renderPage()}
      </DashboardLayout>

      <AddWebsiteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddSave}
      />

      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] max-w-lg w-full mx-4 px-5 py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-2xl shadow-2xl flex items-start space-x-3">
          <span className="text-emerald-400 dark:text-emerald-600 text-base leading-none mt-0.5">✓</span>
          <span>{savedToast}</span>
          <button onClick={() => setSavedToast('')} className="ml-auto text-zinc-400 hover:text-white cursor-pointer shrink-0">✕</button>
        </div>
      )}
    </>
  );
}
