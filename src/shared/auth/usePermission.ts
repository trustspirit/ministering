import { useAuth } from '@/features/auth/useAuth';
import type { Database } from '@/types/database.types';

export type Role = Database['public']['Enums']['user_role'];

export interface Permissions {
  canEditRS: boolean;
  canEditEQ: boolean;
  canEditMembers: boolean;
  canManageUsers: boolean;
}

export function computePermissions(role: Role | null | undefined): Permissions {
  const r = role ?? null;
  return {
    canEditRS: r === 'rs_president' || r === 'bishopric',
    canEditEQ: r === 'eq_president' || r === 'bishopric',
    canEditMembers: r !== null && r !== 'viewer',
    canManageUsers: r === 'bishopric',
  };
}

export function usePermission(): Permissions {
  const { profile } = useAuth();
  return computePermissions(profile?.role ?? null);
}
