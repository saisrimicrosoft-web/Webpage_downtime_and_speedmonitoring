'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Lock, Trash2, ArrowLeft, Loader2, AlertCircle, CheckCircle2,
  Activity, Shield, BarChart3,
} from 'lucide-react';
import { profileApi, ProfileData } from '@/lib/flaskApi';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import { format } from 'date-fns';

export default function ProfilePage() {
  return <AuthGuard><ProfileContent /></AuthGuard>;
}

function ProfileContent() {
  const router  = useRouter();
  const { refresh, logout } = useAuth();

  const [profile,   setProfile]  = useState<ProfileData | null>(null);
  const [loading,   setLoading]  = useState(true);
  const [section,   setSection]  = useState<'info' | 'password' | 'delete'>('info');

  // Info form
  const [name,      setName]     = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [infoMsg,   setInfoMsg]  = useState('');
  const [infoErr,   setInfoErr]  = useState('');
  const [infoBusy,  setInfoBusy] = useState(false);

  // Password form
  const [current,  setCurrent]  = useState('');
  const [newPw,    setNewPw]    = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [pwMsg,    setPwMsg]    = useState('');
  const [pwErr,    setPwErr]    = useState('');
  const [pwBusy,   setPwBusy]   = useState(false);

  // Delete
  const [delConfirm, setDelConfirm] = useState('');
  const [delBusy,    setDelBusy]    = useState(false);
  const [delErr,     setDelErr]     = useState('');

  useEffect(() => {
    profileApi.get().then(p => {
      setProfile(p);
      setName(p.name);
      setAvatarUrl(p.avatar_url || '');
    }).finally(() => setLoading(false));
  }, []);

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    setInfoMsg(''); setInfoErr(''); setInfoBusy(true);
    try {
      await profileApi.update({ name, avatar_url: avatarUrl });
      setInfoMsg('Profile updated');
      await refresh();
    } catch (err: any) {
      setInfoErr(err?.message || 'Update failed');
    } finally {
      setInfoBusy(false);
    }
  }

  async function savePw(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(''); setPwErr(''); setPwBusy(true);
    try {
      await profileApi.changePassword(current, newPw, confirm);
      setPwMsg('Password changed successfully');
      setCurrent(''); setNewPw(''); setConfirm('');
    } catch (err: any) {
      setPwErr(err?.body?.error || err?.message || 'Failed to change password');
    } finally {
      setPwBusy(false);
    }
  }

  async function deleteAccount() {
    setDelErr(''); setDelBusy(true);
    try {
      await profileApi.deleteAccount();
      await logout();
      router.replace('/login');
    } catch (err: any) {
      setDelErr(err?.message || 'Deletion failed');
      setDelBusy(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
    </div>
  );

  if (!profile) return null;

  const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center space-x-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /><span>Back</span>
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex items-center space-x-5 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-extrabold flex-shrink-0 overflow-hidden">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white">{profile.name}</h1>
            <p className="text-sm text-zinc-500">{profile.email}</p>
            <p className="text-xs text-zinc-400 mt-0.5">Member since {format(new Date(profile.created_at), 'MMMM d, yyyy')}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Monitors',     value: profile.stats.total_monitors, icon: <Activity className="w-4 h-4" />,  color: 'text-purple-600' },
            { label: 'Total checks', value: profile.stats.total_checks,   icon: <BarChart3 className="w-4 h-4" />, color: 'text-blue-600' },
            { label: 'Uptime',       value: `${profile.stats.overall_uptime}%`, icon: <Shield className="w-4 h-4" />, color: profile.stats.overall_uptime >= 99 ? 'text-emerald-600' : 'text-amber-500' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs text-center">
              <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
              <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Section tabs */}
        <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          {([['info', 'Profile Info', User], ['password', 'Change Password', Lock], ['delete', 'Delete Account', Trash2]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setSection(id as typeof section)}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                section === id
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              } ${id === 'delete' && section === 'delete' ? '!text-rose-500' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" /><span>{label}</span>
            </button>
          ))}
        </div>

        {/* Info section */}
        {section === 'info' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            {infoMsg && <div className="mb-4 flex items-center space-x-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 text-xs"><CheckCircle2 className="w-4 h-4 flex-shrink-0" /><span>{infoMsg}</span></div>}
            {infoErr && <div className="mb-4 flex items-center space-x-2 px-3 py-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 text-xs"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{infoErr}</span></div>}
            <form onSubmit={saveInfo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Full name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Avatar URL <span className="text-zinc-400">(optional)</span></label>
                <input type="url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://…" className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Email address</label>
                <input type="email" value={profile.email} disabled className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-400 cursor-not-allowed" />
              </div>
              <button type="submit" disabled={infoBusy} className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition cursor-pointer">
                {infoBusy && <Loader2 className="w-4 h-4 animate-spin" />}<span>Save changes</span>
              </button>
            </form>
          </div>
        )}

        {/* Password section */}
        {section === 'password' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            {pwMsg && <div className="mb-4 flex items-center space-x-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 text-xs"><CheckCircle2 className="w-4 h-4 flex-shrink-0" /><span>{pwMsg}</span></div>}
            {pwErr && <div className="mb-4 flex items-center space-x-2 px-3 py-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 text-xs"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{pwErr}</span></div>}
            <form onSubmit={savePw} className="space-y-4">
              {[
                { label: 'Current password', value: current, set: setCurrent, auto: 'current-password' },
                { label: 'New password',     value: newPw,   set: setNewPw,   auto: 'new-password' },
                { label: 'Confirm new password', value: confirm, set: setConfirm, auto: 'new-password' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">{f.label}</label>
                  <input type="password" autoComplete={f.auto} value={f.value} onChange={e => f.set(e.target.value)} required className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                </div>
              ))}
              <button type="submit" disabled={pwBusy} className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition cursor-pointer">
                {pwBusy && <Loader2 className="w-4 h-4 animate-spin" />}<span>Change password</span>
              </button>
            </form>
          </div>
        )}

        {/* Delete section */}
        {section === 'delete' && (
          <div className="bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-800 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-rose-600 mb-2 flex items-center space-x-2"><Trash2 className="w-4 h-4" /><span>Delete account</span></h3>
            <p className="text-xs text-zinc-500 mb-4">This will permanently delete your account, all monitors, check history, and incidents. This action cannot be undone.</p>
            {delErr && <div className="mb-4 px-3 py-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 text-xs">{delErr}</div>}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">Type <span className="font-bold text-zinc-900 dark:text-white">DELETE</span> to confirm</label>
              <input type="text" value={delConfirm} onChange={e => setDelConfirm(e.target.value)} placeholder="DELETE" className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50" />
            </div>
            <button
              onClick={deleteAccount}
              disabled={delConfirm !== 'DELETE' || delBusy}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition cursor-pointer"
            >
              {delBusy && <Loader2 className="w-4 h-4 animate-spin" />}<span>Delete my account</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
