-- role 조회 함수 (JWT가 아닌 DB 조회 → role 변경 즉시 반영)
-- public 스키마에 배치 (auth 스키마는 migration 실행 역할의 권한 밖)
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS TEXT AS $$
  SELECT role::TEXT FROM app_user_profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- RLS 활성화
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_member_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_household_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY members_select ON members FOR SELECT TO authenticated
  USING (is_deleted = false);
CREATE POLICY households_select ON households FOR SELECT TO authenticated
  USING (true);
CREATE POLICY ministries_select ON ministries FOR SELECT TO authenticated
  USING (true);
CREATE POLICY companions_select ON ministry_companions FOR SELECT TO authenticated
  USING (true);
CREATE POLICY rs_recipients_select ON ministry_member_recipients FOR SELECT TO authenticated
  USING (true);
CREATE POLICY eq_recipients_select ON ministry_household_recipients FOR SELECT TO authenticated
  USING (true);
CREATE POLICY profiles_select ON app_user_profiles FOR SELECT TO authenticated
  USING (true);

-- members / households write (viewer 제외)
CREATE POLICY members_insert ON members FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() <> 'viewer');
CREATE POLICY members_update ON members FOR UPDATE TO authenticated
  USING (public.current_user_role() <> 'viewer')
  WITH CHECK (public.current_user_role() <> 'viewer');
CREATE POLICY members_delete ON members FOR DELETE TO authenticated
  USING (public.current_user_role() <> 'viewer');

CREATE POLICY households_insert ON households FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() <> 'viewer');
CREATE POLICY households_update ON households FOR UPDATE TO authenticated
  USING (public.current_user_role() <> 'viewer')
  WITH CHECK (public.current_user_role() <> 'viewer');
CREATE POLICY households_delete ON households FOR DELETE TO authenticated
  USING (public.current_user_role() <> 'viewer');

-- RS ministries write
CREATE POLICY ministries_rs_insert ON ministries FOR INSERT TO authenticated
  WITH CHECK (organization = 'RS' AND public.current_user_role() IN ('rs_president', 'bishopric'));
CREATE POLICY ministries_rs_update ON ministries FOR UPDATE TO authenticated
  USING (organization = 'RS' AND public.current_user_role() IN ('rs_president', 'bishopric'))
  WITH CHECK (organization = 'RS' AND public.current_user_role() IN ('rs_president', 'bishopric'));
CREATE POLICY ministries_rs_delete ON ministries FOR DELETE TO authenticated
  USING (organization = 'RS' AND public.current_user_role() IN ('rs_president', 'bishopric'));

-- EQ ministries write
CREATE POLICY ministries_eq_insert ON ministries FOR INSERT TO authenticated
  WITH CHECK (organization = 'EQ' AND public.current_user_role() IN ('eq_president', 'bishopric'));
CREATE POLICY ministries_eq_update ON ministries FOR UPDATE TO authenticated
  USING (organization = 'EQ' AND public.current_user_role() IN ('eq_president', 'bishopric'))
  WITH CHECK (organization = 'EQ' AND public.current_user_role() IN ('eq_president', 'bishopric'));
CREATE POLICY ministries_eq_delete ON ministries FOR DELETE TO authenticated
  USING (organization = 'EQ' AND public.current_user_role() IN ('eq_president', 'bishopric'));

-- companions write: 해당 ministry의 organization에 따라 분기
CREATE POLICY companions_write ON ministry_companions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ministries m WHERE m.id = ministry_id AND (
      (m.organization = 'RS' AND public.current_user_role() IN ('rs_president', 'bishopric'))
      OR (m.organization = 'EQ' AND public.current_user_role() IN ('eq_president', 'bishopric'))
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM ministries m WHERE m.id = ministry_id AND (
      (m.organization = 'RS' AND public.current_user_role() IN ('rs_president', 'bishopric'))
      OR (m.organization = 'EQ' AND public.current_user_role() IN ('eq_president', 'bishopric'))
    )
  ));

CREATE POLICY rs_recipients_write ON ministry_member_recipients FOR ALL TO authenticated
  USING (public.current_user_role() IN ('rs_president', 'bishopric'))
  WITH CHECK (public.current_user_role() IN ('rs_president', 'bishopric'));

CREATE POLICY eq_recipients_write ON ministry_household_recipients FOR ALL TO authenticated
  USING (public.current_user_role() IN ('eq_president', 'bishopric'))
  WITH CHECK (public.current_user_role() IN ('eq_president', 'bishopric'));

-- app_user_profiles: role 변경은 bishopric만, 본인 row만 UPDATE 가능 (display_name 등)
CREATE POLICY profile_self_update ON app_user_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() = 'bishopric')
  WITH CHECK (user_id = auth.uid() OR public.current_user_role() = 'bishopric');
