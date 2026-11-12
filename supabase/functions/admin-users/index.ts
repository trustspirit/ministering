// Deno entry point of the `admin-users` Edge Function: HTTP + CORS, and the real Supabase clients bound to the
// runtime-agnostic handler. Not part of the Vite app: excluded from tsconfig, ESLint and the app bundle.
import { createClient } from 'npm:@supabase/supabase-js@2.103.3';
import { handleAdminUsers, type AdminDeps, type UserRole } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, clientOptions);
const anon = createClient(SUPABASE_URL, ANON_KEY, clientOptions);

const deps: AdminDeps = {
  async getCaller(token) {
    // Validated by the Auth server itself (signature, expiry, session not revoked) — not just decoded.
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data.user) return null;
    const { data: profile, error: profileError } = await service
      .from('app_user_profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    return profile ? { id: data.user.id, role: profile.role as UserRole } : null;
  },

  async findUserByEmail(email) {
    const perPage = 1000;
    for (let page = 1; ; page++) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const found = data.users.find((u) => u.email?.toLowerCase() === email);
      if (found) return { id: found.id };
      if (data.users.length < perPage) return null;
    }
  },

  async generateLink({ type, email, displayName }) {
    const { data, error } =
      type === 'invite'
        ? await service.auth.admin.generateLink({
            type,
            email,
            options: displayName ? { data: { full_name: displayName } } : undefined,
          })
        : await service.auth.admin.generateLink({ type, email });
    if (error) throw error;
    return { userId: data.user.id, tokenHash: data.properties.hashed_token };
  },

  async getUser(userId) {
    const { data, error } = await service.auth.admin.getUserById(userId);
    if (error) {
      if (error.status === 404) return null;
      throw error;
    }
    if (!data.user?.email) return null;
    return { email: data.user.email, confirmed: Boolean(data.user.email_confirmed_at) };
  },

  async setProfile(userId, { role, displayName }) {
    // The service role has no auth.uid(), which the profile guard trigger allows to set a role.
    const { data, error } = await service
      .from('app_user_profiles')
      .update({ role, display_name: displayName })
      .eq('user_id', userId)
      .select('user_id');
    if (error) throw error;
    if (data?.length !== 1) throw Object.assign(new Error('profile missing'), { code: 'profile_missing' });
  },

  async listBishopricIds() {
    const { data, error } = await service.from('app_user_profiles').select('user_id').eq('role', 'bishopric');
    if (error) throw error;
    return (data ?? []).map((r) => r.user_id as string);
  },

  async deleteUser(userId) {
    // app_user_profiles.user_id references auth.users ON DELETE CASCADE, so the profile goes with it.
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) throw error;
  },

  log(event, detail) {
    console.error(JSON.stringify({ fn: 'admin-users', event, ...detail }));
  },
};

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json(405, { error: 'invalid_request' }, origin);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_request' }, origin);
  }
  const result = await handleAdminUsers({ authHeader: req.headers.get('Authorization'), body }, deps);
  return json(result.status, result.body, origin);
});
