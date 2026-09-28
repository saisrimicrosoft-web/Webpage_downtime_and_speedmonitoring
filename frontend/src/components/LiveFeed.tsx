'use client';

import React, { useState, useEffect } from 'react';
import { RegionStatus } from '@/data/mockIncidents';

interface LogEntry {
  id: string;
  time: string;
  region: RegionStatus;
  result: string;
}

interface Props {
  regions: RegionStatus[];
  isResolved: boolean;
}

export default function LiveFeed({ regions, isResolved }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (isResolved) return;
    
    let counter = 0;
    const generateLog = () => {
      const region = regions[Math.floor(Math.random() * regions.length)];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      let result = '';
      if (region.status === 'OK') {
        result = `${region.httpCode} OK · ${region.responseTime}ms`;
      } else {
        result = `${region.httpCode} Service Unavailable`;
      }

      const newLog: LogEntry = {
        id: `log-${Date.now()}-${counter++}`,
        time: timeStr,
        region,
        result
      };

      setLogs(prev => [newLog, ...prev].slice(0, 7));
    };

    // Initial population
    for(let i=0; i<7; i++) generateLog();

    const interval = setInterval(generateLog, 2000);
    return () => clearInterval(interval);
  }, [regions, isResolved]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          Live Feed
          {!isResolved && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </h3>
        {!isResolved && <span className="text-xs text-zinc-500 uppercase tracking-wider">Streaming</span>}
      </div>

      <div className="flex-1 font-mono text-xs overflow-hidden flex flex-col gap-2 relative">
        {logs.map((log, i) => (
          <div 
            key={log.id} 
            className={`flex items-center gap-3 p-2 rounded bg-zinc-800/50 border border-zinc-800/50 transition-all ${i === 0 ? 'animate-in fade-in slide-in-from-top-2' : ''}`}
          >
            <span className="text-zinc-500 shrink-0">{log.time}</span>
            <span className={`shrink-0 w-24 truncate ${log.region.status === 'FAILING' ? 'text-rose-400' : 'text-emerald-400'}`}>
              [{log.region.name}]
            </span>
            <span className={`truncate ${log.region.status === 'FAILING' ? 'text-rose-300' : 'text-zinc-300'}`}>
              {log.result}
            </span>
          </div>
        ))}
        {logs.length === 0 && isResolved && (
          <div className="text-zinc-500 italic p-4 text-center">Feed paused. All systems operational.</div>
        )}
      </div>
    </div>
  );
}
