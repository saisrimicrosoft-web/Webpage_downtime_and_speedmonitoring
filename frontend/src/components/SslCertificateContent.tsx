'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldX, Lock, Unlock, Key,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Search,
  Filter, Calendar, ExternalLink, Clock, ArrowUpRight,
  Radio, MapPin, ChevronDown, Eye, X, Award, Check, AlertOctagon,
  Copy, Layers, Sparkles
} from 'lucide-react';
import { REGION_GROUPS } from './MonitorWebsitesContent';

export interface SslCertificate {
  id: string;
  domain: string;
  url: string;
  region: string;
  status: 'Valid' | 'Expiring Soon' | 'Expired';
  daysLeft: number;
  grade: 'A+' | 'A' | 'B' | 'F';
  issuer: string;
  validFrom: string;
  validTo: string;
  protocol: string;
  keyType: string;
  serialNumber: string;
  fingerprint: string;
  sans: string[];
  ocspStapling: boolean;
  certTransparency: boolean;
  autoRenew: boolean;
}

const SAMPLE_CERTIFICATES: SslCertificate[] = [
  {
    id: '1',
    domain: 'google.com',
    url: 'https://google.com',
    region: 'India - Mumbai',
    status: 'Valid',
    daysLeft: 248,
    grade: 'A+',
    issuer: 'Google Trust Services LLC (WR2)',
    validFrom: 'Jan 10, 2026',
    validTo: 'Jun 12, 2027',
    protocol: 'TLS 1.3 / X25519',
    keyType: 'ECDSA 256 bits',
    serialNumber: '5B:A2:18:90:3E:04:7F:C2',
    fingerprint: '3D:88:AE:91:67:E1:54:19:BD:21:44:89:12:F0:3A:99:4C:E6:AA:21',
    sans: ['*.google.com', 'google.com', '*.android.com', '*.appengine.google.com'],
    ocspStapling: true,
    certTransparency: true,
    autoRenew: true,
  },
  {
    id: '2',
    domain: 'amazon.in',
    url: 'https://amazon.in',
    region: 'India - Mumbai',
    status: 'Expiring Soon',
    daysLeft: 4,
    grade: 'A',
    issuer: 'Amazon RSA 2048 M02',
    validFrom: 'Oct 08, 2025',
    validTo: 'Oct 07, 2026',
    protocol: 'TLS 1.3 / AES_256_GCM',
    keyType: 'RSA 2048 bits',
    serialNumber: '08:C3:7E:89:AA:F4:01:23',
    fingerprint: '9A:43:EE:12:55:09:88:CD:17:82:39:FF:01:64:89:BC:11:02:44:E2',
    sans: ['amazon.in', '*.amazon.in', 'media.amazon.in'],
    ocspStapling: true,
    certTransparency: true,
    autoRenew: false,
  },
  {
    id: '3',
    domain: 'flipkart.com',
    url: 'https://flipkart.com',
    region: 'India - Delhi NCR',
    status: 'Expired',
    daysLeft: 0,
    grade: 'F',
    issuer: 'DigiCert Global Root G2',
    validFrom: 'Sep 28, 2025',
    validTo: 'Oct 02, 2026',
    protocol: 'TLS 1.2 / Deprecated',
    keyType: 'RSA 2048 bits',
    serialNumber: '02:EE:99:81:7A:B4:9C:12',
    fingerprint: 'E2:10:98:76:54:32:10:FE:DC:BA:98:76:54:32:10:FE:DC:BA:98:76',
    sans: ['flipkart.com', '*.flipkart.com', 'm.flipkart.com'],
    ocspStapling: false,
    certTransparency: true,
    autoRenew: false,
  },
  {
    id: '4',
    domain: 'myntra.com',
    url: 'https://myntra.com',
    region: 'India - Bengaluru',
    status: 'Valid',
    daysLeft: 65,
    grade: 'A+',
    issuer: 'Let\'s Encrypt Authority E6',
    validFrom: 'Aug 05, 2026',
    validTo: 'Dec 07, 2026',
    protocol: 'TLS 1.3 / CHACHA20_POLY1305',
    keyType: 'ECDSA 384 bits',
    serialNumber: '04:88:E2:10:44:8C:F9:31',
    fingerprint: '11:22:33:44:55:66:77:88:99:00:AA:BB:CC:DD:EE:FF:00:11:22:33',
    sans: ['myntra.com', '*.myntra.com', 'assets.myntra.com'],
    ocspStapling: true,
    certTransparency: true,
    autoRenew: true,
  },
  {
    id: '5',
    domain: 'vercel.com',
    url: 'https://vercel.com',
    region: 'India - Hyderabad',
    status: 'Valid',
    daysLeft: 220,
    grade: 'A+',
    issuer: 'Let\'s Encrypt Authority R3',
    validFrom: 'Jan 12, 2026',
    validTo: 'May 11, 2027',
    protocol: 'TLS 1.3 / AES_128_GCM',
    keyType: 'ECDSA 256 bits',
    serialNumber: '03:1A:BC:54:EE:29:10:99',
    fingerprint: 'A1:B2:C3:D4:E5:F6:07:18:29:3A:4B:5C:6D:7E:8F:90:12:34:56:78',
    sans: ['vercel.com', '*.vercel.com', 'api.vercel.com'],
    ocspStapling: true,
    certTransparency: true,
    autoRenew: true,
  },
  {
    id: '6',
    domain: 'github.com',
    url: 'https://github.com',
    region: 'EU-Central Frankfurt',
    status: 'Valid',
    daysLeft: 42,
    grade: 'A+',
    issuer: 'DigiCert High Assurance TLS Hybrid',
    validFrom: 'Nov 14, 2025',
    validTo: 'Nov 14, 2026',
    protocol: 'TLS 1.3 / AES_256_GCM',
    keyType: 'RSA 2048 bits',
    serialNumber: '09:88:12:77:EA:10:FF:55',
    fingerprint: '88:77:66:55:44:33:22:11:00:FF:EE:DD:CC:BB:AA:99:88:77:66:55',
    sans: ['github.com', '*.github.com', 'gist.github.com'],
    ocspStapling: true,
    certTransparency: true,
    autoRenew: true,
  },
  {
    id: '7',
    domain: 'openai.com',
    url: 'https://openai.com',
    region: 'US-West California',
    status: 'Valid',
    daysLeft: 190,
    grade: 'A+',
    issuer: 'Cloudflare Inc ECC CA-3',
    validFrom: 'Feb 15, 2026',
    validTo: 'Apr 18, 2027',
    protocol: 'TLS 1.3 / X25519',
    keyType: 'ECDSA 256 bits',
    serialNumber: '01:F8:99:23:44:55:66:77',
    fingerprint: '44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77',
    sans: ['openai.com', '*.openai.com', 'chatgpt.com'],
    ocspStapling: true,
    certTransparency: true,
    autoRenew: true,
  },
  {
    id: '8',
    domain: 'spotify.com',
    url: 'https://spotify.com',
    region: 'EU-West London',
    status: 'Valid',
    daysLeft: 120,
    grade: 'A',
    issuer: 'Sectigo RSA Domain Validation',
    validFrom: 'Jan 20, 2026',
    validTo: 'Feb 02, 2027',
    protocol: 'TLS 1.3 / AES_128_GCM',
    keyType: 'RSA 2048 bits',
    serialNumber: '07:22:33:44:55:66:77:88',
    fingerprint: 'FE:DC:BA:98:76:54:32:10:01:23:45:67:89:AB:CD:EF:01:23:45:67',
    sans: ['spotify.com', '*.spotify.com', 'open.spotify.com'],
    ocspStapling: true,
    certTransparency: true,
    autoRenew: true,
  },
  {
    id: '9',
    domain: 'netflix.com',
    url: 'https://netflix.com',
    region: 'US-East Ohio',
    status: 'Valid',
    daysLeft: 310,
    grade: 'A+',
    issuer: 'DigiCert SHA2 Extended Validation Server CA',
    validFrom: 'Mar 01, 2026',
    validTo: 'Aug 10, 2027',
    protocol: 'TLS 1.3 / AES_256_GCM',
    keyType: 'RSA 2048 bits',
    serialNumber: '05:44:55:66:77:88:99:AA',
    fingerprint: 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD',
    sans: ['netflix.com', '*.netflix.com'],
    ocspStapling: true,
    certTransparency: true,
    autoRenew: true,
  },
  {
    id: '10',
    domain: 'medium.com',
    url: 'https://medium.com',
    region: 'AP-Southeast Singapore',
    status: 'Valid',
    daysLeft: 180,
    grade: 'A',
    issuer: 'Cloudflare Inc RSA CA-2',
    validFrom: 'Apr 02, 2026',
    validTo: 'Apr 02, 2027',
    protocol: 'TLS 1.3 / AES_128_GCM',
    keyType: 'RSA 2048 bits',
    serialNumber: '06:11:22:33:44:55:66:77',
    fingerprint: '99:88:77:66:55:44:33:22:11:00:FF:EE:DD:CC:BB:AA:99:88:77:66',
    sans: ['medium.com', '*.medium.com'],
    ocspStapling: true,
    certTransparency: true,
    autoRenew: true,
  },
];

