-- The ward must never be left without a bishopric account: 20261113130000 guarded only DELETE, so the last
-- bishopric could still demote itself (Settings role select / PATCH app_user_profiles) and lock everyone out of user
-- management. The guard now also covers role changes away from bishopric.
--
-- Refusals raise SQLSTATE P0001 with the stable message 'last_bishopric' (the client maps it to its own text).
-- Still allowed: deleting / demoting a bishopric while another one exists (also by the service role), and any change
-- to a non-bishopric profile. Concurrent deletes or demotions of the last two bishopric accounts are serialised by an
-- advisory transaction lock, so the second one sees the first and is refused.
CREATE OR REPLACE FUNCTION public.guard_last_bishopric() RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.role = 'bishopric'
     AND (TG_OP = 'DELETE' OR NEW.role IS DISTINCT FROM 'bishopric') THEN
    PERFORM pg_advisory_xact_lock(hashtext('public.app_user_profiles.last_bishopric'));
    -- A fresh snapshot after the lock (volatile function, READ COMMITTED): a demotion or delete committed by the
    -- transaction that held the lock is visible here.
    IF NOT EXISTS (
      SELECT 1 FROM public.app_user_profiles WHERE role = 'bishopric' AND user_id <> OLD.user_id
    ) THEN
      RAISE EXCEPTION 'last_bishopric' USING ERRCODE = 'P0001',
        DETAIL = 'The last bishopric account cannot be deleted or given another role.';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_last_bishopric() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profiles_keep_last_bishopric ON public.app_user_profiles;
CREATE TRIGGER trg_profiles_keep_last_bishopric
  BEFORE DELETE OR UPDATE OF role ON public.app_user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_last_bishopric();

-- The settings badge: "has not opened the invitation yet" (email not confirmed). The earlier has_password flag could
-- not mean "has set a password": GoTrue stores a random password hash as soon as an invitation is verified, before
-- the person chooses their own. Only a boolean leaves the function. Still bishopric-only.
DROP FUNCTION IF EXISTS public.get_app_users();

CREATE FUNCTION public.get_app_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role user_role,
  display_name TEXT,
  created_at TIMESTAMPTZ,
  invite_pending BOOLEAN
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
    (u.email_confirmed_at IS NULL) AS invite_pending
  FROM public.app_user_profiles p
  JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_app_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_app_users() TO authenticated;
