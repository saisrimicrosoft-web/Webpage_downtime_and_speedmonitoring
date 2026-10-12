'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface ProfileState {
  name: string;
  email: string;
  avatarUrl: string;
  updateProfile: (name: string, email: string, avatarUrl?: string) => void;
  setAvatarUrl: (url: string) => void;
}

const ProfileContext = createContext<ProfileState>({
  name: '',
  email: '',
  avatarUrl: '',
  updateProfile: () => {},
  setAvatarUrl: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrlState] = useState('');

  // Initial avatar load from localStorage (supports guest too)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = user ? `nexora_avatar_${user.id}` : 'nexora_avatar_guest';
      const stored = localStorage.getItem(key) || localStorage.getItem('nexora_avatar_guest');
      if (stored) {
        setAvatarUrlState(stored);
      }
    }
  }, [user]);

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
    const initialAvatar = user.user_metadata?.avatar_url || '';
    if (initialName) setName(initialName);
    if (initialEmail) setEmail(initialEmail);
    if (initialAvatar) setAvatarUrlState(initialAvatar);

    async function loadProfile() {
      try {
        // Also check localStorage
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(`nexora_profile_${user!.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.name && !cancelled) setName(parsed.name);
            if (parsed.email && !cancelled) setEmail(parsed.email);
            if (parsed.avatar_url && !cancelled) setAvatarUrlState(parsed.avatar_url);
          }
          const storedAvatar = localStorage.getItem(`nexora_avatar_${user!.id}`);
          if (storedAvatar && !cancelled) setAvatarUrlState(storedAvatar);
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('name, email, avatar_url')
          .eq('id', user!.id)
          .single();

        if (cancelled) return;

        if (!error && data) {
          if (data.name) setName(data.name);
          if (data.email) setEmail(data.email);
          if (data.avatar_url) setAvatarUrlState(data.avatar_url);
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
            if (payload.new?.avatar_url) setAvatarUrlState(payload.new.avatar_url);
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

  const updateProfile = useCallback((newName: string, newEmail: string, newAvatar?: string) => {
    setName(newName);
    setEmail(newEmail);
    if (newAvatar !== undefined) {
      setAvatarUrlState(newAvatar);
      if (typeof window !== 'undefined') {
        const key = user ? `nexora_avatar_${user.id}` : 'nexora_avatar_guest';
        if (newAvatar) {
          localStorage.setItem(key, newAvatar);
        } else {
          localStorage.removeItem(key);
        }
      }
    }
  }, [user]);

  const setAvatarUrl = useCallback((url: string) => {
    setAvatarUrlState(url);
    if (typeof window !== 'undefined') {
      const key = user ? `nexora_avatar_${user.id}` : 'nexora_avatar_guest';
      if (url) {
        localStorage.setItem(key, url);
      } else {
        localStorage.removeItem(key);
      }
    }
  }, [user]);

  return (
    <ProfileContext.Provider value={{ name, email, avatarUrl, updateProfile, setAvatarUrl }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
