'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, AuthUser } from '@/lib/flaskApi';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login:  (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, token: null, loading: true,
  login: () => {}, logout: async () => {}, refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback((tok: string, u: AuthUser) => {
    localStorage.setItem('auth_token', tok);
    setToken(tok);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!stored) {
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await authApi.me();
      if (data && data.user) {
        setToken(stored);
        setUser(data.user);
      } else {
        throw new Error('Invalid user response');
      }
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
