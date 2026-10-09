'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Globe, ChevronDown, ChevronRight, MoreHorizontal,
  Pencil, Pause, Play, Trash2, History, X, LogOut, User, Bell,
  Loader2, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react';
import { monitorsApi, profileApi, MonitorRecord, IncidentRecord } from '@/lib/flaskApi';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  selectedMonitorId: number | null;
  onSelectMonitor: (id: number) => void;
  onAddMonitor: () => void;
  refreshTick: number;
}

type HistoryBuckets = {
  today: IncidentRecord[];
  yesterday: IncidentRecord[];
  week: IncidentRecord[];
  older: IncidentRecord[];
};

function StatusDot({ status, responseMs }: { status?: string; responseMs?: number | null }) {
  if (!status) return <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />;
  if (status === 'up') {
    if (responseMs && responseMs > 1000)
      return <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Slow" />;
    return <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />;
  }
  return <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Down" />;
}

export default function UserSidebar({ selectedMonitorId, onSelectMonitor, onAddMonitor, refreshTick }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [monitors, setMonitors]         = useState<MonitorRecord[]>([]);
  const [history,  setHistory]          = useState<HistoryBuckets | null>(null);
  const [search,   setSearch]           = useState('');
  const [loading,  setLoading]          = useState(true);
  const [menuId,   setMenuId]           = useState<number | null>(null);
  const [histOpen, setHistOpen]         = useState(false);
  const [profileOpen, setProfileOpen]   = useState(false);
  const [deletingId, setDeletingId]     = useState<number | null>(null);

  const loadMonitors = useCallback(async () => {
    try {
      const data = await monitorsApi.list();
      setMonitors(data);
    } catch {}
    setLoading(false);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await monitorsApi.history();
      setHistory(data);
    } catch {}
  }, []);

  useEffect(() => { loadMonitors(); loadHistory(); }, [loadMonitors, loadHistory, refreshTick]);

  // Poll every 15s
  useEffect(() => {
    const t = setInterval(() => { loadMonitors(); }, 15000);
    return () => clearInterval(t);
  }, [loadMonitors]);

  const filtered = monitors.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.url.toLowerCase().includes(search.toLowerCase())
  );

  async function handleTogglePause(m: MonitorRecord) {
    setMenuId(null);
    await monitorsApi.update(m.id, { is_active: !m.is_active });
    loadMonitors();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this monitor and all its history?')) return;
    setMenuId(null);
    setDeletingId(id);
    await monitorsApi.delete(id);
    setDeletingId(null);
    loadMonitors();
    loadHistory();
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  const totalIncidents = history
    ? [...history.today, ...history.yesterday, ...history.week, ...history.older].length
    : 0;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className="h-full flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 w-[260px] flex-shrink-0">

      {/* ── Add Website ────────────────────────────── */}
      <div className="px-3 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={onAddMonitor}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-[.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Website</span>
        </button>
      </div>

      {/* ── Search ──────────────────────────────────── */}
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search sites…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>
      </div>

      {/* ── Monitor List ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-xs text-zinc-400">No websites yet</p>
          </div>
        ) : (
          filtered.map(m => {
            const lc  = m.latest_check;
            const isActive = selectedMonitorId === m.id;
            return (
              <div key={m.id} className="relative group">
                <button
                  onClick={() => onSelectMonitor(m.id)}
                  className={`w-full flex items-center space-x-2.5 px-2.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-purple-50 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/50'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  {/* Favicon */}
                  <div className="w-7 h-7 rounded-full bg-white border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${new URL(m.url).hostname}&sz=64`}
                      alt=""
                      loading="lazy"
                      className="w-4 h-4 object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold truncate ${isActive ? 'text-purple-700 dark:text-purple-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        {m.name}
                      </span>
                      <StatusDot status={lc?.status} responseMs={lc?.response_time_ms} />
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-zinc-400 truncate">{m.url.replace(/^https?:\/\//, '')}</span>
                      {lc?.response_time_ms != null && (
                        <span className={`text-[10px] font-mono font-semibold ${
                          lc.response_time_ms < 500 ? 'text-emerald-600' :
                          lc.response_time_ms < 1000 ? 'text-amber-500' : 'text-rose-500'
                        }`}>
                          {lc.response_time_ms}ms
                        </span>
                      )}
                    </div>
                    {m.uptime_24h != null && (
                      <div className="mt-1 w-full bg-zinc-100 dark:bg-zinc-700 rounded-full h-0.5">
                        <div
                          className={`h-0.5 rounded-full ${m.uptime_24h >= 99 ? 'bg-emerald-500' : m.uptime_24h >= 95 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${m.uptime_24h}%` }}
                        />
                      </div>
                    )}
                  </div>
                </button>

                {/* ··· menu */}
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setMenuId(menuId === m.id ? null : m.id); }}
                    className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 cursor-pointer"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                {menuId === m.id && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-40 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1 text-xs">
                    <button onClick={() => { setMenuId(null); onSelectMonitor(m.id); }} className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      <Pencil className="w-3.5 h-3.5" /><span>View Details</span>
                    </button>
                    <button onClick={() => handleTogglePause(m)} className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      {m.is_active ? <><Pause className="w-3.5 h-3.5" /><span>Pause</span></> : <><Play className="w-3.5 h-3.5" /><span>Resume</span></>}
                    </button>
                    <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />
                    <button onClick={() => handleDelete(m.id)} className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 cursor-pointer">
                      {deletingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── History Section ───────────────────────────── */}
      <div className="border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => setHistOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
        >
          <div className="flex items-center space-x-1.5">
            <History className="w-3.5 h-3.5" />
            <span>Incident History</span>
            {totalIncidents > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full text-[10px] font-bold">{totalIncidents}</span>
            )}
          </div>
          {histOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {histOpen && history && (
          <div className="max-h-56 overflow-y-auto px-2 pb-2 space-y-1">
            {(['today', 'yesterday', 'week', 'older'] as const).map(bucket => {
              const items = history[bucket];
              if (!items.length) return null;
              const labels = { today: 'Today', yesterday: 'Yesterday', week: 'Last 7 days', older: 'Older' };
              return (
                <div key={bucket}>
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">{labels[bucket]}</p>
                  {items.map(inc => (
                    <div key={inc.id} className="px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-default">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate">{inc.monitor_name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${inc.status === 'open' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'}`}>
                          {inc.status === 'open' ? 'Open' : 'Resolved'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {formatDistanceToNow(new Date(inc.started_at), { addSuffix: true })} · {inc.duration_display}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })}
            {totalIncidents === 0 && (
              <p className="text-center text-[11px] text-zinc-400 py-4">No incidents recorded</p>
            )}
          </div>
        )}
      </div>

      {/* ── Profile dropdown ──────────────────────────── */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 relative">
        <button
          onClick={() => setProfileOpen(v => !v)}
          className="w-full flex items-center space-x-2.5 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{user?.name}</p>
            <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        </button>

        {profileOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1 z-50 text-xs">
            <button onClick={() => { setProfileOpen(false); router.push('/profile'); }} className="w-full flex items-center space-x-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <User className="w-4 h-4" /><span>Profile</span>
            </button>
            <button onClick={() => { setProfileOpen(false); router.push('/alerts'); }} className="w-full flex items-center space-x-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <Bell className="w-4 h-4" /><span>Alert Settings</span>
            </button>
            <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />
            <button onClick={handleLogout} className="w-full flex items-center space-x-2 px-3 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 cursor-pointer">
              <LogOut className="w-4 h-4" /><span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
