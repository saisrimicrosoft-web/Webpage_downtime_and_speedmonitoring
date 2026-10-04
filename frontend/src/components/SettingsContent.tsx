'use client';

import React, { useState } from 'react';
import {
  Settings, Bell, Activity, Zap, Users, AlertTriangle,
  Eye, EyeOff, Copy, Key, RefreshCw, Save, CheckCircle2,
  UserPlus, ExternalLink, LogOut, Trash2, Edit3, X,
  Info, Webhook, Smartphone, Database, AlertOctagon,
  Slack, Github
} from 'lucide-react';

/* ─────────────────────────── TYPES ─────────────────────────── */
type SettingsTab = 'general' | 'notifications' | 'monitoring' | 'integrations' | 'team' | 'danger';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Viewer';
  status: 'Active' | 'Pending';
  initials: string;
  color: string;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  badge?: string;
}

/* ─────────────────────────── SUB-COMPONENTS ─────────────────────────── */

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer flex-shrink-0 ${
        enabled ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 mt-0.5 ${
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
      <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h3>
        {description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children, htmlFor }: { label: string; description?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-zinc-50 dark:border-zinc-800/60 last:border-0">
      <div className="flex-1 min-w-0">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 block">
          {label}
        </label>
        {description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function SaveBtn({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-60 active:scale-95"
    >
      {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      <span>{saving ? 'Saving…' : 'Save Changes'}</span>
    </button>
  );
}

/* ─────────────────────────── TAB DEFINITIONS ─────────────────────────── */
const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general',       label: 'General',       icon: <Settings className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications',  icon: <Bell className="w-4 h-4" /> },
  { id: 'monitoring',    label: 'Monitoring',     icon: <Activity className="w-4 h-4" /> },
  { id: 'integrations',  label: 'Integrations',   icon: <Zap className="w-4 h-4" /> },
  { id: 'team',          label: 'Team & Access',  icon: <Users className="w-4 h-4" /> },
  { id: 'danger',        label: 'Danger Zone',    icon: <AlertTriangle className="w-4 h-4" /> },
];

const INITIAL_TEAM: TeamMember[] = [
  { id: '1', name: 'DevOps Admin',  email: 'admin@nexora.io',    role: 'Owner',  status: 'Active',  initials: 'DA', color: 'from-purple-500 to-indigo-600' },
  { id: '2', name: 'Rakshana S',    email: 'rakshana@nexora.io', role: 'Admin',  status: 'Active',  initials: 'RS', color: 'from-emerald-500 to-teal-600' },
  { id: '3', name: 'Priya Nair',    email: 'priya@nexora.io',    role: 'Viewer', status: 'Active',  initials: 'PN', color: 'from-amber-500 to-orange-500' },
  { id: '4', name: 'Arjun Kumar',   email: 'arjun@nexora.io',    role: 'Viewer', status: 'Pending', initials: 'AK', color: 'from-rose-500 to-pink-600' },
];

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */
export default function SettingsContent() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // General
  const [orgName, setOrgName]         = useState('Nexora Monitoring');
  const [displayName, setDisplayName] = useState('DevOps Admin');
  const [email, setEmail]             = useState('admin@nexora.io');
  const [timezone, setTimezone]       = useState('Asia/Kolkata');
  const [language, setLanguage]       = useState('en');
  const [darkMode, setDarkMode]       = useState(false);
  const [compactSidebar, setCompact]  = useState(false);
  const [showApiKey, setShowApiKey]   = useState(false);
  const API_KEY = 'nxr_live_sk_93f21c4e8a7b6d0f1e2c3a4b5d6e7f8a';

  // Notifications
  const [emailAlerts, setEmailAlerts]     = useState(true);
  const [smsAlerts, setSmsAlerts]         = useState(false);
  const [slackAlerts, setSlackAlerts]     = useState(true);
  const [webhookAlerts, setWebhookAlerts] = useState(false);
  const [alertOnDown, setAlertOnDown]     = useState(true);
  const [alertOnRec, setAlertOnRec]       = useState(true);
  const [alertOnSsl, setAlertOnSsl]       = useState(true);
  const [alertOnDeg, setAlertOnDeg]       = useState(false);
  const [quietHours, setQuietHours]       = useState(false);
  const [quietStart, setQuietStart]       = useState('22:00');
  const [quietEnd, setQuietEnd]           = useState('07:00');
  const [alertEmail, setAlertEmail]       = useState('admin@nexora.io');
  const [slackWH, setSlackWH]             = useState('https://hooks.slack.com/services/...');

  // Monitoring
  const [checkInterval, setCheckInterval] = useState('60');
  const [reqTimeout, setReqTimeout]       = useState('30');
  const [retryCount, setRetryCount]       = useState('3');
  const [sslWarnDays, setSslWarnDays]     = useState('30');
  const [globalPause, setGlobalPause]     = useState(false);
  const [followRedirects, setFollowRedir] = useState(true);
  const [verifySsl, setVerifySsl]         = useState(true);
  const [ipv6, setIpv6]                   = useState(false);

  // Integrations
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: 'slack',     name: 'Slack',         description: 'Send real-time alerts directly to a Slack channel.',       icon: <Slack className="w-5 h-5" />,         connected: true,  badge: 'Connected' },
    { id: 'pagerduty', name: 'PagerDuty',      description: 'Trigger on-call incidents when a monitor goes down.',     icon: <AlertOctagon className="w-5 h-5" />,  connected: false },
    { id: 'github',    name: 'GitHub',         description: 'Auto-create GitHub issues for downtime incidents.',       icon: <Github className="w-5 h-5" />,         connected: false },
    { id: 'webhook',   name: 'Custom Webhook', description: 'POST JSON payloads to any URL on status change events.', icon: <Webhook className="w-5 h-5" />,        connected: true,  badge: 'Connected' },
    { id: 'supabase',  name: 'Supabase',       description: 'Store historical check logs in your Supabase database.',  icon: <Database className="w-5 h-5" />,       connected: true,  badge: 'Active' },
    { id: 'sms',       name: 'Twilio SMS',     description: 'Receive SMS alerts on any phone number via Twilio.',     icon: <Smartphone className="w-5 h-5" />,     connected: false },
  ]);

  // Team
  const [team, setTeam]               = useState<TeamMember[]>(INITIAL_TEAM);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole]   = useState<'Admin' | 'Viewer'>('Viewer');
  const [showInvite, setShowInvite]   = useState(false);

  /* helpers */
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 1200);
  };

  const toggleIntegration = (id: string) =>
    setIntegrations(prev =>
      prev.map(i => i.id === id ? { ...i, connected: !i.connected, badge: !i.connected ? 'Connected' : undefined } : i)
    );

  const removeMember = (id: string) => setTeam(prev => prev.filter(m => m.id !== id));

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    setTeam(prev => [...prev, {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'Pending',
      initials: inviteEmail.slice(0, 2).toUpperCase(),
      color: 'from-sky-500 to-blue-600',
    }]);
    setInviteEmail('');
    setShowInvite(false);
  };

  /* ── Save bar ── */
  const SaveBar = () => (
    <div className="flex items-center justify-between pt-2">
      {saved && (
        <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>Changes saved successfully!</span>
        </span>
      )}
      <div className="ml-auto">
        <SaveBtn onClick={handleSave} saving={saving} />
      </div>
    </div>
  );

  /* ─────────────── TAB: GENERAL ─────────────── */
  const renderGeneral = () => (
    <div className="space-y-6">
      <SectionCard title="Organisation Profile" description="Displayed in reports, alerts, and status pages.">
        <SettingRow label="Organisation Name" description="Your brand name shown across all dashboards and emails." htmlFor="org-name">
          <input id="org-name" value={orgName} onChange={e => setOrgName(e.target.value)}
            className="w-56 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        </SettingRow>
        <SettingRow label="Display Name" description="Your personal display name within the team." htmlFor="disp-name">
          <input id="disp-name" value={displayName} onChange={e => setDisplayName(e.target.value)}
            className="w-56 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        </SettingRow>
        <SettingRow label="Email Address" description="Used for login, alerts, and billing." htmlFor="acc-email">
          <input id="acc-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-56 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Locale & Appearance" description="Customize how dates, times, and the UI are displayed.">
        <SettingRow label="Timezone" description="All timestamps are displayed in this timezone." htmlFor="tz-sel">
          <select id="tz-sel" value={timezone} onChange={e => setTimezone(e.target.value)}
            className="w-56 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
            <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Europe/Paris">Europe/Paris (CET)</option>
            <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
          </select>
        </SettingRow>
        <SettingRow label="Language" description="Dashboard UI language preference." htmlFor="lang-sel">
          <select id="lang-sel" value={language} onChange={e => setLanguage(e.target.value)}
            className="w-56 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
            <option value="en">English (US)</option>
            <option value="en-gb">English (UK)</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
          </select>
        </SettingRow>
        <SettingRow label="Dark Mode" description="Enable the dark theme for the dashboard.">
          <Toggle enabled={darkMode} onChange={setDarkMode} />
        </SettingRow>
        <SettingRow label="Compact Sidebar" description="Show only icons to save horizontal space.">
          <Toggle enabled={compactSidebar} onChange={setCompact} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="API Access" description="Use this key to authenticate with the Nexora REST API.">
        <SettingRow label="API Key" description="Keep this secret. Regenerate if compromised.">
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 space-x-2 w-72">
              <Key className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">
                {showApiKey ? API_KEY : '••••••••••••••••••••••••••••••••'}
              </span>
            </div>
            <button onClick={() => setShowApiKey(!showApiKey)}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer" title={showApiKey ? 'Hide' : 'Reveal'}>
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={() => navigator.clipboard?.writeText(API_KEY)}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer" title="Copy">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </SettingRow>
        <div className="mt-2">
          <button className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold flex items-center space-x-1 cursor-pointer">
            <RefreshCw className="w-3 h-3" /><span>Regenerate API Key</span>
          </button>
        </div>
      </SectionCard>
      <SaveBar />
    </div>
  );

  /* ─────────────── TAB: NOTIFICATIONS ─────────────── */
  const renderNotifications = () => (
    <div className="space-y-6">
      <SectionCard title="Alert Channels" description="Choose how you want to receive downtime and performance alerts.">
        <SettingRow label="Email Alerts" description="Send alert emails to the configured address.">
          <div className="flex flex-col items-end gap-2">
            <Toggle enabled={emailAlerts} onChange={setEmailAlerts} />
            {emailAlerts && (
              <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)} placeholder="alert@example.com"
                className="w-56 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            )}
          </div>
        </SettingRow>
        <SettingRow label="SMS Alerts" description="Receive text messages for critical incidents.">
          <Toggle enabled={smsAlerts} onChange={setSmsAlerts} />
        </SettingRow>
        <SettingRow label="Slack Alerts" description="Post incident updates to a Slack channel via webhook.">
          <div className="flex flex-col items-end gap-2">
            <Toggle enabled={slackAlerts} onChange={setSlackAlerts} />
            {slackAlerts && (
              <input value={slackWH} onChange={e => setSlackWH(e.target.value)} placeholder="https://hooks.slack.com/..."
                className="w-64 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            )}
          </div>
        </SettingRow>
        <SettingRow label="Webhook Alerts" description="POST JSON payloads to a custom endpoint.">
          <Toggle enabled={webhookAlerts} onChange={setWebhookAlerts} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Alert Triggers" description="Control which events fire notifications.">
        <SettingRow label="Monitor Goes Down" description="Alert immediately when an endpoint becomes unreachable.">
          <Toggle enabled={alertOnDown} onChange={setAlertOnDown} />
        </SettingRow>
        <SettingRow label="Monitor Recovers" description="Alert when a previously down monitor comes back online.">
          <Toggle enabled={alertOnRec} onChange={setAlertOnRec} />
        </SettingRow>
        <SettingRow label="SSL Certificate Warning" description="Alert when an SSL cert is expiring within the warning window.">
          <Toggle enabled={alertOnSsl} onChange={setAlertOnSsl} />
        </SettingRow>
        <SettingRow label="Performance Degraded" description="Alert when response time exceeds the configured threshold.">
          <Toggle enabled={alertOnDeg} onChange={setAlertOnDeg} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Quiet Hours" description="Suppress non-critical alerts during off-hours.">
        <SettingRow label="Enable Quiet Hours" description="Critical (down) alerts always break through.">
          <Toggle enabled={quietHours} onChange={setQuietHours} />
        </SettingRow>
        {quietHours && (
          <SettingRow label="Quiet Window" description="Time range (24h) when non-critical alerts are muted.">
            <div className="flex items-center space-x-2">
              <input type="time" value={quietStart} onChange={e => setQuietStart(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              <span className="text-xs text-zinc-400 font-semibold">to</span>
              <input type="time" value={quietEnd} onChange={e => setQuietEnd(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
          </SettingRow>
        )}
      </SectionCard>
      <SaveBar />
    </div>
  );

  /* ─────────────── TAB: MONITORING ─────────────── */
  const renderMonitoring = () => (
    <div className="space-y-6">
      <SectionCard title="Check Configuration" description="Global defaults applied to all monitors.">
        <SettingRow label="Check Interval" description="How frequently each monitor pings its target." htmlFor="chk-int">
          <select id="chk-int" value={checkInterval} onChange={e => setCheckInterval(e.target.value)}
            className="w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
            <option value="30">Every 30 seconds</option>
            <option value="60">Every 1 minute</option>
            <option value="120">Every 2 minutes</option>
            <option value="300">Every 5 minutes</option>
            <option value="600">Every 10 minutes</option>
            <option value="1800">Every 30 minutes</option>
          </select>
        </SettingRow>
        <SettingRow label="Request Timeout" description="Max time (seconds) before a check is marked failed." htmlFor="req-to">
          <select id="req-to" value={reqTimeout} onChange={e => setReqTimeout(e.target.value)}
            className="w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
            <option value="10">10 seconds</option>
            <option value="20">20 seconds</option>
            <option value="30">30 seconds</option>
            <option value="45">45 seconds</option>
            <option value="60">60 seconds</option>
          </select>
        </SettingRow>
        <SettingRow label="Retry Count" description="Consecutive failures before an alert fires." htmlFor="retry">
          <select id="retry" value={retryCount} onChange={e => setRetryCount(e.target.value)}
            className="w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
            <option value="1">1 retry</option>
            <option value="2">2 retries</option>
            <option value="3">3 retries</option>
            <option value="5">5 retries</option>
          </select>
        </SettingRow>
        <SettingRow label="SSL Warning Threshold" description="Warn when cert expires within this many days." htmlFor="ssl-warn">
          <select id="ssl-warn" value={sslWarnDays} onChange={e => setSslWarnDays(e.target.value)}
            className="w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
          </select>
        </SettingRow>
      </SectionCard>

      <SectionCard title="Advanced Options" description="Fine-tune how checks are performed.">
        <SettingRow label="Follow Redirects" description="Automatically follow HTTP 3xx redirects.">
          <Toggle enabled={followRedirects} onChange={setFollowRedir} />
        </SettingRow>
        <SettingRow label="Verify SSL Certificates" description="Reject checks if SSL is invalid or untrusted.">
          <Toggle enabled={verifySsl} onChange={setVerifySsl} />
        </SettingRow>
        <SettingRow label="Enable IPv6 Checks" description="Run checks over IPv6 where available.">
          <Toggle enabled={ipv6} onChange={setIpv6} />
        </SettingRow>
        <SettingRow label="Pause All Monitors" description="Globally suspend all monitoring. Alerts will not fire.">
          <div className="flex items-center space-x-3">
            {globalPause && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">Paused</span>
            )}
            <Toggle enabled={globalPause} onChange={setGlobalPause} />
          </div>
        </SettingRow>
      </SectionCard>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl px-5 py-4 flex items-start space-x-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          Changes to check interval and timeout apply to all monitors going forward. Existing in-progress checks will not be interrupted.
        </p>
      </div>
      <SaveBar />
    </div>
  );

  /* ─────────────── TAB: INTEGRATIONS ─────────────── */
  const renderIntegrations = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {integrations.map(intg => (
          <div key={intg.id}
            className={`bg-white dark:bg-zinc-900 border rounded-2xl shadow-xs p-5 flex flex-col gap-4 transition-all ${
              intg.connected ? 'border-purple-200 dark:border-purple-800' : 'border-zinc-200 dark:border-zinc-800'
            }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl ${intg.connected ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                  {intg.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{intg.name}</h4>
                  {intg.badge && (
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 rounded-full text-[10px] font-bold">
                      {intg.badge}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => toggleIntegration(intg.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  intg.connected
                    ? 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    : 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                }`}>
                {intg.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{intg.description}</p>
            {intg.connected && (
              <button className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer self-start">
                <Edit3 className="w-3 h-3" /><span>Configure</span>
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-6 text-center">
        <ExternalLink className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">More integrations coming soon</p>
        <p className="text-xs text-zinc-400 mt-1">Opsgenie, Datadog, Microsoft Teams, and more.</p>
      </div>
    </div>
  );

  /* ─────────────── TAB: TEAM ─────────────── */
  const renderTeam = () => (
    <div className="space-y-6">
      <SectionCard title="Team Members" description="Manage who has access to this Nexora workspace.">
        <div className="space-y-1">
          {team.map(m => (
            <div key={m.id} className="flex items-center justify-between py-3 border-b border-zinc-50 dark:border-zinc-800/60 last:border-0">
              <div className="flex items-center space-x-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {m.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">{m.name}</p>
                  <p className="text-xs text-zinc-500">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                  m.status === 'Pending'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                }`}>
                  {m.status === 'Pending' ? 'Pending' : m.role}
                </span>
                {m.role !== 'Owner' && (
                  <button onClick={() => removeMember(m.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer" title="Remove">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {showInvite ? (
          <div className="mt-4 flex items-center space-x-2 flex-wrap gap-2">
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com"
              className="flex-1 min-w-[200px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'Admin' | 'Viewer')}
              className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
              <option value="Admin">Admin</option>
              <option value="Viewer">Viewer</option>
            </select>
            <button onClick={handleInvite} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer">Invite</button>
            <button onClick={() => setShowInvite(false)} className="p-2 text-zinc-400 hover:text-zinc-700 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button onClick={() => setShowInvite(true)}
            className="mt-4 inline-flex items-center space-x-2 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer">
            <UserPlus className="w-4 h-4" /><span>Invite Team Member</span>
          </button>
        )}
      </SectionCard>

      <SectionCard title="Security & Access" description="Manage authentication and session policies.">
        <SettingRow label="Two-Factor Authentication" description="Require 2FA for all admin and owner accounts.">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Recommended</span>
            <button className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer">Enable</button>
          </div>
        </SettingRow>
        <SettingRow label="Session Timeout" description="Auto sign-out inactive sessions." htmlFor="sess-to">
          <select id="sess-to"
            className="w-40 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
            <option>1 hour</option>
            <option>4 hours</option>
            <option>8 hours</option>
            <option>24 hours</option>
            <option>Never</option>
          </select>
        </SettingRow>
        <SettingRow label="Audit Log" description="Full history of actions taken by all team members.">
          <button className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer">
            <ExternalLink className="w-3.5 h-3.5" /><span>View Audit Log</span>
          </button>
        </SettingRow>
      </SectionCard>
    </div>
  );

  /* ─────────────── TAB: DANGER ZONE ─────────────── */
  const renderDanger = () => (
    <div className="space-y-6">
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl px-5 py-4 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-rose-700 dark:text-rose-400">Danger Zone</p>
          <p className="text-xs text-rose-600 dark:text-rose-500 mt-0.5 leading-relaxed">
            Actions here are irreversible. Please read each option carefully before proceeding.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800">
        <div className="px-6 py-5 flex items-start justify-between gap-6">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Reset All Monitor Data</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-sm">
              Clear all historical check logs, response time history, and uptime data. Monitor configurations are preserved.
            </p>
          </div>
          <button className="flex-shrink-0 inline-flex items-center space-x-2 px-4 py-2 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-sm font-bold transition-all cursor-pointer">
            <RefreshCw className="w-4 h-4" /><span>Reset Data</span>
          </button>
        </div>

        <div className="px-6 py-5 flex items-start justify-between gap-6">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Export All Data</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-sm">
              Download a full export of all monitors, check logs, and incident history.
            </p>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-sm font-bold transition-all cursor-pointer">JSON</button>
            <button className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-sm font-bold transition-all cursor-pointer">CSV</button>
          </div>
        </div>

        <div className="px-6 py-5 flex items-start justify-between gap-6">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Revoke All Sessions</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-sm">
              Immediately sign out all active sessions across all devices. You will need to log in again.
            </p>
          </div>
          <button className="flex-shrink-0 inline-flex items-center space-x-2 px-4 py-2 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-sm font-bold transition-all cursor-pointer">
            <LogOut className="w-4 h-4" /><span>Revoke Sessions</span>
          </button>
        </div>

        <div className="px-6 py-5 flex items-start justify-between gap-6">
          <div>
            <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">Delete Workspace</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-sm">
              Permanently delete this Nexora workspace, all monitors, all data, and all team access. This cannot be undone.
            </p>
          </div>
          <button className="flex-shrink-0 inline-flex items-center space-x-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-all cursor-pointer shadow-sm">
            <Trash2 className="w-4 h-4" /><span>Delete Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'general':       return renderGeneral();
      case 'notifications': return renderNotifications();
      case 'monitoring':    return renderMonitoring();
      case 'integrations':  return renderIntegrations();
      case 'team':          return renderTeam();
      case 'danger':        return renderDanger();
      default:              return null;
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
          Manage your workspace preferences, alerts, integrations, and team access.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl p-1 mb-8 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`settings-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
              activeTab === tab.id
                ? tab.id === 'danger'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-400 shadow-sm border border-purple-100 dark:border-purple-800/40'
                : tab.id === 'danger'
                  ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderContent()}
    </div>
  );
}
