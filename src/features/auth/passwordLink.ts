/** OTP types the admin-users function issues; keep in sync with supabase/functions/admin-users/handler.ts. */
export type PasswordLinkType = 'invite' | 'recovery';

const TYPES: readonly PasswordLinkType[] = ['invite', 'recovery'];
/** GoTrue's hashed_token: a SHA-224 hex digest (56 lower-case hex characters). Anything else is never sent. */
const TOKEN_HASH = /^[0-9a-f]{56}$/;

export const SET_PASSWORD_PATH = '/set-password';

export function buildPasswordLink(origin: string, tokenHash: string, type: PasswordLinkType): string {
  const params = new URLSearchParams({ token_hash: tokenHash, type });
  return `${origin}${SET_PASSWORD_PATH}?${params.toString()}`;
}

export function parsePasswordLink(search: string): { tokenHash: string; type: PasswordLinkType } | null {
  const params = new URLSearchParams(search);
  const hashes = params.getAll('token_hash');
  const types = params.getAll('type');
  if (hashes.length !== 1 || types.length !== 1) return null;
  const [tokenHash] = hashes;
  const type = types[0] as PasswordLinkType;
  if (!TOKEN_HASH.test(tokenHash) || !TYPES.includes(type)) return null;
  return { tokenHash, type };
}
