'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { X, ExternalLink, Copy, Check } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SslCertData, SslHistoryPoint, getSslHistory } from '@/lib/api';
import { getSslStatus } from '@/lib/ssl';
import SslGauge from './SslGauge';
import { format, formatDistanceToNow } from 'date-fns';

interface Props {
  cert: SslCertData | null;
  onClose: () => void;
}

function getRecommendedAction(daysLeft: number): string {
  if (daysLeft <= 0)  return 'Certificate expired — renew immediately to restore HTTPS.';
  if (daysLeft <= 7)  return `Renew within ${daysLeft} day${daysLeft > 1 ? 's' : ''} to prevent outage.`;
  if (daysLeft <= 14) return 'Schedule renewal this week.';
  if (daysLeft <= 30) return 'Plan renewal within the next month.';
  return 'Certificate is healthy. No action required.';
}

export default function SslDetailDrawer({ cert, onClose }: Props) {
  const [history, setHistory]         = useState<SslHistoryPoint[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [copied, setCopied]           = useState(false);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  useEffect(() => {
    if (!cert) { setHistory([]); return; }
    setHistLoading(true);
    getSslHistory(cert.url, 30)
      .then(setHistory)
      .finally(() => setHistLoading(false));
  }, [cert]);

  if (!cert) return null;

  const cfg = getSslStatus(cert.ssl_days_left);
  const expiresFormatted = (() => {
    try { return format(new Date(cert.expires_on), 'MMMM d, yyyy'); }
    catch { return cert.expires_on; }
  })();
  const lastChecked = (() => {
    try { return formatDistanceToNow(new Date(cert.checked_at), { addSuffix: true }); }
    catch { return cert.checked_at; }
  })();

  const chartData = history.map(h => ({
    date: (() => { try { return format(new Date(h.checked_at), 'MMM d'); } catch { return ''; } })(),
    days: h.ssl_days_left,
  }));

  function copyHost() {
    navigator.clipboard.writeText(cert!.hostname).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const keyFacts: Array<{ label: string; value: string }> = [
    { label: 'Expires on',   value: expiresFormatted },
    { label: 'Last checked', value: lastChecked },
    { label: 'Days left',    value: cert.ssl_days_left <= 0 ? 'Expired' : `${cert.ssl_days_left} days` },
    { label: 'Domain',       value: cert.hostname },
    ...(cert.issuer      ? [{ label: 'Issuer',      value: cert.issuer }]              : []),
    ...(cert.tls_version ? [{ label: 'TLS Version', value: cert.tls_version }]         : []),
    ...(cert.cipher      ? [{ label: 'Cipher',      value: cert.cipher }]              : []),
    ...(cert.key_size    ? [{ label: 'Key size',    value: `${cert.key_size} bits` }]  : []),
    ...(cert.region      ? [{ label: 'Region',      value: cert.region }]              : []),
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal aria-label={`SSL details for ${cert.hostname}`}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm" onClick={close} />

      {/* Drawer */}
      <aside
        className="absolute inset-y-0 right-0 w-full max-w-[480px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
        style={{ animation: 'slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 border-l-4 ${cfg.accent}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <SslGauge daysLeft={cert.ssl_days_left} size={56} />
              <div>
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">{cert.hostname}</h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border mt-1 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                  {cfg.label}
                </span>
              </div>
            </div>
            <button onClick={close} aria-label="Close drawer"
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Recommended action */}
          <div className={`p-3.5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
            <p className={`text-xs font-bold ${cfg.color}`}>{getRecommendedAction(cert.ssl_days_left)}</p>
          </div>

          {/* Key facts */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {keyFacts.map(f => (
              <div key={f.label} className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-0.5">{f.label}</p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{f.value}</p>
              </div>
            ))}
          </div>

          {/* Optional: chain_valid, auto_renew, tls_grade */}
          {(cert.chain_valid != null || cert.auto_renew != null || cert.tls_grade) && (
            <div className="flex flex-wrap gap-2">
              {cert.chain_valid != null && (
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${cert.chain_valid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                  Chain: {cert.chain_valid ? 'Valid' : 'Invalid'}
                </span>
              )}
              {cert.auto_renew != null && (
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${cert.auto_renew ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                  Auto-renew: {cert.auto_renew ? 'On' : 'Off'}
                </span>
              )}
              {cert.tls_grade && (
                <span className="px-3 py-1 rounded-full text-[11px] font-black border bg-purple-50 text-purple-700 border-purple-200">
                  Grade {cert.tls_grade}
                </span>
              )}
            </div>
          )}

          {/* SANs */}
          {cert.san && cert.san.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Subject Alternative Names ({cert.san.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cert.san.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md text-[10px] font-mono border border-zinc-200 dark:border-zinc-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 30-day trend */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
              30-Day SSL Days Remaining Trend
            </p>
            {histLoading ? (
              <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
            ) : chartData.length > 1 ? (
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="sslGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={cfg.barColor} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={cfg.barColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip
                      contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [`${v} days`, 'Days left']}
                    />
                    <Area type="monotone" dataKey="days" stroke={cfg.barColor} strokeWidth={2} fill="url(#sslGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 text-center py-6">No historical data yet</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={copyHost}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Host'}
            </button>
            <a href={cert.url} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
              <ExternalLink className="w-3.5 h-3.5" />
              Open Site
            </a>
          </div>
        </div>
      </aside>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          aside { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
