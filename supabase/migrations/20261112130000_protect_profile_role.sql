-- profile_self_update 정책은 본인 row UPDATE를 허용하지만 컬럼을 구분하지 않아,
-- 누구나 자신의 role을 bishopric으로 바꿀 수 있었다. role / user_id 변경은 DB에서 직접 막는다.
-- auth.uid()가 NULL인 경우(SQL Editor, service role, 마이그레이션)는 최초 감독단 지정을 위해 허용한다.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns() RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be changed' USING ERRCODE = '42501';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(public.current_user_role(), '') <> 'bishopric' THEN
    RAISE EXCEPTION 'only bishopric can change roles' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_guard_privileged_columns
  BEFORE UPDATE ON app_user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();
