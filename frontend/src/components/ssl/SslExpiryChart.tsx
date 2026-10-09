'use client';
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { getSslBuckets } from '@/lib/ssl';
import { SslCertData } from '@/lib/api';

interface Props { certs: SslCertData[] }

interface BucketEntry {
  name: string;
  count: number;
  domains: string[];
  color: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BucketEntry }>;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 shadow-lg text-xs max-w-[200px]">
      <p className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">{d.name} — {d.count} cert{d.count !== 1 ? 's' : ''}</p>
      {d.domains.slice(0, 5).map((dom: string) => (
        <p key={dom} className="text-zinc-500 truncate">· {dom}</p>
      ))}
      {d.domains.length > 5 && <p className="text-zinc-400">+{d.domains.length - 5} more</p>}
    </div>
  );
};

export default function SslExpiryChart({ certs }: Props) {
  const buckets = getSslBuckets(certs.map(c => ({ hostname: c.hostname, ssl_days_left: c.ssl_days_left })));
  const data: BucketEntry[] = buckets.map(b => ({ name: b.label, count: b.count, domains: b.domains, color: b.barColor }));

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
      <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4">Certificate Expiry Runway</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
          <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={68} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {buckets.map(b => (
          <div key={b.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${b.color}`} aria-hidden />
            <span className="text-[10px] font-semibold text-zinc-500">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
