'use client';

import React from 'react';
import { X, Clock, MapPin, Activity, FileText } from 'lucide-react';
import { Incident } from '@/data/mockIncidents';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  siteName: string | null;
  incident?: Incident | null;
}

export default function IncidentDrawer({ isOpen, onClose, siteName, incident }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-white">Incident Details</h2>
            <p className="text-zinc-400 text-sm">{siteName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {incident ? (
            <>
              <div>
                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-4 uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-purple-500" /> Status & Error
                </h3>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${incident.status === 'ACTIVE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                      {incident.status}
                    </span>
                    <span className="text-sm font-semibold text-zinc-300">Severity: {incident.severity}</span>
                  </div>
                  <p className="text-white font-mono text-sm mt-3">{incident.errorType}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-4 uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-purple-500" /> Regions Affected
                </h3>
                <div className="flex flex-wrap gap-2">
                  {incident.regions.map(r => (
                    <span key={r.name} className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${r.status === 'FAILING' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                      {r.name} ({r.responseTime}ms)
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-4 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-purple-500" /> Event Timeline
                </h3>
                <div className="space-y-4">
                  {incident.events.map((event, i) => (
                    <div key={event.id} className="relative pl-6 before:absolute before:left-[11px] before:top-6 before:bottom-[-24px] before:w-px before:bg-zinc-800 last:before:hidden">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-zinc-900 border border-purple-500/50 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      </div>
                      <div className="text-xs text-purple-400 font-bold">{new Date(event.time).toLocaleTimeString()} · {event.status}</div>
                      <div className="text-sm text-zinc-300 mt-1">{event.message}</div>
                    </div>
                  ))}
                </div>
              </div>

              {incident.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-4 uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-purple-500" /> Notes
                  </h3>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-400">
                    {incident.notes}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-zinc-500 py-12">
              No recent incident details available for this site.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
