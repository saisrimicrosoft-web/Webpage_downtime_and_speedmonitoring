'use client';

import React from 'react';
import { Search, AlertCircle, Bell, UserCheck, Wrench, CheckCircle2 } from 'lucide-react';

export type LifecycleStep = 'Detected' | 'Alerted' | 'Acknowledged' | 'Fixing' | 'Resolved';

interface Props {
  currentStep: LifecycleStep;
  onResolve: () => void;
}

const STEPS: { id: LifecycleStep; label: string; icon: React.ElementType }[] = [
  { id: 'Detected', label: 'Detected', icon: Search },
  { id: 'Alerted', label: 'Alerted', icon: Bell },
  { id: 'Acknowledged', label: 'Acknowledged', icon: UserCheck },
  { id: 'Fixing', label: 'Fixing', icon: Wrench },
  { id: 'Resolved', label: 'Resolved', icon: CheckCircle2 },
];

export default function IncidentLifecycle({ currentStep, onResolve }: Props) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-purple-500" />
          Incident Lifecycle
        </h3>
        {currentStep !== 'Resolved' && (
          <button onClick={onResolve} className="text-xs px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors font-medium">
            Mark as Resolved
          </button>
        )}
      </div>

      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-zinc-800 z-0"></div>
        <div 
          className="absolute top-6 left-[10%] h-0.5 bg-purple-600 z-0 transition-all duration-500"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 80}%` }}
        ></div>

        <div className="flex justify-between relative z-10">
          {STEPS.map((step, i) => {
            const isCompleted = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isUpcoming = i > currentIndex;
            const Icon = step.icon;

            let bgColor = 'bg-zinc-800';
            let borderColor = 'border-zinc-700';
            let iconColor = 'text-zinc-500';

            if (isCompleted) {
              bgColor = 'bg-purple-900/50';
              borderColor = 'border-purple-500';
              iconColor = 'text-purple-400';
            } else if (isCurrent) {
              if (step.id === 'Resolved') {
                bgColor = 'bg-emerald-500';
                borderColor = 'border-emerald-400';
                iconColor = 'text-white';
              } else {
                bgColor = 'bg-rose-500';
                borderColor = 'border-rose-400';
                iconColor = 'text-white';
              }
            }

            return (
              <div key={step.id} className="flex flex-col items-center gap-3 w-1/5">
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${bgColor} ${borderColor} ${isCurrent && step.id !== 'Resolved' ? 'animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]' : ''} ${isCurrent && step.id === 'Resolved' ? 'shadow-[0_0_15px_rgba(16,185,129,0.5)]' : ''}`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <span className={`text-xs font-semibold ${isCurrent ? 'text-white' : isCompleted ? 'text-purple-300' : 'text-zinc-500'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
