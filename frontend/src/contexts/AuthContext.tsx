import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
      } else {
        // Fallback to user metadata if public.profiles is not yet populated
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setProfile({
            id: user.id,
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
            email: user.email || '',
            avatar_url: null,
            created_at: user.created_at,
            updated_at: user.created_at,
          });
        }
      }
    } catch {
      // Gracefully continue even if table does not exist yet
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        throw new Error('Invalid email or password. Please try again.');
      }
      if (msg.includes('email not confirmed')) {
        throw new Error('Please confirm your email address before signing in.');
      }
      throw new Error(error.message || 'Unable to sign in. Please check your credentials.');
    }
    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      if (data.user) fetchProfile(data.user.id);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    // 1. Call backend endpoint to create user with email_confirm: true via Supabase Admin
    await api.post('/api/auth/signup', {
      fullName,
      email,
      password,
    });

    // 2. Sign in immediately to establish user session
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Account created, please sign in.');
    }

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      if (data.user) fetchProfile(data.user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
