# 프로젝트: 웹 게임 포털 사이트

플래시 게임 사이트처럼, 메인 페이지에 게임 목록을 보여주고 게임을 선택하면
플레이 페이지에서 바로 할 수 있는 웹 게임 포털을 만든다.
이번 작업의 목표는 **포털 사이트 구축**이며, 게임은 이후 하나씩 추가한다.
단, 게임을 쉽게 추가할 수 있는 구조와 템플릿은 이번에 함께 준비한다.

## 기술 스택
- 패키지 매니저: pnpm (workspace 모노레포)
- 포털: Next.js (App Router) + TypeScript + React + Tailwind CSS
- 인증: Supabase Auth, Google 소셜 로그인 (`@supabase/ssr` 사용)
- 게임: 게임마다 독립된 Vite + TypeScript + Phaser 프로젝트
- 배포: Vercel (포털), 게임은 빌드 결과물을 포털의 정적 파일로 포함

라이브러리 버전과 API는 기억에 의존하지 말고, 설치 전에 공식 문서로 최신 사용법을 확인할 것.
특히 Next.js App Router와 `@supabase/ssr`의 인증 패턴은 버전에 따라 달라지므로 주의.

## 핵심 설계 원칙
1. **포털과 게임의 분리**: 각 게임은 독립적으로 빌드되는 정적 웹앱이며,
   포털은 `<iframe>`으로 게임을 불러온다. 게임 코드는 포털 코드를 import하지 않는다.
2. **게임 추가 = 폴더 하나 + 목록 한 줄**: 새 게임은 `games/<slug>` 폴더를 만들고
   게임 레지스트리에 항목 하나를 추가하는 것만으로 포털에 나타나야 한다.
3. **게임 ↔ 포털 통신은 postMessage로만**: 점수, 게임 시작/종료 같은 이벤트는
   정해진 메시지 규약으로 주고받는다. 포털은 메시지의 origin과 형식을 반드시 검증한다.

## 목표 디렉토리 구조
```
/
├── apps/
│   └── portal/                  # Next.js 포털
│       ├── src/app/
│       │   ├── page.tsx         # 메인: 게임 목록
│       │   ├── games/[slug]/    # 게임 플레이 페이지
│       │   └── auth/            # OAuth 콜백 등
│       ├── src/lib/games.ts     # 게임 레지스트리 (타입 포함)
│       ├── src/lib/supabase/    # 서버/클라이언트용 Supabase 클라이언트
│       └── public/play/<slug>/  # 빌드된 게임이 복사되는 위치 (git에서 제외)
├── games/
│   ├── _template/               # Phaser 게임 템플릿 (복사해서 새 게임 시작)
│   └── <slug>/                  # 개별 게임 (Vite + TS + Phaser)
├── packages/
│   └── game-sdk/                # 게임 → 포털 postMessage 헬퍼 + 메시지 타입
├── scripts/
│   └── build-games.ts           # 모든 게임 빌드 후 portal/public/play로 복사
└── pnpm-workspace.yaml
```

## 작업 방식
- 아래 Phase를 **순서대로 하나씩** 진행한다.
- 각 Phase가 끝나면 멈추고 다음을 보고한 뒤, 내 확인을 받고 다음 Phase로 넘어간다:
  무엇을 만들었는지, 어떻게 실행/확인하는지, 내가 직접 해야 할 일이 있는지.
- 비밀값(API 키 등)은 절대 커밋하지 않는다. `.env.example`에 필요한 변수 이름만 적는다.
- 내가 직접 외부 서비스 설정(Google Cloud, Supabase)을 해야 하는 부분은
  단계별로 클릭 순서까지 안내해 준다.

## Phase 0. 모노레포 초기 설정
- pnpm workspace 구성 (`apps/*`, `games/*`, `packages/*`)
- `apps/portal`에 Next.js(App Router, TypeScript, Tailwind, ESLint) 생성
- 루트 스크립트: `dev`, `build`, `build:games`, `lint`
- `.gitignore`에 `apps/portal/public/play/` 추가
- 완료 기준: `pnpm dev`로 포털 기본 페이지가 뜬다.

