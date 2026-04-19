-- 회원/가정 쓰기 정책을 명시적 whitelist 로 리팩토링
DROP POLICY IF EXISTS members_insert ON members;
DROP POLICY IF EXISTS members_update ON members;
DROP POLICY IF EXISTS members_delete ON members;

CREATE POLICY members_insert ON members FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('rs_president', 'eq_president', 'bishopric'));
CREATE POLICY members_update ON members FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('rs_president', 'eq_president', 'bishopric'))
  WITH CHECK (public.current_user_role() IN ('rs_president', 'eq_president', 'bishopric'));
CREATE POLICY members_delete ON members FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('rs_president', 'eq_president', 'bishopric'));

DROP POLICY IF EXISTS households_insert ON households;
DROP POLICY IF EXISTS households_update ON households;
DROP POLICY IF EXISTS households_delete ON households;

CREATE POLICY households_insert ON households FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('rs_president', 'eq_president', 'bishopric'));
CREATE POLICY households_update ON households FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('rs_president', 'eq_president', 'bishopric'))
  WITH CHECK (public.current_user_role() IN ('rs_president', 'eq_president', 'bishopric'));
CREATE POLICY households_delete ON households FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('rs_president', 'eq_president', 'bishopric'));
