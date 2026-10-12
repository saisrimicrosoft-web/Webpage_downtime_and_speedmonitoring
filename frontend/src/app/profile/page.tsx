'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getProfile } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';

export default function ProfilePage() {
  return <AuthGuard><ProfileContent /></AuthGuard>;
}

function ProfileContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ name?: string; email?: string; phone?: string } | null>(null);

  useEffect(() => {
    getProfile().then(p => setProfile(p ?? null));
  }, []);

  const name  = profile?.name || user?.user_metadata?.name || '';
  const email = profile?.email ?? user?.email ?? '—';
  const phone = profile?.phone || '—';
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        <button
          onClick={() => router.back()}
          className="flex items-center space-x-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /><span>Back</span>
        </button>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex items-center space-x-5 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-extrabold flex-shrink-0">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white">{name || email}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Member since {createdAt}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Account Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Name</span>
              <span className="font-medium text-zinc-900 dark:text-white">{name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Email</span>
              <span className="font-medium text-zinc-900 dark:text-white">{email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Phone</span>
              <span className="font-medium text-zinc-900 dark:text-white">{phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">User ID</span>
              <span className="font-mono text-xs text-zinc-400">{user?.id ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Created</span>
              <span className="text-zinc-700 dark:text-zinc-300">{createdAt}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
