import React from 'react';
import UptimeStatus from '@/components/UptimeStatus';

export default function UptimeDemoPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 antialiased">
      <UptimeStatus />
    </div>
  );
}
