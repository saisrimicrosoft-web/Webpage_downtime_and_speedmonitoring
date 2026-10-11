'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const DashboardClient = dynamic(() => import('./DashboardClient'), { ssr: false });

export default function DashboardShell() {
  return <DashboardClient />;
}
