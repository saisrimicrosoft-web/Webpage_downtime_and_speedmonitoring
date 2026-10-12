'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity, Globe, Clock, Bell, ShieldCheck, FileText,
  Settings, ChevronDown, Search, Plus, Menu, X,
  AlertTriangle, LogOut, User
} from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export type NavPage =
  | 'dashboard'
  | 'monitor-websites'
  | 'uptime-status'
  | 'downtime-alerts'
  | 'ssl-certificate'
  | 'reports'
  | 'settings';

interface DashboardLayoutProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  onOpenAddModal?: () => void;
  openIncidentCount?: number;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: NavPage; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',        label: 'Dashboard',        icon: <Activity className="w-4 h-4" /> },
  { id: 'monitor-websites', label: 'Monitor Websites', icon: <Globe className="w-4 h-4" /> },
  { id: 'uptime-status',    label: 'Uptime Status',    icon: <Clock className="w-4 h-4" /> },
  { id: 'downtime-alerts',  label: 'Downtime Alerts',  icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'ssl-certificate',  label: 'SSL Certificate',  icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'reports',          label: 'Reports',          icon: <FileText className="w-4 h-4" /> },
  { id: 'settings',         label: 'Settings',         icon: <Settings className="w-4 h-4" /> },
];

export default function DashboardLayout({
  activePage,
  onNavigate,
  onOpenAddModal,
  openIncidentCount = 0,
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { name, email: profileEmail, avatarUrl } = useProfile();
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Derive display name: ProfileContext override > user_metadata.name > full_name > email prefix > fallback
  const authFullName  = (user?.user_metadata?.name as string | undefined) ?? (user?.user_metadata?.full_name as string | undefined) ?? '';
  const authEmail     = user?.email ?? '';
  const emailPrefix   = authEmail ? authEmail.split('@')[0] : '';
  const displayName   = name.trim() || authFullName.trim() || emailPrefix || 'DevOps Admin';

  // Login time: formatted as "Logged in HH:MM AM/PM" using last_sign_in_at from Supabase session
  const [loginTime, setLoginTime] = useState<string>('');
  useEffect(() => {
    if (user?.last_sign_in_at) {
      const d = new Date(user.last_sign_in_at);
      const formatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLoginTime(`Logged in ${formatted}`);
    }
  }, [user?.last_sign_in_at]);

  const displaySub = loginTime || (profileEmail.trim() ? profileEmail.trim() : 'Cloud Ops');

  const initials = displayName
    .split(' ')
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('') || 'DA';

  // Sidebar bottom user
  const sidebarEmail    = authEmail || profileEmail || '';
  const sidebarInitials = sidebarEmail ? sidebarEmail[0].toUpperCase() : initials;

  async function handleLogout() {
    await signOut();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">

      {/* Mobile overlay */}
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
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm flex items-center justify-center bg-white border border-zinc-200 dark:border-zinc-700">
              <img src="/logo.svg" alt="Nexora Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-white">Nexora</span>
              </div>
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                Enterprise
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
          >
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
                {item.id === 'downtime-alerts' && openIncidentCount > 0 && (
                  <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center bg-rose-500">
                    {openIncidentCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: User profile */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 relative">
          <button
            onClick={() => setProfileOpen(v => !v)}
            className="w-full flex items-center space-x-2.5 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={sidebarEmail}
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-purple-500/40 shadow-xs flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {sidebarInitials}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{sidebarEmail}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          </button>

          {profileOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1 z-50 text-xs">
              <button
                onClick={() => { setProfileOpen(false); router.push('/profile'); }}
                className="w-full flex items-center space-x-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                <User className="w-4 h-4" /><span>Profile</span>
              </button>
              <button
                onClick={() => { setProfileOpen(false); onNavigate('settings'); }}
                className="w-full flex items-center space-x-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                <Bell className="w-4 h-4" /><span>Alert Settings</span>
              </button>
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-700" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /><span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ═══════════ MAIN AREA ═══════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ─── TOP HEADER BAR ─── */}
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">

            {/* Left: Hamburger (mobile) + Search */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 text-zinc-500 hover:text-zinc-800 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-300/80" />
                <input
                  type="text"
                  placeholder="Search websites, regions, alerts..."
                  className="w-72 bg-zinc-900/80 border border-zinc-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-400 font-medium transition-all"
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-3">
              {onOpenAddModal && (
                <button
                  onClick={onOpenAddModal}
                  className="hidden sm:inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-[0_0_24px_rgba(147,51,234,0.65)] hover:shadow-[0_0_30px_rgba(168,85,247,0.85)] border border-purple-300/60 hover:border-white transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 text-white stroke-[3]" />
                  <span className="tracking-wide">Monitor New Website</span>
                </button>
              )}

              {/* Notifications bell */}
              <button className="relative p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-zinc-900"></span>
              </button>

              {/* User avatar — updates live from ProfileContext */}
              <div className="flex items-center space-x-2 pl-2 border-l border-zinc-200 dark:border-zinc-700/80 ml-1">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-purple-500/40 shadow-xs"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                    {initials}
                  </div>
                )}
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight drop-shadow-xs">{displayName}</p>
                  <p className="text-[10px] text-zinc-500 dark:text-purple-200/90 font-medium">{displaySub}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-300 hidden sm:block" />
              </div>
            </div>
          </div>
        </header>

        {/* ─── PAGE CONTENT ─── */}
        <main className="flex-1 overflow-y-auto relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
