'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Globe, Plus, ShieldCheck, RefreshCw } from 'lucide-react';

interface HeaderNavProps {
  onOpenAddModal?: () => void;
}

export default function HeaderNav({ onOpenAddModal }: HeaderNavProps) {
  const pathname = usePathname();

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Brand & Main Nav Links */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 rounded-xl shadow-md group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Universal Monitor
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider block text-purple-600 dark:text-purple-400">
                Early Warning Telemetry
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl">
            <Link
              href="/"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                pathname === '/'
                  ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Overview</span>
            </Link>

            <Link
              href="/websites"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                pathname === '/websites'
                  ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Monitored Websites</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold">
                48
              </span>
            </Link>
          </nav>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>All Engines Active</span>
          </div>

          {onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-purple-500/25 transition-all cursor-pointer transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Monitor New Website</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
