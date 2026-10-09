'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    fetch(`/api/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setStatus('error');
          setMessage(data.error);
        } else {
          setStatus('success');
          setMessage(data.message);
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-white font-extrabold text-2xl tracking-tighter">N</span>
          </div>
        </div>

        <div className="mt-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl py-10 px-6 shadow-2xl sm:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Verifying your email...</h2>
              <p className="text-sm text-zinc-500">Please wait a moment.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Email Verified!</h2>
              <p className="text-sm text-zinc-500">{message}</p>
              <Link href="/login"
                className="inline-block mt-4 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:from-purple-700 hover:to-indigo-700 transition-all">
                Sign in to your account
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="w-14 h-14 text-rose-500 mx-auto" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Verification Failed</h2>
              <p className="text-sm text-zinc-500">{message}</p>
              <Link href="/signup"
                className="inline-block mt-4 px-6 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Back to Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
