/**
 * Bishopric-only user management (spec §9.9), runtime-agnostic so vitest can test it.
 * `index.ts` (Deno) binds `AdminDeps` to the real Supabase clients.
 *
 * The function never handles passwords: accounts are created without one and the person sets their own through the
 * returned one-time link. Responses carry only the token hash (never GoTrue's `action_link`), and errors are a code
 * from the fixed list below — never raw GoTrue / Postgres text.
 */

export type UserRole = 'rs_president' | 'eq_president' | 'bishopric' | 'viewer';
/** OTP types the set-password page verifies; keep in sync with src/features/auth/passwordLink.ts. */
export type LinkType = 'invite' | 'recovery';

export const USER_ROLES: readonly UserRole[] = ['rs_president', 'eq_president', 'bishopric', 'viewer'];

export type ErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'invalid_request'
  | 'invalid_action'
  | 'invalid_email'
  | 'invalid_name'
  | 'invalid_role'
  | 'user_not_found'
  | 'email_exists'
  | 'cannot_delete_self'
  | 'last_bishopric'
  | 'internal_error';

export interface AdminDeps {
  /** The signed-in user behind an access token, with the role from app_user_profiles; null when the token is invalid. */
  getCaller(token: string): Promise<{ id: string; role: UserRole } | null>;
  /** An existing account with exactly this (normalised) email. */
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  /** Creates (invite) or re-issues a one-time link; each call replaces the user's previous unused token of that type. */
  generateLink(a: { type: LinkType; email: string; displayName?: string }): Promise<{ userId: string; tokenHash: string }>;
  /** `confirmed` is false while an invitation has never been opened. */
  getUser(userId: string): Promise<{ email: string; confirmed: boolean } | null>;
  setProfile(userId: string, a: { role: UserRole; displayName: string }): Promise<void>;
  listBishopricIds(): Promise<string[]>;
  deleteUser(userId: string): Promise<void>;
  /** Receives only an event name and non-secret details (never error text, tokens or hashes). */
  log?(event: string, detail?: Record<string, string | number | boolean>): void;
}

export interface AdminRequest {
  authHeader: string | null;
  body: unknown;
}

export interface AdminResponse {
  status: number;
  body: unknown;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NAME = 50;
/** Control characters and bidirectional overrides/isolates, which could disguise a name in the user list. */
// eslint-disable-next-line no-control-regex
const UNSAFE_NAME = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/;
const MAX_EMAIL = 254;

const fail = (status: number, error: ErrorCode): AdminResponse => ({ status, body: { error } });

function bearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)\s*$/i);
  return match ? match[1] : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isRole(v: unknown): v is UserRole {
  return typeof v === 'string' && (USER_ROLES as readonly string[]).includes(v);
}

function isUserId(v: unknown): v is string {
  return typeof v === 'string' && UUID.test(v);
}

/** GoTrue answers 422 `email_exists` ("A user with this email address has already been registered"). */
function isEmailExists(err: unknown): boolean {
  if (!isRecord(err) && !(err instanceof Error)) return false;
  const e = err as { code?: unknown; message?: unknown };
  return e.code === 'email_exists' || (typeof e.message === 'string' && /already (been )?registered/i.test(e.message));
}

/** GoTrue refuses an address it cannot validate (e.g. a non-ASCII local part) with 400 `validation_failed`. */
function isEmailRejected(err: unknown): boolean {
  if (!isRecord(err) && !(err instanceof Error)) return false;
  const e = err as { code?: unknown; status?: unknown };
  return e.code === 'validation_failed' || e.code === 'email_address_invalid';
}

/** A safe label for logs: the error's code or status if it has one, never its message. */
function errorKind(err: unknown): string {
  if (isRecord(err) || err instanceof Error) {
    const e = err as { code?: unknown; status?: unknown; name?: unknown };
    if (typeof e.code === 'string' && /^[a-z0-9_]{1,40}$/i.test(e.code)) return e.code;
    if (typeof e.status === 'number') return `status_${e.status}`;
  }
  return 'unknown';
}

