# 성역 편성 앱 — 배포 가이드

## 아키텍처

- **Frontend:** Vercel (Vite 정적 빌드)
- **Backend:** Supabase Cloud (Postgres + Auth + Realtime)
- **지도:** Kakao Developers Maps API

## 최초 배포

### 1. Supabase Cloud 프로젝트 생성

1. https://supabase.com/dashboard 에서 새 프로젝트 생성
2. 지역: `ap-northeast-2` (서울)
3. DB 비밀번호 저장
4. 프로젝트 Reference ID 복사

### 2. 로컬에서 프로덕션 DB 에 마이그레이션 적용

```bash
supabase login
supabase link --project-ref <프로젝트-ref>
supabase db push
```

모든 마이그레이션이 프로덕션에 반영됨. RLS/트리거/RPC 모두 포함.

적용 순서 (`20260419173707_rls_whitelist_refactor` 이후에 추가된 것):

| 마이그레이션 | 내용 |
|---|---|
| `20261112130000_protect_profile_role` | 본인 프로필의 `role` / `user_id` 변경을 DB 트리거로 차단 |
| `20261112140000_status_new_member` | 상태 값 `new_member`(새로운 회원) 추가 |
| `20261112140100_memo_phone_share` | `households.memo`, `members.phone`, `ministries.share_token` 추가, 공개 공유용 RPC `get_ministry_share` |
| `20261112140200_share_token_min_length` | 공유 토큰은 32자 이상만 저장 |
| `20261112140300_share_token_role_checked_access` | 공유 토큰 열 접근 제거, 역할 확인 RPC `get_ministry_share_token` / `set_ministry_share_token`만 허용 |
| `20261113100000_share_address` | `get_ministry_share` 응답에 지명된 가정·자매의 주소 추가 |
| `20261113110000_soft_delete_member_rpc` | 사람 삭제용 RPC `soft_delete_member` (아래 참고) |

RPC 요약:

- `get_ministry_share(p_token)` — 로그인 없이 호출 가능. 토큰이 맞는 성역 동반자 하나의 이름·연락처·주소·가족의 나이와 성별만 돌려준다 (공유 페이지 `/s/<token>`).
- `get_ministry_share_token(p_ministry_id)` / `set_ministry_share_token(p_ministry_id, p_token)` — 해당 조직을 편집할 수 있는 역할(감독단, 해당 회장단)만 호출 가능.
- `soft_delete_member(p_member_id)` — 장로 정원회 회장단, 상호부조회 회장단, 감독단만 호출 가능(그 외 `42501`). 명부에서 사람을 삭제하면 이 함수를 거치며, 그 사람의 성역 동반자·지명도 함께 정리된다. 테이블을 직접 UPDATE 하는 방식은 행 수준 보안 때문에 항상 실패한다.

### 3. 최초 감독단 지정

Supabase Studio (프로덕션) 의 SQL Editor 에서:

1. Studio > Authentication > Users > Add user 로 관리자 계정을 만든다. (앱에는 가입 화면이 없다.)
2. 다음 쿼리 실행:

```sql
UPDATE app_user_profiles
SET role = 'bishopric'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
```

### 4. Realtime 활성화 확인

프로젝트 설정 → Database → Replication → `supabase_realtime` publication 에 해당 테이블들 포함되어 있는지 확인 (마이그레이션이 추가했으므로 자동 반영되지만, Dashboard 에서 확인 가능).

### 5. Vercel 프로젝트 생성

1. https://vercel.com 에서 "New Project" → GitHub 리포지토리 연결
2. Framework Preset: **Vite** 자동 감지
3. 환경변수 설정:
   - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL (https://xxxxx.supabase.co)
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon key
   - `VITE_KAKAO_JS_KEY`: Kakao Developers JavaScript 키
   - `VITE_UNIT_NAME`: 머리말과 로그인 화면에 표시할 지역 단위 이름 (예: `OO 와드`). 비워 두면 표시하지 않는다.
4. Deploy

### 6. Kakao Maps 설정

지도 SDK 는 키가 아니라 **그 JavaScript 키에 등록된 도메인 목록**으로 호출을 허용한다. 다음 세 가지가 모두 맞아야 지도가 뜬다.

1. Kakao Developers → 내 애플리케이션 → 제품 설정에서 **카카오맵**을 활성화한다.
2. 앱 키 → JavaScript 키 → **JavaScript SDK 도메인**에 아래 주소를 등록한다. (플랫폼 → Web 의 사이트 도메인과는 별개 항목이다.)
   - 로컬: `http://localhost:5173`
   - 프로덕션: `https://<your-vercel-domain>.vercel.app`
3. 로컬 개발은 등록된 주소(`http://localhost:5173`) 그대로 띄운다. 다른 포트나 `127.0.0.1` 로 열면 SDK 가 거부한다.

---

## 일상 운영

### 마이그레이션 배포

```bash
# 로컬에서 개발 후
supabase migration new <description>
# 파일 편집
supabase db reset  # 로컬 검증
# git push 후 DB 는 수동으로:
supabase db push  # 프로덕션 반영
```

**주의:** 프론트 배포(Vercel)는 `master` push 시 자동이지만 DB 마이그레이션은 **수동** — 스키마 변경 사고 방지.

### 백업

Supabase Cloud 가 자동 백업 제공 (무료 플랜 7일 보관). Pro 플랜 이상에서 PITR 가능.

### 모니터링

- **DB 쿼리**: Supabase Dashboard → Database → Query Performance
- **에러**: Vercel Dashboard → Logs (클라이언트 에러는 브라우저 콘솔)
- **Realtime 연결**: Supabase Dashboard → Realtime

## 환경변수 체크리스트

| 변수 | 로컬 | 프로덕션 |
|---|---|---|
| `VITE_SUPABASE_URL` | `http://127.0.0.1:54321` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `supabase start` 출력 | Supabase Dashboard |
| `VITE_KAKAO_JS_KEY` | Kakao Developers | 같음 |
| `VITE_UNIT_NAME` | 선택 (예: `OO 와드`) | 선택 |

## 문제 해결

### 지도가 안 뜸
- JavaScript 키의 **JavaScript SDK 도메인** 목록에 현재 주소(로컬이면 `http://localhost:5173`)가 있는지 확인
- 앱에서 **카카오맵** 제품이 활성화되어 있는지 확인
- 브라우저 콘솔에 "CORS" 또는 "invalid app key" 에러 확인
- 지도가 없어도 목록과 성역 동반자 카드는 그대로 쓸 수 있다

### Realtime 반영 안 됨
- Supabase Dashboard → Database → Replication 에서 `supabase_realtime` publication 멤버십 확인
- 브라우저 네트워크 탭에서 WebSocket 연결 상태 확인

### 사람 삭제가 안 됨
- `soft_delete_member` 마이그레이션(`20261113110000`)이 적용됐는지 확인 (`supabase db push`)
- 열람 역할은 삭제할 수 없다 (`42501`)

### RLS 권한 오류
- 현재 로그인한 사용자의 `app_user_profiles.role` 확인
- RLS 정책은 `public.current_user_role()` 함수에 의존 — 프로필이 없으면 null 반환
