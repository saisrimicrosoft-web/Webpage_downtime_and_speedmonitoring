'use client';

import React, { useState, useCallback } from 'react';
import AuthGuard from '@/components/AuthGuard';
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

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {selectedId != null ? (
          <SiteDetailView monitorId={selectedId} />
        ) : (
          <DashboardShell />
        )}
      </main>

      {addOpen && (
        <AddMonitorModal
          onClose={() => setAddOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
