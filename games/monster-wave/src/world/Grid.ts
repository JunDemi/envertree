import { arenaConfig, gameConfig } from "../config";

/**
 * 아레나 격자. 칸마다 두 층을 기록한다.
 * - 벽(wall): 맵에 고정된 벽/장애물. 총알, 시야, 길찾기 모두 막는다.
 * - 설치물(obstacle): 바리케이드, 드럼통. 이동은 막지만, 길찾기에서는 "비용이 큰 칸"으로 취급해
 *   몬스터가 돌아갈 길이 너무 멀면 부수고 지나가게 한다. 총알/시야는 설치물 종류별로 따로 처리한다.
 */
export class Grid {
  readonly cols = gameConfig.arenaCols;
  readonly rows = gameConfig.arenaRows;
  readonly tile = gameConfig.tileSize;
  private readonly wall: Uint8Array;
  private readonly obstacle: Uint8Array;

  constructor() {
    this.wall = new Uint8Array(this.cols * this.rows);
    this.obstacle = new Uint8Array(this.cols * this.rows);

    // 바깥 테두리
    for (let c = 0; c < this.cols; c++) {
      this.setWall(c, 0, true);
      this.setWall(c, this.rows - 1, true);
    }
    for (let r = 0; r < this.rows; r++) {
      this.setWall(0, r, true);
      this.setWall(this.cols - 1, r, true);
    }

    // 내부 장애물
    for (const o of arenaConfig.obstacles) {
      for (let r = o.row; r < o.row + o.h; r++) {
        for (let c = o.col; c < o.col + o.w; c++) {
          if (!this.inBounds(c, r)) throw new Error(`장애물이 아레나 밖에 있습니다: col ${c}, row ${r}`);
          this.setWall(c, r, true);
        }
      }
    }
  }

  inBounds(col: number, row: number) {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows;
  }

  /** 이동이 막힌 칸 (벽 또는 설치물). 아레나 밖도 막힌 것으로 본다 */
  isBlocked(col: number, row: number) {
    if (!this.inBounds(col, row)) return true;
    const i = row * this.cols + col;
    return this.wall[i] === 1 || this.obstacle[i] === 1;
  }

  /** 고정 벽 (아레나 밖 포함) */
  isWall(col: number, row: number) {
    return !this.inBounds(col, row) || this.wall[row * this.cols + col] === 1;
  }

  /** 설치물(바리케이드, 드럼통)이 있는 칸 */
  isObstacle(col: number, row: number) {
    return this.inBounds(col, row) && this.obstacle[row * this.cols + col] === 1;
  }

  setObstacle(col: number, row: number, value: boolean) {
    if (this.inBounds(col, row)) this.obstacle[row * this.cols + col] = value ? 1 : 0;
  }

  private setWall(col: number, row: number, value: boolean) {
    if (this.inBounds(col, row)) this.wall[row * this.cols + col] = value ? 1 : 0;
  }

  /** 타일 → 월드 좌표 (칸의 가운데) */
  tileCenter(col: number, row: number) {
    return { x: (col + 0.5) * this.tile, y: (row + 0.5) * this.tile };
  }

  /** 월드 좌표 → 타일 */
  worldToTile(x: number, y: number) {
    return { col: Math.floor(x / this.tile), row: Math.floor(y / this.tile) };
  }

  /**
   * 벽 칸들을 가로로 이어진 구간끼리 묶은 사각형 목록 (충돌 몸체 수를 줄이기 위함).
   * 위아래로 같은 구간이 이어지면 하나로 합친다.
   */
  blockedRects(): { col: number; row: number; w: number; h: number }[] {
    const rects: { col: number; row: number; w: number; h: number }[] = [];
    // 열린 사각형: "시작열,너비" → rect
    let open = new Map<string, { col: number; row: number; w: number; h: number }>();
    for (let r = 0; r < this.rows; r++) {
      const next = new Map<string, { col: number; row: number; w: number; h: number }>();
      let c = 0;
      while (c < this.cols) {
        if (!this.isWall(c, r)) {
          c++;
          continue;
        }
        const start = c;
        while (c < this.cols && this.isWall(c, r)) c++;
        const key = `${start},${c - start}`;
        const prev = open.get(key);
        if (prev) {
          prev.h += 1;
          next.set(key, prev);
          open.delete(key);
        } else {
          next.set(key, { col: start, row: r, w: c - start, h: 1 });
        }
      }
      for (const rect of open.values()) rects.push(rect);
      open = next;
    }
    for (const rect of open.values()) rects.push(rect);
    return rects;
  }
}
