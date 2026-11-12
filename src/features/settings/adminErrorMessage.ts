import { T } from '@/shared/copy';
import { AdminUsersError } from './hooks/useAdminUsers';

/** A Korean message for a failed admin-users call (the function only ever returns short codes). */
export function adminErrorMessage(err: unknown): string {
  if (err instanceof AdminUsersError) return T.settings.adminErrors[err.code] ?? T.settings.adminFailed;
  return T.settings.adminFailed;
}
