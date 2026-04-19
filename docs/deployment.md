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

### 3. 최초 감독단 지정

Supabase Studio (프로덕션) 의 SQL Editor 에서:

1. 이메일로 관리자 가입 (`/login` 에서 회원가입 / 또는 Studio > Authentication > Add user)
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
4. Deploy

### 6. Kakao Maps 도메인 등록

Kakao Developers → 내 애플리케이션 → 플랫폼 → Web:
- 로컬: `http://localhost:5173`
- 프로덕션: `https://<your-vercel-domain>.vercel.app`

---

## 일상 운영

### 마이그레이션 배포

```bash
# 로컬에서 개발 후
supabase migration new <description>
# 파일 편집
supabase db reset  # 로컬 검증
# git push 후 배포는 수동으로:
supabase db push  # 프로덕션 반영
```

**주의:** 프론트 배포(Vercel)는 `main` push 시 자동이지만 DB 마이그레이션은 **수동** — 스키마 변경 사고 방지.

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

## 문제 해결

### 지도가 안 뜸
- Kakao Developers 의 도메인 허용 목록 확인
- 브라우저 콘솔에 "CORS" 또는 "invalid app key" 에러 확인

### Realtime 반영 안 됨
- Supabase Dashboard → Database → Replication 에서 `supabase_realtime` publication 멤버십 확인
- 브라우저 네트워크 탭에서 WebSocket 연결 상태 확인

### RLS 권한 오류
- 현재 로그인한 사용자의 `app_user_profiles.role` 확인
- RLS 정책은 `public.current_user_role()` 함수에 의존 — 프로필이 없으면 null 반환
