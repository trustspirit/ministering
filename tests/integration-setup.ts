import { supabase } from '@/shared/lib/supabase';

// Fail fast, with one clear message, when the local stack is not running or not seeded.
beforeAll(async () => {
  const hint = "Run 'npx supabase start' and 'npx supabase db reset' first.";
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'viewer@test.local',
      password: 'password',
    });
    if (error) throw new Error(error.message);
    await supabase.auth.signOut();
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(`Local Supabase is not reachable or not seeded (${reason}). ${hint}`);
  }
});
