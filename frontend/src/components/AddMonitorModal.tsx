'use client';

import React, { useState } from 'react';
import { X, Globe, Loader2, AlertCircle } from 'lucide-react';
import { monitorsApi } from '@/lib/flaskApi';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function AddMonitorModal({ onClose, onCreated }: Props) {
  const [url,      setUrl]      = useState('');
  const [name,     setName]     = useState('');
  const [interval, setInterval] = useState(60);
  const [timeout,  setTimeout_] = useState(10);
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await monitorsApi.create({ url: url.trim(), name: name.trim() || undefined, check_interval_seconds: interval, timeout_seconds: timeout });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.body?.error || err?.message || 'Failed to add monitor');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6">

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-950/40 rounded-lg">
              <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">Add Website Monitor</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center space-x-2 px-3 py-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">URL <span className="text-rose-500">*</span></label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
              placeholder="https://example.com"
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Display Name <span className="text-zinc-400">(optional)</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Website"
              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Check interval</label>
              <select
                value={interval}
                onChange={e => setInterval(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
              >
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Timeout</label>
              <select
                value={timeout}
                onChange={e => setTimeout_(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
              >
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition cursor-pointer">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{busy ? 'Adding…' : 'Add Monitor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
