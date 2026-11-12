-- 로컬 테스트 전용 시드. 프로덕션에서는 실행되지 않음.
-- 테스트 계정 4개 (비밀번호: password)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change, email_change_token_new)
VALUES
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'bishop@test.local',
    crypt('password', gen_salt('bf')), now(), '{"full_name":"감독"}'::jsonb, now(), now(), false, false, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'rs@test.local',
    crypt('password', gen_salt('bf')), now(), '{"full_name":"상호부조회장"}'::jsonb, now(), now(), false, false, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'eq@test.local',
    crypt('password', gen_salt('bf')), now(), '{"full_name":"장로정원회장"}'::jsonb, now(), now(), false, false, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'viewer@test.local',
    crypt('password', gen_salt('bf')), now(), '{"full_name":"뷰어"}'::jsonb, now(), now(), false, false, '', '', '', '')
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


-- ---------------------------------------------------------------
-- 샘플 데이터: 가정 9개, 회원 26명, 성역 동반자 4개
-- ---------------------------------------------------------------
INSERT INTO households (id, name, address, lat, lng, memo) VALUES
  ('a0000000-0000-0000-0000-000000000001', '서동욱 가정', '서울 마포구 월드컵로 212', 37.5663, 126.9019, '아이들이 어려서 저녁 시간에 방문하는 것이 좋음'),
  ('a0000000-0000-0000-0000-000000000002', '김도현 가정', '서울 마포구 성미산로 150', 37.5615, 126.9230, NULL),
  ('a0000000-0000-0000-0000-000000000003', '문정자 가정', '서울 서대문구 연희로 45', 37.5698, 126.9328, '혼자 거주. 무릎이 불편하심'),
  ('a0000000-0000-0000-0000-000000000004', '최영수 가정', '서울 은평구 통일로 684', 37.6176, 126.9227, NULL),
  ('a0000000-0000-0000-0000-000000000005', '한상철 가정', '서울 은평구 증산로 17', 37.5833, 126.9102, '몇 해째 모임에 나오지 못하심'),
  ('a0000000-0000-0000-0000-000000000006', '윤재호 가정', '서울 영등포구 당산로 120', 37.5345, 126.9024, '지난달 침례 받음'),
  ('a0000000-0000-0000-0000-000000000007', '임호진 가정', '서울 영등포구 여의대방로 62', 37.5036, 126.9246, NULL),
  ('a0000000-0000-0000-0000-000000000008', '노진수 가정', '서울 동작구 상도로 369', 37.4988, 126.9531, NULL),
  ('a0000000-0000-0000-0000-000000000009', '조은지 가정', '서울 관악구 관악로 1', 37.4784, 126.9516, '직장 때문에 주말에만 시간이 됨')
ON CONFLICT (id) DO NOTHING;

INSERT INTO members (full_name, gender, birth_date, active_status, personality, memo, phone, household_id, household_role, address, lat, lng)
SELECT v.full_name, v.gender::gender, v.birth_date::date, v.status::active_status, v.personality::personality,
       v.memo, v.phone, h.id, v.hrole::household_role, h.address, h.lat, h.lng
