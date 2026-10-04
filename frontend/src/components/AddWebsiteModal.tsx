'use client';

import React, { useState } from 'react';
import { X, Globe, Shield, Bell, Cpu, Check, Layers, Clock, MapPin, Zap } from 'lucide-react';

interface AddWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSite: any) => void;
}

const REGION_OPTIONS = [
  'India - Mumbai',
  'India - Bengaluru',
  'India - Delhi NCR',
  'India - Hyderabad',
  'India - Chennai',
  'India - Pune',
  'India - Kolkata',
  'Singapore',
  'Tokyo',
  'London',
  'Frankfurt',
  'Sydney',
  'New York',
  'California',
  'São Paulo',
  'Dubai',
];

const MONITOR_TYPES = ['HTTP', 'HTTPS', 'Ping', 'TCP Port', 'DNS Lookup', 'API Endpoint'];

const ALERT_CHANNELS = ['Email', 'Slack', 'Discord', 'Telegram', 'SMS', 'Microsoft Teams'];

export default function AddWebsiteModal({ isOpen, onClose, onSave }: AddWebsiteModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['HTTPS', 'HTTP']);
  const [pollingInterval, setPollingInterval] = useState('1 Minute');
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['India - Mumbai', 'India - Bengaluru', 'Singapore']);
  const [sslEnabled, setSslEnabled] = useState(true);
  const [sslDaysThreshold, setSslDaysThreshold] = useState(30);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>(['Email', 'Discord', 'Slack']);
  const [aiEnabled, setAiEnabled] = useState(true);

  if (!isOpen) return null;

  const toggleType = (t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
    );
  };

  const toggleRegion = (r: string) => {
    setSelectedRegions((prev) =>
      prev.includes(r) ? prev.filter((item) => item !== r) : [...prev, r]
    );
  };

  const toggleAlert = (a: string) => {
    setSelectedAlerts((prev) =>
      prev.includes(a) ? prev.filter((item) => item !== a) : [...prev, a]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    onSave({
      name,
      url,
      description,
      types: selectedTypes,
      pollingInterval,
      regions: selectedRegions,
      sslEnabled,
      sslDaysThreshold,
      alerts: selectedAlerts,
      aiEnabled,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 transform transition-all">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-indigo-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-850">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-md">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                Monitor New Website
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Configure automated telemetry, multi-region probes & alerting rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 max-h-[75vh] overflow-y-auto space-y-7">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center">
              <Layers className="w-4 h-4 mr-1.5" />
              <span>Website Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Website Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Cloud Dashboard"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Website URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Production customer portal monitoring..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              />
            </div>
          </div>

          {/* Section 2: Monitor Type & Interval */}
          <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center">
              <Clock className="w-4 h-4 mr-1.5" />
              <span>Probe Configuration</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Monitor Type (Select all that apply)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {MONITOR_TYPES.map((type) => {
                  const isChecked = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all text-left cursor-pointer ${
                        isChecked
                          ? 'bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300'
                          : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isChecked
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-zinc-400 dark:border-zinc-600'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Polling Interval
              </label>
              <select
                value={pollingInterval}
                onChange={(e) => setPollingInterval(e.target.value)}
                className="w-full sm:w-72 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="Every 30 Seconds">Every 30 Seconds</option>
                <option value="1 Minute">1 Minute</option>
                <option value="5 Minutes">5 Minutes</option>
                <option value="15 Minutes">15 Minutes</option>
                <option value="30 Minutes">30 Minutes</option>
              </select>
            </div>
          </div>

          {/* Section 3: Monitoring Regions */}
          <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center">
              <MapPin className="w-4 h-4 mr-1.5" />
              <span>Monitoring Regions (Multi-select)</span>
            </h3>

            <div className="flex flex-wrap gap-2">
              {REGION_OPTIONS.map((region) => {
                const isSelected = selectedRegions.includes(region);
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => toggleRegion(region)}
                    className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
                    }`}
                  >
                    <span>{region}</span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: SSL Monitoring */}
          <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  SSL Certificate Monitoring
                </span>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => setSslEnabled(!sslEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  sslEnabled ? 'bg-purple-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    sslEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {sslEnabled && (
              <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    Expiry Alert Threshold
                  </p>
                  <p className="text-[11px] text-purple-700 dark:text-purple-400">
                    Notify channels before certificate expiration date
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={7}
                    max={90}
                    value={sslDaysThreshold}
                    onChange={(e) => setSslDaysThreshold(Number(e.target.value))}
                    className="w-16 bg-white dark:bg-zinc-800 border border-purple-300 dark:border-purple-700 rounded-lg px-2.5 py-1 text-xs font-bold text-center text-purple-900 dark:text-purple-200"
                  />
                  <span className="text-xs font-medium text-purple-800 dark:text-purple-300">Days</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Alert Notification Channels */}
          <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center">
              <Bell className="w-4 h-4 mr-1.5" />
              <span>Alert Notification Channels</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ALERT_CHANNELS.map((channel) => {
                const isSelected = selectedAlerts.includes(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleAlert(channel)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-zinc-400 dark:border-zinc-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{channel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 6: AI Anomaly Detection */}
          <div className="bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-blue-900/10 border border-purple-200/80 dark:border-purple-800/40 rounded-2xl p-5 flex items-start justify-between">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-xl shadow-md mt-0.5">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center">
                  <span>Enable AI Anomaly Detection</span>
                  <span className="ml-2 px-2 py-0.5 text-[9px] font-extrabold uppercase bg-purple-600 text-white rounded-full">
                    PRO
                  </span>
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Detect unusual latency spikes and recurring outages automatically using ML time-series predictions.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ml-4 ${
                aiEnabled ? 'bg-purple-600' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  aiEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-3 border-t border-zinc-200 dark:border-zinc-800 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white rounded-xl text-xs font-extrabold shadow-lg hover:shadow-purple-500/25 transition-all cursor-pointer transform active:scale-95 flex items-center space-x-2"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Save Website</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
