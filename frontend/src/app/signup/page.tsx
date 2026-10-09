'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Mail, Phone, Lock, User, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const [method, setMethod] = useState<'email' | 'phone' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: method === 'phone' ? phone : email,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setLoading(true);
    signIn('google', { callbackUrl: '/' });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl py-10 px-6 shadow-2xl sm:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white mb-2">Check your email!</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              We&apos;ve sent a verification link to <strong className="text-zinc-900 dark:text-white">{method === 'phone' ? phone : email}</strong>. Click the link to activate your account.
            </p>
            <p className="text-xs text-zinc-500">
              Didn&apos;t receive the email? Check your spam folder or{' '}
              <button onClick={() => setSuccess(false)} className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 cursor-pointer">try again</button>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="text-white font-extrabold text-2xl tracking-tighter">N</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Create an account
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Start monitoring your endpoints in seconds
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-zinc-200/50 dark:border-zinc-800/50">

          {error && (
            <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-600 dark:text-rose-400 font-medium text-center animate-in fade-in zoom-in duration-200">
              {error}
            </div>
          )}

          {!method ? (
            <div className="space-y-4">
              <button onClick={handleGoogle} disabled={loading}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm bg-white dark:bg-zinc-800 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                <span>Sign up with Google</span>
              </button>

              <button onClick={() => setMethod('email')}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm bg-white dark:bg-zinc-800 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer">
                <Mail className="w-5 h-5 text-zinc-500" />
                <span>Sign up with Email</span>
              </button>

              <button onClick={() => setMethod('phone')}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm bg-white dark:bg-zinc-800 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer">
                <Phone className="w-5 h-5 text-zinc-500" />
                <span>Sign up with Phone Number</span>
              </button>
            </div>
          ) : (
            <form className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300" onSubmit={handleSignup}>
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all dark:text-white" placeholder="John Doe" />
                </div>
              </div>

              {method === 'email' ? (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all dark:text-white" placeholder="you@company.com" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all dark:text-white" placeholder="+1 (555) 000-0000" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all dark:text-white" placeholder="Min 8 chars, 1 uppercase, 1 number" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-zinc-400">Must be 8+ characters with at least 1 uppercase letter and 1 number</p>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setMethod(null)}
                  className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors w-1/3 cursor-pointer">
                  Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 flex justify-center items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all cursor-pointer disabled:opacity-70">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create account'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center text-xs text-zinc-600 dark:text-zinc-400 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500">
              Sign in <ArrowRight className="w-3 h-3 inline-block ml-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
