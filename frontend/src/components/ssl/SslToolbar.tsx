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
    <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/90 px-4 py-3 rounded-xl border border-purple-500/30 shadow-md shadow-purple-950/40 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
          <input
            type="text"
            placeholder="Search hostname or issuer…"
            value={search}
            onChange={e => onSearch(e.target.value)}
            aria-label="Search certificates"
            className="w-56 bg-zinc-950/80 border border-purple-500/40 hover:border-purple-400/70 focus:border-purple-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-400/60 font-medium shadow-sm transition-all"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
          <select
            value={sort}
            onChange={e => onSort(e.target.value as Sort)}
            aria-label="Sort certificates"
            className="appearance-none bg-zinc-950/80 border border-purple-500/40 hover:border-purple-400/70 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-400/60 cursor-pointer shadow-sm transition-all"
          >
            <option value="urgent" className="bg-zinc-900 text-white">Most Urgent</option>
            <option value="days" className="bg-zinc-900 text-white">Days Left</option>
            <option value="az" className="bg-zinc-900 text-white">A – Z</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-white drop-shadow-xs">
          Showing <span className="text-purple-300">{showing}</span> of <span className="text-purple-300">{total}</span>
        </span>
        {/* View toggle */}
        <div className="flex items-center bg-zinc-950/80 border border-purple-500/30 rounded-xl p-1">
          <button
            onClick={() => onView('cards')}
            aria-label="Card view"
            aria-pressed={view === 'cards'}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              view === 'cards' ? 'bg-purple-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onView('list')}
            aria-label="List view"
            aria-pressed={view === 'list'}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              view === 'list' ? 'bg-purple-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
