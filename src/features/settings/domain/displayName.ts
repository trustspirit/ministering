import { T } from '@/shared/copy';

/** Control characters and bidirectional overrides/isolates, which could disguise a name in the user list. */
// eslint-disable-next-line no-control-regex
const UNSAFE_NAME = /[\u0000-\u001f\u007f‪-‮⁦-⁩]/;
export const MAX_NAME = 50;

export type DisplayNameCheck =
  | { ok: true; name: string }
  | { ok: false; reason: 'required' | 'tooLong' | 'unsafe' };

/**
 * The same rule as the admin-users function and the app_user_profiles.display_name CHECK constraint:
 * 1-50 characters after trimming, no control or bidirectional formatting characters.
 */
export function validateDisplayName(raw: string): DisplayNameCheck {
  const name = raw.trim();
  if (!name) return { ok: false, reason: 'required' };
  if ([...name].length > MAX_NAME) return { ok: false, reason: 'tooLong' };
  if (UNSAFE_NAME.test(name)) return { ok: false, reason: 'unsafe' };
  return { ok: true, name };
}

/** The screen text for a failed check. */
export function nameProblem(reason: 'required' | 'tooLong' | 'unsafe'): string {
  return reason === 'required' ? T.settings.nameRequired : reason === 'tooLong' ? T.settings.nameTooLong : T.settings.nameUnsafe;
}
