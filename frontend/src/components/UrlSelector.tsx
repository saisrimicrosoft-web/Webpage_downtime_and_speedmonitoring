'use client';

import React from 'react';
import { Globe, ChevronDown } from 'lucide-react';

interface UrlSelectorProps {
  urls: string[];
  selectedUrl: string;
  onSelectUrl: (url: string) => void;
}

export default function UrlSelector({ urls, selectedUrl, onSelectUrl }: UrlSelectorProps) {
  if (!urls || urls.length === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Target Monitor Selection</h3>
          <p className="text-xs text-zinc-500">Select a URL to inspect latency history & uptime metrics</p>
        </div>
      </div>

      <div className="relative inline-block w-full sm:w-72">
        <select
          value={selectedUrl}
          onChange={(e) => onSelectUrl(e.target.value)}
          className="w-full appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
        >
          {urls.map((url) => (
            <option key={url} value={url}>
              {url}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 dark:text-zinc-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
