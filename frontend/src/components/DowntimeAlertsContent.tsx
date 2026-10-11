'use client';

import React, { useState, useEffect } from 'react';
import ActiveIncidentBanner from '@/components/ActiveIncidentBanner';
import RegionRadar from '@/components/RegionRadar';
import LiveFeed from '@/components/LiveFeed';
import IncidentLifecycle from '@/components/IncidentLifecycle';
import DowntimeTimeline from '@/components/DowntimeTimeline';
import IncidentDrawer from '@/components/IncidentDrawer';
import { MOCK_INCIDENT, Incident } from '@/data/mockIncidents';
import { LifecycleStep } from '@/components/IncidentLifecycle';
import { getIncidents } from '@/lib/api';

export default function DowntimeAlertsContent() {
  const [incident, setIncident] = useState<Incident>(MOCK_INCIDENT);
  const [currentStep, setCurrentStep] = useState<LifecycleStep>('Alerted');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRealData, setHasRealData] = useState(false);

  const fetchIncidents = async () => {
    try {
      const incidents = await getIncidents();
      const active = incidents.find(i => i.resolvedAt === null);
      if (active) {
        let siteName = active.url;
        try { siteName = new URL(active.url).hostname; } catch { /* keep original */ }

        setIncident({
          id: active.id,
          siteName,
          status: 'ACTIVE',
          severity: 'Critical',
          detectedAt: new Date(active.startedAt),
          errorType: 'Site Unreachable',
          regions: [
            { name: 'Primary', status: 'FAILING', responseTime: 5000, httpCode: 503 },
          ],
          events: [
            {
              id: `evt-${active.id}`,
              time: active.startedAt,
              status: 'Detected' as const,
              message: `${active.checkCount} consecutive failed checks detected.`,
            },
          ],
        });
        setHasRealData(true);
      } else {
        setHasRealData(false);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load incidents';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleAcknowledge = () => {
    setCurrentStep('Acknowledged');
    const newEvent = {
      id: `evt-${Date.now()}`,
      time: new Date().toISOString(),
      status: 'Acknowledged' as const,
      message: 'Incident acknowledged by on-call engineer.'
    };
    setIncident(prev => ({ ...prev, events: [...prev.events, newEvent] }));
  };

  const handleEscalate = () => {
    setCurrentStep('Fixing');
    const newEvent = {
      id: `evt-${Date.now()}`,
      time: new Date().toISOString(),
      status: 'Fixing' as const,
      message: 'Incident escalated. Engineering team investigating.'
    };
    setIncident(prev => ({ ...prev, events: [...prev.events, newEvent] }));
  };

  const handleResolve = () => {
    setCurrentStep('Resolved');
    const newEvent = {
      id: `evt-${Date.now()}`,
      time: new Date().toISOString(),
      status: 'Resolved' as const,
      message: 'Systems have recovered. Monitoring for stability.'
    };
    setIncident(prev => ({
      ...prev,
      status: 'RESOLVED',
      resolvedAt: new Date(),
      events: [...prev.events, newEvent],
      regions: prev.regions.map(r => ({ ...r, status: 'OK' as const }))
    }));
  };

  const handleTimelineClick = (site: string) => {
    setSelectedSite(site);
    setDrawerOpen(true);
  };

  if (loading) return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-zinc-500">Loading incident data…</p>
      </div>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Incident Command Center</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Real-time incident response, regional disruption radar, and system lifecycle tracking.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between">
          <p className="text-sm text-rose-700 dark:text-rose-400 font-medium">{error}</p>
          <button
            onClick={fetchIncidents}
            className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {!hasRealData ? (
        <div className="flex flex-col items-center justify-center min-h-[360px] bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-950/40 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-zinc-300 mb-1">All Systems Operational</p>
          <p className="text-xs text-zinc-500 max-w-xs">No active incidents detected. All monitored websites are responding normally.</p>
        </div>
      ) : (
        <>
          {/* 1. Active incident banner */}
          <ActiveIncidentBanner
            incident={incident}
            onAcknowledge={handleAcknowledge}
            onEscalate={handleEscalate}
          />

          {/* 2. Region radar & Live feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 h-[400px]">
              <RegionRadar regions={incident.regions} />
            </div>
            <div className="lg:col-span-5 h-[400px]">
              <LiveFeed regions={incident.regions} isResolved={incident.status === 'RESOLVED'} />
            </div>
          </div>

          {/* 3. Incident lifecycle tracker */}
          <IncidentLifecycle
            currentStep={currentStep}
            onResolve={handleResolve}
          />

          {/* 4. 24-hour timeline */}
          <DowntimeTimeline onTimelineClick={handleTimelineClick} />

          {/* Side Drawer */}
          <IncidentDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            siteName={selectedSite}
            incident={selectedSite === incident.siteName ? incident : null}
          />
        </>
      )}
    </div>
  );
}
