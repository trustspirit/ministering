-- display_name can be written by the person themselves (own-row PATCH from Settings) and by the admin-users Edge
-- Function. Only the function checked for control and bidirectional characters, so a direct PATCH could disguise a
-- name in the bishopric's user list. Enforce the same rule in the database:
--   NULL, or 1-50 characters after trimming, with no U+0000-U+001F, U+007F, U+202A-U+202E, U+2066-U+2069.
-- (Mirrors UNSAFE_NAME / MAX_NAME in supabase/functions/admin-users/handler.ts; PostgreSQL text cannot hold U+0000.)

-- Existing rows that would violate the constraint are cleaned first, so the migration cannot fail on old data.
UPDATE public.app_user_profiles
   SET display_name = NULLIF(left(btrim(regexp_replace(
         display_name, '[\u0001-\u001f\u007f‪-‮⁦-⁩]', '', 'g')), 50), '')
 WHERE display_name IS NOT NULL
   AND (char_length(btrim(display_name)) NOT BETWEEN 1 AND 50
        OR display_name ~ '[\u0001-\u001f\u007f‪-‮⁦-⁩]');

ALTER TABLE public.app_user_profiles
  ADD CONSTRAINT app_user_profiles_display_name_check CHECK (
    display_name IS NULL
    OR (char_length(btrim(display_name)) BETWEEN 1 AND 50
        AND display_name !~ '[\u0001-\u001f\u007f‪-‮⁦-⁩]')
  );

-- The profile row is created for every new auth user from the invitation metadata or the e-mail address. Neither is
-- guaranteed to satisfy the constraint (a long address, odd characters), and a violation here would make user creation
-- fail with "Database error saving new user". Strip the unsafe characters and cut to 50 characters; a name that ends
-- up empty becomes NULL (the settings list shows a dash and the bishopric can set a name).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_name := NULLIF(left(btrim(regexp_replace(
              v_name, '[\u0001-\u001f\u007f‪-‮⁦-⁩]', '', 'g')), 50), '');
  -- left() can leave a trailing space after the cut
  v_name := NULLIF(btrim(v_name), '');
  INSERT INTO public.app_user_profiles (user_id, display_name)
  VALUES (NEW.id, v_name)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
