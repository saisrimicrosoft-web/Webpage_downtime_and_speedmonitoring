'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Mail, Phone, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [method, setMethod] = useState<'email' | 'phone' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: method === 'phone' ? phone : email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'EMAIL_NOT_VERIFIED') {
          setError('Please verify your email address before signing in. Check your inbox.');
        } else {
          setError('Invalid email or password.');
        }
      } else if (result?.ok) {
        window.location.href = '/';
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setLoading(true);
    signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-white font-extrabold text-2xl tracking-tighter">N</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to your Nexora workspace
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
                <span>Continue with Google</span>
              </button>

              <button onClick={() => setMethod('email')}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm bg-white dark:bg-zinc-800 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer">
                <Mail className="w-5 h-5 text-zinc-500" />
                <span>Continue with Email</span>
              </button>

              <button onClick={() => setMethod('phone')}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm bg-white dark:bg-zinc-800 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer">
                <Phone className="w-5 h-5 text-zinc-500" />
                <span>Continue with Phone Number</span>
              </button>
            </div>
          ) : (
            <form className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300" onSubmit={handleLogin}>
              {method === 'email' ? (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-all dark:text-white" placeholder="you@company.com" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-all dark:text-white" placeholder="+1 (555) 000-0000" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-all dark:text-white" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-300 rounded cursor-pointer" />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    Remember me
                  </label>
                </div>
                <div className="text-xs">
                  <Link href="/forgot-password" className="font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setMethod(null)}
                  className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors w-1/3 cursor-pointer">
                  Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 flex justify-center items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all cursor-pointer disabled:opacity-70">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center text-xs text-zinc-600 dark:text-zinc-400 font-medium">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500">
              Sign up now <ArrowRight className="w-3 h-3 inline-block ml-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
