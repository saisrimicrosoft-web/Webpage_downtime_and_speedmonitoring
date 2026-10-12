'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface ProfileState {
  name: string;
  email: string;
  updateProfile: (name: string, email: string) => void;
}

const ProfileContext = createContext<ProfileState>({
  name: '',
  email: '',
  updateProfile: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!user) {
      setName('');
      setEmail('');
      return;
    }

    let cancelled = false;

    // Immediately seed from user metadata so there is zero delay
    const initialName = user.user_metadata?.name || user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : '');
    const initialEmail = user.email || user.user_metadata?.email || '';
    if (initialName) setName(initialName);
    if (initialEmail) setEmail(initialEmail);

    async function loadProfile() {
      try {
        // Also check localStorage
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(`nexora_profile_${user!.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.name && !cancelled) setName(parsed.name);
            if (parsed.email && !cancelled) setEmail(parsed.email);
          }
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', user!.id)
          .single();

        if (cancelled) return;

        if (!error && data) {
          if (data.name) setName(data.name);
          if (data.email) setEmail(data.email);
        }
      } catch (err) {
        // Silently fallback to user_metadata
      }
    }

    loadProfile();

    // Safely listen for changes if table exists
    let channel: any = null;
    try {
      channel = supabase
        .channel('profile-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload: any) => {
            if (cancelled) return;
            if (payload.new?.name) setName(payload.new.name);
            if (payload.new?.email) setEmail(payload.new.email);
          })
        .subscribe();
    } catch {
      // Ignored
    }

    return () => {
      cancelled = true;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [user]);

  const updateProfile = useCallback((newName: string, newEmail: string) => {
    setName(newName);
    setEmail(newEmail);
  }, []);

  return (
    <ProfileContext.Provider value={{ name, email, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
