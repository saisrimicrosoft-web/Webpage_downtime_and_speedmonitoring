'use client';

import React, { useState, useCallback } from 'react';
import AuthGuard from '@/components/AuthGuard';
import UserSidebar from '@/components/UserSidebar';
import SiteDetailView from '@/components/SiteDetailView';
import DashboardShell from '@/components/DashboardShell';
import AddMonitorModal from '@/components/AddMonitorModal';

export default function HomePage() {
  return (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  );
}

function DashboardPage() {
  const [selectedId,   setSelectedId]   = useState<number | null>(null);
  const [addOpen,      setAddOpen]      = useState(false);
  const [refreshTick,  setRefreshTick]  = useState(0);

  const handleCreated = useCallback(() => setRefreshTick(t => t + 1), []);

import React from 'react';
import AuthGuard from '@/components/AuthGuard';
import DashboardShell from '@/components/DashboardShell';

export default function HomePage() {
  return (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  );
}

function DashboardPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Per-user sidebar */}
      <UserSidebar
        selectedMonitorId={selectedId}
        onSelectMonitor={setSelectedId}
        onAddMonitor={() => setAddOpen(true)}
        refreshTick={refreshTick}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {selectedId != null ? (
          <SiteDetailView monitorId={selectedId} />
        ) : (
          <DashboardShell onAddMonitor={() => setAddOpen(true)} />
        )}
      </main>

      {addOpen && (
        <AddMonitorModal
          onClose={() => setAddOpen(false)}
          onCreated={handleCreated}
        />
      )}
      <main className="flex-1 overflow-y-auto">
        <DashboardShell />
      </main>
    </div>
  );
}
