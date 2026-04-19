-- 로컬 테스트 전용 시드. 프로덕션에서는 실행되지 않음.
-- 테스트 계정 4개 (비밀번호: password)
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'bishop@test.local',
    crypt('password', gen_salt('bf')), now(), '{"full_name":"감독"}'::jsonb, now(), now(), false, false),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'rs@test.local',
    crypt('password', gen_salt('bf')), now(), '{"full_name":"상호부조회장"}'::jsonb, now(), now(), false, false),
  ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'eq@test.local',
    crypt('password', gen_salt('bf')), now(), '{"full_name":"장로정원회장"}'::jsonb, now(), now(), false, false),
  ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'viewer@test.local',
    crypt('password', gen_salt('bf')), now(), '{"full_name":"뷰어"}'::jsonb, now(), now(), false, false)
ON CONFLICT (id) DO NOTHING;

-- identities (Supabase 로그인에 필요)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"bishop@test.local"}'::jsonb,
    'email', '11111111-1111-1111-1111-111111111111', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"rs@test.local"}'::jsonb,
    'email', '22222222-2222-2222-2222-222222222222', now(), now(), now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"eq@test.local"}'::jsonb,
    'email', '33333333-3333-3333-3333-333333333333', now(), now(), now()),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444',
    '{"sub":"44444444-4444-4444-4444-444444444444","email":"viewer@test.local"}'::jsonb,
    'email', '44444444-4444-4444-4444-444444444444', now(), now(), now())
ON CONFLICT DO NOTHING;

-- 역할 지정 (auth.users insert 시 트리거가 app_user_profiles 자동 생성, 여기선 role만 업데이트)
UPDATE app_user_profiles SET role = 'bishopric' WHERE user_id = '11111111-1111-1111-1111-111111111111';
UPDATE app_user_profiles SET role = 'rs_president' WHERE user_id = '22222222-2222-2222-2222-222222222222';
UPDATE app_user_profiles SET role = 'eq_president' WHERE user_id = '33333333-3333-3333-3333-333333333333';
-- viewer는 default
