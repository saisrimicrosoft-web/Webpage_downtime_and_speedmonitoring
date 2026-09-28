'use client';

import React from 'react';
import { MOCK_SITES_TIMELINE } from '@/data/mockIncidents';

interface Props {
  onTimelineClick: (site: string) => void;
}

export default function DowntimeTimeline({ onTimelineClick }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold">24-Hour Timeline</h3>
        <div className="flex gap-4 text-xs font-medium text-zinc-500">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Critical</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Major</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Minor</div>
        </div>
      </div>

      <div className="space-y-4">
        {MOCK_SITES_TIMELINE.map((siteData) => (
          <div key={siteData.site} className="flex items-center gap-4">
            <div className="w-32 text-sm text-zinc-300 truncate shrink-0">{siteData.site}</div>
            <div className="flex-1 h-6 bg-zinc-800 rounded-md relative group cursor-pointer overflow-hidden" onClick={() => onTimelineClick(siteData.site)}>
              <div className="absolute inset-0 bg-emerald-500/10"></div>
              {siteData.incidents.map((inc, i) => {
                // Calculate position and width based on 24h
                const now = Date.now();
                const twentyFourHours = 24 * 60 * 60 * 1000;
                
                const startRatio = Math.max(0, 1 - (now - inc.start.getTime()) / twentyFourHours);
                const endRatio = Math.max(0, 1 - (now - inc.end.getTime()) / twentyFourHours);
                
                const left = `${startRatio * 100}%`;
                const width = `${(endRatio - startRatio) * 100}%`;
                
                let colorClass = 'bg-rose-500';
                if (inc.severity === 'Major') colorClass = 'bg-amber-500';
                if (inc.severity === 'Minor') colorClass = 'bg-blue-500';
                
                // If it's ongoing (end is basically now)
                const isOngoing = (now - inc.end.getTime()) < 10000;
                
                return (
                  <div 
                    key={i} 
                    className={`absolute top-0 bottom-0 ${colorClass} ${isOngoing ? 'animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]' : ''}`}
                    style={{ left, width: isOngoing ? `calc(100% - ${left})` : width }}
                  ></div>
                );
              })}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 transition-opacity"></div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-xs text-zinc-600 mt-3 pl-36 font-mono">
        <span>24h ago</span>
        <span>12h</span>
        <span>now</span>
      </div>
    </div>
  );
}
