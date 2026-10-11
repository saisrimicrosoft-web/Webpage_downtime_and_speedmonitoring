'use client';

// useMonitoring() — single shared data layer.
// Fetches websites, checks, incidents, ssl_certs on mount.
// Subscribes to Supabase Realtime for live updates.
// ALL pages read ONLY from this hook.

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import type { Website, Check, Incident, SslCert } from './types';

export interface MonitoringStore {
  websites:  Website[];
  checks:    Check[];
  incidents: Incident[];
  sslCerts:  SslCert[];
  loading:   boolean;
  error:     string | null;
  refresh:   () => Promise<void>;
}

export function useMonitoring(): MonitoringStore {
  const [websites,  setWebsites]  = useState<Website[]>([]);
  const [checks,    setChecks]    = useState<Check[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sslCerts,  setSslCerts]  = useState<SslCert[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [ws, ch, inc, ssl] = await Promise.all([
        supabase.from('websites').select('*').order('created_at', { ascending: false }),
        supabase.from('checks').select('*').order('checked_at', { ascending: false }).limit(500),
        supabase.from('incidents').select('*').order('started_at', { ascending: false }),
        supabase.from('ssl_certs').select('*'),
      ]);
      if (ws.error)  throw new Error(ws.error.message);
      if (ch.error)  throw new Error(ch.error.message);
      if (inc.error) throw new Error(inc.error.message);
      if (ssl.error) throw new Error(ssl.error.message);
      setWebsites(ws.data  ?? []);
      setChecks(ch.data    ?? []);
      setIncidents(inc.data ?? []);
      setSslCerts(ssl.data  ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => { refresh(); }, [refresh]);

  // Realtime subscriptions
  useEffect(() => {
    // Unsubscribe previous channels
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    const tables = ['websites', 'checks', 'incidents', 'ssl_certs'] as const;

    tables.forEach(table => {
      const ch = supabase
        .channel(`realtime:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          refresh();
        })
        .subscribe();
      channelsRef.current.push(ch);
    });

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    };
  }, [refresh]);

  return { websites, checks, incidents, sslCerts, loading, error, refresh };
}
