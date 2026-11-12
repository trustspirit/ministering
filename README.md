# 성역 임무 지명

와드·지부의 성역자(성역 동반자)를 지명하고 관리하는 웹 앱입니다. 장로 정원회는 가정 단위, 상호부조회는 개인 단위로 성역 동반자를 만들고, 지도와 배경 정보를 보며 끌어다 놓거나 눌러서 지명합니다. 성역 동반자별 공개 링크로 로그인 없이 연락처와 주소를 공유할 수 있습니다.

주요 화면: 장로 정원회 / 상호부조회 지명 화면, 명부(가정·사람 관리, CSV 가져오기·내보내기), 설정(사용자 역할, 감독단만), 공개 공유 페이지(`/s/<token>`).

## 기술 스택

- React 19, Vite, TypeScript, React Router, TanStack Query, Zustand
- UI: [trust-ui-react](https://www.npmjs.com/package/trust-ui-react) 2.3 (테마는 `src/styles/theme.css`)
- 백엔드: Supabase (Postgres, Auth, Realtime, 행 수준 보안)
- 지도: Kakao Maps JavaScript SDK
- 테스트: Vitest, Testing Library (통합 테스트는 로컬 Supabase 필요)

## 로컬에서 실행하기

필요한 것: Node 20 이상, Docker, [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm ci
supabase start        # 로컬 Postgres·Auth 실행 (Docker)
supabase db reset     # 마이그레이션 적용 + supabase/seed.sql (가상의 샘플 데이터)
cp .env.example .env.local
```

`.env.local` 을 채웁니다. 이 파일은 커밋하지 않습니다.

| 변수 | 값 |
|---|---|
| `VITE_SUPABASE_URL` | `http://127.0.0.1:54321` |
| `VITE_SUPABASE_ANON_KEY` | `supabase status` 에 나오는 anon key |
| `VITE_KAKAO_JS_KEY` | Kakao Developers 의 JavaScript 키 |
| `VITE_UNIT_NAME` | 머리말에 표시할 이름 (선택) |

지도를 보려면 카카오맵을 활성화하고 그 JavaScript 키의 **JavaScript SDK 도메인**에 `http://localhost:5173` 을 등록해야 하며, 개발 서버도 그 주소로 열어야 합니다. 자세한 설정은 [docs/deployment.md](docs/deployment.md) 를 보세요.

```bash
npm run dev           # http://localhost:5173
```

시드 로그인 (비밀번호는 모두 `password`):

| 이메일 | 역할 |
|---|---|
| `bishop@test.local` | 감독단 |
| `eq@test.local` | 장로 정원회 회장단 |
| `rs@test.local` | 상호부조회 회장단 |
| `viewer@test.local` | 열람 |

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 후 프로덕션 빌드 |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint |
| `npm test` | 단위·화면 테스트 |
| `npm run test:integration` | 로컬 Supabase 를 쓰는 통합 테스트 |
| `npm run db:types` | 로컬 DB 스키마에서 `src/types/database.types.ts` 생성 |

DB 를 바꿀 때는 `supabase migration new <이름>` 으로 마이그레이션을 만들고 `supabase db reset` 으로 확인한 뒤 `npm run db:types` 를 실행합니다.

## 배포

Vercel(프론트)과 Supabase Cloud(DB)를 씁니다. 순서와 환경변수는 [docs/deployment.md](docs/deployment.md) 에 있습니다.

## 브랜드 자산

`public/brand/` 의 교회 이름 로고(SVG)와 흰색 그리스도 상 상징(PNG)은 churchofjesuschrist.org 한국어 첫 화면 머리말에서 받은 것이며, 자르거나 색을 바꾸지 않고 남색 바탕 위에서만 씁니다.

이 앱은 개인이 만든 것으로, 예수 그리스도 후기 성도 교회의 공식 제품이 아닙니다.
