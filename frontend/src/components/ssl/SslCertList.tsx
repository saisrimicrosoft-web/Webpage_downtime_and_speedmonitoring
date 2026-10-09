'use client';
import React from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { SslCertData } from '@/lib/api';
import { getSslStatus } from '@/lib/ssl';
import { format } from 'date-fns';

interface Props {
  certs: SslCertData[];
  onDetails: (cert: SslCertData) => void;
}

export default function SslCertList({ certs, onDetails }: Props) {
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);

  function copyHost(cert: SslCertData, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(cert.hostname).catch(() => {});
    setCopiedUrl(cert.url);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  if (!certs.length) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {certs.map(cert => {
          const cfg = getSslStatus(cert.ssl_days_left);
          const pct = Math.min(100, Math.max(0, cert.ssl_days_left <= 0 ? 100 : (cert.ssl_days_left / 365) * 100));
          const expiresFormatted = (() => {
            try { return format(new Date(cert.expires_on), 'MMM d, yyyy'); }
            catch { return cert.expires_on; }
          })();
          const faviconUrl = (() => {
            try { return `https://www.google.com/s2/favicons?domain=${new URL(cert.url).hostname}&sz=32`; }
            catch { return ''; }
          })();

          return (
            <div
              key={cert.url}
              onClick={() => onDetails(cert)}
              onKeyDown={e => e.key === 'Enter' && onDetails(cert)}
              tabIndex={0}
              role="button"
              aria-label={`SSL certificate for ${cert.hostname}`}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 cursor-pointer transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500 border-l-4 ${cfg.accent}`}
            >
              {/* Favicon */}
              <div className="w-6 h-6 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {faviconUrl && (
                  <img src={faviconUrl} alt="" loading="lazy" width={14} height={14} className="w-3.5 h-3.5 object-contain"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>

              {/* Hostname */}
              <div className="w-36 flex-shrink-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400">{cert.hostname}</p>
                <p className="text-[10px] text-zinc-400 truncate">{expiresFormatted}</p>
              </div>

              {/* Status badge */}
              <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                {cfg.label}
              </span>

              {/* Progress bar */}
              <div className="flex-1 hidden md:block">
                <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: cfg.barColor }}
                  />
                </div>
              </div>

              {/* Days */}
              <span className="text-xs font-mono font-bold w-16 text-right flex-shrink-0" style={{ color: cfg.barColor }}>
                {cert.ssl_days_left <= 0 ? 'Expired' : `${cert.ssl_days_left}d`}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button onClick={e => copyHost(cert, e)} aria-label="Copy hostname"
                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded cursor-pointer">
                  {copiedUrl === cert.url ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a href={cert.url} target="_blank" rel="noopener noreferrer" aria-label="Open site"
                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
