import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import type { Database } from '@/types/database.types';
import { appUsersKey } from './useAppUsers';

type Role = Database['public']['Enums']['user_role'];

/** The database refused because it would leave the ward without a bishopric (trigger guard_last_bishopric). */
export function isLastBishopricError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 'P0001' &&
    (err as { message?: unknown }).message === 'last_bishopric'
  );
}

export function useUpdateProfileRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase
        .from('app_user_profiles')
        .update({ role })
        .eq('user_id', userId);
      if (error) throw error;
    },
    // Also after a refusal, so every select shows the role actually stored.
    onSettled: () => qc.invalidateQueries({ queryKey: appUsersKey }),
  });
}

export function useUpdateDisplayName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, displayName }: { userId: string; displayName: string }) => {
      const { error } = await supabase
        .from('app_user_profiles')
        .update({ display_name: displayName })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: appUsersKey }),
  });
}
