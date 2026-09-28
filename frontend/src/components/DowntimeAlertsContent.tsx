'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Activity,
  Mail,
  Bell,
  Webhook,
  ChevronRight,
  ShieldAlert,
  ServerCrash,
  X,
  AlertCircle
} from 'lucide-react';

interface AlertTimelineEvent {
  time: string;
  message: string;
}

interface AlertData {
  id: string;
  website: string;
  status: 'DOWN' | 'DEGRADED' | 'RESOLVED';
  severity: 'Critical' | 'Warning' | 'Info';
  detectedAt: string;
  resolvedAt?: string;
  duration: string;
  lastChecked: string;
  responseTime: string;
  errorType: string;
  locationsAffected: number;
  failedChecks: number;
  timeline: AlertTimelineEvent[];
}

const MOCK_ACTIVE_ALERTS: AlertData[] = [
  {
    id: 'alt-1',
    website: 'example.com',
    status: 'DOWN',
    severity: 'Critical',
    detectedAt: '10:42 AM',
    duration: '18 min',
    lastChecked: '10:59 AM',
    responseTime: 'Timeout',
    errorType: 'HTTP 502 Bad Gateway',
    locationsAffected: 4,
    failedChecks: 12,
    timeline: [
      { time: '10:42 AM', message: 'Website became unreachable' },
      { time: '10:43 AM', message: 'Failed check from Chennai' },
      { time: '10:44 AM', message: 'Failed check from Singapore' },
      { time: '10:50 AM', message: 'Alert notification sent via Email & Webhook' }
    ]
  },
  {
    id: 'alt-2',
    website: 'api.production.app',
    status: 'DEGRADED',
    severity: 'Warning',
    detectedAt: '11:15 AM',
    duration: '5 min',
    lastChecked: '11:20 AM',
    responseTime: '2450ms',
    errorType: 'High Latency',
    locationsAffected: 1,
    failedChecks: 3,
    timeline: [
      { time: '11:15 AM', message: 'Response time exceeded 2000ms threshold' },
      { time: '11:16 AM', message: 'Warning alert triggered' }
    ]
  }
];

const MOCK_HISTORY_ALERTS: AlertData[] = [
  {
    id: 'hist-1',
    website: 'payment-gateway.inc',
    status: 'RESOLVED',
    severity: 'Critical',
    detectedAt: 'Yesterday 02:15 PM',
    resolvedAt: 'Yesterday 02:45 PM',
    duration: '30 min',
    lastChecked: 'Now',
    responseTime: '120ms',
    errorType: 'Connection Refused',
    locationsAffected: 6,
    failedChecks: 20,
    timeline: [
      { time: '02:15 PM', message: 'Connection refused' },
      { time: '02:45 PM', message: 'Service recovered automatically' }
    ]
  },
  {
    id: 'hist-2',
    website: 'blog.example.com',
    status: 'RESOLVED',
    severity: 'Warning',
    detectedAt: 'Oct 12, 09:00 AM',
    resolvedAt: 'Oct 12, 09:12 AM',
    duration: '12 min',
    lastChecked: 'Now',
    responseTime: '340ms',
    errorType: 'SSL Certificate Warning',
    locationsAffected: 2,
    failedChecks: 5,
    timeline: [
      { time: '09:00 AM', message: 'SSL verification failed' },
      { time: '09:12 AM', message: 'SSL certificate updated' }
    ]
  }
];

