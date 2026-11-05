/**
 * 아레나 배치. 바깥 테두리 한 칸은 자동으로 벽이 되고,
 * 아래 obstacles에 내부 장애물(타일 단위 사각형)을 적는다.
 * 격자 크기는 game.ts의 arenaCols × arenaRows (48 × 36).
 */
export interface ObstacleRect {
  col: number;
  row: number;
  w: number;
  h: number;
}

export const arenaConfig = {
  /** 플레이어 시작 타일 (중앙) */
  playerStart: { col: 24, row: 18 },

  obstacles: [
    // 중앙을 둘러싼 기둥 4개 (2×2)
    { col: 15, row: 11, w: 2, h: 2 },
    { col: 31, row: 11, w: 2, h: 2 },
    { col: 15, row: 23, w: 2, h: 2 },
    { col: 31, row: 23, w: 2, h: 2 },
    // 위아래 가로벽
    { col: 20, row: 6, w: 8, h: 1 },
    { col: 20, row: 29, w: 8, h: 1 },
    // 좌우 세로벽
    { col: 8, row: 14, w: 1, h: 8 },
    { col: 39, row: 14, w: 1, h: 8 },
    // 네 모서리의 ㄱ자 벽
    { col: 5, row: 5, w: 5, h: 1 },
    { col: 5, row: 6, w: 1, h: 3 },
    { col: 38, row: 5, w: 5, h: 1 },
    { col: 42, row: 6, w: 1, h: 3 },
    { col: 5, row: 30, w: 5, h: 1 },
    { col: 5, row: 27, w: 1, h: 3 },
    { col: 38, row: 30, w: 5, h: 1 },
    { col: 42, row: 27, w: 1, h: 3 },
    // 중간 지대의 짧은 엄폐물
    { col: 12, row: 17, w: 2, h: 1 },
    { col: 34, row: 18, w: 2, h: 1 },
    { col: 23, row: 12, w: 2, h: 1 },
    { col: 23, row: 24, w: 2, h: 1 },
  ] satisfies ObstacleRect[],
} as const;
