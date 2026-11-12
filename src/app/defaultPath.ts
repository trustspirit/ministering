import type { Role } from '@/shared/auth/usePermission';

export function defaultAssignmentPath(role: Role | null | undefined): '/assignments/rs' | '/assignments/eq' {
  return role === 'rs_president' ? '/assignments/rs' : '/assignments/eq';
}
