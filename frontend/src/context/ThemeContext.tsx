'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'Light' | 'Dark' | 'System';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'Dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('Dark');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  const applyTheme = useCallback((mode: ThemeMode) => {
    if (typeof window === 'undefined') return;

    let targetIsDark = true;
    if (mode === 'Dark') {
      targetIsDark = true;
    } else if (mode === 'Light') {
      targetIsDark = false;
    } else if (mode === 'System') {
      targetIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    const root = document.documentElement;
    if (targetIsDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      setResolvedTheme('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      setResolvedTheme('light');
    }
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('nexora_theme', newTheme);
    } catch {}
    applyTheme(newTheme);
  }, [applyTheme]);

  // Initial mount: load saved theme or default to Dark
  useEffect(() => {
    let initial: ThemeMode = 'Dark';
    try {
      const stored = localStorage.getItem('nexora_theme') as ThemeMode | null;
      if (stored === 'Light') {
        initial = 'Light';
      } else {
        initial = 'Dark';
        localStorage.setItem('nexora_theme', 'Dark');
      }
    } catch {}

    setThemeState(initial);
    applyTheme(initial);
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
