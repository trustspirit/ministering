CREATE OR REPLACE FUNCTION public.get_app_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role user_role,
  display_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.current_user_role() IS DISTINCT FROM 'bishopric' THEN
    RAISE EXCEPTION 'Only bishopric can list users';
  END IF;
  RETURN QUERY
  SELECT
    p.user_id,
    u.email::TEXT,
    p.role,
    p.display_name,
    u.created_at
  FROM app_user_profiles p
  JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_app_users() TO authenticated;
