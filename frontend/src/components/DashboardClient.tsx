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
                <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Website Monitoring Dashboard
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium max-w-xl">
                  Monitor uptime, downtime, response time, SSL health, and website performance in real time.
                </p>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => store.refresh()}
                  disabled={store.loading}
                  className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${store.loading ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Website</span>
                </button>
              </div>
            </div>

            <div className="mb-5">
              <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isSupabaseConfigured
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              }`}>
                <Database className="w-3 h-3" />
                <span>{isSupabaseConfigured ? 'Supabase Realtime Active' : 'Configure NEXT_PUBLIC_SUPABASE_URL in .env.local'}</span>
              </span>
            </div>

            <KPIOverview
              uptimePercentage={kpis.uptimePercentage}
              activeIncidents={kpis.activeIncidents}
              sslWarnings={kpis.sslWarnings}
              totalUrls={kpis.totalSites}
            />

            <div className="mt-8 mb-12">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Monitored Websites</h2>
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
        onNavigate={setActivePage}
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
