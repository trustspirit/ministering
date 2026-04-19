import { supabase } from '@/shared/lib/supabase';

beforeAll(async () => {
  const { error } = await supabase.from('members').select('id').limit(1);
  if (error) {
    throw new Error(
      `Local Supabase not reachable: ${error.message}. Run 'supabase start' first.`,
    );
  }
});
