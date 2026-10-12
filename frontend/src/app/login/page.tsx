'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AuthVisualPanel from '@/components/AuthVisualPanel';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  // Clear inputs on mount to ensure no stale credentials remain after signing out
  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  // Already logged in → redirect to dashboard
  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace('/');
    } catch (err: any) {
      setError(err?.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#a67c74] via-[#b68981] to-[#8c625a] dark:from-[#110e11] dark:via-[#19151e] dark:to-[#09080c] p-4 sm:p-6 lg:p-10 antialiased">
      {/* Main Split Card */}
      <div className="w-full max-w-[1040px] bg-white dark:bg-zinc-900 border border-white/60 dark:border-zinc-800 rounded-[32px] sm:rounded-[36px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.30)] overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        
        {/* Left Column: Sign In Form */}
        <div className="p-8 sm:p-12 lg:p-14 flex flex-col justify-center order-2 lg:order-1">
          <div className="mb-7">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight mb-2">
              Hello Again!
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Welcome back! Please enter your details.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start space-x-2.5 px-4 py-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Decoy hidden inputs to intercept aggressive browser autofill */}
            <input type="text" name="decoy_user" tabIndex={-1} aria-hidden="true" className="hidden" autoComplete="off" />
            <input type="password" name="decoy_pw" tabIndex={-1} aria-hidden="true" className="hidden" autoComplete="off" />

            {/* Email Field */}
            <div>
              <input
                type="email"
                name="nexora_user_identifier"
                id="nexora_login_email"
                autoComplete="new-password"
                data-lpignore="true"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Email"
                className="w-full px-4 py-3.5 bg-zinc-50/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#855866]/40 focus:border-[#855866] transition shadow-xs"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  name="nexora_auth_pass"
                  id="nexora_login_password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  className="w-full px-4 py-3.5 pr-11 bg-zinc-50/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#855866]/40 focus:border-[#855866] transition shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Recovery Password Link */}
              <div className="text-right mt-2">
                <button
                  type="button"
                  onClick={() => setError('Please contact your administrator to reset credentials.')}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer"
                >
                  Recovery Password
                </button>
              </div>
            </div>

            {/* Submit Button (chic mauve styling from reference template) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 bg-[#855866] hover:bg-[#734a57] active:scale-[0.99] disabled:opacity-60 text-white font-semibold rounded-2xl text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{busy ? 'Signing in…' : 'Sign In'}</span>
              </button>
            </div>
          </form>

          {/* Social Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white dark:bg-zinc-900 text-zinc-400 font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Logins */}
          <div className="flex items-center justify-center space-x-3 sm:space-x-4">
            {/* Google */}
            <button
              type="button"
              onClick={() => setError('Google sign-in is disabled. Please use your email & password.')}
              aria-label="Continue with Google"
              className="w-16 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 flex items-center justify-center transition shadow-xs cursor-pointer hover:border-zinc-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </button>

            {/* Apple */}
            <button
              type="button"
              onClick={() => setError('Apple sign-in is disabled. Please use your email & password.')}
              aria-label="Continue with Apple"
              className="w-16 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 flex items-center justify-center transition shadow-xs cursor-pointer hover:border-zinc-300"
            >
              <svg className="w-5 h-5 text-zinc-900 dark:text-white fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.08-7.72-7.85-12.06-14.3-6.53-9.67-11.66-20.73-15.38-33.18-3.73-12.45-5.59-24.16-5.59-35.14 0-14.3 3.65-26.06 10.96-35.29 7.3-9.22 16.5-13.9 27.58-14.03 4.24 0 9.28 1.14 15.11 3.42 5.83 2.28 9.68 3.48 11.55 3.6 2.06 0 6.13-1.32 12.22-3.95 6.09-2.63 11.53-3.73 16.32-3.3 12.07.98 21.84 5.76 29.31 14.34-10.66 6.42-15.88 15.34-15.66 26.77.22 8.92 3.65 16.42 10.3 22.51 6.64 6.09 14.57 9.58 23.77 10.45-2.07 6.1-4.79 12.4-8.14 18.89zM119.22 31.84c0-7.39 2.68-14.34 8.04-20.85 5.36-6.52 12.01-10.49 19.95-11.91.43 1.3.65 2.61.65 3.91 0 7.39-2.72 14.34-8.14 20.86-5.43 6.52-12.07 10.37-19.93 11.54-.22-1.19-.57-2.38-.57-3.55z" />
              </svg>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={() => setError('Facebook sign-in is disabled. Please use your email & password.')}
              aria-label="Continue with Facebook"
              className="w-16 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 flex items-center justify-center transition shadow-xs cursor-pointer hover:border-zinc-300"
            >
              <svg className="w-5 h-5 text-[#1877F2] fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>
          </div>

          {/* Bottom link */}
          <p className="mt-8 text-center text-xs sm:text-sm text-zinc-500 font-medium">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-zinc-900 dark:text-white hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        {/* Right Column: Visual Artwork Panel (matching user's uploaded template) */}
        <div className="p-3 sm:p-4 order-1 lg:order-2">
          <AuthVisualPanel />
        </div>

      </div>
    </div>
  );
}
