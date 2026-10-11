'use client';

/**
 * HeartbeatRow — ECG heartbeat line per monitored website.
 *
 * TUNABLE CONSTANTS:
 *   SLOW_MS          — latency above this = "slow/degraded" (default 1500ms)
 *   HEARTBEAT_CHECKS — number of recent checks shown in the ECG line (default 30)
 *   HEATMAP_DAYS     — days shown in the 91-day detail grid
 */

import React, { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, MapPin } from 'lucide-react';
import type { UptimeService } from './UptimeStatusContent';
import { getUrlHistory91Days } from '@/lib/api';
import type { CheckRow } from '@/lib/api';

// ─── Tunable constants ────────────────────────────────────────────────────────
const SLOW_MS          = 1500;  // ms — above this is "degraded"
const HEARTBEAT_CHECKS = 30;    // fewer checks = wider spikes = more visible ECG
const HEATMAP_DAYS     = 91;    // days shown in the detail heatmap

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000)  return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (m < 60) return `${m}m ${s}s`;
  const h  = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

function getProtocol(url: string): string {
  try { return new URL(url).protocol.replace(':', '').toUpperCase(); }
  catch { return 'HTTPS'; }
}

// ─── ECG heartbeat SVG ────────────────────────────────────────────────────────
// Uses a fixed 600-unit logical viewBox so every spike is always visibly wide,
// regardless of how many checks there are or how narrow the container is.

interface HeartbeatSVGProps {
  heartbeat: UptimeService['heartbeat'];
  isPaused?: boolean;
  height?: number;
}

function HeartbeatSVG({ heartbeat, isPaused = false, height = 48 }: HeartbeatSVGProps) {
  const VW   = 600;                    // fixed logical width — always 600 units
  const midY = height / 2;
  const checks = heartbeat.slice(-HEARTBEAT_CHECKS);

  // Paused or no data → dashed grey baseline
  if (isPaused || checks.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${VW} ${height}`}
        width="100%" height={height}
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
        aria-hidden="true"
      >
        <line
          x1="8" y1={midY} x2={VW - 8} y2={midY}
          stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="8 5"
        />
      </svg>
    );
  }

  const n    = checks.length;
  const segW = (VW - 16) / n;           // logical units per check segment
  // Spike occupies 35% of segment width, min 10 units so always visible
  const spikeW = Math.max(10, segW * 0.35);

  const hasDown     = checks.some(c => c.status === 'down');
  const hasDegraded = checks.some(c => c.status === 'degraded');
  const lineColor   = hasDown ? '#f87171' : hasDegraded ? '#fbbf24' : '#34d399';

  const pathParts: string[] = [];

  checks.forEach((c, i) => {
    const segStart    = 8 + i * segW;
    const spikeCenter = segStart + segW * 0.5;
    const spikeLeft   = spikeCenter - spikeW / 2;
    const spikeRight  = spikeCenter + spikeW / 2;
    const segEnd      = segStart + segW;

    if (i === 0) pathParts.push(`M ${segStart.toFixed(1)} ${midY.toFixed(1)}`);

    if (c.status === 'down') {
      // Down: flat segment at baseline
      pathParts.push(`L ${segEnd.toFixed(1)} ${midY.toFixed(1)}`);
    } else {
      // Up: sharp spike — amplitude from latency, min 8 units always visible
      const lat       = Math.max(c.latency ?? 0, 0);
      const amplitude = Math.max(8, (Math.min(lat, 3000) / 3000) * (height * 0.44));
      const spikeTop  = midY - amplitude;

      pathParts.push(`L ${spikeLeft.toFixed(1)} ${midY.toFixed(1)}`);  // baseline to spike left
      pathParts.push(`L ${spikeCenter.toFixed(1)} ${spikeTop.toFixed(1)}`);  // sharp rise
      pathParts.push(`L ${spikeRight.toFixed(1)} ${midY.toFixed(1)}`);  // sharp fall
      pathParts.push(`L ${segEnd.toFixed(1)} ${midY.toFixed(1)}`);      // baseline to segment end
    }
  });

  const isCurrentlyDown = checks[checks.length - 1]?.status === 'down';
  const lastX = (8 + n * segW).toFixed(1);

  return (
    <svg
      viewBox={`0 0 ${VW} ${height}`}
      width="100%" height={height}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <path
        d={pathParts.join(' ')}
        fill="none"
        stroke={lineColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${lineColor}cc)` }}
      />
      {/* Glowing dot at the right end when currently down */}
      {isCurrentlyDown && (
        <circle
          cx={lastX} cy={midY.toFixed(1)} r="6"
          fill="#f87171"
          style={{ filter: 'drop-shadow(0 0 8px #f8717199)' }}
        />
      )}
    </svg>
  );
}

// ─── 91-day heatmap grid ──────────────────────────────────────────────────────

interface DayStatus { status: 'perfect' | 'slow' | 'down' | 'nodata'; date: string }

