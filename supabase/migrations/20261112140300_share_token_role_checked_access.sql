-- Share tokens are credentials: only users who can edit a ministry's organization may read or write them.
-- Column access to ministries.share_token is removed from API roles; the token is reachable only through
-- the two role-checked SECURITY DEFINER functions below (and get_ministry_share, which is token-gated).

REVOKE ALL ON public.ministries FROM anon;
REVOKE SELECT, INSERT, UPDATE ON public.ministries FROM authenticated;
GRANT SELECT (id, organization, number, name, created_at, updated_at) ON public.ministries TO authenticated;
GRANT INSERT (id, organization, number, name) ON public.ministries TO authenticated;
GRANT UPDATE (name, number) ON public.ministries TO authenticated;
-- DELETE stays as granted (governed by the ministries_*_delete policies).

-- Realtime must not stream the token either: publish every column except share_token.
ALTER PUBLICATION supabase_realtime DROP TABLE public.ministries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ministries (id, organization, number, name, created_at, updated_at);

CREATE OR REPLACE FUNCTION public.can_edit_ministry_org(p_ministry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ministries m
     WHERE m.id = p_ministry_id
       AND public.current_user_role() = ANY (
         CASE m.organization
           WHEN 'RS' THEN ARRAY['rs_president', 'bishopric']
           ELSE ARRAY['eq_president', 'bishopric']
         END)
  );
$$;
-- Internal helper: callable only by the definer functions below (Supabase default privileges grant EXECUTE to API roles).
REVOKE ALL ON FUNCTION public.can_edit_ministry_org(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_ministry_share_token(p_ministry_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT public.can_edit_ministry_org(p_ministry_id) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  SELECT share_token INTO v_token FROM public.ministries WHERE id = p_ministry_id;
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ministry_share_token(p_ministry_id uuid, p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_edit_ministry_org(p_ministry_id) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_token IS NOT NULL AND p_token !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid share token' USING ERRCODE = '22023';
  END IF;
  UPDATE public.ministries SET share_token = p_token WHERE id = p_ministry_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ministry_share_token(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_ministry_share_token(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ministry_share_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_ministry_share_token(uuid, text) TO authenticated;
