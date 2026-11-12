ALTER TABLE households ADD COLUMN memo text;
ALTER TABLE members ADD COLUMN phone text;
ALTER TABLE ministries ADD COLUMN share_token text UNIQUE;

-- Public, token-gated read of one ministry's share page. Exposes only names,
-- phones, ages and genders; never memo, address, status, personality or ids.
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
           'name', h.name,
           'members', (
             SELECT COALESCE(jsonb_agg(jsonb_build_object(
                      'name', x.full_name,
                      'age', date_part('year', age(x.birth_date))::int,
                      'gender', x.gender,
                      'phone', x.phone)
                    ORDER BY (CASE x.household_role WHEN 'husband' THEN 0 WHEN 'wife' THEN 1 ELSE 2 END),
                             x.birth_date ASC, x.full_name), '[]'::jsonb)
               FROM members x
              WHERE x.household_id = h.id AND NOT x.is_deleted)
         ) ORDER BY h.name), '[]'::jsonb)
    INTO v_households
    FROM ministry_household_recipients r
    JOIN households h ON h.id = r.household_id
   WHERE r.ministry_id = m.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'type', 'member', 'name', x.full_name, 'phone', x.phone)
         ORDER BY x.full_name), '[]'::jsonb)
    INTO v_members
    FROM ministry_member_recipients r
    JOIN members x ON x.id = r.member_id
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
