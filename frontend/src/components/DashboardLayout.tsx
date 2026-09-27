'use client';

import React, { useState } from 'react';
import {
  Activity, Globe, Clock, Bell, Gauge, ShieldCheck, BarChart3, FileText,
  Users, Settings, ChevronDown, Search, Plus, Menu, X, Zap,
  AlertTriangle, BellRing
} from 'lucide-react';

export type NavPage =
  | 'dashboard'
  | 'monitor-websites'
  | 'uptime-status'
  | 'downtime-alerts'
  | 'performance-speed'
  | 'ssl-certificate'
  | 'analytics'
  | 'reports'
  | 'notification-center'
  | 'team-members'
  | 'settings';

interface DashboardLayoutProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  onOpenAddModal?: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: NavPage; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
  { id: 'monitor-websites', label: 'Monitor Websites', icon: <Globe className="w-4 h-4" /> },
  { id: 'uptime-status', label: 'Uptime Status', icon: <Clock className="w-4 h-4" /> },
  { id: 'downtime-alerts', label: 'Downtime Alerts', icon: <AlertTriangle className="w-4 h-4" />, badge: '1', badgeColor: 'bg-rose-500' },
  { id: 'performance-speed', label: 'Performance Speed', icon: <Gauge className="w-4 h-4" /> },
  { id: 'ssl-certificate', label: 'SSL Certificate', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> },
  { id: 'notification-center', label: 'Notification Center', icon: <BellRing className="w-4 h-4" />, badge: '3', badgeColor: 'bg-purple-500' },
  { id: 'team-members', label: 'Team Members', icon: <Users className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export default function DashboardLayout({ activePage, onNavigate, onOpenAddModal, children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ═══════════ LEFT SIDEBAR ═══════════ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Brand */}
        <div className="px-5 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 rounded-xl shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-white">PulseGuard</span>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 text-white tracking-wider">PRO</span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Monitor Fleet
              </span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 font-semibold shadow-xs border border-purple-200/80 dark:border-purple-800/50'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center space-x-3">
                  <span className={isActive ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </span>
                {item.badge && (
                  <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      </aside>

      {/* ═══════════ MAIN AREA ═══════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ─── TOP HEADER BAR ─── */}
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            {/* Left: Hamburger + Search */}
            <div className="flex items-center space-x-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 text-zinc-500 hover:text-zinc-800 cursor-pointer">
                <Menu className="w-5 h-5" />
              </button>

              <div className="hidden sm:flex relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search websites, regions, alerts..."
                  className="w-72 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-medium"
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-3">
              {/* Monitor New Website button */}
              {onOpenAddModal && (
                <button
                  onClick={onOpenAddModal}
                  className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-purple-500/25 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Monitor New Website</span>
                </button>
              )}

              {/* Notifications bell */}
              <button className="relative p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-zinc-900"></span>
              </button>

              {/* User avatar */}
              <div className="flex items-center space-x-2 pl-2 border-l border-zinc-200 dark:border-zinc-800 ml-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                  DA
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">DevOps Admin</p>
                  <p className="text-[10px] text-zinc-500">Cloud Ops</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
              </div>
            </div>
          </div>
        </header>

        {/* ─── PAGE CONTENT ─── */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
