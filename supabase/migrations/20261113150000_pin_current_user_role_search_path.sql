-- current_user_role() is SECURITY DEFINER but had no search_path and an unqualified table name, so a caller-controlled
-- search_path could shadow app_user_profiles. Pin the search_path and qualify the table.
-- Signature, return type, volatility and language are unchanged; CREATE OR REPLACE keeps the existing ACL, which is
-- restated below exactly as it is today (PUBLIC, anon, authenticated, service_role and the owner may execute).
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role::TEXT FROM public.app_user_profiles WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO PUBLIC, anon, authenticated, service_role;
