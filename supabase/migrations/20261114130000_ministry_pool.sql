-- The ministry pool: who an organization's assignment board shows, by role. Presidencies add the people and
-- households they are organizing instead of seeing every adult of the ward.
--   EQ companion -> member, EQ recipient -> household, RS companion / recipient -> member.
-- Assigning someone (from anywhere) puts them in the pool for that role, and unassigning keeps them there, so the
-- pool always contains everyone currently assigned.

CREATE TYPE pool_role AS ENUM ('companion', 'recipient');

CREATE TABLE public.ministry_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization organization NOT NULL,
  role pool_role NOT NULL,
  member_id uuid REFERENCES public.members (id) ON DELETE CASCADE,
  household_id uuid REFERENCES public.households (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ministry_pool_one_target CHECK ((member_id IS NULL) <> (household_id IS NULL)),
  -- Households are EQ recipients and nothing else; EQ recipients are households only.
  CONSTRAINT ministry_pool_target_kind CHECK (
    (household_id IS NOT NULL) = (organization = 'EQ' AND role = 'recipient')
  ),
  CONSTRAINT ministry_pool_member_unique UNIQUE (organization, role, member_id),
  CONSTRAINT ministry_pool_household_unique UNIQUE (organization, role, household_id)
);

CREATE INDEX ministry_pool_member_idx ON public.ministry_pool (member_id);
CREATE INDEX ministry_pool_household_idx ON public.ministry_pool (household_id);

REVOKE ALL ON public.ministry_pool FROM anon;

ALTER TABLE public.ministry_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY pool_select ON public.ministry_pool FOR SELECT TO authenticated USING (true);

CREATE POLICY pool_rs_write ON public.ministry_pool FOR ALL TO authenticated
  USING (organization = 'RS' AND public.current_user_role() IN ('rs_president', 'bishopric'))
  WITH CHECK (organization = 'RS' AND public.current_user_role() IN ('rs_president', 'bishopric'));

CREATE POLICY pool_eq_write ON public.ministry_pool FOR ALL TO authenticated
  USING (organization = 'EQ' AND public.current_user_role() IN ('eq_president', 'bishopric'))
  WITH CHECK (organization = 'EQ' AND public.current_user_role() IN ('eq_president', 'bishopric'));

-- Assignment -> pool. SECURITY DEFINER: whoever may assign in an organization may also grow its pool, and the
-- pool write must not depend on how the caller's role maps onto the pool policies.
CREATE OR REPLACE FUNCTION public.pool_from_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org organization;
BEGIN
  SELECT organization INTO v_org FROM ministries WHERE id = NEW.ministry_id;
  IF TG_TABLE_NAME = 'ministry_companions' THEN
    INSERT INTO ministry_pool (organization, role, member_id) VALUES (v_org, 'companion', NEW.member_id)
      ON CONFLICT DO NOTHING;
  ELSIF TG_TABLE_NAME = 'ministry_member_recipients' THEN
    INSERT INTO ministry_pool (organization, role, member_id) VALUES (v_org, 'recipient', NEW.member_id)
      ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO ministry_pool (organization, role, household_id) VALUES (v_org, 'recipient', NEW.household_id)
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.pool_from_assignment() FROM PUBLIC;

CREATE TRIGGER pool_from_companion AFTER INSERT ON public.ministry_companions
  FOR EACH ROW EXECUTE FUNCTION public.pool_from_assignment();
CREATE TRIGGER pool_from_member_recipient AFTER INSERT ON public.ministry_member_recipients
  FOR EACH ROW EXECUTE FUNCTION public.pool_from_assignment();
CREATE TRIGGER pool_from_household_recipient AFTER INSERT ON public.ministry_household_recipients
  FOR EACH ROW EXECUTE FUNCTION public.pool_from_assignment();

-- A soft-deleted member also leaves every pool.
CREATE OR REPLACE FUNCTION cleanup_member_assignments_on_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = true AND (OLD.is_deleted IS NULL OR OLD.is_deleted = false) THEN
    DELETE FROM ministry_companions WHERE member_id = NEW.id;
    DELETE FROM ministry_member_recipients WHERE member_id = NEW.id;
    DELETE FROM presidency_members WHERE member_id = NEW.id;
    DELETE FROM ministry_pool WHERE member_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The pool starts as everyone assigned today.
INSERT INTO ministry_pool (organization, role, member_id)
  SELECT DISTINCT m.organization, 'companion'::pool_role, c.member_id
    FROM ministry_companions c JOIN ministries m ON m.id = c.ministry_id
  ON CONFLICT DO NOTHING;
INSERT INTO ministry_pool (organization, role, member_id)
  SELECT DISTINCT m.organization, 'recipient'::pool_role, r.member_id
    FROM ministry_member_recipients r JOIN ministries m ON m.id = r.ministry_id
  ON CONFLICT DO NOTHING;
INSERT INTO ministry_pool (organization, role, household_id)
  SELECT DISTINCT m.organization, 'recipient'::pool_role, r.household_id
    FROM ministry_household_recipients r JOIN ministries m ON m.id = r.ministry_id
  ON CONFLICT DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.ministry_pool;
