'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ShieldCheck, ShieldX, Shield, AlertTriangle, RefreshCw,
  Search, Filter, ChevronDown, Download, Copy, Check,
  CheckCircle2, XCircle, Info, Clock, Globe, Plus
} from 'lucide-react';
import { useMonitoring } from '@/lib/store';
import {
  selectSslSummary,
  selectSslRowStatus,
  selectSslGrade,
  selectSslGradeReasons,
} from '@/lib/selectors';
import type { Website, SslCert, SslStatus, SslGrade } from '@/lib/types';
import DashboardLayout from '@/components/DashboardLayout';
import AddWebsiteModal from '@/components/AddWebsiteModal';

// ─── Grade color ──────────────────────────────────────────────────────────────
const GRADE_COLOR: Record<SslGrade, string> = {
  A: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  B: 'text-blue-400   bg-blue-500/15   border-blue-500/30',
  C: 'text-amber-400  bg-amber-500/15  border-amber-500/30',
  D: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  F: 'text-rose-400   bg-rose-500/15   border-rose-500/30',
};

const STATUS_COLOR: Record<SslStatus, string> = {
  valid:    'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  expiring: 'text-amber-400  bg-amber-500/15  border-amber-500/30',
  critical: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  expired:  'text-rose-400   bg-rose-500/15   border-rose-500/30',
  invalid:  'text-rose-400   bg-rose-500/15   border-rose-500/30',
  no_ssl:   'text-zinc-500   bg-zinc-500/10   border-zinc-500/20',
};

const STATUS_LABEL: Record<SslStatus, string> = {
  valid:    'Valid',
  expiring: 'Expiring',
  critical: 'Critical',
  expired:  'Expired',
  invalid:  'Invalid',
  no_ssl:   'No SSL',
};

// ─── Days remaining badge ─────────────────────────────────────────────────────
function DaysBadge({ days }: { days: number | null }) {
  if (days === null || days === undefined) return <span className="text-zinc-500">—</span>;
  if (days <= 0)  return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">Expired</span>;
  if (days <= 7)  return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">{days}d</span>;
  if (days <= 30) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">{days}d</span>;
  return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">{days}d</span>;
}

// ─── Summary card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-zinc-700 transition text-zinc-400 hover:text-zinc-200 cursor-pointer" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────
interface DrawerProps {
  website: Website | null;
  cert: SslCert | null;
  onClose: () => void;
}

