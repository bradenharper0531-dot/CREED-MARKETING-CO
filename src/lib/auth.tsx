import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';

export type Role = 'owner' | 'rep';
export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /* true after someone opens a password-reset link from their email */
  recovering: boolean;
  doneRecovering: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  loading: false,
  recovering: false,
  doneRecovering: () => {},
  signOut: async () => {},
});

/* Role always comes from the `profiles` table (set by the owner-email allowlist
   in the database), never from anything typed at sign-up. */
async function loadProfile(session: Session): Promise<Profile> {
  const fallback: Profile = {
    id: session.user.id,
    email: session.user.email ?? '',
    fullName: (session.user.user_metadata?.full_name as string) || session.user.email || '',
    role: 'rep',
  };
  if (!supabase) return fallback;
  const { data } = await supabase.from('profiles').select('email, full_name, role').eq('id', session.user.id).maybeSingle();
  if (!data) return fallback;
  return { id: session.user.id, email: data.email, fullName: data.full_name || fallback.fullName, role: data.role === 'owner' ? 'owner' : 'rep' };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const apply = async (s: Session | null) => {
      setSession(s);
      setProfile(s ? await loadProfile(s) : null);
      if (alive) setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      // defer the profile query out of the auth callback (supabase-js guidance)
      setTimeout(() => apply(s), 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, recovering, doneRecovering: () => setRecovering(false), signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const initials = (name: string) =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