function buildHeatmap(history91: CheckRow[]): DayStatus[] {
  const byDay = new Map<string, CheckRow[]>();
  for (const c of history91) {
    const d   = new Date(c.checked_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(c);
  }

  let anchorMs = 0;
  for (const c of history91) {
    const t = new Date(c.checked_at).getTime();
    if (t > anchorMs) anchorMs = t;
  }

  const days: DayStatus[] = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d   = new Date(anchorMs - i * 86400000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const chks = byDay.get(key);
    if (!chks || chks.length === 0) { days.push({ status: 'nodata', date: key }); continue; }
    if (chks.some(c => !c.is_up))  { days.push({ status: 'down',   date: key }); continue; }
    const avg = chks.reduce((s, c) => s + (c.response_ms ?? 0), 0) / chks.length;
    days.push({ status: avg > SLOW_MS ? 'slow' : 'perfect', date: key });
  }
  return days;
}

const dayColor: Record<DayStatus['status'], string> = {
  perfect: 'bg-emerald-500',
  slow:    'bg-amber-500',
  down:    'bg-rose-500',
  nodata:  'bg-zinc-700/40',
};

// ─── Flatline incident log ────────────────────────────────────────────────────

interface FlatlineIncident {
  id: string;
  isOngoing: boolean;
  reason: string;
  startedLabel: string;
  durationLabel: string;
}

function buildFlatlineLog(history91: CheckRow[]): FlatlineIncident[] {
  if (history91.length === 0) return [];
  const incidents: FlatlineIncident[] = [];
  let run: CheckRow[] = [];
  const sorted = [...history91].reverse(); // oldest first

  for (const c of sorted) {
    if (!c.is_up) {
      run.push(c);
    } else if (run.length > 0) {
      const first = run[0];
      const last  = run[run.length - 1];
      const dMs   = new Date(last.checked_at).getTime() - new Date(first.checked_at).getTime();
      const reason = !first.status_code || first.status_code <= 0 ? 'Timeout' : `Status ${first.status_code}`;
      const sd = new Date(first.checked_at);
      incidents.push({
        id: `${first.checked_at}-${last.checked_at}`,
        isOngoing: false,
        reason,
        startedLabel: `Started ${String(sd.getUTCHours()).padStart(2,'0')}:${String(sd.getUTCMinutes()).padStart(2,'0')}`,
        durationLabel: formatDuration(dMs + 60000),
      });
      run = [];
    }
  }
  if (run.length > 0) {
    const first = run[0];
    const last  = run[run.length - 1];
    const dMs   = new Date(last.checked_at).getTime() - new Date(first.checked_at).getTime();
    const reason = !first.status_code || first.status_code <= 0 ? 'Timeout' : `Status ${first.status_code}`;
    const sd = new Date(first.checked_at);
    incidents.push({
      id: `${first.checked_at}-ongoing`,
      isOngoing: true,
      reason,
      startedLabel: `Started ${String(sd.getUTCHours()).padStart(2,'0')}:${String(sd.getUTCMinutes()).padStart(2,'0')}`,
      durationLabel: formatDuration(dMs + 60000),
    });
  }
  return incidents.reverse().slice(0, 5);
}

// ─── Detail panel ────────────────────────────────────────────────────────────

function DetailPanel({ service }: { service: UptimeService }) {
  const [history91, setHistory91] = useState<CheckRow[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    getUrlHistory91Days(service.url)
      .then(setHistory91)
      .catch(() => setHistory91([]))
      .finally(() => setLoading(false));
  }, [service.url]);

  const heatmap   = useMemo(() => buildHeatmap(history91),   [history91]);
  const incidents = useMemo(() => buildFlatlineLog(history91), [history91]);

  let hostname = service.url;
  try { hostname = new URL(service.url).hostname; } catch {}

  if (loading) {
    return (
      <div className="p-5 border-t border-zinc-800 animate-pulse">
        <div className="h-4 w-48 bg-zinc-700 rounded mb-4" />
        <div className="flex gap-4">
          <div className="w-[220px] h-[120px] bg-zinc-700/40 rounded" />
          <div className="flex-1 h-[120px] bg-zinc-700/30 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 border-t border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-zinc-100">
          {hostname} · <span className="text-zinc-400 font-normal">last 91 days</span>
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Perfect</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Slow</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Down</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5">
        {/* 13×7 heatmap */}
        <div className="flex-shrink-0">
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: 'repeat(13, 16px)', gridTemplateRows: 'repeat(7, 16px)' }}
          >
            {heatmap.map((day, i) => (
              <div key={i} title={`${day.date}: ${day.status}`}
                className={`w-4 h-4 rounded-[3px] ${dayColor[day.status]}`} />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-zinc-500">
            <span>13 weeks ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Flatline log */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-zinc-400 mb-2">Flatline log</p>
          {incidents.length === 0 ? (
            <p className="text-[12px] text-zinc-500 py-3">No incidents in this period.</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[150px] pr-1">
              {incidents.map(inc => (
                <div key={inc.id} className="flex items-start justify-between gap-3 py-2 border-b border-zinc-800 last:border-0">
                  <div className="flex items-start gap-2.5">
                    {inc.isOngoing ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Ongoing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                        ✓ Resolved
                      </span>
                    )}
                    <div>
                      <p className="text-[12px] font-semibold text-zinc-200">{inc.reason}</p>
                      <p className="text-[11px] text-zinc-500">{inc.startedLabel}</p>
                    </div>
                  </div>
                  <span className="text-[12px] text-zinc-400 font-mono whitespace-nowrap flex-shrink-0">
                    {inc.durationLabel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── HeartbeatRow (exported) ──────────────────────────────────────────────────

interface HeartbeatRowProps {
  service:    UptimeService;
  isSelected: boolean;
  onSelect:   () => void;
  timeframe:  '24h' | '7d' | '30d' | '90d';
  hoveredBar: { serviceId: string; date: string; uptime: number; latency: number } | null;
  onHoverBar: (v: { serviceId: string; date: string; uptime: number; latency: number } | null) => void;
}

export default function HeartbeatRow({
  service,
  isSelected,
  onSelect,
  timeframe,
  hoveredBar,
  onHoverBar,
}: HeartbeatRowProps) {
  const protocol = getProtocol(service.url);

  const currentUptime =
    timeframe === '24h' ? service.uptime24h :
    timeframe === '7d'  ? service.uptime7d  :
    timeframe === '30d' ? service.uptime30d :
    service.uptime90d;

  const uptimeColor =
    currentUptime >= 99.9 ? 'text-emerald-400' :
    currentUptime >= 96   ? 'text-amber-400'   :
    'text-rose-400';

  const StatusIcon =
    service.status === 'Operational' ? CheckCircle2 :
    service.status === 'Degraded'    ? AlertTriangle :
    XCircle;

  const iconColor =
    service.status === 'Operational' ? 'text-emerald-400' :
    service.status === 'Degraded'    ? 'text-amber-400'   :
    'text-rose-400';

  const isPaused = service.status === 'Maintenance';

  let hostname = service.url;
  try { hostname = new URL(service.url).hostname; } catch {}

  const regionLabel = service.region && service.region !== 'Unknown' ? service.region : null;

  return (
    <div>
      <button
        onClick={onSelect}
        aria-label={`${hostname}, ${service.status}, ${currentUptime.toFixed(2)} percent uptime`}
        aria-pressed={isSelected}
        className={`w-full text-left px-4 py-3.5 transition-all cursor-pointer group ${
          isSelected
            ? 'bg-purple-950/30 border-l-[3px] border-l-purple-500'
            : 'hover:bg-zinc-800/40 border-l-[3px] border-l-transparent'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3">

          {/* LEFT — status icon + site name + protocol */}
          <div className="flex items-center gap-2.5 min-w-0 md:w-[200px] flex-shrink-0">
            <StatusIcon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-zinc-100 truncate group-hover:text-purple-300 transition-colors">
                {hostname}
              </p>
              <p className="text-[11px] text-zinc-500">
                {protocol}
                {regionLabel && (
                  <span> · <MapPin className="inline w-2.5 h-2.5 text-rose-500 -mt-0.5" /> {regionLabel}</span>
                )}
                {isPaused && <span className="ml-1">· paused</span>}
              </p>
            </div>
          </div>

          {/* MIDDLE — ECG line (hidden on very small screens) */}
          <div
            className="flex-1 hidden sm:block relative min-w-0"
            onMouseLeave={() => onHoverBar(null)}
          >
            {isPaused ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-dashed border-zinc-600" />
                <span className="text-[11px] text-zinc-500 font-semibold shrink-0">Paused</span>
              </div>
            ) : (
              <>
                <HeartbeatSVG heartbeat={service.heartbeat} height={48} />
                {hoveredBar && hoveredBar.serviceId === service.id && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-[10px] font-medium text-zinc-200 pointer-events-none z-10">
                    {hoveredBar.date} · {hoveredBar.latency}ms
                  </div>
                )}
              </>
            )}
            {!isPaused && (
              <p className="text-[10px] text-zinc-500 mt-0.5 text-center">
                {hoveredBar && hoveredBar.serviceId === service.id
                  ? <span className="text-purple-400">{hoveredBar.date}: {hoveredBar.latency}ms</span>
                  : `Overall Availability: ${currentUptime.toFixed(2)}%`
                }
              </p>
            )}
          </div>

          {/* RIGHT — response + uptime */}
          <div className="flex items-center gap-5 flex-shrink-0 md:w-[160px] justify-end">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-zinc-500">Response</p>
              <p className={`text-xs font-mono font-bold ${service.status === 'Outage' ? 'text-rose-400' : 'text-zinc-200'}`}>
                {service.status === 'Outage' ? 'Timeout' : `${service.currentLatency}ms`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-zinc-500">90D Uptime</p>
              <p className={`text-sm font-mono font-black ${uptimeColor}`}>
                {currentUptime.toFixed(2)}%
              </p>
            </div>
          </div>

        </div>
      </button>

      {isSelected && <DetailPanel service={service} />}
    </div>
  );
}
