'use client';

import React, { useState } from 'react';
import {
  LogOut, User, Bell, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useRouter } from 'next/navigation';

interface Props {
  selectedMonitorId: number | null;
  onSelectMonitor: (id: number) => void;
  onAddMonitor: () => void;
  refreshTick: number;
}

export default function UserSidebar({ onAddMonitor }: Props) {
  const { user, signOut } = useAuth();
  const { name: profileName } = useProfile();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  async function handleLogout() {
    await signOut();
    router.replace('/login');
  }

  const email = user?.email ?? '';
  const metaName = (user?.user_metadata?.name as string | undefined) ?? (user?.user_metadata?.full_name as string | undefined) ?? '';
  const displayName = profileName.trim() || metaName.trim() || email;
  const initials = displayName ? displayName[0].toUpperCase() : 'U';

  return (
    <aside className="h-full flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 w-[260px] flex-shrink-0">

      {/* ── Profile dropdown ──────────────────────────── */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 relative mt-auto">
        <button
          onClick={() => setProfileOpen(v => !v)}
          className="w-full flex items-center space-x-2.5 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{displayName}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
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
              onClick={() => { setProfileOpen(false); router.push('/alerts'); }}
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
  );
}