FROM (VALUES
  ('서동욱', 'M', '1985-03-12', 'active',      'active',   NULL,                 '010-0000-0101', '서동욱 가정', 'husband'),
  ('박미영', 'F', '1987-07-30', 'active',      'active',   NULL,                 '010-0000-0102', '서동욱 가정', 'wife'),
  ('서지호', 'M', '2014-05-02', 'active',      'moderate', NULL,                 NULL,            '서동욱 가정', 'child'),
  ('서하윤', 'F', '2017-11-19', 'active',      'moderate', NULL,                 NULL,            '서동욱 가정', 'child'),
  ('김도현', 'M', '1990-01-25', 'active',      'active',   NULL,                 '010-0000-0201', '김도현 가정', 'husband'),
  ('이수진', 'F', '1991-09-08', 'active',      'active',   NULL,                 '010-0000-0202', '김도현 가정', 'wife'),
  ('김서준', 'M', '2020-04-14', 'active',      'moderate', NULL,                 NULL,            '김도현 가정', 'child'),
  ('문정자', 'F', '1948-12-03', 'active',      'passive',  '보청기를 사용하심',  NULL,            '문정자 가정', 'other'),
  ('최영수', 'M', '1972-06-21', 'active',      'moderate', NULL,                 '010-0000-0301', '최영수 가정', 'husband'),
  ('정은희', 'F', '1974-10-10', 'active',      'moderate', NULL,                 '010-0000-0302', '최영수 가정', 'wife'),
  ('최민석', 'M', '2005-02-17', 'active',      'moderate', NULL,                 NULL,            '최영수 가정', 'child'),
  ('최유나', 'F', '2008-08-26', 'active',      'moderate', NULL,                 NULL,            '최영수 가정', 'child'),
  ('한상철', 'M', '1958-04-05', 'less_active', 'passive',  '방문을 반기지 않으심', NULL,          '한상철 가정', 'husband'),
  ('오순자', 'F', '1960-09-14', 'less_active', 'moderate', '전화는 받으심',      '010-0000-0401', '한상철 가정', 'wife'),
  ('윤재호', 'M', '1995-05-30', 'new_member',  'active',   NULL,                 '010-0000-0501', '윤재호 가정', 'husband'),
  ('강소영', 'F', '1996-12-12', 'new_member',  'active',   NULL,                 '010-0000-0502', '윤재호 가정', 'wife'),
  ('임호진', 'M', '1980-08-08', 'active',      'active',   NULL,                 '010-0000-0601', '임호진 가정', 'husband'),
  ('송지현', 'F', '1982-02-20', 'active',      'active',   NULL,                 '010-0000-0602', '임호진 가정', 'wife'),
  ('임다은', 'F', '2010-06-06', 'active',      'moderate', NULL,                 NULL,            '임호진 가정', 'child'),
  ('임도윤', 'M', '2013-10-31', 'active',      'moderate', NULL,                 NULL,            '임호진 가정', 'child'),
  ('노진수', 'M', '1965-03-03', 'active',      'moderate', NULL,                 '010-0000-0701', '노진수 가정', 'husband'),
  ('장미경', 'F', '1966-11-27', 'active',      'moderate', NULL,                 '010-0000-0702', '노진수 가정', 'wife'),
  ('노지원', 'F', '2003-01-15', 'active',      'moderate', NULL,                 NULL,            '노진수 가정', 'child'),
  ('배성민', 'M', '1999-07-07', 'new_member',  'moderate', '대학생, 최근 전입',  '010-0000-0703', '노진수 가정', 'other'),
  ('조은지', 'F', '1978-05-18', 'active',      'moderate', NULL,                 '010-0000-0801', '조은지 가정', 'wife'),
  ('조현우', 'M', '2009-09-09', 'active',      'moderate', NULL,                 NULL,            '조은지 가정', 'child')
) AS v(full_name, gender, birth_date, status, personality, memo, phone, hname, hrole)
JOIN households h ON h.name = v.hname
ON CONFLICT (full_name, birth_date) DO NOTHING;

-- seed.sql is local-only (never run against a real project). EQ 1 gets a random 64-hex share token
-- generated at seed time, so no fixed or guessable token exists in the repository.
INSERT INTO ministries (id, organization, number, name, share_token) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'EQ', 1, NULL, encode(gen_random_bytes(32), 'hex')),
  ('b0000000-0000-0000-0000-000000000002', 'EQ', 2, NULL, NULL),
  ('b0000000-0000-0000-0000-000000000003', 'RS', 1, NULL, NULL),
  ('b0000000-0000-0000-0000-000000000004', 'RS', 2, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ministry_companions (ministry_id, member_id)
SELECT m.id, mem.id FROM (VALUES
  ('b0000000-0000-0000-0000-000000000001'::uuid, '김도현'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, '윤재호'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, '임호진'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, '최영수'),
  ('b0000000-0000-0000-0000-000000000003'::uuid, '이수진'),
  ('b0000000-0000-0000-0000-000000000003'::uuid, '박미영'),
  ('b0000000-0000-0000-0000-000000000004'::uuid, '송지현'),
  ('b0000000-0000-0000-0000-000000000004'::uuid, '정은희')
) AS v(mid, mname)
JOIN ministries m ON m.id = v.mid
JOIN members mem ON mem.full_name = v.mname;

INSERT INTO ministry_household_recipients (ministry_id, household_id)
SELECT v.mid, h.id FROM (VALUES
  ('b0000000-0000-0000-0000-000000000001'::uuid, '서동욱 가정'),
  ('b0000000-0000-0000-0000-000000000001'::uuid, '한상철 가정'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, '노진수 가정'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, '조은지 가정')
) AS v(mid, hname) JOIN households h ON h.name = v.hname;

INSERT INTO ministry_member_recipients (ministry_id, member_id)
SELECT v.mid, mem.id FROM (VALUES
  ('b0000000-0000-0000-0000-000000000003'::uuid, '문정자'),
  ('b0000000-0000-0000-0000-000000000003'::uuid, '오순자'),
  ('b0000000-0000-0000-0000-000000000004'::uuid, '장미경'),
  ('b0000000-0000-0000-0000-000000000004'::uuid, '강소영')
) AS v(mid, mname) JOIN members mem ON mem.full_name = v.mname;
