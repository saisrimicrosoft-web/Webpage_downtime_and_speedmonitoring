'use client';

import React from 'react';
import { Activity } from 'lucide-react';

interface Props { monitorId: number }

/**
 * SiteDetailView previously fetched from the Flask monitors API.
 * That API has been removed; monitoring data now comes from Supabase CHECKS table.
 * This component is a stub — implement with getUrlHistory() from @/lib/api when needed.
 */
export default function SiteDetailView({ monitorId }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-12 text-center">
      <div className="p-4 bg-purple-50 dark:bg-purple-950/30 text-purple-500 rounded-2xl mb-4">
        <Activity className="w-8 h-8" />
      </div>
      <h2 className="text-base font-bold text-zinc-800 dark:text-white mb-1">Site Detail View</h2>
      <p className="text-sm text-zinc-500 max-w-xs">
        Detailed per-site analytics coming soon. Monitor ID: {monitorId}
      </p>
    </div>
  );
}
