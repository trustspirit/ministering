-- soft_delete_member used to succeed silently for an id that does not exist or is already deleted.
-- Report it (P0002 = no_data_found) so the UI can tell the user and refresh.
-- Replaces the function from 20261113110000; role check and grants are unchanged.
CREATE OR REPLACE FUNCTION public.soft_delete_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_user_role() IS NULL
     OR public.current_user_role() NOT IN ('rs_president', 'eq_president', 'bishopric') THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  UPDATE public.members SET is_deleted = true WHERE id = p_member_id AND is_deleted = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'member not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
