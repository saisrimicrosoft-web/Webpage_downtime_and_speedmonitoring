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
    const stored = localStorage.getItem('auth_token');
    if (!stored) { setLoading(false); return; }
    try {
      const { user: u } = await authApi.me();
      setToken(stored);
      setUser(u);
    } catch {
      localStorage.removeItem('auth_token');
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
