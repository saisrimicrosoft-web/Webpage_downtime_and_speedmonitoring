'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import AuthGuard from '@/components/AuthGuard';

const DashboardLayout = dynamic(() => import('@/components/DashboardLayout'), { ssr: false });
const SettingsContent = dynamic(() => import('@/components/SettingsContent'), { ssr: false });

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsPageClient />
    </AuthGuard>
  );
}

function SettingsPageClient() {
  const [active, setActive] = React.useState<'settings'>('settings');

  return (
    <DashboardLayout
      activePage={active}
      onNavigate={(page) => {
        if (page !== 'settings') {
          window.location.href = `/?page=${page}`;
        }
      }}
    >
      <SettingsContent />
    </DashboardLayout>
  );
}
