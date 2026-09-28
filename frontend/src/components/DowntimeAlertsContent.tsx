'use client';

import React, { useState } from 'react';
import ActiveIncidentBanner from '@/components/ActiveIncidentBanner';
import RegionRadar from '@/components/RegionRadar';
import LiveFeed from '@/components/LiveFeed';
import IncidentLifecycle from '@/components/IncidentLifecycle';
import DowntimeTimeline from '@/components/DowntimeTimeline';
import IncidentDrawer from '@/components/IncidentDrawer';
import { MOCK_INCIDENT, Incident } from '@/data/mockIncidents';
import { LifecycleStep } from '@/components/IncidentLifecycle';

export default function DowntimeAlertsContent() {
  const [incident, setIncident] = useState<Incident>(MOCK_INCIDENT);
  const [currentStep, setCurrentStep] = useState<LifecycleStep>('Alerted');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

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
      regions: prev.regions.map(r => ({ ...r, status: 'OK' }))
    }));
  };

  const handleTimelineClick = (site: string) => {
    setSelectedSite(site);
    setDrawerOpen(true);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Incident Command Center</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Real-time incident response, regional disruption radar, and system lifecycle tracking.
        </p>
      </div>

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
    </div>
  );
}
