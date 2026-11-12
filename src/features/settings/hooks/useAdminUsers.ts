import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PasswordLinkType } from '@/features/auth/passwordLink';
import { supabase } from '@/shared/lib/supabase';
import type { Database } from '@/types/database.types';
import { appUsersKey } from './useAppUsers';

type Role = Database['public']['Enums']['user_role'];

/** What the admin-users function returns for a new account or a password-change link (never a password). */
export interface PasswordLinkResult {
  userId: string;
  tokenHash: string;
  type: PasswordLinkType;
}

/** A refusal from the admin-users function, carrying its short error code (see the function's handler.ts). */
export class AdminUsersError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = 'AdminUsersError';
    this.code = code;
  }
}

async function invokeAdminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('admin-users', { body });
  if (error) {
    // HTTP errors carry the Response; its body is `{ error: <code> }`.
    const response = (error as { context?: unknown }).context;
    let code = 'network_error';
    if (response instanceof Response) {
      code = 'internal_error';
      try {
        const payload: unknown = await response.json();
        if (payload && typeof payload === 'object' && typeof (payload as { error?: unknown }).error === 'string') {
          code = (payload as { error: string }).error;
        } else if (response.status === 401) {
          code = 'unauthorized';
        }
      } catch {
        if (response.status === 401) code = 'unauthorized';
      }
    }
    throw new AdminUsersError(code);
  }
  if (data === null) throw new AdminUsersError('internal_error');
  return data;
}

export function useAdminUsers() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: appUsersKey });

  const createUser = useMutation({
    mutationFn: (input: { email: string; displayName: string; role: Role }) =>
      invokeAdminUsers<PasswordLinkResult>({ action: 'create', ...input }),
    onSuccess: refresh,
  });

  const createResetLink = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      invokeAdminUsers<PasswordLinkResult>({ action: 'reset', userId }),
    onSuccess: refresh,
  });

  const deleteUser = useMutation({
    mutationFn: ({ userId }: { userId: string }) => invokeAdminUsers<{ ok: true }>({ action: 'delete', userId }),
    onSettled: refresh,
  });

  return { createUser, createResetLink, deleteUser };
}
