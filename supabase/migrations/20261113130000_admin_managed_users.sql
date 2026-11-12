-- Admin-managed users (spec §9.9): accounts are created by the admin-users Edge Function through GoTrue.
--
-- 1. handle_new_auth_user had no search_path. GoTrue inserts into auth.users as supabase_auth_admin, whose
--    search_path is `auth`, so the unqualified `app_user_profiles` did not resolve and EVERY user created through
--    the Auth API (dashboard "Add user", admin invite) failed with "Database error saving new user". Only users
--    inserted by SQL (the seed) worked. Pin the search_path and qualify the table.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.app_user_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. get_app_users also tells whether the person has set a password yet (invited accounts have none until they
--    open their link). Only a boolean leaves the function, never the hash. Still bishopric-only.
DROP FUNCTION IF EXISTS public.get_app_users();

CREATE FUNCTION public.get_app_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role user_role,
  display_name TEXT,
  created_at TIMESTAMPTZ,
  has_password BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'bishopric' THEN
    RAISE EXCEPTION 'Only bishopric can list users' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    p.user_id,
    u.email::TEXT,
    p.role,
    p.display_name,
    u.created_at,
    (u.encrypted_password IS NOT NULL AND u.encrypted_password <> '') AS has_password
  FROM public.app_user_profiles p
  JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_app_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_app_users() TO authenticated;

-- 3. The ward must never lose its last bishopric account (nobody could manage users any more). The admin-users
--    function refuses this too; the trigger also covers two bishopric members deleting each other at the same time
--    (the advisory lock serialises them, so the second sees the first deletion) and deletes from the dashboard.
CREATE OR REPLACE FUNCTION public.guard_last_bishopric() RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.role = 'bishopric' THEN
    PERFORM pg_advisory_xact_lock(hashtext('public.app_user_profiles.last_bishopric'));
    IF NOT EXISTS (
      SELECT 1 FROM public.app_user_profiles WHERE role = 'bishopric' AND user_id <> OLD.user_id
    ) THEN
      RAISE EXCEPTION 'the last bishopric account cannot be deleted' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_last_bishopric() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_profiles_keep_last_bishopric
  BEFORE DELETE ON public.app_user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_last_bishopric();
