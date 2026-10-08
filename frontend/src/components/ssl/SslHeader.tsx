'use client';
import React from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  lastScanned: Date | null;
  isScanning: boolean;
  onScan: () => void;
}

export default function SslHeader({ lastScanned, isScanning, onScan }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            SSL / TLS Certificate Sentinel
          </h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3 h-3" />
            TLS Auditing Active
          </span>
        </div>
        {lastScanned && (
          <p className="text-xs text-zinc-400 mt-1">
            Last scanned {formatDistanceToNow(lastScanned, { addSuffix: true })}
          </p>
        )}
      </div>
      <button
        onClick={onScan}
        disabled={isScanning}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
        {isScanning ? 'Scanning…' : 'Scan All Certificates'}
      </button>
    </div>
  );
}
