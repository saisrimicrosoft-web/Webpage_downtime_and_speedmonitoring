'use client';

import React, { useState } from 'react';
import HeaderNav from '@/components/HeaderNav';
import LiveMonitoringBanner from '@/components/LiveMonitoringBanner';
import HealthSummaryCards from '@/components/HealthSummaryCards';
import LatencyDistributionBar from '@/components/LatencyDistributionBar';
import WebsitesTable, { WebsiteItem } from '@/components/WebsitesTable';
import AddWebsiteModal from '@/components/AddWebsiteModal';
import WebsiteDetailsDrawer from '@/components/WebsiteDetailsDrawer';

const INITIAL_WEBSITES: WebsiteItem[] = [
  {
    id: '1',
    name: 'google.com',
    url: 'https://google.com',
    status: 'Online',
    uptime: 100.0,
    latency: 42,
    sslStatus: 'Valid',
    sslDaysLeft: 248,
    region: 'US-East N.Virginia',
    lastChecked: '12s ago',
    ipAddress: '142.250.190.46',
    lastIncident: 'None (Clean)',
    lastDeployment: 'Sep 26, 2026 12:00 UTC',
    monitoringStarted: 'Jan 15, 2026',
    isPaused: false,
  },
  {
    id: '2',
    name: 'github.com',
    url: 'https://github.com',
    status: 'Online',
    uptime: 99.99,
    latency: 118,
    sslStatus: 'Valid',
    sslDaysLeft: 42,
    region: 'EU-West Frankfurt',
    lastChecked: '28s ago',
    ipAddress: '140.82.121.4',
    lastIncident: 'Aug 12, 2026 (Resolved in 2m)',
    lastDeployment: 'Sep 25, 2026 18:30 UTC',
    monitoringStarted: 'Feb 01, 2026',
    isPaused: false,
  },
  {
    id: '3',
    name: 'amazon.in',
    url: 'https://amazon.in',
    status: 'Slow',
    uptime: 95.42,
    latency: 380,
    sslStatus: 'Expiring Soon',
    sslDaysLeft: 4,
    region: 'AP-South Mumbai',
    lastChecked: 'Just now',
    ipAddress: '52.95.116.115',
    lastIncident: 'Sep 27, 2026 04:12 UTC (Latency Spike)',
    lastDeployment: 'Sep 20, 2026 09:15 UTC',
    monitoringStarted: 'Feb 10, 2026',
    isPaused: false,
  },
  {
    id: '4',
    name: 'openai.com',
    url: 'https://openai.com',
    status: 'Online',
    uptime: 99.98,
    latency: 88,
    sslStatus: 'Valid',
    sslDaysLeft: 190,
    region: 'US-West California',
    lastChecked: '5s ago',
    ipAddress: '104.18.7.192',
    lastIncident: 'Jul 30, 2026 (Resolved in 6m)',
    lastDeployment: 'Sep 24, 2026 21:00 UTC',
    monitoringStarted: 'Jan 22, 2026',
    isPaused: false,
  },
  {
    id: '5',
    name: 'myntra.com',
    url: 'https://myntra.com',
    status: 'Online',
    uptime: 99.91,
    latency: 135,
    sslStatus: 'Valid',
    sslDaysLeft: 65,
    region: 'AP-South Mumbai',
    lastChecked: '18s ago',
    ipAddress: '13.235.14.99',
    lastIncident: 'Sep 02, 2026 (Resolved in 3m)',
    lastDeployment: 'Sep 22, 2026 11:45 UTC',
    monitoringStarted: 'Mar 05, 2026',
    isPaused: false,
  },
  {
    id: '6',
    name: 'spotify.com',
    url: 'https://spotify.com',
    status: 'Maintenance',
    uptime: 99.85,
    latency: 160,
    sslStatus: 'Valid',
    sslDaysLeft: 120,
    region: 'EU-Central Frankfurt',
    lastChecked: '2m ago',
    ipAddress: '35.186.224.25',
    lastIncident: 'Scheduled Maintenance Window',
    lastDeployment: 'Sep 27, 2026 01:00 UTC',
    monitoringStarted: 'Feb 18, 2026',
    isPaused: false,
  },
  {
    id: '7',
    name: 'netflix.com',
    url: 'https://netflix.com',
    status: 'Online',
    uptime: 99.99,
    latency: 92,
    sslStatus: 'Valid',
    sslDaysLeft: 310,
    region: 'US-East N.Virginia',
    lastChecked: '8s ago',
    ipAddress: '54.237.226.164',
    lastIncident: 'None (Clean)',
    lastDeployment: 'Sep 26, 2026 03:30 UTC',
    monitoringStarted: 'Jan 01, 2026',
    isPaused: false,
  },
  {
    id: '8',
    name: 'flipkart.com',
    url: 'https://flipkart.com',
    status: 'Down',
    uptime: 92.10,
    latency: 0,
    sslStatus: 'Expired',
    sslDaysLeft: 0,
    region: 'AP-South Mumbai',
    lastChecked: '4s ago',
    ipAddress: '163.53.78.88',
    lastIncident: 'Sep 27, 2026 14:10 UTC (Connection Failure)',
    lastDeployment: 'Sep 19, 2026 15:00 UTC',
    monitoringStarted: 'Mar 12, 2026',
    isPaused: false,
  },
];

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<WebsiteItem[]>(INITIAL_WEBSITES);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<WebsiteItem | null>(null);

  const handleSaveWebsite = (newSiteData: any) => {
    const newSite: WebsiteItem = {
      id: Date.now().toString(),
      name: newSiteData.name,
      url: newSiteData.url,
      status: 'Online',
      uptime: 100.0,
      latency: Math.floor(Math.random() * 80) + 40,
      sslStatus: newSiteData.sslEnabled ? 'Valid' : 'Unmonitored',
      sslDaysLeft: newSiteData.sslEnabled ? newSiteData.sslDaysThreshold || 30 : 0,
      region: newSiteData.regions[0] || 'US-East N.Virginia',
      lastChecked: 'Just now',
      ipAddress: '104.21.55.12',
      lastIncident: 'None',
      lastDeployment: 'Just now',
      monitoringStarted: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isPaused: false,
    };

    setWebsites([newSite, ...websites]);
  };

  const handleTogglePause = (id: string) => {
    setWebsites(
      websites.map((site) =>
        site.id === id ? { ...site, isPaused: !site.isPaused } : site
      )
    );
    if (selectedWebsite && selectedWebsite.id === id) {
      setSelectedWebsite({ ...selectedWebsite, isPaused: !selectedWebsite.isPaused });
    }
  };

  const handleDeleteWebsite = (id: string) => {
    if (confirm('Are you sure you want to delete this monitored website?')) {
      setWebsites(websites.filter((site) => site.id !== id));
      if (selectedWebsite?.id === id) {
        setSelectedWebsite(null);
      }
    }
  };

  const handleRefresh = () => {
    setWebsites(
      websites.map((site) => ({
        ...site,
        lastChecked: 'Just now',
        latency: site.status === 'Down' ? 0 : Math.max(35, site.latency + (Math.floor(Math.random() * 10) - 5)),
      }))
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      {/* Header Navigation */}
      <HeaderNav onOpenAddModal={() => setIsAddModalOpen(true)} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              Monitor Websites Page
            </h1>
            <p className="text-xs text-zinc-500 font-semibold mt-1">
              Manage target domains, multi-region probes, SSL certificates & alert rules.
            </p>
          </div>
        </div>

        {/* Live Monitoring Banner */}
        <LiveMonitoringBanner />

        {/* Website Health Summary Cards */}
        <HealthSummaryCards />

        {/* Latency Distribution Breakdown Bar */}
        <LatencyDistributionBar />

        {/* Monitored Websites Table */}
        <WebsitesTable
          websites={websites}
          onSelectWebsite={setSelectedWebsite}
          onTogglePause={handleTogglePause}
          onDelete={handleDeleteWebsite}
          onRefresh={handleRefresh}
        />
      </main>

      {/* Add New Website Modal */}
      <AddWebsiteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveWebsite}
      />

      {/* Website Details Drawer */}
      <WebsiteDetailsDrawer
        website={selectedWebsite}
        isOpen={Boolean(selectedWebsite)}
        onClose={() => setSelectedWebsite(null)}
        onTogglePause={handleTogglePause}
      />
    </div>
  );
}
