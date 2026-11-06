# Envertree

설치 없이 브라우저에서 바로 즐기는 웹 게임 포털.
메인에서 게임을 고르면 플레이 페이지에서 `<iframe>`으로 게임이 실행된다.

## 구조

```
apps/portal/            Next.js 포털 (목록, 플레이 페이지, 로그인)
  src/lib/games.ts      게임 레지스트리 ← 새 게임은 여기에 한 줄 추가
  public/play/<slug>/   빌드된 게임 (자동 생성, git 제외 / dummy만 예외)
  public/thumbnails/    게임 썸네일
games/_template/        Phaser 게임 템플릿 (복사해서 새 게임 시작)
games/<slug>/           개별 게임 (Vite + TypeScript + Phaser)
games/sample/           샘플 게임 "별 받기" (구현 설명: games/sample/README.md)
games/monster-wave/     몬스터웨이브 (조작/설정/몬스터·무기 추가: games/monster-wave/README.md)
packages/game-sdk/      게임 → 포털 메시지 헬퍼와 타입
scripts/build-games.ts  게임을 빌드해 public/play 로 복사
```

포털과 게임은 완전히 분리되어 있다. 게임은 독립된 정적 웹앱이고, 포털 코드를 import하지 않는다.
둘 사이의 통신은 `postMessage`로만 한다 (아래 "메시지 규약").

## 시작하기

필요: Node.js 22.18 이상, pnpm 11

```bash
pnpm install
cp apps/portal/.env.example apps/portal/.env.local   # Supabase 값 채우기 (없어도 로그인만 꺼짐)
pnpm dev
```

