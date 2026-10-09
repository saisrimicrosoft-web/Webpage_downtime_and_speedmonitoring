'use client';

import React, { useState, useEffect } from 'react';
import {
  User, Palette, Bell, Shield, Lock, Trash2,
  Save, CheckCircle2, RefreshCw, LogOut, Download
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import {
  getSettings, saveSettings, getExportUrl
} from '@/lib/api';

/* ─────────────────────────── TYPES ─────────────────────────── */
type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'privacy' | 'security' | 'account';

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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
      <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function SettingRow({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-zinc-50 dark:border-zinc-800/60 last:border-0">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 block flex-1">
        {label}
      </label>
      <div className="flex-shrink-0 ml-6">{children}</div>
    </div>
  );
}

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */
export default function SettingsContent() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('https://ui-avatars.com/api/?name=User&background=random');

  // Appearance
  const [theme, setTheme] = useState('System');
  const [fontSize, setFontSize] = useState('medium');
  const [language, setLanguage] = useState('English');

  // Notifications
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [marketingNotif, setMarketingNotif] = useState(false);

  // Privacy
  const [publicProfile, setPublicProfile] = useState(false);
  const [showOnline, setShowOnline] = useState(true);

  // Security
  const [twoFactor, setTwoFactor] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    async function load() {
      const data = await getSettings();
      if (data) {
        // Profile
        setName(data.profile?.name || '');
        setEmail(data.profile?.email || '');
        setPhone(data.profile?.phone || '');
        
        // Appearance
        setTheme(data.appearance?.theme || 'System');
        setFontSize(data.appearance?.fontSize || 'medium');
        setLanguage(data.appearance?.language || 'English');

        // Notifications
        setEmailNotif(data.notifications?.email ?? true);
        setPushNotif(data.notifications?.push ?? false);
        setMarketingNotif(data.notifications?.marketing ?? false);

        // Privacy
        setPublicProfile(data.privacy?.publicProfile ?? false);
        setShowOnline(data.privacy?.showOnline ?? true);

        // Security
        setTwoFactor(data.security?.twoFactor ?? false);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      profile: { name, email, phone },
      appearance: { theme, fontSize, language },
      notifications: { email: emailNotif, push: pushNotif, marketing: marketingNotif },
      privacy: { publicProfile, showOnline },
      security: { twoFactor }
    };
    const success = await saveSettings(payload);
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const SaveBar = () => (
    <div className="flex items-center justify-between pt-2">
      <div className="text-sm">
        {saved && (
          <span className="inline-flex items-center space-x-1.5 font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully!</span>
          </span>
        )}
      </div>
      <button
        onClick={handleSave}
        disabled={saving || loading}
        className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-60 active:scale-95"
      >
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        <span>{saving ? 'Saving…' : 'Save Changes'}</span>
      </button>
    </div>
  );

  const handleChangePassword = async () => {
    if (!password || !currentPassword) {
      alert('Please enter both current and new passwords.');
      return;
    }
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update password.');
        return;
      }
      alert('Password updated successfully!');
      setPassword('');
      setCurrentPassword('');
    } catch {
      alert('Something went wrong.');
    }
  };

  const handleLogoutAll = async () => {
    try {
      await fetch('/api/settings/logout-all', { method: 'POST' });
      signOut({ callbackUrl: '/login' });
    } catch {
      alert('Something went wrong.');
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  const handleDeleteAccount = async () => {
    if (confirm('Are you absolutely sure you want to permanently delete your account? This cannot be undone.')) {
      try {
        const res = await fetch('/api/settings/delete-account', { method: 'DELETE' });
        if (res.ok) {
          signOut({ callbackUrl: '/signup' });
        }
      } catch {
        alert('Something went wrong.');
      }
    }
  };

  const handlePhotoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      alert('Profile photo updated!');
      setProfilePhoto(`https://ui-avatars.com/api/?name=${name || 'User'}&background=10b981&color=fff`);
    };
    input.click();
  };

  if (loading) {
    return <div className="p-8 text-zinc-500 animate-pulse">Loading settings...</div>;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <SectionCard title="Profile Information">
              <div className="flex items-center gap-6 py-4 border-b border-zinc-50 dark:border-zinc-800/60">
                <img src={profilePhoto} alt="Profile" className="w-16 h-16 rounded-full border border-zinc-200 dark:border-zinc-700" />
                <button onClick={handlePhotoUpload} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                  Change Photo
                </button>
              </div>
              <SettingRow label="Name" htmlFor="profile-name">
                <input id="profile-name" value={name} onChange={e => setName(e.target.value)}
                  className="w-64 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              </SettingRow>
              <SettingRow label="Email address" htmlFor="profile-email">
                <input id="profile-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-64 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              </SettingRow>
              <SettingRow label="Phone number (optional)" htmlFor="profile-phone">
                <input id="profile-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000"
                  className="w-64 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              </SettingRow>
            </SectionCard>
            <SaveBar />
          </div>
        );
      
      case 'appearance':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <SectionCard title="Appearance Preferences">
              <SettingRow label="Theme">
                <select value={theme} onChange={e => setTheme(e.target.value)}
                  className="w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
                  <option value="Light">Light</option>
                  <option value="Dark">Dark</option>
                  <option value="System">System</option>
                </select>
              </SettingRow>
              <SettingRow label="Font size">
                <select value={fontSize} onChange={e => setFontSize(e.target.value)}
                  className="w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </SettingRow>
              <SettingRow label="Language">
                <select value={language} onChange={e => setLanguage(e.target.value)}
                  className="w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer">
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
              </SettingRow>
            </SectionCard>
            <SaveBar />
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <SectionCard title="Notification Settings">
              <SettingRow label="Email notifications">
                <Toggle enabled={emailNotif} onChange={setEmailNotif} />
              </SettingRow>
              <SettingRow label="Push notifications">
                <Toggle enabled={pushNotif} onChange={setPushNotif} />
              </SettingRow>
              <SettingRow label="Marketing emails">
                <Toggle enabled={marketingNotif} onChange={setMarketingNotif} />
              </SettingRow>
            </SectionCard>
            <SaveBar />
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <SectionCard title="Privacy Settings">
              <SettingRow label="Make profile public">
                <Toggle enabled={publicProfile} onChange={setPublicProfile} />
              </SettingRow>
              <SettingRow label="Show online status">
                <Toggle enabled={showOnline} onChange={setShowOnline} />
              </SettingRow>
              <SettingRow label="Download my data">
                <a href={getExportUrl()} target="_blank" rel="noreferrer" download="nexora_export.json" className="inline-flex items-center space-x-2 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-sm font-bold transition-colors cursor-pointer">
                  <Download className="w-4 h-4" />
                  <span>Download JSON</span>
                </a>
              </SettingRow>
            </SectionCard>
            <SaveBar />
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <SectionCard title="Security Preferences">
              <SettingRow label="Change password">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-3">
                    <input type="password" placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                      className="w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                  </div>
                  <div className="flex items-center space-x-3">
                    <input type="password" placeholder="New Password" value={password} onChange={e => setPassword(e.target.value)}
                      className="w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                    <button onClick={handleChangePassword} className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                      Update
                    </button>
                  </div>
                </div>
              </SettingRow>
              <SettingRow label="Two-factor authentication">
                <Toggle enabled={twoFactor} onChange={setTwoFactor} />
              </SettingRow>
              <SettingRow label="Log out of all devices">
                <button onClick={handleLogoutAll} className="inline-flex items-center space-x-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl text-sm font-bold transition-colors cursor-pointer">
                  <LogOut className="w-4 h-4" />
                  <span>Log out all sessions</span>
                </button>
              </SettingRow>
            </SectionCard>
            <SaveBar />
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <SectionCard title="Account Management">
              <SettingRow label="Log out">
                <button onClick={handleLogout} className="inline-flex items-center space-x-2 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-sm font-bold transition-colors cursor-pointer">
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </SettingRow>
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <SettingRow label="Delete account">
                  <button onClick={handleDeleteAccount} className="inline-flex items-center space-x-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                    <span>Permanently delete account</span>
                  </button>
                </SettingRow>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </div>
            </SectionCard>
          </div>
        );

      default:
        return null;
    }
  };

  const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile',       label: 'Profile',       icon: <User className="w-4 h-4" /> },
    { id: 'appearance',    label: 'Appearance',    icon: <Palette className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'privacy',       label: 'Privacy',       icon: <Shield className="w-4 h-4" /> },
    { id: 'security',      label: 'Security',      icon: <Lock className="w-4 h-4" /> },
    { id: 'account',       label: 'Account',       icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
          Manage your personal preferences and account security.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl p-1 mb-8 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-400 shadow-sm border border-purple-100 dark:border-purple-800/40'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderContent()}
      </div>
    </div>
  );
}
