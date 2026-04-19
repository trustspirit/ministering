-- ENUM types
CREATE TYPE gender AS ENUM ('M', 'F');
CREATE TYPE active_status AS ENUM ('active', 'less_active');
CREATE TYPE personality AS ENUM ('active', 'moderate', 'passive');
CREATE TYPE household_role AS ENUM ('husband', 'wife', 'child', 'other');
CREATE TYPE organization AS ENUM ('RS', 'EQ');
CREATE TYPE user_role AS ENUM ('rs_president', 'eq_president', 'bishopric', 'viewer');

-- households
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- members
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  gender gender NOT NULL,
  birth_date DATE NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  active_status active_status NOT NULL DEFAULT 'active',
  personality personality NOT NULL DEFAULT 'moderate',
  memo TEXT,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  household_role household_role NOT NULL DEFAULT 'other',
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT members_name_birth_unique UNIQUE (full_name, birth_date)
);

-- 같은 가정에서 husband/wife는 각각 최대 1명 (partial unique)
CREATE UNIQUE INDEX members_one_husband_per_household
  ON members (household_id) WHERE household_role = 'husband';
CREATE UNIQUE INDEX members_one_wife_per_household
  ON members (household_id) WHERE household_role = 'wife';

-- ministries (조)
CREATE TABLE ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization organization NOT NULL,
  number INTEGER NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ministries_org_number_unique UNIQUE (organization, number)
);

-- ministry_companions (조 동반자)
CREATE TABLE ministry_companions (
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  since_date DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (ministry_id, member_id),
  CONSTRAINT companions_member_unique UNIQUE (member_id)
);

-- ministry_member_recipients (RS 조원)
CREATE TABLE ministry_member_recipients (
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (ministry_id, member_id),
  CONSTRAINT rs_recipient_member_unique UNIQUE (member_id)
);

-- ministry_household_recipients (EQ 조원)
CREATE TABLE ministry_household_recipients (
  ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  PRIMARY KEY (ministry_id, household_id),
  CONSTRAINT eq_recipient_household_unique UNIQUE (household_id)
);

-- app_user_profiles (Supabase auth.users 확장)
CREATE TABLE app_user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_households_updated BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ministries_updated BEFORE UPDATE ON ministries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON app_user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
