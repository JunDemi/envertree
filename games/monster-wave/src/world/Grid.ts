import { arenaConfig, gameConfig } from "../config";

/**
 * 아레나 격자. 각 칸이 막혀 있는지(벽) 기록한다.
 * 벽 충돌 몸체 생성과, 이후 몬스터 길찾기(플로우 필드)가 이 데이터를 쓴다.
 */
export class Grid {
  readonly cols = gameConfig.arenaCols;
  readonly rows = gameConfig.arenaRows;
  readonly tile = gameConfig.tileSize;
  private readonly blocked: Uint8Array;

  constructor() {
    this.blocked = new Uint8Array(this.cols * this.rows);

    // 바깥 테두리
    for (let c = 0; c < this.cols; c++) {
      this.setBlocked(c, 0, true);
      this.setBlocked(c, this.rows - 1, true);
    }
    for (let r = 0; r < this.rows; r++) {
      this.setBlocked(0, r, true);
      this.setBlocked(this.cols - 1, r, true);
    }

    // 내부 장애물
    for (const o of arenaConfig.obstacles) {
      for (let r = o.row; r < o.row + o.h; r++) {
        for (let c = o.col; c < o.col + o.w; c++) {
          if (!this.inBounds(c, r)) throw new Error(`장애물이 아레나 밖에 있습니다: col ${c}, row ${r}`);
          this.setBlocked(c, r, true);
        }
      }
    }
  }

  inBounds(col: number, row: number) {
    return col >= 0 && row >= 0 && col < this.cols && row < this.rows;
  }

  isBlocked(col: number, row: number) {
    return !this.inBounds(col, row) || this.blocked[row * this.cols + col] === 1;
  }

  setBlocked(col: number, row: number, value: boolean) {
    if (this.inBounds(col, row)) this.blocked[row * this.cols + col] = value ? 1 : 0;
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
   * 막힌 칸들을 가로로 이어진 구간끼리 묶은 사각형 목록 (충돌 몸체 수를 줄이기 위함).
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
        if (!this.isBlocked(c, r)) {
          c++;
          continue;
        }
        const start = c;
        while (c < this.cols && this.isBlocked(c, r)) c++;
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
