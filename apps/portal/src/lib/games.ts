/**
 * 게임 레지스트리.
 *
 * 새 게임을 추가하려면:
 *  1. games/_template 을 games/<slug> 로 복사해 게임을 만든다
 *  2. 아래 `games` 배열에 항목 하나를 추가한다
 *  3. 썸네일을 public/thumbnails/ 에 넣는다
 *  자세한 절차는 루트 README.md 참고
 *
 * 빌드된 게임은 /play/<slug>/index.html 에서 서비스된다 (getPlayUrl).
 */

/** 사용할 수 있는 태그 목록. 키는 URL에 쓰이고, 값은 화면에 보이는 이름이다. */
export const GAME_TAGS = {
  action: "액션",
  puzzle: "퍼즐",
  arcade: "아케이드",
  casual: "캐주얼",
  strategy: "전략",
  shooter: "슈팅",
} as const;

export type GameTag = keyof typeof GAME_TAGS;

export interface GameControl {
  /** 입력 방법. 예: "← →", "Space", "마우스 클릭" */
  input: string;
  /** 그 입력으로 하는 동작. 예: "이동", "점프" */
  action: string;
}

export interface Game {
  /** URL과 폴더 이름에 쓰이는 고유 ID. 소문자, 숫자, 하이픈만 사용. */
  slug: string;
  title: string;
  description: string;
  /** public 기준 경로. 예: "/thumbnails/my-game.png" (권장 비율 16:9) */
  thumbnail: string;
  tags: GameTag[];
  /** 게임 화면의 기본 해상도. 플레이 페이지는 이 비율을 유지하며 크기를 맞춘다. */
  size: { width: number; height: number };
  controls: GameControl[];
  /** 등록일 (YYYY-MM-DD). 최신순 정렬에 사용. */
  addedAt: string;
}

export const games: Game[] = [
  {
    slug: "monster-wave",
    title: "몬스터웨이브",
    description:
      "사방에서 몰려오는 몬스터를 처치하며 버티는 탑다운 웨이브 서바이벌 슈팅. 빠르게 연속 처치해 콤보를 이으면 새 무기가 열립니다.",
    thumbnail: "/thumbnails/monster-wave.svg",
    tags: ["action", "shooter", "arcade"],
    size: { width: 960, height: 640 },
    controls: [
      { input: "W A S D", action: "이동" },
      { input: "마우스", action: "조준" },
      { input: "왼쪽 클릭", action: "사격 (누르고 있으면 연사)" },
      { input: "1~9 · 휠 · Q/E", action: "무기 교체" },
      { input: "ESC / P", action: "일시정지" },
    ],
    addedAt: "2026-11-07",
  },
  {
    slug: "sample",
    title: "별 받기",
    description: "바구니를 움직여 떨어지는 별을 받으세요. 별을 받을수록 점점 빨라지고, 3개를 놓치면 끝납니다.",
    thumbnail: "/thumbnails/sample.svg",
    tags: ["arcade", "casual"],
    size: { width: 800, height: 600 },
    controls: [
      { input: "← →", action: "바구니 이동" },
      { input: "마우스 이동", action: "바구니 이동" },
      { input: "Space / 클릭", action: "시작 · 다시 시작" },
    ],
    addedAt: "2026-11-06",
  },
  {
    slug: "dummy",
    title: "클릭 챌린지",
    description: "10초 동안 화면을 최대한 많이 클릭하세요. 동작 확인용 테스트 게임입니다.",
    thumbnail: "/thumbnails/dummy.svg",
    tags: ["casual", "arcade"],
    size: { width: 800, height: 600 },
    controls: [{ input: "마우스 클릭", action: "점수 획득" }],
    addedAt: "2026-11-05",
  },
];

/** 최신 등록순으로 정렬된 전체 게임 목록 */
export function getAllGames(): Game[] {
  return [...games].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export function getGameBySlug(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}

/** 실제로 하나 이상의 게임에 쓰인 태그만 반환 */
export function getUsedTags(): GameTag[] {
  const used = new Set(games.flatMap((game) => game.tags));
  return (Object.keys(GAME_TAGS) as GameTag[]).filter((tag) => used.has(tag));
}

export function isGameTag(value: string): value is GameTag {
  return Object.hasOwn(GAME_TAGS, value);
}

/** 플레이 페이지의 iframe이 불러올 주소 */
export function getPlayUrl(slug: string): string {
  return `/play/${slug}/index.html`;
}

/** 추천 게임: 태그가 많이 겹치는 순 → 최신순 */
export function getRelatedGames(slug: string, limit = 4): Game[] {
  const current = getGameBySlug(slug);
  if (!current) return [];
  return getAllGames()
    .filter((game) => game.slug !== slug)
    .map((game) => ({
      game,
      shared: game.tags.filter((tag) => current.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map(({ game }) => game);
}
