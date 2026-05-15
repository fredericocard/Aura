'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  isLoggedIn: boolean;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInAsGuest: () => Promise<{ error: string | null }>;
  promoteGuest: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  promoteGuestWithGoogle: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0] },
      },
    });
    if (error) return { error: error.message };
    // Supabase returns a user with empty identities when the email is already taken
    // (instead of an error, to prevent email enumeration)
    if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
      return { error: 'This email is already linked to an Aura account. Try logging in instead.' };
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signInAsGuest = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    return { error: error?.message ?? null };
  };

  // Promote anonymous guest to full account with email/password
  // Uses updateUser which keeps the same user ID — all guest data stays linked
  const promoteGuest = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.updateUser({
      email,
      password,
      data: { display_name: displayName || email.split('@')[0] },
    });
    if (!error) {
      // Update the profile row to mark as full account
      const userId = user?.id;
      if (userId) {
        await supabase.from('profiles').update({
          account_type: 'full',
          email,
          display_name: displayName || email.split('@')[0],
        }).eq('id', userId);
      }
    }
    return { error: error?.message ?? null };
  };

  // Promote anonymous guest via Google SSO (links identity to existing anon user)
  const promoteGuestWithGoogle = async () => {
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin + '/review' : undefined,
      },
    });
    return { error: error?.message ?? null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin + '/landing' : undefined,
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isGuest = user?.is_anonymous === true;
  const isLoggedIn = !!user && !isGuest;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isGuest,
      isLoggedIn,
      loading,
      signUp,
      signIn,
      signInAsGuest,
      promoteGuest,
      promoteGuestWithGoogle,
      resetPassword,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
