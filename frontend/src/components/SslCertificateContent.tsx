'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShieldX, Shield } from 'lucide-react';
import { getSslCertificates, SslCertData } from '@/lib/api';
import SslHeader       from './ssl/SslHeader';
import SslUrgentBanner from './ssl/SslUrgentBanner';
import SslKpiCards     from './ssl/SslKpiCards';
import SslExpiryChart  from './ssl/SslExpiryChart';
import SslToolbar      from './ssl/SslToolbar';
import SslCertCard     from './ssl/SslCertCard';
import SslCertList     from './ssl/SslCertList';
import SslDetailDrawer from './ssl/SslDetailDrawer';

type Filter = 'all' | 'valid' | 'expiring' | 'expired';
type Sort   = 'urgent' | 'days' | 'az';
type View   = 'cards' | 'list';

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs animate-pulse border-l-4 border-l-zinc-200">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="space-y-1.5">
            <div className="w-28 h-3 bg-zinc-200 dark:bg-zinc-700 rounded" />
            <div className="w-16 h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
          </div>
        </div>
        <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="w-24 h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded mb-3" />
      <div className="flex gap-1.5">
        <div className="w-20 h-5 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
        <div className="w-14 h-5 bg-zinc-100 dark:bg-zinc-800 rounded-md" />
      </div>
    </div>
  );
}

function SkeletonKpi() {
  return <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 h-24 animate-pulse" />;
}

export default function SslCertificateContent() {
  const [certs,       setCerts]       = useState<SslCertData[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<Date | null>(null);
  const [isScanning,  setIsScanning]  = useState(false);

  const [filter,   setFilter]   = useState<Filter>('all');
  const [search,   setSearch]   = useState('');
  const [sort,     setSort]     = useState<Sort>('urgent');
  const [view,     setView]     = useState<View>('cards');
  const [selected, setSelected] = useState<SslCertData | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getSslCertificates();
      setCerts(data);
      setLastScanned(new Date());
      setError(null);
    } catch {
      setError('Failed to load certificate data. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleScan() {
    setIsScanning(true);
    await load();
    setIsScanning(false);
  }

  // Apply filters + sort
  const displayed = useMemo(() => {
    let list = [...certs];

    // Status filter
    if (filter === 'valid')    list = list.filter(c => c.ssl_days_left > 30);
    if (filter === 'expiring') list = list.filter(c => c.ssl_days_left > 0 && c.ssl_days_left <= 14);
    if (filter === 'expired')  list = list.filter(c => c.ssl_days_left <= 0);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.hostname.toLowerCase().includes(q) ||
        (c.issuer ?? '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (sort === 'urgent') list.sort((a, b) => a.ssl_days_left - b.ssl_days_left);
    if (sort === 'days')   list.sort((a, b) => b.ssl_days_left - a.ssl_days_left);
    if (sort === 'az')     list.sort((a, b) => a.hostname.localeCompare(b.hostname));

    return list;
  }, [certs, filter, search, sort]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="h-10 w-64 bg-zinc-200 dark:bg-zinc-700 rounded-xl animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <SkeletonKpi key={i} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col items-center justify-center min-h-[320px] bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900 rounded-2xl p-10 text-center">
        <ShieldX className="w-12 h-12 text-rose-400 mb-4" />
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-1">Unable to load certificates</p>
        <p className="text-xs text-zinc-500 mb-5 max-w-xs">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer">
          Retry
        </button>
      </div>
    </div>
  );

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!certs.length) return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <SslHeader lastScanned={lastScanned} isScanning={isScanning} onScan={handleScan} />
      <div className="flex flex-col items-center justify-center min-h-[360px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center mt-6">
        <Shield className="w-14 h-14 text-zinc-300 dark:text-zinc-600 mb-4" />
        <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 mb-1">No certificates monitored yet</p>
        <p className="text-xs text-zinc-400 max-w-xs">Add HTTPS websites to your monitor list and run a scan to see their SSL health here.</p>
      </div>
    </div>
  );

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <SslHeader lastScanned={lastScanned} isScanning={isScanning} onScan={handleScan} />

      <SslUrgentBanner certs={certs} onChipClick={setSelected} />

      <SslKpiCards certs={certs} activeFilter={filter} onFilterChange={setFilter} />

      <SslExpiryChart certs={certs} />

      <SslToolbar
        search={search}    onSearch={setSearch}
        sort={sort}        onSort={setSort}
        view={view}        onView={setView}
        total={certs.length}
        showing={displayed.length}
      />

      {view === 'cards' ? (
        displayed.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayed.map(cert => (
              <SslCertCard
                key={cert.url}
                cert={cert}
                onDetails={setSelected}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-10 text-center text-xs text-zinc-400">
            No certificates match the current filters.
          </div>
        )
      ) : (
        displayed.length > 0
          ? <SslCertList certs={displayed} onDetails={setSelected} />
          : (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-10 text-center text-xs text-zinc-400">
              No certificates match the current filters.
            </div>
          )
      )}

      <SslDetailDrawer cert={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
