'use client';

import React from 'react';
import { RegionStatus } from '@/data/mockIncidents';

interface Props {
  regions: RegionStatus[];
}

export default function RegionRadar({ regions }: Props) {
  // SVG coordinates for a hexagon/circle arrangement around center
  const getCoordinates = (index: number, total: number, radius: number) => {
    const angle = (index * (360 / total) - 90) * (Math.PI / 180);
    return {
      x: 150 + radius * Math.cos(angle),
      y: 150 + radius * Math.sin(angle)
    };
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-full flex flex-col relative overflow-hidden group">
      <h3 className="text-white font-semibold mb-4 z-10 relative">Region Radar</h3>
      
      <div className="flex-1 flex items-center justify-center relative min-h-[250px]">
        <svg viewBox="0 0 300 300" className="w-full max-w-[280px] h-auto overflow-visible" aria-label="Region Radar">
          {/* Radar rings */}
          <circle cx="150" cy="150" r="100" fill="none" stroke="currentColor" className="text-zinc-800" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="150" cy="150" r="65" fill="none" stroke="currentColor" className="text-zinc-800" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="150" cy="150" r="30" fill="none" stroke="currentColor" className="text-zinc-800" strokeWidth="1" strokeDasharray="4 4" />

          {/* Sweep animation */}
          <g className="origin-center" style={{ animation: 'spin 5s linear infinite' }}>
            <path d="M150,150 L150,50 A100,100 0 0,1 250,150 Z" fill="url(#sweep-grad)" />
          </g>

          {/* Connection lines */}
          {regions.map((region, i) => {
            const pos = getCoordinates(i, regions.length, 100);
            return (
              <line 
                key={`line-${i}`} 
                x1="150" y1="150" x2={pos.x} y2={pos.y} 
                stroke={region.status === 'FAILING' ? '#f43f5e' : '#a1a1aa'} 
                strokeWidth="1" 
                strokeDasharray="2 2" 
                opacity="0.5" 
              />
            );
          })}

          {/* Center node */}
          <circle cx="150" cy="150" r="8" fill="#a855f7" className="drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />

          {/* Region nodes */}
          {regions.map((region, i) => {
            const pos = getCoordinates(i, regions.length, 100);
            const isFailing = region.status === 'FAILING';
            return (
              <g key={`node-${i}`} className="group/node cursor-pointer">
                {isFailing && (
                  <>
                    <circle cx={pos.x} cy={pos.y} r="12" fill="#f43f5e" opacity="0.3" className="animate-ping origin-center" />
                    <circle cx={pos.x} cy={pos.y} r="8" fill="#f43f5e" opacity="0.4" className="animate-pulse" />
                  </>
                )}
                <circle cx={pos.x} cy={pos.y} r="6" fill={isFailing ? '#f43f5e' : '#10b981'} className={isFailing ? 'drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : ''} />
                
                {/* Tooltip text (SVG) */}
                <text x={pos.x} y={pos.y - 15} textAnchor="middle" fill="white" fontSize="10" className="font-mono opacity-0 group-hover/node:opacity-100 transition-opacity">
                  {region.responseTime}ms
                </text>
                <text x={pos.x} y={pos.y + 20} textAnchor="middle" fill="#a1a1aa" fontSize="10" className="font-semibold">
                  {region.name}
                </text>
              </g>
            );
          })}

          <defs>
            <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
            <style>
              {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
            </style>
          </defs>
        </svg>
      </div>
    </div>
  );
}
