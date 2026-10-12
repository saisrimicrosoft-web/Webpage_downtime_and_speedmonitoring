'use client';

import React, { useState, useEffect } from 'react';
import {
  User, Palette, Bell, Shield, Lock, Trash2,
  Save, CheckCircle2, RefreshCw, LogOut, Download
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
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
  const { signOut, user } = useAuth();
  const { updateProfile, setAvatarUrl, avatarUrl, name: contextName, email: contextEmail } = useProfile();
  const { theme: currentGlobalTheme, setTheme: setGlobalTheme } = useTheme();
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile - pre-initialize from Auth / Context immediately
  const [name, setName] = useState(contextName || user?.user_metadata?.name || user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(contextEmail || user?.email || user?.user_metadata?.email || '');
  const [phone, setPhone] = useState(user?.user_metadata?.phone || '');
  const [profilePhoto, setProfilePhoto] = useState(
    avatarUrl || user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(contextName || user?.user_metadata?.name || 'User')}&background=8b5cf6&color=fff`
  );

  // Appearance
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nexora_theme') as ThemeMode | null;
      if (stored === 'Light') return 'Light';
      if (stored === 'Dark') return 'Dark';
    }
    return currentGlobalTheme === 'Light' ? 'Light' : 'Dark';
  });
  const [fontSize, setFontSize] = useState('medium');
  const [language, setLanguage] = useState('English');

  // Keep theme in sync with global theme
  useEffect(() => {
    if (currentGlobalTheme && (currentGlobalTheme === 'Light' || currentGlobalTheme === 'Dark')) {
      setTheme(currentGlobalTheme);
    }
  }, [currentGlobalTheme]);

  // Keep avatar in sync with context
  useEffect(() => {
    if (avatarUrl) {
      setProfilePhoto(avatarUrl);
    }
  }, [avatarUrl]);

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
  const [pwMsg, setPwMsg] = useState({ text: '', isError: false });

  useEffect(() => {
    async function load() {
      try {
        const data = await getSettings() as any;
        if (data) {
          // Profile
          const loadedName = data.profile?.name || contextName || user?.user_metadata?.name || '';
          const loadedEmail = data.profile?.email || contextEmail || user?.email || '';
          const loadedPhone = data.profile?.phone || user?.user_metadata?.phone || '';
          const loadedAvatar = data.profile?.avatar_url || avatarUrl || user?.user_metadata?.avatar_url || '';

          if (loadedName) setName(loadedName);
          if (loadedEmail) setEmail(loadedEmail);
          if (loadedPhone) setPhone(loadedPhone);
          if (loadedAvatar) {
            setProfilePhoto(loadedAvatar);
            setAvatarUrl(loadedAvatar);
          } else if (loadedName) {
            setProfilePhoto(`https://ui-avatars.com/api/?name=${encodeURIComponent(loadedName)}&background=8b5cf6&color=fff`);
          }
          if (loadedName || loadedEmail) updateProfile(loadedName, loadedEmail, loadedAvatar);

          // Appearance
          if (data.appearance?.theme) {
            const loadedTheme: ThemeMode = data.appearance.theme === 'Light' ? 'Light' : 'Dark';
            setTheme(loadedTheme);
            if (loadedTheme === 'Light' && currentGlobalTheme !== 'Light') {
              setGlobalTheme('Light');
            } else if (loadedTheme === 'Dark' && currentGlobalTheme !== 'Dark') {
              setGlobalTheme('Dark');
            }
          }
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
      } catch (err) {
        console.warn('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, contextName, contextEmail, updateProfile, avatarUrl, setAvatarUrl, setGlobalTheme]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      profile: { name, email, phone, avatar_url: profilePhoto },
      appearance: { theme, fontSize, language },
      notifications: { email: emailNotif, push: pushNotif, marketing: marketingNotif },
      privacy: { publicProfile, showOnline },
      security: { twoFactor }
    };
    const success = await saveSettings(payload);
    setSaving(false);
    if (success) {
      updateProfile(name, email, profilePhoto);
      setGlobalTheme(theme);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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
    if (!password) {
      setPwMsg({ text: 'Please enter a new password.', isError: true });
      return;
    }
    if (password.length < 8) {
      setPwMsg({ text: 'Password must be at least 8 characters.', isError: true });
      return;
    }
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setPwMsg({ text: error.message, isError: true });
        return;
      }
      setPwMsg({ text: 'Password updated successfully!', isError: false });
      setPassword('');
      setCurrentPassword('');
      setTimeout(() => setPwMsg({ text: '', isError: false }), 4000);
    } catch {
      setPwMsg({ text: 'Something went wrong updating password.', isError: true });
    }
  };

  const handleLogoutAll = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch {
      alert('Something went wrong.');
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleDeleteAccount = async () => {
    if (confirm('Are you absolutely sure you want to permanently delete your account? This cannot be undone.')) {
      try {
        await signOut();
        router.replace('/signup');
      } catch {
        alert('Something went wrong.');
      }
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, etc.).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        setProfilePhoto(dataUrl);
        setAvatarUrl(dataUrl);
        updateProfile(name, email, dataUrl);
      }
    };
    reader.readAsDataURL(file);
    // Reset input value so same file can be re-selected if desired
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=8b5cf6&color=fff`;
    setProfilePhoto(fallback);
    setAvatarUrl('');
    updateProfile(name, email, '');
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
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                className="hidden"
              />
              <div className="flex items-center gap-6 py-4 border-b border-zinc-50 dark:border-zinc-800/60">
                <div className="relative">
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border-2 border-purple-500 shadow-md ring-2 ring-purple-500/20"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=8b5cf6&color=fff`;
                    }}
                  />
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:via-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    Change Photo
                  </button>
                  {profilePhoto && !profilePhoto.includes('ui-avatars.com') && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
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
                <select
                  value={theme}
                  onChange={e => {
                    const newTheme = e.target.value as ThemeMode;
                    setTheme(newTheme);
                    setGlobalTheme(newTheme);
                  }}
                  className="w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                >
                  <option value="Dark">Dark</option>
                  <option value="Light">Light</option>
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
                    <input type="password" placeholder="New Password (min 8 chars)" value={password} onChange={e => setPassword(e.target.value)}
                      className="w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                    <button onClick={handleChangePassword} className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs">
                      Update Password
                    </button>
                  </div>
                  {pwMsg.text && (
                    <p className={`text-xs font-semibold ${pwMsg.isError ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {pwMsg.text}
                    </p>
                  )}
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
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_16px_rgba(255,255,255,0.4)]">
          Account & System Settings
        </h1>
        <p className="text-xs sm:text-sm text-white font-medium mt-1.5 leading-relaxed drop-shadow-xs">
          Manage your <span className="text-purple-300 font-bold bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-400/30">personal preferences</span>, notification channels, and <span className="text-cyan-300 font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-400/30">account security</span>.
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
