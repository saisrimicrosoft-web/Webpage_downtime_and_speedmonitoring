'use client';
import React, { useState } from 'react';
import { ExternalLink, Copy, Check, RefreshCw } from 'lucide-react';
import { SslCertData } from '@/lib/api';
import { getSslStatus } from '@/lib/ssl';
import SslGauge from './SslGauge';
import { format } from 'date-fns';

interface Props {
  cert: SslCertData;
  onDetails: (cert: SslCertData) => void;
  onRescan?: (cert: SslCertData) => void;
}

export default function SslCertCard({ cert, onDetails, onRescan }: Props) {
  const [copied, setCopied] = useState(false);
  const cfg = getSslStatus(cert.ssl_days_left);

  const faviconUrl = (() => {
    try { return `https://www.google.com/s2/favicons?domain=${new URL(cert.url).hostname}&sz=64`; }
    catch { return ''; }
  })();

  function copyHost() {
    navigator.clipboard.writeText(cert.hostname).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const expiresFormatted = (() => {
    try { return format(new Date(cert.expires_on), 'MMM d, yyyy'); }
    catch { return cert.expires_on; }
  })();

  return (
    <div
      className={`group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs hover:shadow-lg transition-all duration-200 overflow-hidden border-l-4 ${cfg.accent} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500`}
      onClick={() => onDetails(cert)}
      onKeyDown={e => e.key === 'Enter' && onDetails(cert)}
      tabIndex={0}
      role="button"
      aria-label={`SSL certificate for ${cert.hostname}: ${cfg.label}, ${cert.ssl_days_left} days remaining`}
    >
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {faviconUrl && (
                <img src={faviconUrl} alt="" loading="lazy" width={18} height={18}
                  className="w-4.5 h-4.5 object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {cert.hostname}
              </p>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                {cfg.label}
              </span>
            </div>
          </div>
          {/* Gauge */}
          <SslGauge daysLeft={cert.ssl_days_left} size={64} />
        </div>

        {/* Expiry */}
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
          Expires <span className="font-semibold text-zinc-700 dark:text-zinc-300">{expiresFormatted}</span>
        </p>

        {/* Optional chips */}
        <div className="flex flex-wrap gap-1.5">
          {cert.issuer && (
            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md text-[10px] font-medium border border-zinc-200 dark:border-zinc-700 truncate max-w-[140px]">
              {cert.issuer.split(' ').slice(0, 3).join(' ')}
            </span>
          )}
          {cert.tls_version && (
            <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 rounded-md text-[10px] font-bold border border-purple-200 dark:border-purple-800">
              {cert.tls_version}
            </span>
          )}
          {cert.tls_grade && (
            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-md text-[10px] font-black border border-indigo-200 dark:border-indigo-800">
              {cert.tls_grade}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 px-4 py-2.5 bg-zinc-50/60 dark:bg-zinc-800/30"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={() => onDetails(cert)}
          className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 cursor-pointer">
          Details →
        </button>
        <div className="flex items-center gap-1.5">
          <button onClick={copyHost} aria-label="Copy hostname"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onRescan && (
            <button onClick={() => onRescan(cert)} aria-label="Rescan certificate"
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <a href={cert.url} target="_blank" rel="noopener noreferrer" aria-label="Open site"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
