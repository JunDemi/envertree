/**
 * 게임 레지스트리.
 *
 * 새 게임을 추가하려면:
 *  1. games/<slug> 폴더에 게임을 만든다 (Phase 4에서 템플릿 제공)
 *  2. 아래 `games` 배열에 항목 하나를 추가한다
 *  3. 썸네일을 public/thumbnails/ 에 넣는다
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
    slug: "dummy",
    title: "클릭 챌린지",
    description: "10초 동안 화면을 최대한 많이 클릭하세요. 동작 확인용 테스트 게임입니다.",
    thumbnail: "/thumbnails/dummy.svg",
    tags: ["casual", "arcade"],
    size: { width: 800, height: 600 },
    controls: [{ input: "마우스 클릭", action: "점수 획득" }],
    addedAt: "2026-11-05",
  },
  {
    slug: "space-dodge",
    title: "스페이스 닷지",
    description: "쏟아지는 운석을 피해 최대한 오래 살아남으세요.",
    thumbnail: "/thumbnails/space-dodge.svg",
    tags: ["action", "arcade"],
    size: { width: 960, height: 540 },
    controls: [
      { input: "← →", action: "좌우 이동" },
      { input: "Space", action: "부스터" },
    ],
    addedAt: "2026-11-04",
  },
  {
    slug: "block-match",
    title: "블록 매치",
    description: "같은 색 블록을 3개 이상 이어 없애는 퍼즐 게임입니다.",
    thumbnail: "/thumbnails/block-match.svg",
    tags: ["puzzle", "casual"],
    size: { width: 600, height: 800 },
    controls: [{ input: "마우스 드래그", action: "블록 교환" }],
    addedAt: "2026-11-03",
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