async function create(body: Record<string, unknown>, deps: AdminDeps): Promise<AdminResponse> {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > MAX_EMAIL || !EMAIL.test(email)) return fail(400, 'invalid_email');
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  if (!displayName || [...displayName].length > MAX_NAME || UNSAFE_NAME.test(displayName)) {
    return fail(400, 'invalid_name');
  }
  if (!isRole(body.role)) return fail(400, 'invalid_role');
  const role = body.role;

  // An unopened invitation is silently re-issued by GoTrue for the same email, so existing accounts are refused first.
  if (await deps.findUserByEmail(email)) return fail(409, 'email_exists');

  let link: { userId: string; tokenHash: string };
  try {
    link = await deps.generateLink({ type: 'invite', email, displayName });
  } catch (err) {
    if (isEmailExists(err)) return fail(409, 'email_exists');
    if (isEmailRejected(err)) return fail(400, 'invalid_email');
    deps.log?.('create_link_failed', { kind: errorKind(err) });
    return fail(500, 'internal_error');
  }

  try {
    await deps.setProfile(link.userId, { role, displayName });
  } catch (err) {
    deps.log?.('create_profile_failed', { kind: errorKind(err) });
    // No half-created accounts: without its role the new account must not exist.
    try {
      await deps.deleteUser(link.userId);
    } catch (cleanupErr) {
      deps.log?.('create_rollback_failed', { kind: errorKind(cleanupErr) });
    }
    return fail(500, 'internal_error');
  }

  return { status: 200, body: { userId: link.userId, tokenHash: link.tokenHash, type: 'invite' } };
}

async function reset(body: Record<string, unknown>, deps: AdminDeps): Promise<AdminResponse> {
  if (!isUserId(body.userId)) return fail(400, 'user_not_found');
  const userId = body.userId;
  const target = await deps.getUser(userId);
  if (!target) return fail(400, 'user_not_found');

  // GoTrue keeps one token per type and user. Someone who never opened their invitation still has a live invite
  // token, which a recovery link would NOT replace — so they get a fresh invitation instead (it replaces the old one).
  const type: LinkType = target.confirmed ? 'recovery' : 'invite';
  try {
    const link = await deps.generateLink({ type, email: target.email });
    return { status: 200, body: { userId, tokenHash: link.tokenHash, type } };
  } catch (err) {
    deps.log?.('reset_link_failed', { kind: errorKind(err), type });
    return fail(500, 'internal_error');
  }
}

async function remove(body: Record<string, unknown>, callerId: string, deps: AdminDeps): Promise<AdminResponse> {
  if (!isUserId(body.userId)) return fail(400, 'user_not_found');
  const userId = body.userId;
  if (userId.toLowerCase() === callerId.toLowerCase()) return fail(403, 'cannot_delete_self');
  if (!(await deps.getUser(userId))) return fail(400, 'user_not_found');

  // The ward must never lock itself out of user management.
  const bishopric = await deps.listBishopricIds();
  if (bishopric.includes(userId) && bishopric.filter((id) => id !== userId).length === 0) {
    return fail(409, 'last_bishopric');
  }

  try {
    await deps.deleteUser(userId);
  } catch (err) {
    deps.log?.('delete_failed', { kind: errorKind(err) });
    return fail(500, 'internal_error');
  }
  return { status: 200, body: { ok: true } };
}

export async function handleAdminUsers(req: AdminRequest, deps: AdminDeps): Promise<AdminResponse> {
  try {
    const token = bearerToken(req.authHeader);
    if (!token) return fail(401, 'unauthorized');
    // Identity and role come only from the verified token and the profiles table — never from the request body.
    const caller = await deps.getCaller(token);
    if (!caller) return fail(401, 'unauthorized');
    if (caller.role !== 'bishopric') return fail(403, 'forbidden');

    const body = req.body;
    if (!isRecord(body)) return fail(400, 'invalid_request');
    switch (body.action) {
      case 'create':
        return await create(body, deps);
      case 'reset':
        return await reset(body, deps);
      case 'delete':
        return await remove(body, caller.id, deps);
      default:
        return fail(400, 'invalid_action');
    }
  } catch (err) {
    deps.log?.('unexpected_failure', { kind: errorKind(err) });
    return fail(500, 'internal_error');
  }
}
