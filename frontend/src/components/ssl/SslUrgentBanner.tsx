'use client';
import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { SslCertData } from '@/lib/api';
import { getSslStatus } from '@/lib/ssl';

interface Props {
  certs: SslCertData[];
  onChipClick: (cert: SslCertData) => void;
}

export default function SslUrgentBanner({ certs, onChipClick }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const urgent = certs.filter(c => c.ssl_days_left <= 14).slice(0, 3);

  if (!urgent.length || dismissed) return null;

  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border bg-gradient-to-r from-rose-50 to-amber-50/40 dark:from-rose-950/30 dark:to-zinc-900 border-rose-200 dark:border-rose-900 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-rose-500 text-white rounded-xl flex-shrink-0">
          <ShieldAlert className="w-5 h-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-extrabold text-zinc-900 dark:text-white mb-1.5">
            {urgent.length} certificate{urgent.length > 1 ? 's' : ''} need immediate attention
          </p>
          <div className="flex flex-wrap gap-2">
            {urgent.map(c => {
              const cfg = getSslStatus(c.ssl_days_left);
              return (
                <button
                  key={c.url}
                  onClick={() => onChipClick(c)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer transition-all hover:scale-105 ${cfg.bg} ${cfg.color} ${cfg.border}`}
                >
                  {c.hostname}
                  <span className="opacity-70">· {c.ssl_days_left <= 0 ? 'Expired' : `${c.ssl_days_left}d`}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss banner"
        className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
