import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase';
import { AuthContext, type Profile } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Keyed by user id so a profile fetched for one user is never shown for another.
  const [loadedProfile, setLoadedProfile] = useState<{ userId: string; profile: Profile | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase.from('app_user_profiles').select('*').eq('user_id', userId).single()
      .then(({ data }) => { if (!cancelled) setLoadedProfile({ userId, profile: data ?? null }); });
    return () => { cancelled = true; };
  }, [userId]);

  const profile = userId && loadedProfile?.userId === userId ? loadedProfile.profile : null;

  const profileLoaded = !userId || loadedProfile?.userId === userId;

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    // A session the server no longer knows (e.g. after a database reset) makes the global sign-out fail; the user
    // must still end up signed out in this browser.
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) return;
    } catch {
      // fall through to the local sign-out
    }
    await supabase.auth.signOut({ scope: 'local' });
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileLoaded,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