| 명령 | 설명 |
| --- | --- |
| `pnpm dev` | 아직 빌드 안 된 게임만 빌드한 뒤 포털 개발 서버 실행 |
| `pnpm build` | 모든 게임 빌드 → 포털 빌드 (배포용) |
| `pnpm build:games [slug...]` | 게임만 빌드해서 `public/play`로 복사 (slug 생략 시 전체) |
| `pnpm --filter <slug> dev` | 게임 하나만 단독으로 개발 (Vite, http://localhost:5173) |
| `pnpm lint` / `pnpm typecheck` | 전체 lint / 타입 검사 |

## 새 게임 추가하는 법

예시로 slug가 `space-dodge`인 게임을 만든다.
완성된 예시가 필요하면 [`games/sample`](games/sample/README.md)(별 받기)의 코드와 설명을 참고한다.
slug는 폴더 이름이자 주소(`/games/space-dodge`)이며 **소문자, 숫자, 하이픈**만 쓸 수 있다.

### 1. 템플릿 복사

```bash
cp -R games/_template games/space-dodge
rm -rf games/space-dodge/node_modules games/space-dodge/dist
```

### 2. 이름 바꾸기

- `games/space-dodge/package.json`의 `"name"`을 `"space-dodge"`로 바꾼다.
- `games/space-dodge/index.html`의 `<title>`을 게임 이름으로 바꾼다.
- 게임 해상도가 다르면 `src/config.ts`의 `GAME_WIDTH`, `GAME_HEIGHT`를 바꾼다.

```bash
pnpm install   # 새 게임의 의존성 연결
```

### 3. 게임 만들기

```bash
pnpm --filter space-dodge dev   # http://localhost:5173 에서 단독 실행
```

- `src/scenes/`의 씬들을 고친다. (시작 → 게임 → 게임 오버 흐름이 이미 들어 있음)
- 이미지, 사운드는 `public/assets/`에 넣고 `"assets/파일명"`처럼 **상대 경로**로 불러온다.
  `"/assets/..."`처럼 `/`로 시작하면 포털 안에서 404가 난다.
- 포털에 이벤트를 알리려면 game-sdk를 호출한다. 템플릿에 이미 들어 있다.

  ```ts
  import { ready, gameStart, gameOver } from "@envertree/game-sdk";
  ready();                   // 로딩이 끝났을 때 한 번
  gameStart();               // 한 판 시작할 때
  gameOver({ score: 120 });  // 한 판 끝났을 때 (웨이브가 있으면 { score, wave })
  ```

  단독 실행 중에는 부모 창이 없으므로 콘솔에 기록만 된다.

### 4. 포털에 등록

`apps/portal/src/lib/games.ts`의 `games` 배열에 항목을 추가한다.

```ts
{
  slug: "space-dodge",                         // 폴더 이름과 같아야 함
  title: "스페이스 닷지",
  description: "쏟아지는 운석을 피해 살아남으세요.",
  thumbnail: "/thumbnails/space-dodge.png",   // 권장 16:9
  tags: ["action", "arcade"],                  // GAME_TAGS에 있는 값만
  size: { width: 800, height: 600 },           // src/config.ts와 같은 값
  controls: [{ input: "← →", action: "이동" }],
  addedAt: "2026-11-06",                       // 최신순 정렬 기준
},
```

썸네일 파일은 `apps/portal/public/thumbnails/`에 넣는다.
새 태그가 필요하면 같은 파일의 `GAME_TAGS`에 추가한다.

### 5. 포털에서 확인

```bash
pnpm build:games space-dodge   # 게임 빌드 → public/play/space-dodge
pnpm dev
```

`/games/space-dodge`에서 게임이 실행되고, 게임 오버 시 화면 아래에 점수가 표시되면 끝이다.
게임 코드를 고친 뒤에는 `pnpm build:games space-dodge`를 다시 실행하면 포털에 반영된다.

> 레지스트리에 등록하지 않으면 `build:games`가 경고를 띄운다.
> 빌드 결과가 없으면 플레이 페이지에 "게임 준비 중입니다"가 표시된다.

## 메시지 규약

게임은 `window.parent.postMessage`로 아래 형태의 메시지를 보낸다.
정의: [`packages/game-sdk/src/protocol.ts`](packages/game-sdk/src/protocol.ts)

```ts
{ source: "game-portal", version: 1, type: "ready" }
{ source: "game-portal", version: 1, type: "gameStart" }
{ source: "game-portal", version: 1, type: "gameOver", payload: { score: number, wave?: number } }
```

포털([`use-game-messages.ts`](apps/portal/src/lib/use-game-messages.ts))은 다음을 모두 확인한 메시지만 처리한다.

1. **origin**: 포털과 같은 출처
2. **source**: 이 페이지의 게임 iframe이 보낸 것
3. **형식**: `source`, `version`, `type`, `payload`가 규약과 일치 (점수는 0 이상의 유한한 숫자, `wave`는 있으면 1 이상의 정수)

빌드 도구 없이 HTML 하나로 만든 게임도 같은 형식으로 직접 보내면 된다
(예: [`apps/portal/public/play/dummy/index.html`](apps/portal/public/play/dummy/index.html)).

## 로그인

Supabase Auth의 Google 로그인을 쓴다. 게임 플레이는 로그인 없이 가능하다.
서버에서 현재 사용자는 `getCurrentUser()` ([`src/lib/auth.ts`](apps/portal/src/lib/auth.ts))로 얻는다.

## 배포 (Vercel)

포털 하나만 Vercel 프로젝트로 배포한다. 게임은 포털 빌드 때 함께 빌드되어 `public/play/<slug>/`에 정적 파일로 들어간다.

설정은 [`apps/portal/vercel.json`](apps/portal/vercel.json)과 `apps/portal/package.json`의 `engines`(Node 24)에 들어 있다.
대시보드에서 따로 정할 것은 **Root Directory**와 **환경 변수**뿐이다.

### 1. 프로젝트 만들기 (처음 한 번)

1. 최신 커밋을 GitHub에 push 한다.
2. [vercel.com](https://vercel.com) → **Add New… → Project** → `envertree` 저장소 **Import**
3. **Root Directory** 옆 **Edit** → `apps/portal` 선택
   - Framework Preset은 Next.js로 자동 선택된다. Build / Install Command는 비워 둔다 (`vercel.json`이 정함).
4. **Environment Variables** 에 추가

   | 이름 | 값 | 설명 |
   | --- | --- | --- |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1` | pnpm 11로 설치하게 한다. 없으면 Vercel이 pnpm 9~10을 골라 설치가 어긋날 수 있다 |
   | `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`과 같은 값 | |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local`과 같은 값 | |
   | `NEXT_PUBLIC_SITE_URL` | (선택) 직접 연결한 도메인 | 비우면 Vercel 프로덕션 주소를 쓴다 |

5. **Deploy**

빌드 로그 맨 위에서 `pnpm v11.23.0`과 Node 24로 설치되는지 확인한다.
`NEXT_PUBLIC_` 변수는 빌드할 때 코드에 들어가므로, 값을 바꾸면 **Redeploy** 해야 반영된다.

> Settings → Build and Deployment → Root Directory 의 **Include files outside the root directory in the Build Step**은 켜져 있어야 한다(기본값).
> 포털 빌드가 저장소 루트의 `scripts/build-games.ts`와 `games/*`를 쓰기 때문이다.

### 2. 로그인 주소 등록 (Supabase)

로그인 후 돌아올 주소는 접속한 사이트 주소로 자동으로 만들어지므로, 코드는 고칠 필요 없고 Supabase에 주소만 허용하면 된다.

Supabase 대시보드 → **Authentication → URL Configuration**

- **Site URL**: 프로덕션 주소 (예: `https://envertree.vercel.app`)
- **Redirect URLs**에 추가
  - `https://<프로덕션 주소>/**`
  - `https://*-<Vercel 팀 또는 계정 slug>.vercel.app/**` — 미리보기(Preview) 배포에서도 로그인하려면
  - `http://localhost:3000/**` — 로컬 개발용 (이미 있으면 그대로)

### 3. Google Cloud는 바꿀 것 없음

Google 로그인은 Supabase를 거치기 때문에, Google OAuth 클라이언트의 **승인된 리디렉션 URI**는 배포 주소가 아니라
Supabase 주소(`https://<project-ref>.supabase.co/auth/v1/callback`) 하나면 된다. Phase 3에서 이미 등록했다.

단, Google Cloud → **Google 인증 플랫폼(OAuth 동의 화면)**이 **테스트** 상태면 등록한 테스트 사용자만 로그인할 수 있다.
누구나 로그인하게 하려면 **앱 게시(프로덕션으로 전환)** 를 누른다.

### 4. 확인

배포 주소에서:
1. 메인 페이지에 게임 목록이 보인다.
2. 게임을 눌러 플레이할 수 있다 (몬스터웨이브, 샘플).
3. 로그인 → 헤더에 프로필 → 로그아웃까지 된다.
