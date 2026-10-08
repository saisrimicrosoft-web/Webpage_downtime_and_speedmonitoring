'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Loader2, AlertCircle, CheckCircle2, Mail, Clock } from 'lucide-react';
import { profileApi, AlertSettings } from '@/lib/flaskApi';
import AuthGuard from '@/components/AuthGuard';

export default function AlertsPage() {
  return <AuthGuard><AlertsContent /></AuthGuard>;
}

function AlertsContent() {
  const router = useRouter();
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState(false);
  const [msg,      setMsg]      = useState('');
  const [err,      setErr]      = useState('');

  // Local form state
  const [enabled,      setEnabled]      = useState(false);
  const [alertEmail,   setAlertEmail]   = useState('');
  const [threshold,    setThreshold]    = useState(1000);
  const [onRecovery,   setOnRecovery]   = useState(true);
  const [onSsl,        setOnSsl]        = useState(true);

  useEffect(() => {
    profileApi.getAlertSettings().then(s => {
      setSettings(s);
      setEnabled(s.email_alerts_enabled);
      setAlertEmail(s.alert_email || '');
      setThreshold(s.slow_threshold_ms);
      setOnRecovery(s.notify_on_recovery);
      setOnSsl(s.notify_on_ssl_expiry);
    }).finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setErr(''); setBusy(true);
    try {
      const updated = await profileApi.updateAlertSettings({
        email_alerts_enabled: enabled,
        alert_email:          alertEmail.trim() || null,
        slow_threshold_ms:    threshold,
        notify_on_recovery:   onRecovery,
        notify_on_ssl_expiry: onSsl,
      });
      setSettings(updated);
      setMsg('Alert settings saved');
    } catch (e: any) {
      setErr(e?.message || 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">

        <button onClick={() => router.back()} className="flex items-center space-x-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /><span>Back</span>
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-950/40 rounded-xl">
            <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white">Alert Settings</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Configure email notifications for downtime events</p>
          </div>
        </div>

        {msg && <div className="flex items-center space-x-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 text-sm"><CheckCircle2 className="w-4 h-4 flex-shrink-0" /><span>{msg}</span></div>}
        {err && <div className="flex items-center space-x-2 px-4 py-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{err}</span></div>}

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
          <form onSubmit={save} className="space-y-6">

            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Email alerts</p>
                <p className="text-xs text-zinc-500 mt-0.5">Receive email notifications when sites go down or recover</p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${enabled ? 'bg-purple-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Alert email */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5" /><span>Alert email address</span>
              </label>
              <input
                type="email"
                value={alertEmail}
                onChange={e => setAlertEmail(e.target.value)}
                placeholder="alerts@example.com"
                disabled={!enabled}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-zinc-400">Leave blank to use your account email</p>
            </div>

            {/* Slow threshold */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5" /><span>Slow response threshold</span>
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min={200}
                  max={5000}
                  step={100}
                  value={threshold}
                  onChange={e => setThreshold(Number(e.target.value))}
                  disabled={!enabled}
                  className="flex-1 accent-purple-600 disabled:opacity-50"
                />
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 w-16 text-right">{threshold}ms</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">Alert when response time exceeds this value</p>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              {[
                { label: 'Notify on recovery',    desc: 'Send an alert when a site comes back online', value: onRecovery, set: setOnRecovery },
                { label: 'Notify on SSL expiry',  desc: 'Alert when an SSL cert is expiring within 30 days', value: onSsl, set: setOnSsl },
              ].map(opt => (
                <label key={opt.label} className={`flex items-start space-x-3 cursor-pointer ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input
                    type="checkbox"
                    checked={opt.value}
                    onChange={e => opt.set(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-purple-600 rounded cursor-pointer"
                  />
                  <div>
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{opt.label}</p>
                    <p className="text-xs text-zinc-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* SMTP notice */}
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400">
              <p className="font-semibold mb-0.5">SMTP required for email delivery</p>
              <p>Add SMTP_HOST, SMTP_USER, and SMTP_PASSWORD to your backend <code className="font-mono">.env</code> file. Without SMTP, alerts are logged to the server console instead.</p>
            </div>

            <button type="submit" disabled={busy} className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition cursor-pointer">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}<span>Save settings</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
