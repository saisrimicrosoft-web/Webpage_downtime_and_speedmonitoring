'use client';
import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldX, Clock } from 'lucide-react';
import { SslCertData } from '@/lib/api';

type Filter = 'all' | 'valid' | 'expiring' | 'expired';

interface Props {
  certs: SslCertData[];
  activeFilter: Filter;
  onFilterChange: (f: Filter) => void;
}

export default function SslKpiCards({ certs, activeFilter, onFilterChange }: Props) {
  const valid    = certs.filter(c => c.ssl_days_left > 30).length;
  const expiring = certs.filter(c => c.ssl_days_left > 0 && c.ssl_days_left <= 14).length;
  const expired  = certs.filter(c => c.ssl_days_left <= 0).length;
  const avgDays  = certs.length
    ? Math.round(certs.reduce((s, c) => s + Math.max(0, c.ssl_days_left), 0) / certs.length)
    : 0;

  const cards = [
    {
      id: 'valid' as Filter,
      label: 'Active & Valid',
      value: valid,
      sub: `${certs.length ? Math.round(valid / certs.length * 100) : 0}% of portfolio`,
      icon: <ShieldCheck className="w-5 h-5" />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600',
      ring: 'ring-emerald-300 dark:ring-emerald-800',
    },
    {
      id: 'expiring' as Filter,
      label: 'Expiring Soon (≤14d)',
      value: expiring,
      sub: expiring > 0 ? 'Renew immediately' : 'All clear',
      icon: <AlertTriangle className="w-5 h-5" />,
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600',
      ring: 'ring-amber-300 dark:ring-amber-800',
    },
    {
      id: 'expired' as Filter,
      label: 'Expired',
      value: expired,
      sub: expired > 0 ? 'Security risk' : 'None expired',
      icon: <ShieldX className="w-5 h-5" />,
      iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600',
      ring: 'ring-rose-300 dark:ring-rose-800',
    },
    {
      id: 'all' as Filter,
      label: 'Avg Days Remaining',
      value: avgDays,
      sub: 'across all certificates',
      icon: <Clock className="w-5 h-5" />,
      iconBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600',
      ring: 'ring-purple-300 dark:ring-purple-800',
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const isActive = activeFilter === card.id;
        return (
          <button
            key={card.id}
            onClick={() => onFilterChange(activeFilter === card.id ? 'all' : card.id)}
            className={`text-left bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-xs transition-all cursor-pointer hover:shadow-md ${
              isActive ? `ring-2 ${card.ring} border-transparent` : 'border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{card.label}</span>
              <span className={`p-1.5 rounded-lg ${card.iconBg}`} aria-hidden>{card.icon}</span>
            </div>
            <p className="text-2xl font-black text-zinc-900 dark:text-white">{card.value}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">{card.sub}</p>
          </button>
        );
      })}
    </div>
  );
}