export default function SslCertificateContent() {
  const [certificates, setCertificates] = useState<SslCertificate[]>(SAMPLE_CERTIFICATES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'expiring' | 'expired'>('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [issuerFilter, setIssuerFilter] = useState('all');
  const [selectedCert, setSelectedCert] = useState<SslCertificate | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Favicon helper
  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return '';
    }
  };

  // KPI Calculations
  const validCount = certificates.filter(c => c.status === 'Valid').length;
  const expiringCount = certificates.filter(c => c.status === 'Expiring Soon').length;
  const expiredCount = certificates.filter(c => c.status === 'Expired').length;
  const tls13Count = certificates.filter(c => c.protocol.includes('1.3')).length;

  // Filtered List
  const filtered = useMemo(() => {
    return certificates.filter(c => {
      const matchSearch =
        c.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.issuer.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (statusFilter === 'valid' && c.status !== 'Valid') return false;
      if (statusFilter === 'expiring' && c.status !== 'Expiring Soon') return false;
      if (statusFilter === 'expired' && c.status !== 'Expired') return false;

      if (issuerFilter !== 'all' && !c.issuer.toLowerCase().includes(issuerFilter.toLowerCase())) return false;

      if (regionFilter !== 'all') {
        if (regionFilter === 'India (All)' || regionFilter === 'India') {
          const l = c.region.toLowerCase();
          return l.includes('india') || l.includes('mumbai') || l.includes('delhi') || l.includes('bengaluru') || l.includes('hyderabad');
        }
        const norm = (str: string) => str.toLowerCase().replace(/[\(\)\-\s\.\/]/g, '');
        return norm(c.region).includes(norm(regionFilter)) || norm(regionFilter).includes(norm(c.region));
      }

      return true;
    });
  }, [certificates, searchQuery, statusFilter, regionFilter, issuerFilter]);

  const handleScanAll = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 1200);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              SSL / TLS Certificate Sentinel
            </h1>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3 h-3" />
              <span>TLS Auditing Active</span>
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            Automated certificate lifespan tracking, cryptographic cipher grading, and early expiration warning system.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleScanAll}
            disabled={isScanning}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-purple-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Auditing TLS Chains...' : 'Scan All Certificates'}</span>
          </button>
        </div>
      </div>

      {/* ═══ EXPIRY WARNING BANNER (IF CRITICAL OR EXPIRING SOON) ═══ */}
      {(expiredCount > 0 || expiringCount > 0) && (
        <div className="p-4 sm:p-5 rounded-2xl border bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border-rose-300 dark:border-rose-900/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md flex-shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center space-x-2">
                <span>Immediate Certificate Attention Required</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                  {expiredCount + expiringCount} Affected
                </span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                {expiredCount > 0 && <strong className="text-rose-600 dark:text-rose-400">flipkart.com has EXPIRED (0 days left). </strong>}
                {expiringCount > 0 && <span className="text-amber-700 dark:text-amber-400">amazon.in expires in 4 days. Renew before browsers throw HSTS/Security warnings.</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('expiring')}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start md:self-auto"
          >
            View Urgent Renewals
          </button>
        </div>
      )}

      {/* ═══ 4 METRIC CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active & Valid</span>
            <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2">{validCount}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{(validCount / certificates.length * 100).toFixed(0)}% secure</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Expiring Soon (&lt;14d)</span>
            <span className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2">{expiringCount}</p>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Urgent renewal required</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Expired Certificates</span>
            <span className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-lg">
              <ShieldX className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2">{expiredCount}</p>
          <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Breaches security posture</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Modern TLS 1.3</span>
            <span className="p-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-lg">
              <Lock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2">{tls13Count}/{certificates.length}</p>
          <p className="text-[11px] text-purple-600 font-semibold mt-0.5">AES-GCM & ChaCha20</p>
        </div>
      </div>

      {/* ═══ FILTER TOOLBAR ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search hostname or issuer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-56"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
            >
              <option value="all">All Certificates</option>
              <option value="valid">Valid Only</option>
              <option value="expiring">Expiring Soon (&lt;14d)</option>
              <option value="expired">Expired</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>

          {/* Region filter with India at the top! */}
          <div className="relative">
            <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              className="appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer max-w-[200px] truncate"
            >
              <option value="all">All Regions</option>
              {REGION_GROUPS.map(group => (
                <optgroup key={group.group} label={group.group} className="font-bold text-zinc-900 dark:text-zinc-100">
                  {group.regions.map(r => (
                    <option key={r} value={r} className="font-normal text-zinc-700 dark:text-zinc-300">
                      {r}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>

          {/* Issuer filter */}
          <div className="relative">
            <Award className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select
              value={issuerFilter}
              onChange={e => setIssuerFilter(e.target.value)}
              className="appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
            >
              <option value="all">All Certificate Authorities</option>
              <option value="Let's Encrypt">Let's Encrypt</option>
              <option value="DigiCert">DigiCert</option>
              <option value="Google">Google Trust Services</option>
              <option value="Amazon">Amazon Trust</option>
              <option value="Cloudflare">Cloudflare</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        <span className="text-xs font-bold text-zinc-400">
          Showing {filtered.length} of {certificates.length} certificates
        </span>
      </div>

      {/* ═══ SSL CERTIFICATES TABLE ═══ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50/80 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Domain / Hostname</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">SSL Status</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Days Remaining</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">TLS Grade</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Issuer / CA</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Primary Region</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Valid Until</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.length > 0 ? (
                filtered.map(cert => {
                  const statusBadge =
                    cert.status === 'Valid'
                      ? { bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900', icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" /> }
                      : cert.status === 'Expiring Soon'
                      ? { bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900', icon: <AlertTriangle className="w-3 h-3 text-amber-500" /> }
                      : { bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900 animate-pulse', icon: <XCircle className="w-3 h-3 text-rose-500" /> };

                  const gradeBadge =
                    cert.grade === 'A+'
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                      : cert.grade === 'A'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800';

                  const daysPercent = Math.min(100, Math.max(0, Math.round((cert.daysLeft / 365) * 100)));

                  return (
                    <tr
                      key={cert.id}
                      onClick={() => setSelectedCert(cert)}
                      className="hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors cursor-pointer group"
                    >
                      {/* Domain */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xs flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img
                              src={getFavicon(cert.url)}
                              alt={cert.domain}
                              width={18}
                              height={18}
                              loading="lazy"
                              className="w-4.5 h-4.5 object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {cert.domain}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[150px]">{cert.url}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusBadge.bg}`}>
                          {statusBadge.icon}
                          <span>{cert.status}</span>
                        </span>
                      </td>

                      {/* Days Remaining with Lifespan Bar */}
                      <td className="px-5 py-3.5">
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                            <span className={cert.daysLeft <= 0 ? 'text-rose-600 font-black' : cert.daysLeft < 14 ? 'text-amber-600 font-black' : ''}>
                              {cert.daysLeft <= 0 ? 'Expired' : `${cert.daysLeft} days left`}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-normal">{daysPercent}%</span>
                          </div>
                          <div className="w-28 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                cert.daysLeft <= 0
                                  ? 'bg-rose-500 w-full'
                                  : cert.daysLeft < 14
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: cert.daysLeft <= 0 ? '100%' : `${daysPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Grade */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black border ${gradeBadge}`}>
                          {cert.grade}
                        </span>
                      </td>

                      {/* Issuer */}
                      <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400 font-medium truncate max-w-[180px]">
                        {cert.issuer}
                      </td>

                      {/* Region */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          <span className="text-zinc-600 dark:text-zinc-300 font-medium text-[11px]">{cert.region}</span>
                        </div>
                      </td>

                      {/* Valid Until */}
                      <td className="px-5 py-3.5 text-zinc-500 font-mono text-[11px]">
                        {cert.validTo}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedCert(cert)}
                            title="Inspect SSL Chain & Cryptography"
                            className="p-1.5 text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={cert.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Open Site"
                            className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-zinc-400 text-xs">
                    No SSL certificates match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ INTERACTIVE SSL INSPECTION DRAWER ═══ */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm transition-opacity" onClick={() => setSelectedCert(null)} />
          <aside
            className="absolute inset-y-0 right-0 w-full max-w-[480px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
            style={{ animation: 'slide-left 0.25s cubic-bezier(0.16,1,0.3,1)' }}
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-purple-50/60 to-white dark:from-zinc-900 dark:to-zinc-900 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center space-x-1.5">
                      <span>{selectedCert.domain}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400">
                        {selectedCert.grade}
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[240px]">{selectedCert.url}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCert(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Pill */}
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  selectedCert.status === 'Valid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : selectedCert.status === 'Expiring Soon'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  <span>{selectedCert.status}</span>
                  <span>({selectedCert.daysLeft} days remaining)</span>
                </span>
                <span className="text-[11px] text-zinc-500 font-medium">Auto-Renew: {selectedCert.autoRenew ? 'Active' : 'Off'}</span>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-6">
              {/* Trust Chain Hierarchy */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2.5 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Verified X.509 Certificate Chain</span>
                </h4>
                <div className="space-y-2 border-l-2 border-purple-300 dark:border-purple-800 pl-3 ml-1.5">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold">1. Root Certificate Authority</p>
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">GlobalSign / DigiCert Trust Network</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold">2. Intermediate CA</p>
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{selectedCert.issuer}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-bold">3. Leaf Certificate (Server)</p>
                    <p className="text-xs font-bold text-purple-900 dark:text-purple-200 mt-0.5">{selectedCert.domain}</p>
                  </div>
                </div>
              </div>

              {/* Cryptography Specifications */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2.5 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Cryptographic Specs</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">TLS Protocol</p>
                    <p className="font-bold text-zinc-900 dark:text-white mt-0.5">{selectedCert.protocol}</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Key Strength</p>
                    <p className="font-bold text-zinc-900 dark:text-white mt-0.5">{selectedCert.keyType}</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">OCSP Stapling</p>
                    <p className={`font-bold mt-0.5 ${selectedCert.ocspStapling ? 'text-emerald-600' : 'text-zinc-500'}`}>
                      {selectedCert.ocspStapling ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Cert Transparency</p>
                    <p className="font-bold text-emerald-600 mt-0.5">SCT Verified</p>
                  </div>
                </div>
              </div>

              {/* Subject Alternative Names (SANs) */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Subject Alternative Names ({selectedCert.sans.length})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCert.sans.map(san => (
                    <span key={san} className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-mono text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {san}
                    </span>
                  ))}
                </div>
              </div>

              {/* Serial & Fingerprint */}
              <div className="space-y-3">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase mb-1">
                    <span>Serial Number</span>
                    <button
                      onClick={() => handleCopy(selectedCert.serialNumber, 'serial')}
                      className="text-purple-600 hover:text-purple-700 cursor-pointer flex items-center space-x-1"
                    >
                      {copiedId === 'serial' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === 'serial' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] font-mono font-semibold text-zinc-800 dark:text-zinc-200 break-all">{selectedCert.serialNumber}</p>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase mb-1">
                    <span>SHA-256 Fingerprint</span>
                    <button
                      onClick={() => handleCopy(selectedCert.fingerprint, 'fingerprint')}
                      className="text-purple-600 hover:text-purple-700 cursor-pointer flex items-center space-x-1"
                    >
                      {copiedId === 'fingerprint' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === 'fingerprint' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] font-mono font-semibold text-zinc-800 dark:text-zinc-200 break-all">{selectedCert.fingerprint}</p>
                </div>
              </div>

              {/* Expiry Lifespan Dates */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Issued Date</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{selectedCert.validFrom}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Expiration Date</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{selectedCert.validTo}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Hosting Region</span>
                  <span className="font-semibold text-zinc-900 dark:text-white flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    <span>{selectedCert.region}</span>
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