export default function DowntimeAlertsContent() {
  const [activeAlerts] = useState<AlertData[]>(MOCK_ACTIVE_ALERTS);
  const [historyAlerts] = useState<AlertData[]>(MOCK_HISTORY_ALERTS);
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Active' | 'Resolved'>('Active');
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Simulated timer for "Last updated X seconds ago"
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(0);
      setIsRefreshing(false);
    }, 600);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DOWN': return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900';
      case 'DEGRADED': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900';
      case 'RESOLVED': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900';
      default: return 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400';
      case 'Warning': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
    }
  };

  const displayedHistory = historyAlerts.filter(a => 
    a.website.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      
      {/* ─── HEADER & REAL-TIME CONTROLS ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Downtime Alerts</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Monitor website outages, degraded services, and resolved downtime incidents.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Last updated {lastUpdated} seconds ago
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </span>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg border transition-colors ${autoRefresh ? 'bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400' : 'bg-white border-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:border-zinc-800'}`}
            title="Toggle Auto-Refresh"
          >
            <Activity className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Active Alerts</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">2</h3>
            </div>
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Critical Alerts</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">1</h3>
            </div>
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <ServerCrash className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Downtime Today</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">23m</h3>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Resolved Alerts</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">5</h3>
            </div>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── FILTERS & NOTIFICATION INFO ─── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search website..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-64 dark:text-white"
            />
          </div>
          
          <button className="flex items-center gap-2 px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300">
            <Filter className="w-4 h-4" /> Filter Status
          </button>
        </div>

        <div className="flex items-center gap-4 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mr-2">Alert Channels:</span>
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Email Enabled">
            <Mail className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Push Enabled">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1 text-zinc-400" title="Webhook Disabled">
            <Webhook className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ─── ACTIVE ALERTS ─── */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" /> Active Downtime Alerts
        </h2>
        
        {activeAlerts.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-400">All monitored websites are operational</h3>
            <p className="text-sm text-emerald-600/70 dark:text-emerald-500/70 mt-1">No active downtime alerts detected at this moment.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Website</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Severity</th>
                    <th className="px-6 py-3 font-semibold">Detected At</th>
                    <th className="px-6 py-3 font-semibold">Duration</th>
                    <th className="px-6 py-3 font-semibold">Last Checked</th>
                    <th className="px-6 py-3 font-semibold">Response Time</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {activeAlerts.map(alert => (
                    <tr key={alert.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{alert.website}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-md border ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md ${getSeverityBadge(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{alert.detectedAt}</td>
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{alert.duration}</td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{alert.lastChecked}</td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{alert.responseTime}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedAlert(alert)}
                          className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── RECENT HISTORY ─── */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div className="flex gap-4">
            <button 
              className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'Active' ? 'border-purple-600 text-purple-600 dark:border-purple-500 dark:text-purple-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              onClick={() => setActiveTab('Active')}
            >
              Active Incidents
            </button>
            <button 
              className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'Resolved' ? 'border-purple-600 text-purple-600 dark:border-purple-500 dark:text-purple-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              onClick={() => setActiveTab('Resolved')}
            >
              Resolved History
            </button>
          </div>
        </div>

        {activeTab === 'Resolved' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Website</th>
                    <th className="px-6 py-3 font-semibold">Alert Type</th>
                    <th className="px-6 py-3 font-semibold">Started</th>
                    <th className="px-6 py-3 font-semibold">Resolved</th>
                    <th className="px-6 py-3 font-semibold">Duration</th>
                    <th className="px-6 py-3 font-semibold">Severity</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {displayedHistory.map(alert => (
                    <tr key={alert.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{alert.website}</td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{alert.errorType}</td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{alert.detectedAt}</td>
                      <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400">{alert.resolvedAt}</td>
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{alert.duration}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md ${getSeverityBadge(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedAlert(alert)}
                          className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {displayedHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                        No resolved incidents found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'Active' && (
          <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-xl mt-4">
            <p className="text-zinc-500 dark:text-zinc-400">See the Active Downtime Alerts section above.</p>
          </div>
        )}
      </div>

      {/* ─── INCIDENT DETAILS MODAL ─── */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-zinc-500" /> Incident Details
              </h2>
              <button 
                onClick={() => setSelectedAlert(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{selectedAlert.website}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${getStatusColor(selectedAlert.status)}`}>
                      {selectedAlert.status}
                    </span>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${getSeverityBadge(selectedAlert.severity)}`}>
                      {selectedAlert.severity} Severity
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Duration</div>
                  <div className="text-xl font-bold text-zinc-900 dark:text-white">{selectedAlert.duration}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500">Incident Started</div>
                  <div className="font-semibold text-zinc-900 dark:text-white mt-1">{selectedAlert.detectedAt}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500">Last Checked</div>
                  <div className="font-semibold text-zinc-900 dark:text-white mt-1">{selectedAlert.lastChecked}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500">HTTP Status/Error</div>
                  <div className="font-semibold text-zinc-900 dark:text-white mt-1">{selectedAlert.errorType}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500">Response Time</div>
                  <div className="font-semibold text-zinc-900 dark:text-white mt-1">{selectedAlert.responseTime}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500">Locations Affected</div>
                  <div className="font-semibold text-zinc-900 dark:text-white mt-1">{selectedAlert.locationsAffected} Regions</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500">Failed Checks</div>
                  <div className="font-semibold text-zinc-900 dark:text-white mt-1">{selectedAlert.failedChecks} Checks</div>
                </div>
              </div>

              <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">Incident Timeline</h4>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 dark:before:via-zinc-700 before:to-transparent">
                {selectedAlert.timeline.map((event, idx) => (
                  <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 group-[.is-active]:bg-purple-600 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <time className="text-xs font-bold text-purple-600 dark:text-purple-400">{event.time}</time>
                      </div>
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{event.message}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
            
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex justify-end">
              <button 
                onClick={() => setSelectedAlert(null)}
                className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
