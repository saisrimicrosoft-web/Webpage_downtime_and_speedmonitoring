import React from 'react';
import DashboardClient from '@/components/DashboardClient';
import { getGlobalKPIs, getRecentLogs, getUniqueUrls, getUrlHistory } from '@/lib/api';

export const revalidate = 30; // Revalidate static generation every 30 seconds

export default async function DashboardPage() {
  const [kpis, recentLogs, uniqueUrls] = await Promise.all([
    getGlobalKPIs(),
    getRecentLogs(50),
    getUniqueUrls(),
  ]);

  const initialChartUrl = uniqueUrls.length > 0 ? uniqueUrls[0] : '';
  const initialChartData = initialChartUrl ? await getUrlHistory(initialChartUrl) : [];

  return (
    <DashboardClient
      initialKpis={kpis}
      initialLogs={recentLogs}
      initialUrls={uniqueUrls}
      initialChartUrl={initialChartUrl}
      initialChartData={initialChartData}
    />
  );
}
