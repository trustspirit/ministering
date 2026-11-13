import { randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export type Account = 'bishop' | 'rs' | 'eq' | 'viewer';

/** A client that keeps no session, so every test user is isolated from the others. */
export function newClient(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (see .env.local).');
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function signedInClient(account: Account): Promise<SupabaseClient> {
  const client = newClient();
  const { error } = await client.auth.signInWithPassword({
    email: `${account}@test.local`,
    password: 'password',
  });
  if (error) {
    throw new Error(`Cannot sign in as ${account}@test.local: ${error.message}. Run 'npx supabase db reset'.`);
  }
  return client;
}

export function newShareToken(): string {
  return randomBytes(32).toString('hex');
}

/** Random suffix so concurrent or repeated runs never collide on unique columns. */
export function runId(): string {
  return randomBytes(4).toString('hex');
}

/** Collect every object key at any depth of a JSON value. */
export function collectKeys(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((v) => collectKeys(v, into));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      into.add(k);
      collectKeys(v, into);
    }
  }
  return into;
}

/**
 * Tracks rows a test file creates so afterAll can remove them. Soft-deleted members stay hidden by RLS and cannot be
 * hard-deleted through the API; their names carry the "ITEST" prefix and they are invisible to the app.
 */
export class Cleanup {
  ministries: string[] = [];
  households: string[] = [];
  members: string[] = [];

  async run(bishop: SupabaseClient) {
    if (this.ministries.length) await bishop.from('ministries').delete().in('id', this.ministries);
    if (this.households.length) await bishop.from('households').delete().in('id', this.households);
    if (this.members.length) await bishop.from('members').delete().in('id', this.members);
  }
}
