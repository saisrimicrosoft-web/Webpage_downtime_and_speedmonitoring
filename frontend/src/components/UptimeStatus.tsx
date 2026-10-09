"use client";

import React, { useState, useEffect } from 'react';
import { HeartPulse, AlertTriangle, Globe, Database, Server, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { monitors, incidents, historyMap } from './uptime.mock';

const GlobalStyles = () => (
  <style>{`
    :root {
      --card: #0c0c11;
      --row: #13131a;
      --border: rgba(255,255,255,0.08);
      --text: #f4f4f6;
      --muted: #8b8b99;
      --faint: #5c5c6b;
      --green: #34d399;
      --amber: #fbbf24;
      --red: #f87171;
      --accent: #7c5cff;
    }
    .font-inter { font-family: 'Inter', sans-serif; }
    @keyframes ecg-slide {
      0% { transform: translateX(0); }
      100% { transform: translateX(-300px); }
    }
    @keyframes pulse-ring {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .animate-ecg { animation: none !important; }
      .animate-ring { animation: none !important; }
    }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

const Heartbeat = ({ status }: { status: string }) => {
  if (status === 'paused') {
    return (
      <svg className="w-[300px] h-[40px]" viewBox="0 0 300 40">
        <line x1="0" y1="20" x2="300" y2="20" stroke="var(--faint)" strokeWidth="1.75" strokeDasharray="4 4" fill="none" />
      </svg>
    );
  }

  if (status === 'down') {
    return (
      <svg className="w-[300px] h-[40px]" viewBox="0 0 300 40">
        <path 
          d="M0,20 L20,20 L26,17 L32,20 L52,20 L58,4 L66,34 L72,14 L76,20 L90,20" 
          stroke="var(--green)" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 4px var(--green))' }}
        />
        <line x1="90" y1="20" x2="292" y2="20" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px var(--red))' }} />
        <circle cx="292" cy="20" r="3.5" fill="var(--red)" style={{ filter: 'drop-shadow(0 0 4px var(--red))' }} />
        <circle cx="292" cy="20" r="3.5" fill="none" stroke="var(--red)" strokeWidth="1" className="animate-ring" style={{ transformOrigin: '292px 20px', animation: 'pulse-ring 1.6s infinite' }} />
      </svg>
    );
  }

  const healthyPath = "M0,20 L40,20 L46,17 L52,20 L78,20 L84,20 L90,4 L98,34 L104,14 L108,20 L170,20 L176,17 L182,20 L205,20 L211,4 L219,34 L225,14 L229,20 L300,20";
  const slowUnit = "l6,-14 l6,28 l6,-24 l6,18 l6,-8 l30,0";
  const slowPath = "M0,20 " + Array(5).fill(slowUnit).join(" ");
  
  const path = status === 'slow' ? slowPath : healthyPath;
  const color = status === 'slow' ? 'var(--amber)' : 'var(--green)';

  return (
    <div className="w-[300px] h-[40px] overflow-hidden relative" style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
      <div className="absolute top-0 left-0 h-full w-[600px] flex animate-ecg" style={{ animation: 'ecg-slide 3.5s linear infinite' }}>
         <svg className="w-[300px] h-[40px] shrink-0" viewBox="0 0 300 40">
            <path d={path} stroke={color} strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: \`drop-shadow(0 0 4px \${color})\` }} />
         </svg>
         <svg className="w-[300px] h-[40px] shrink-0" viewBox="0 0 300 40">
            <path d={path} stroke={color} strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: \`drop-shadow(0 0 4px \${color})\` }} />
         </svg>
      </div>
    </div>
  );
}

const MonitorRow = ({ monitor, isSelected, onClick }: { monitor: any, isSelected: boolean, onClick: () => void }) => {
  const Icon = monitor.protocol === 'HTTPS' || monitor.protocol === 'HTTP' ? Globe : monitor.protocol === 'TCP' ? Database : Server;
  const isPaused = monitor.status === 'paused';
  const color = isPaused ? 'var(--faint)' : monitor.status === 'down' ? 'var(--red)' : monitor.status === 'slow' ? 'var(--amber)' : 'var(--green)';
  
  return (
    <button 
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={\`\${monitor.name}, \${monitor.status}, \${monitor.uptime !== null ? monitor.uptime + '%' : 'paused'}\`}
      className={\`w-full grid items-center text-left px-[14px] rounded-[12px] transition-colors border outline-none font-inter
        \${isSelected 
          ? 'bg-[rgba(124,92,255,0.08)] border-[#7c5cff] shadow-[0_0_0_1px_rgba(124,92,255,0.25),0_0_24px_rgba(124,92,255,0.18)]' 
          : 'bg-[var(--row)] border-[var(--border)]'}
        \${isPaused ? 'opacity-60' : 'opacity-100'}\`}
      style={{ gridTemplateColumns: '28px 1fr 300px auto', height: '56px' }}
    >
      <div className="shrink-0 flex items-center justify-center w-4 h-4">
        {isPaused ? (
          <div className="w-[10px] h-[10px] bg-[var(--faint)] border border-[var(--faint)]" /> // Stub pause icon if lucide isn't perfect
        ) : (
          <Icon className="w-4 h-4 text-[var(--muted)]" style={{ color: isSelected ? 'var(--accent)' : 'var(--muted)' }} />
        )}
      </div>
      
      <div className="truncate flex-1 pr-4 min-w-0 flex flex-col justify-center">
        <div className="text-[13px] font-[600] text-[var(--text)] truncate">{monitor.name}</div>
        <div className="text-[11px] text-[var(--muted)] truncate">
          {monitor.protocol} · {isPaused ? 'paused' : \`\${monitor.regions} region\${monitor.regions > 1 ? 's' : ''}\`}
        </div>
      </div>
      
      <div className="flex items-center justify-center">
        <Heartbeat status={monitor.status} />
      </div>
      
      <div className="w-[80px] shrink-0 text-right flex flex-col justify-center">
        {isPaused ? (
          <span className="text-[15px] font-[600] text-[var(--faint)]">Paused</span>
        ) : (
          <span className="text-[15px] font-[700] tabular-nums" style={{ color }}>
            {monitor.uptime === 100 ? '100%' : \`\${monitor.uptime}%\`}
          </span>
        )}
      </div>
    </button>
  );
}

const UptimeHeatmap = ({ monitorId }: { monitorId: string }) => {
  const history = historyMap[monitorId as keyof typeof historyMap] || [];
  return (
    <div className="w-[243px] shrink-0 flex flex-col">
      <div className="grid grid-flow-col gap-[4px] mt-2" style={{ gridTemplateColumns: 'repeat(13, 15px)', gridTemplateRows: 'repeat(7, 15px)' }}>
        {history.map((status, i) => (
          <div 
            key={i} 
            title={\`\${status}\`}
            className={\`w-[15px] h-[15px] rounded-[3px] \${status === 'perfect' ? 'bg-[var(--green)]' : status === 'slow' ? 'bg-[var(--amber)]' : 'bg-[var(--red)]'}\`} 
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[11px] text-[var(--muted)]">
        <span>13 weeks ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

const IncidentLog = ({ monitorId, now }: { monitorId: string, now: number }) => {
  const monitorIncidents = incidents[monitorId as keyof typeof incidents] || [];
  
  return (
    <div className="flex-1 min-w-0">
      <div className="text-[12px] text-[var(--muted)] mb-2">Flatline log</div>
      <div className="flex flex-col">
        {monitorIncidents.length > 0 ? (
          monitorIncidents.map((inc, i) => {
            const isOngoing = inc.type === 'ongoing';
            let displayDuration = inc.durationLabel;
            
            if (isOngoing && inc.startedAt) {
              const diffMs = Math.max(0, now - inc.startedAt);
              const minutes = Math.floor(diffMs / 60000);
              const seconds = Math.floor((diffMs % 60000) / 1000);
              displayDuration = \`\${minutes}m \${seconds}s\`;
            }
            
            return (
              <div key={i} className={\`py-[12px] flex items-start justify-between \${i !== 0 ? 'border-t border-[var(--border)]' : ''}\`}>
                <div className="flex items-start gap-3">
                  {isOngoing ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-[rgba(248,113,113,0.12)] text-[var(--red)] text-[11px] font-[600] border border-[rgba(248,113,113,0.35)] mt-0.5">
                      <AlertCircle className="w-3 h-3" /> Ongoing
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-[rgba(52,211,153,0.12)] text-[var(--green)] text-[11px] font-[600] border border-[rgba(52,211,153,0.35)] mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Resolved
                    </div>
                  )}
                  <div>
                    <div className="text-[13px] font-[700] text-[var(--text)]">{inc.title}</div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">
                      {isOngoing ? inc.startedLabel : inc.agoLabel}
                    </div>
                  </div>
                </div>
                <div className="text-[13px] text-[var(--muted)] tabular-nums font-[500] shrink-0 ml-4 mt-0.5">{displayDuration}</div>
              </div>
            );
          })
        ) : (
          <div className="text-[13px] text-[var(--muted)] py-[12px]">No incidents in this range.</div>
        )}
      </div>
    </div>
  );
}

export default function UptimeStatus() {
  const [selectedMonitor, setSelectedMonitor] = useState<string>('checkout');
  const [range, setRange] = useState<'24h' | '7d' | '30d' | '90d'>('90d');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selected = monitors.find(m => m.id === selectedMonitor) || monitors[0];
  const aliveCount = monitors.filter(m => m.status !== 'down').length;
  const totalCount = monitors.length;
  const downMonitor = monitors.find(m => m.status === 'down');
  
  let liveAgo = '';
  if (downMonitor) {
    const downIncident = incidents[downMonitor.id as keyof typeof incidents]?.find(i => i.type === 'ongoing');
    if (downIncident && downIncident.startedAt) {
      const diffMs = Math.max(0, now - downIncident.startedAt);
      liveAgo = Math.floor(diffMs / 60000) + 'm';
    }
  }

  return (
    <div className="w-full max-w-[800px] p-[20px] rounded-[16px] bg-[var(--card)] font-inter text-[var(--text)] mx-auto">
      <GlobalStyles />
      
      {/* 1. Header */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-[44px] h-[44px] rounded-[12px] bg-[rgba(124,92,255,0.15)] flex items-center justify-center shrink-0">
          <HeartPulse className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div className="flex flex-col justify-center min-h-[44px]">
          <h2 className="text-[18px] font-[700] leading-none text-[#fff]">{aliveCount} of {totalCount} systems alive</h2>
          {downMonitor && liveAgo && (
            <div className="flex items-center gap-1.5 mt-2 text-[var(--red)] text-[12px] leading-none">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{downMonitor.name} flatlined {liveAgo} ago</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Range controls */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
        {(['24h', '7d', '30d', '90d'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={\`h-[32px] px-[14px] text-[12px] font-[500] rounded-[8px] transition-colors shrink-0 \${
              range === r 
                ? 'bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.28)] text-[#fff]' 
                : 'bg-transparent border border-[rgba(255,255,255,0.14)] text-[#c9c9d3] hover:border-[rgba(255,255,255,0.28)]'
            }\`}
          >
            {r}
          </button>
        ))}
        <button 
          onClick={() => {}}
          className="h-[32px] px-[14px] text-[12px] font-[500] rounded-[8px] bg-transparent border border-[rgba(255,255,255,0.14)] text-[#c9c9d3] hover:border-[rgba(255,255,255,0.28)] flex items-center gap-1.5 ml-2 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add monitor
        </button>
      </div>

      {/* 3. Section label row */}
      <div className="flex justify-between items-center mb-3 px-1">
        <span className="text-[11px] text-[var(--muted)]">Live heartbeat · select a monitor</span>
        <div className="flex items-center gap-1.5 text-[var(--green)] text-[11px]">
          <span className="relative flex h-[6px] w-[6px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--green)] opacity-75" style={{ animationDuration: '2s' }}></span>
            <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[var(--green)]"></span>
          </span>
          streaming
        </div>
      </div>

      {/* 4. Monitor list */}
      <div className="flex flex-col gap-[8px]">
        {monitors.map(monitor => (
          <MonitorRow 
            key={monitor.id} 
            monitor={monitor} 
            isSelected={selectedMonitor === monitor.id} 
            onClick={() => setSelectedMonitor(monitor.id)} 
          />
        ))}
      </div>

      {/* 5. Detail panel */}
      <div className="mt-[20px] pt-[20px] border-t border-[var(--border)]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[14px] font-[700] leading-none text-[#fff]">{selected.name} · last 91 days</h3>
          <div className="flex items-center gap-[12px] text-[11px] text-[var(--muted)]">
            <span className="flex items-center gap-1.5"><span className="w-[8px] h-[8px] rounded-full bg-[var(--green)]" /> Perfect</span>
            <span className="flex items-center gap-1.5"><span className="w-[8px] h-[8px] rounded-full bg-[var(--amber)]" /> Slow</span>
            <span className="flex items-center gap-1.5"><span className="w-[8px] h-[8px] rounded-full bg-[var(--red)]" /> Down</span>
          </div>
        </div>
        <div className="grid gap-[28px]" style={{ gridTemplateColumns: '243px 1fr' }}>
          <UptimeHeatmap monitorId={selected.id} />
          <IncidentLog monitorId={selected.id} now={now} />
        </div>
      </div>
    </div>
  );
}
