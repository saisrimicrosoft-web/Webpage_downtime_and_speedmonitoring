'use client';

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
      <main className="flex-1 overflow-y-auto">
        <DashboardShell />
      </main>
    </div>
  );
}
