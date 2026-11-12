-- Soft-deleting a member through a plain UPDATE has never worked: members_select USING (is_deleted = false) is also
-- applied to the updated row, so setting is_deleted = true always violates the row-level security policy.
-- The delete now goes through this role-checked SECURITY DEFINER function. The cleanup trigger from
-- 20260419173703 still fires and removes the member's companion and recipient rows.

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
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_member(uuid) TO authenticated;
