-- One fact, one place.
--
-- Address and coordinates belong to the household only. Members used to carry their own copy, and a household
-- edit left those copies stale while the assignment page preferred them. Every member belongs to a household, so the
-- copies are dropped and readers use the household's.
--
-- A household's name ("홍길동 가정") was text copied from a member's name when the household was created, so renaming
-- the person did not rename the household. The name is now derived from the household's members on read:
-- husband, else wife, else the oldest adult, else the oldest member; '새 가정' while it has none.
-- The app reads households through the household_list view, which adds that name.

ALTER TABLE public.members DROP COLUMN address, DROP COLUMN lat, DROP COLUMN lng;

ALTER TABLE public.households DROP COLUMN name;

CREATE INDEX IF NOT EXISTS members_household_idx ON public.members (household_id) WHERE NOT is_deleted;

CREATE OR REPLACE FUNCTION public.household_display_name(p_household_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT m.full_name || ' 가정'
       FROM members m
      WHERE m.household_id = p_household_id AND NOT m.is_deleted
      ORDER BY CASE m.household_role WHEN 'husband' THEN 0 WHEN 'wife' THEN 1 ELSE 2 END,
               (m.birth_date <= current_date - interval '18 years') DESC,
               m.birth_date ASC,
               m.full_name
      LIMIT 1),
    '새 가정')
$$;

-- security_invoker: the caller's row-level security applies to households and members, as with direct reads.
CREATE VIEW public.household_list WITH (security_invoker = true) AS
  SELECT h.id, public.household_display_name(h.id) AS name, h.address, h.lat, h.lng, h.memo, h.created_at, h.updated_at
    FROM public.households h;

REVOKE ALL ON public.household_list FROM anon;
GRANT SELECT ON public.household_list TO authenticated;

-- Public share page: same function as 20261113100000_share_address.sql with the household name derived and a
-- sister's address taken from her household. Security attributes and the explicit ACL are unchanged.
CREATE OR REPLACE FUNCTION get_ministry_share(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m ministries%ROWTYPE;
  v_companions jsonb;
  v_households jsonb;
  v_members jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO m FROM ministries WHERE share_token = p_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', x.full_name, 'phone', x.phone)
           ORDER BY x.full_name), '[]'::jsonb)
    INTO v_companions
    FROM ministry_companions c
    JOIN members x ON x.id = c.member_id
   WHERE c.ministry_id = m.id AND NOT x.is_deleted;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'type', 'household',
           'name', hl.name,
           'address', NULLIF(btrim(hl.address), ''),
           'members', (
             SELECT COALESCE(jsonb_agg(jsonb_build_object(
                      'name', x.full_name,
                      'age', date_part('year', age(x.birth_date))::int,
                      'gender', x.gender,
                      'phone', x.phone)
                    ORDER BY (CASE x.household_role WHEN 'husband' THEN 0 WHEN 'wife' THEN 1 ELSE 2 END),
                             x.birth_date ASC, x.full_name), '[]'::jsonb)
               FROM members x
              WHERE x.household_id = hl.id AND NOT x.is_deleted)
         ) ORDER BY hl.name), '[]'::jsonb)
    INTO v_households
    FROM ministry_household_recipients r
    JOIN (SELECT h.id, h.address, household_display_name(h.id) AS name FROM households h) hl ON hl.id = r.household_id
   WHERE r.ministry_id = m.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'type', 'member',
           'name', x.full_name,
           'phone', x.phone,
           'address', NULLIF(btrim(hh.address), ''))
         ORDER BY x.full_name), '[]'::jsonb)
    INTO v_members
    FROM ministry_member_recipients r
    JOIN members x ON x.id = r.member_id
    LEFT JOIN households hh ON hh.id = x.household_id
   WHERE r.ministry_id = m.id AND NOT x.is_deleted;

  RETURN jsonb_build_object(
    'organization', m.organization,
    'number', m.number,
    'name', m.name,
    'companions', v_companions,
    'recipients', v_households || v_members
  );
END;
$$;

REVOKE ALL ON FUNCTION get_ministry_share(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_ministry_share(text) TO anon, authenticated;
