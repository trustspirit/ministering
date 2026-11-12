import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import type { Database } from '@/types/database.types';

export interface AppUser {
  user_id: string;
  email: string;
  role: Database['public']['Enums']['user_role'];
  display_name: string | null;
  created_at: string;
  /** True until the person has opened their invitation link (email not confirmed yet). */
  invite_pending: boolean;
}

export const appUsersKey = ['app-users'] as const;

export function useAppUsers() {
  return useQuery({
    queryKey: appUsersKey,
    queryFn: async (): Promise<AppUser[]> => {
      const { data, error } = await supabase.rpc('get_app_users');
      if (error) throw error;
      return (data ?? []) as AppUser[];
    },
  });
}
