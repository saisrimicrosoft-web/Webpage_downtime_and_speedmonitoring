'use client';

import React, { useState } from 'react';
import {
  FileText, Download, Calendar, Filter, Plus, FileBarChart,
  PieChart, Activity, Clock, ShieldCheck, Mail, ChevronDown, CheckCircle, TrendingUp
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  type: string;
  dateRange: string;
  status: 'Ready' | 'Generating' | 'Scheduled';
  generatedAt: string;
  size: string;
}

const SAMPLE_REPORTS: Report[] = [
  { id: '1', name: 'Monthly SLA Compliance', type: 'Uptime & SLA', dateRange: 'Sep 2026', status: 'Ready', generatedAt: '2 days ago', size: '2.4 MB' },
  { id: '2', name: 'Global Latency Audit', type: 'Performance', dateRange: 'Last 7 Days', status: 'Ready', generatedAt: '12 hours ago', size: '1.1 MB' },
  { id: '3', name: 'SSL Certificate Health Check', type: 'Security', dateRange: 'Current', status: 'Ready', generatedAt: '5 mins ago', size: '450 KB' },
  { id: '4', name: 'Q3 Executive Summary', type: 'Comprehensive', dateRange: 'Q3 2026', status: 'Generating', generatedAt: 'In progress', size: '--' },
  { id: '5', name: 'Weekly Downtime Digest', type: 'Incidents', dateRange: 'This Week', status: 'Scheduled', generatedAt: 'Tomorrow 08:00', size: '--' },
];

export default function ReportsContent() {
  const [reports, setReports] = useState(SAMPLE_REPORTS);
  const [filterType, setFilterType] = useState('All');
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredReports = filterType === 'All' 
    ? reports 
    : reports.filter(r => r.type.includes(filterType) || filterType.includes(r.type));

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newReport: Report = {
        id: Date.now().toString(),
        name: 'On-Demand Custom Audit',
        type: 'Custom',
        dateRange: 'Today',
        status: 'Ready',
        generatedAt: 'Just now',
        size: '800 KB'
      };
      setReports([newReport, ...reports]);
      setIsGenerating(false);
    }, 2500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ready': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900';
      case 'Generating': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 animate-pulse';
      case 'Scheduled': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900';
      default: return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('SLA') || type.includes('Uptime')) return <Activity className="w-4 h-4 text-emerald-500" />;
    if (type.includes('Performance')) return <PieChart className="w-4 h-4 text-purple-500" />;
    if (type.includes('Security')) return <ShieldCheck className="w-4 h-4 text-amber-500" />;
    if (type.includes('Comprehensive')) return <FileBarChart className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-zinc-500" />;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Analytics & Reports</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium max-w-xl">
            Generate, schedule, and download comprehensive SLA and performance reports for your stakeholders.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="relative">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
            >
              <option value="All">All Report Types</option>
              <option value="Uptime">Uptime & SLA</option>
              <option value="Performance">Performance</option>
              <option value="Security">Security & SSL</option>
              <option value="Incidents">Incidents</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-60"
          >
            {isGenerating ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isGenerating ? 'Generating...' : 'New Custom Report'}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-900/10 to-transparent dark:from-purple-900/20 dark:to-transparent border border-purple-100 dark:border-purple-900/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Total Generated</h3>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <FileBarChart className="w-4 h-4 text-purple-600 dark:text-purple-300" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white">128</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" /> +12% from last month
          </p>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Scheduled Reports</h3>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white">5</p>
          <p className="text-xs text-zinc-500 mt-1 font-medium">Next runs tomorrow at 08:00</p>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">SLA Compliance</h3>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-white">99.98%</p>
          <p className="text-xs text-zinc-500 mt-1 font-medium">Exceeds 99.9% target</p>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/80">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center">
            <FileText className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
            Report Archive
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Report Name</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Type</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Date Range</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Generated</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Size</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredReports.map(report => (
                <tr 
                  key={report.id} 
                  className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0 text-zinc-500">
                        {report.type === 'Custom' ? <FileBarChart className="w-4 h-4 text-indigo-500" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white text-xs group-hover:text-purple-600 dark:group-hover:text-purple-400">{report.name}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">ID: RPT-{report.id.slice(-4)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center text-zinc-700 dark:text-zinc-300 font-medium">
                      {getTypeIcon(report.type)}
                      <span className="ml-1.5">{report.type}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-zinc-600 dark:text-zinc-400">{report.dateRange}</td>
                  <td className="px-5 py-3.5 text-zinc-500 font-mono text-[11px]">{report.generatedAt}</td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-zinc-500">{report.size}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {report.status === 'Ready' && (
                        <>
                          <button className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors shadow-sm" title="Email Report">
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 transition-colors shadow-sm" title="Download PDF">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {report.status === 'Scheduled' && (
                        <button className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors shadow-sm" title="Edit Schedule">
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-zinc-500 text-sm">No reports match the selected filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
