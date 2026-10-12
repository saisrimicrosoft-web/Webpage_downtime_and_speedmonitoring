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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_16px_rgba(255,255,255,0.4)]">
            SSL / TLS Certificate Sentinel
          </h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-400/50 shadow-[0_0_14px_rgba(52,211,153,0.35)]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>TLS Auditing Active</span>
          </span>
        </div>
        {lastScanned && (
          <p className="text-xs sm:text-sm text-white font-medium mt-1.5 flex items-center gap-1.5 drop-shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Last scanned {formatDistanceToNow(lastScanned, { addSuffix: true })}</span>
          </p>
        )}
      </div>
      <button
        onClick={onScan}
        disabled={isScanning}
        className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 disabled:opacity-60 text-white rounded-xl text-xs font-black shadow-[0_0_24px_rgba(147,51,234,0.65)] hover:shadow-[0_0_30px_rgba(168,85,247,0.85)] border border-purple-300/60 hover:border-white transition-all cursor-pointer active:scale-95"
      >
        <RefreshCw className={`w-4 h-4 text-white stroke-[2.5] ${isScanning ? 'animate-spin' : ''}`} />
        <span className="tracking-wide">{isScanning ? 'Scanning…' : 'Scan All Certificates'}</span>
      </button>
    </div>
  );
}