## Phase 1. 게임 레지스트리 + 메인 페이지
- `src/lib/games.ts`에 게임 메타데이터 타입과 목록 정의
  (slug, title, description, thumbnail, tags, width/height 또는 aspectRatio, 조작법)
- 메인 페이지: 썸네일 카드 그리드, 반응형, 태그 필터와 제목 검색
- 공통 레이아웃: 헤더(사이트 이름, 로그인 버튼 자리), 푸터
- 테스트용 더미 게임 2~3개 등록 (썸네일은 플레이스홀더)
- 완료 기준: 메인에서 카드 목록이 보이고, 검색/필터가 동작한다.

## Phase 2. 게임 플레이 페이지
- `/games/[slug]`: 레지스트리에서 게임을 찾아 `<iframe src="/play/<slug>/index.html">`로 표시
- 게임 비율을 유지하며 화면에 맞게 크기 조절, 전체화면 버튼
- 게임 아래: 제목, 설명, 조작법, 다른 게임 추천
- 존재하지 않는 slug는 404, 페이지별 메타데이터(title, OG 이미지) 생성
- 동작 확인용으로 `public/play/dummy/index.html`에 간단한 정적 HTML 게임 하나 배치
- 완료 기준: 카드를 누르면 플레이 페이지로 이동하고 iframe 안에서 게임이 돈다.

## Phase 3. Google 소셜 로그인 (Supabase Auth)
- Supabase 프로젝트 생성과 Google OAuth 클라이언트 발급 절차를 나에게 안내
  (리디렉션 URI: 로컬과 배포 주소 모두)
- `@supabase/ssr`로 서버/브라우저 클라이언트 구성, 미들웨어에서 세션 갱신
- OAuth 콜백 라우트, 로그인/로그아웃, 헤더에 프로필 사진과 이름 표시
- 게임 플레이는 비로그인도 가능하게 유지 (로그인은 이후 점수 저장용)
- 완료 기준: 로컬에서 구글 로그인 → 헤더에 내 프로필 표시 → 로그아웃까지 동작.

## Phase 4. 게임 SDK + Phaser 게임 템플릿 + 빌드 파이프라인
- `packages/game-sdk`: 메시지 타입 정의와 헬퍼 함수
  (예: `ready()`, `gameStart()`, `gameOver({ score })`)
  메시지에는 식별용 필드(예: `source: "game-portal"`)와 버전을 포함
- 포털 플레이 페이지에서 메시지 수신: origin 검증, 형식 검증, 일단은 콘솔과 화면에 점수 표시
- `games/_template`: Vite + TypeScript + Phaser 최소 템플릿
  (`base: "./"`로 설정해 하위 경로에서도 리소스가 로드되게, 시작 씬 + 게임오버 시 SDK 호출 예시)
- `scripts/build-games.ts`: `_template`을 제외한 모든 게임을 빌드해
  `apps/portal/public/play/<slug>/`로 복사. 포털 `build` 전에 자동 실행
- 템플릿을 복사해 `games/sample`로 아주 간단한 게임 하나를 만들고 레지스트리에 등록
- `README.md`에 "새 게임 추가하는 법"을 단계별로 문서화
- 완료 기준: `pnpm build` 한 번으로 게임과 포털이 함께 빌드되고,
  샘플 게임을 끝내면 포털 화면에 점수가 표시된다.

## Phase 5. 배포 준비
- Vercel 배포 설정 (모노레포 루트 디렉토리, 빌드 명령)
- 배포 주소를 Supabase와 Google OAuth 리디렉션 URI에 추가하는 방법 안내
- 완료 기준: 배포된 사이트에서 목록, 플레이, 로그인이 모두 동작한다.

## 이번 범위에서 제외 (나중에 할 것)
- 점수 DB 저장과 랭킹 (Supabase 테이블 + RLS)
- 즐겨찾기, 최근 플레이 기록, 댓글
단, 위 기능을 나중에 붙이기 쉽도록 구조를 잡아둘 것.