function DetailDrawer({ website, cert, onClose }: DrawerProps) {
  if (!website) return null;

  const status = selectSslRowStatus(cert, website.url);
  // Cast to extended for extra fields (they may be null if engine hasn't run full check yet)
  const ext = cert as any;
  const grade = selectSslGrade(ext);
  const reasons = selectSslGradeReasons(ext);

  let hostname = website.url;
  try { hostname = new URL(website.url).hostname; } catch {}

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-sm font-bold text-zinc-100">{hostname}</p>
              <p className="text-[11px] text-zinc-500">{website.url}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 cursor-pointer">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Grade + status */}
          <div className="flex items-center gap-3">
            <span className={`text-3xl font-black px-4 py-2 rounded-xl border ${GRADE_COLOR[grade]}`}>{grade}</span>
            <div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_COLOR[status]}`}>
                {STATUS_LABEL[status]}
              </span>
              <p className="text-[11px] text-zinc-500 mt-1">{cert?.days_remaining != null ? `${cert.days_remaining} days remaining` : 'No data'}</p>
            </div>
          </div>

          {/* Grade reasons */}
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Grade Reasons</p>
            <div className="space-y-1.5">
              {reasons.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  {r === 'All checks passed'
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                  <span className={r === 'All checks passed' ? 'text-emerald-400' : 'text-zinc-300'}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Certificate details */}
          {cert ? (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-4 py-3 border-b border-zinc-800">Certificate Details</p>
              <div className="divide-y divide-zinc-800">
                {[
                  ['Subject CN', ext?.subject_cn || hostname],
                  ['Issuer', cert.issuer || '—'],
                  ['Valid From', cert.valid_from ? new Date(cert.valid_from).toLocaleDateString() : '—'],
                  ['Expires At', cert.expires_at ? new Date(cert.expires_at).toLocaleDateString() : '—'],
                  ['TLS Version', ext?.tls_version || '—'],
                  ['Key Type', ext?.key_type ? `${ext.key_type} ${ext?.key_size || ''}`.trim() : '—'],
                  ['Signature Algorithm', ext?.signature_algorithm || '—'],
                  ['Self-Signed', ext?.is_self_signed != null ? (ext.is_self_signed ? 'Yes' : 'No') : '—'],
                  ['Hostname Match', ext?.hostname_match != null ? (ext.hostname_match ? 'Yes' : 'No') : '—'],
                  ['Chain Valid', ext?.chain_valid != null ? (ext.chain_valid ? 'Yes' : 'No') : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[11px] text-zinc-500">{label}</span>
                    <span className="text-[11px] text-zinc-200 font-medium max-w-[220px] truncate text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 text-center">
              <Shield className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No certificate data yet. Run the engine to scan this site.</p>
            </div>
          )}

          {/* Fingerprint */}
          {ext?.fingerprint_sha256 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">SHA-256 Fingerprint</p>
                <CopyButton text={ext.fingerprint_sha256} />
              </div>
              <p className="text-[10px] font-mono text-zinc-400 break-all">{ext.fingerprint_sha256}</p>
            </div>
          )}

          {/* SAN list */}
          {ext?.san_list && ext.san_list.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Subject Alternative Names ({ext.san_list.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {ext.san_list.map((san: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-300 font-mono">{san}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SslPage() {
  const store = useMonitoring();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState<SslStatus | 'all'>('all');
  const [isRechecking, setRecheck] = useState(false);
  const [selectedWebsite, setSelected] = useState<Website | null>(null);
  const [isAddOpen, setAddOpen]   = useState(false);
  const [sortCol, setSortCol]     = useState<'name' | 'days' | 'grade' | 'expires'>('days');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc');

  const certByWebsite = useMemo(() => {
    const m = new Map<number, SslCert>();
    for (const c of store.sslCerts) m.set(c.website_id, c);
    return m;
  }, [store.sslCerts]);

  const summary = useMemo(
    () => selectSslSummary(store.websites, store.sslCerts),
    [store.websites, store.sslCerts]
  );

  // Build rows: website + cert + derived fields
  const rows = useMemo(() => {
    return store.websites
      .filter(w => w.url.startsWith('https'))
      .map(w => {
        const cert = certByWebsite.get(w.id) ?? null;
        const status = selectSslRowStatus(cert, w.url);
        const ext = cert as any;
        const grade = selectSslGrade(ext);
        return { website: w, cert, status, grade };
      });
  }, [store.websites, certByWebsite]);

  // Filter
  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.website.name.toLowerCase().includes(q) ||
        r.website.url.toLowerCase().includes(q) ||
        (r.cert?.issuer ?? '').toLowerCase().includes(q)
      );
    }
    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'name')    cmp = a.website.name.localeCompare(b.website.name);
      if (sortCol === 'days')    cmp = (a.cert?.days_remaining ?? 9999) - (b.cert?.days_remaining ?? 9999);
      if (sortCol === 'grade')   cmp = a.grade.localeCompare(b.grade);
      if (sortCol === 'expires') cmp = (a.cert?.expires_at ?? '').localeCompare(b.cert?.expires_at ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [rows, statusFilter, search, sortCol, sortDir]);

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleRecheck = useCallback(async () => {
    setRecheck(true);
    try {
      await fetch('/api/ssl/recheck', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) });
      await store.refresh();
    } catch { /* ignore */ }
    setRecheck(false);
  }, [store]);

  const exportCsv = () => {
    const rows_csv = [
      ['Website', 'Issuer', 'Expires', 'Days Remaining', 'Grade', 'TLS', 'Status'].join(','),
      ...filtered.map(r => [
        r.website.url,
        r.cert?.issuer ?? '',
        r.cert?.expires_at ? new Date(r.cert.expires_at).toLocaleDateString() : '',
        r.cert?.days_remaining ?? '',
        r.grade,
        (r.cert as any)?.tls_version ?? '',
        r.status,
      ].map(v => `"${v}"`).join(',')),
    ].join('\n');
    const blob = new Blob([rows_csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ssl-certs.csv'; a.click();
  };

  const selectedCert = selectedWebsite ? certByWebsite.get(selectedWebsite.id) ?? null : null;

  // Loading skeleton
  if (store.loading) return (
    <DashboardLayout activePage="ssl-certificate" onNavigate={() => {}}>
      <div className="px-6 py-6 space-y-5 animate-pulse">
        <div className="h-8 w-64 bg-zinc-700 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
        </div>
        <div className="h-10 bg-zinc-800 rounded-xl" />
        <div className="h-64 bg-zinc-800/50 rounded-xl" />
      </div>
    </DashboardLayout>
  );

  const httpsWebsites = store.websites.filter(w => w.url.startsWith('https'));

  return (
    <DashboardLayout activePage="ssl-certificate" onNavigate={() => {}}>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* ── Header ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <h1 className="text-xl font-extrabold text-zinc-100">SSL Certificates</h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Certificate health, expiry tracking and TLS grade for all HTTPS sites.
            </p>
          </div>
          <button
            onClick={handleRecheck}
            disabled={isRechecking}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
            {isRechecking ? 'Rechecking…' : 'Re-check All'}
          </button>
        </div>

        {/* ── Summary cards ──────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Total HTTPS Sites" value={summary.total} color="text-zinc-100" sub={`${httpsWebsites.length} monitored`} />
          <SummaryCard label="Valid"              value={summary.valid} color="text-emerald-400" sub="Grade A/B" />
          <SummaryCard label="Expiring Soon"      value={summary.expiringSoon} color="text-amber-400" sub="Within 30 days" />
          <SummaryCard label="Expired / Invalid"  value={summary.expiredOrInvalid} color="text-rose-400" sub="Needs attention" />
        </div>

        {/* ── Filter bar ─────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by domain or issuer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={e => setStatus(e.target.value as SslStatus | 'all')}
              className="appearance-none bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-7 py-2 text-xs font-medium text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="valid">Valid</option>
              <option value="expiring">Expiring</option>
              <option value="critical">Critical (&lt;7d)</option>
              <option value="expired">Expired</option>
              <option value="invalid">Invalid</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <span className="text-[11px] text-zinc-500 ml-auto">
            Showing {filtered.length} of {rows.length}
          </span>
        </div>

        {/* ── Table ──────────────────────────────── */}
        {rows.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-sm font-bold text-zinc-400 mb-1">No HTTPS sites monitored yet</p>
            <p className="text-xs text-zinc-600 mb-5">Add an HTTPS website to start tracking SSL certificates.</p>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Website
            </button>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead className="bg-zinc-800/60 border-b border-zinc-800">
                  <tr>
                    {[
                      { key: 'name',    label: 'Website' },
                      { key: null,      label: 'Issuer' },
                      { key: 'expires', label: 'Expires' },
                      { key: 'days',    label: 'Days Left' },
                      { key: 'grade',   label: 'Grade' },
                      { key: null,      label: 'TLS' },
                      { key: null,      label: 'Status' },
                      { key: null,      label: 'Last Checked' },
                      { key: null,      label: '' },
                    ].map((col, i) => (
                      <th
                        key={i}
                        onClick={() => col.key && handleSort(col.key as 'name' | 'days' | 'grade' | 'expires')}
                        className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-left ${col.key ? 'cursor-pointer hover:text-zinc-300' : ''}`}
                      >
                        {col.label}
                        {sortCol === col.key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-600">No certificates match the current filters.</td></tr>
                  ) : filtered.map(({ website, cert, status, grade }) => {
                    const ext = cert as any;
                    let hostname = website.url;
                    try { hostname = new URL(website.url).hostname; } catch {}
                    return (
                      <tr
                        key={website.id}
                        onClick={() => setSelected(website)}
                        className="hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                      >
                        {/* Website */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                              width={16} height={16}
                              className="rounded-sm"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              alt=""
                            />
                            <div>
                              <p className="font-bold text-zinc-100 group-hover:text-purple-300 transition-colors">{website.name}</p>
                              <p className="text-[10px] text-zinc-500 truncate max-w-[160px]">{website.url}</p>
                            </div>
                          </div>
                        </td>
                        {/* Issuer */}
                        <td className="px-4 py-3.5 text-zinc-400 max-w-[140px] truncate">{cert?.issuer || '—'}</td>
                        {/* Expires */}
                        <td className="px-4 py-3.5 text-zinc-400 font-mono">
                          {cert?.expires_at ? new Date(cert.expires_at).toLocaleDateString() : '—'}
                        </td>
                        {/* Days left */}
                        <td className="px-4 py-3.5"><DaysBadge days={cert?.days_remaining ?? null} /></td>
                        {/* Grade */}
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black border ${GRADE_COLOR[grade]}`}>{grade}</span>
                        </td>
                        {/* TLS */}
                        <td className="px-4 py-3.5 font-mono text-zinc-400">{ext?.tls_version || '—'}</td>
                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLOR[status]}`}>
                            {STATUS_LABEL[status]}
                          </span>
                        </td>
                        {/* Last checked */}
                        <td className="px-4 py-3.5 text-zinc-500 font-mono">
                          {cert?.last_checked_at ? new Date(cert.last_checked_at).toLocaleTimeString() : '—'}
                        </td>
                        {/* Re-check button */}
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={async () => {
                              await fetch('/api/ssl/recheck', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ website_id: website.id }),
                              });
                              store.refresh();
                            }}
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-zinc-200 transition cursor-pointer opacity-0 group-hover:opacity-100"
                          >
                            Re-check
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Error state ─────────────────────────── */}
        {store.error && (
          <div className="bg-rose-950/20 border border-rose-900 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-rose-400">{store.error}</p>
            <button onClick={store.refresh} className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer">Retry</button>
          </div>
        )}

      </div>

      {/* Detail drawer */}
      {selectedWebsite && (
        <DetailDrawer
          website={selectedWebsite}
          cert={selectedCert}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Add website modal */}
      {isAddOpen && (
        <AddWebsiteModal
          isOpen={isAddOpen}
          onClose={() => setAddOpen(false)}
          onSave={async (site: any) => {
            await fetch('/api/websites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: site.name, url: site.url }),
            });
            setAddOpen(false);
            store.refresh();
          }}
        />
      )}
    </DashboardLayout>
  );
}
