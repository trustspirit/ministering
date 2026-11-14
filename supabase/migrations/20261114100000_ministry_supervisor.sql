-- Each organization keeps a presidency (members chosen from the roster), and each ministry may name one of that
-- organization's presidency members as its supervisor ("담당 회장단"). The composite foreign key is what makes
-- "only a member of this organization's presidency" a database rule: a supervisor outside it is refused (23503),
-- and taking someone out of the presidency clears the ministries they supervised.

CREATE TABLE public.presidency_members (
  organization organization NOT NULL,
  member_id uuid NOT NULL REFERENCES public.members (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization, member_id)
);

CREATE INDEX presidency_members_member_idx ON public.presidency_members (member_id);

ALTER TABLE public.ministries ADD COLUMN supervisor_member_id uuid;

ALTER TABLE public.ministries
  ADD CONSTRAINT ministries_supervisor_fk
  FOREIGN KEY (organization, supervisor_member_id)
  REFERENCES public.presidency_members (organization, member_id)
  ON DELETE SET NULL (supervisor_member_id);

CREATE INDEX ministries_supervisor_idx ON public.ministries (organization, supervisor_member_id);

-- ministries uses column privileges (share_token stays unreadable): the new column needs its own grants.
GRANT SELECT (supervisor_member_id), INSERT (supervisor_member_id), UPDATE (supervisor_member_id)
  ON public.ministries TO authenticated;

REVOKE ALL ON public.presidency_members FROM anon;

ALTER TABLE public.presidency_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY presidency_select ON public.presidency_members FOR SELECT TO authenticated USING (true);

CREATE POLICY presidency_rs_write ON public.presidency_members FOR ALL TO authenticated
  USING (organization = 'RS' AND public.current_user_role() IN ('rs_president', 'bishopric'))
  WITH CHECK (organization = 'RS' AND public.current_user_role() IN ('rs_president', 'bishopric'));

CREATE POLICY presidency_eq_write ON public.presidency_members FOR ALL TO authenticated
  USING (organization = 'EQ' AND public.current_user_role() IN ('eq_president', 'bishopric'))
  WITH CHECK (organization = 'EQ' AND public.current_user_role() IN ('eq_president', 'bishopric'));

-- A soft-deleted member also leaves every presidency (which in turn clears their supervision).
CREATE OR REPLACE FUNCTION cleanup_member_assignments_on_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted = true AND (OLD.is_deleted IS NULL OR OLD.is_deleted = false) THEN
    DELETE FROM ministry_companions WHERE member_id = NEW.id;
    DELETE FROM ministry_member_recipients WHERE member_id = NEW.id;
    DELETE FROM presidency_members WHERE member_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER PUBLICATION supabase_realtime ADD TABLE public.presidency_members;
