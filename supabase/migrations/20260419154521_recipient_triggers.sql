-- RS recipient는 F 회원 + RS ministry만 허용
CREATE OR REPLACE FUNCTION check_rs_recipient() RETURNS TRIGGER AS $$
DECLARE
  org organization;
  member_gender gender;
BEGIN
  SELECT organization INTO org FROM ministries WHERE id = NEW.ministry_id;
  IF org IS DISTINCT FROM 'RS' THEN
    RAISE EXCEPTION 'ministry_member_recipients requires RS ministry (got %)', org;
  END IF;
  SELECT gender INTO member_gender FROM members WHERE id = NEW.member_id;
  IF member_gender IS DISTINCT FROM 'F' THEN
    RAISE EXCEPTION 'ministry_member_recipients requires female member';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rs_recipient_check
  BEFORE INSERT OR UPDATE ON ministry_member_recipients
  FOR EACH ROW EXECUTE FUNCTION check_rs_recipient();

-- EQ recipient는 EQ ministry만 허용
CREATE OR REPLACE FUNCTION check_eq_recipient() RETURNS TRIGGER AS $$
DECLARE
  org organization;
BEGIN
  SELECT organization INTO org FROM ministries WHERE id = NEW.ministry_id;
  IF org IS DISTINCT FROM 'EQ' THEN
    RAISE EXCEPTION 'ministry_household_recipients requires EQ ministry (got %)', org;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_eq_recipient_check
  BEFORE INSERT OR UPDATE ON ministry_household_recipients
  FOR EACH ROW EXECUTE FUNCTION check_eq_recipient();

-- 최초 로그인 시 app_user_profiles 자동 생성
CREATE OR REPLACE FUNCTION handle_new_auth_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO app_user_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auth_user_profile_create
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
