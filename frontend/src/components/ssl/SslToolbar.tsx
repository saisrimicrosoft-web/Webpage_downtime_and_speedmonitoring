'use client';
import React from 'react';
import { Search, Filter, ChevronDown, LayoutGrid, List } from 'lucide-react';

type Sort = 'urgent' | 'days' | 'az';
type View = 'cards' | 'list';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  sort: Sort;
  onSort: (s: Sort) => void;
  view: View;
  onView: (v: View) => void;
  total: number;
  showing: number;
}

export default function SslToolbar({ search, onSearch, sort, onSort, view, onView, total, showing }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search hostname or issuer…"
            value={search}
            onChange={e => onSearch(e.target.value)}
            aria-label="Search certificates"
            className="w-52 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <select
            value={sort}
            onChange={e => onSort(e.target.value as Sort)}
            aria-label="Sort certificates"
            className="appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-7 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
          >
            <option value="urgent">Most Urgent</option>
            <option value="days">Days Left</option>
            <option value="az">A – Z</option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-zinc-400">
          Showing {showing} of {total}
        </span>
        {/* View toggle */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
          <button
            onClick={() => onView('cards')}
            aria-label="Card view"
            aria-pressed={view === 'cards'}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${view === 'cards' ? 'bg-white dark:bg-zinc-700 shadow-sm text-purple-600' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onView('list')}
            aria-label="List view"
            aria-pressed={view === 'list'}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${view === 'list' ? 'bg-white dark:bg-zinc-700 shadow-sm text-purple-600' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
