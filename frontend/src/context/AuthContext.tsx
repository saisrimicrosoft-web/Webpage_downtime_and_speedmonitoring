'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety fallback timeout to prevent infinite loading if Supabase is unreachable
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // Initialise from existing session
    supabase.auth.getSession()
      .then(({ data }) => {
        setUser(data?.session?.user ?? null);
      })
      .catch((err) => {
        console.warn('Supabase auth session fetch failed:', err);
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name?: string) => {
    let apiSuccess = false;
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Sign up failed');
      }
      apiSuccess = true;
    } catch (err: any) {
      if (apiSuccess || (err?.message && !err.message.includes('fetch') && !err.message.includes('Network'))) {
        throw err;
      }
      // Fallback directly to client SDK
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: name ? { data: { name, email } } : undefined,
      });
      if (error) throw error;
    }

    // Auto sign in immediately so user is authenticated right away
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!signInError && signInData?.user) {
      setUser(signInData.user);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    }
    setUser(null);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('nexora_') || key.startsWith('sb-') || key.includes('profile') || key.includes('user'))) {
            toRemove.push(key);
          }
        }
        toRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        console.warn('Storage clear error:', e);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
