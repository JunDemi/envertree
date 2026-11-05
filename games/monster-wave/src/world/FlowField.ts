import type { Grid } from "./Grid";

const UNREACHABLE = 0x7fffffff;
const STRAIGHT = 10;
const DIAGONAL = 14;
// 8방향 이웃: [dc, dr, 비용]
const NEIGHBORS: [number, number, number][] = [
  [1, 0, STRAIGHT], [-1, 0, STRAIGHT], [0, 1, STRAIGHT], [0, -1, STRAIGHT],
  [1, 1, DIAGONAL], [1, -1, DIAGONAL], [-1, 1, DIAGONAL], [-1, -1, DIAGONAL],
];

/**
 * 플로우 필드: 목표(플레이어) 칸까지의 거리를 모든 칸에 대해 계산하고,
 * 각 칸에서 "목표 쪽으로 가는 방향"을 저장한다. 몬스터는 자기 칸의 방향만 읽으면 되므로
 * 몬스터 수와 상관없이 비용이 일정하다.
 *
 * - 대각선 이동은 양옆 두 칸이 모두 비어 있을 때만 허용 (벽 모서리를 파고들지 않게)
 * - 막힌 칸(벽, 바리케이드)은 지나갈 수 없다. 바리케이드가 생기거나 부서지면 다시 계산한다.
 */
export class FlowField {
  private readonly grid: Grid;
  private readonly dist: Int32Array;
  readonly dirX: Float32Array;
  readonly dirY: Float32Array;
  private heap: number[] = [];

  constructor(grid: Grid) {
    this.grid = grid;
    const n = grid.cols * grid.rows;
    this.dist = new Int32Array(n);
    this.dirX = new Float32Array(n);
    this.dirY = new Float32Array(n);
  }

  /** 목표 칸 기준으로 다시 계산 (다익스트라, 칸 수가 2천 개 미만이라 매우 빠름) */
  compute(targetCol: number, targetRow: number) {
    const { grid, dist } = this;
    const cols = grid.cols;
    dist.fill(UNREACHABLE);
    this.heap.length = 0;

    if (grid.isBlocked(targetCol, targetRow)) return;
    const start = targetRow * cols + targetCol;
    dist[start] = 0;
    this.push(start, 0);

    while (this.heap.length > 0) {
      const [idx, d] = this.pop();
      if (d > dist[idx]) continue;
      const c = idx % cols;
      const r = (idx - c) / cols;
      for (const [dc, dr, cost] of NEIGHBORS) {
        const nc = c + dc;
        const nr = r + dr;
        if (grid.isBlocked(nc, nr)) continue;
        if (dc !== 0 && dr !== 0 && (grid.isBlocked(c + dc, r) || grid.isBlocked(c, r + dr))) continue;
        const ni = nr * cols + nc;
        const nd = d + cost;
        if (nd < dist[ni]) {
          dist[ni] = nd;
          this.push(ni, nd);
        }
      }
    }

    // 각 칸의 방향: 거리가 가장 작은 이웃 쪽
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        this.dirX[idx] = 0;
        this.dirY[idx] = 0;
        if (dist[idx] === UNREACHABLE || dist[idx] === 0) continue;
        let best = dist[idx];
        let bx = 0;
        let by = 0;
        for (const [dc, dr] of NEIGHBORS) {
          const nc = c + dc;
          const nr = r + dr;
          if (grid.isBlocked(nc, nr)) continue;
          if (dc !== 0 && dr !== 0 && (grid.isBlocked(c + dc, r) || grid.isBlocked(c, r + dr))) continue;
          const nd = dist[nr * cols + nc];
          if (nd < best) {
            best = nd;
            bx = dc;
            by = dr;
          }
        }
        const len = Math.hypot(bx, by) || 1;
        this.dirX[idx] = bx / len;
        this.dirY[idx] = by / len;
      }
    }
  }

  /** 칸까지의 거리 (직선 1칸 = 10). 도달 불가면 Infinity */
  distanceAt(col: number, row: number): number {
    if (!this.grid.inBounds(col, row)) return Infinity;
    const d = this.dist[row * this.grid.cols + col];
    return d === UNREACHABLE ? Infinity : d;
  }

  // ── 최소 힙 (index, 거리를 번갈아 저장) ──
  private push(idx: number, d: number) {
    const h = this.heap;
    h.push(idx, d);
    let i = h.length / 2 - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (h[p * 2 + 1] <= h[i * 2 + 1]) break;
      this.swap(i, p);
      i = p;
    }
  }

  private pop(): [number, number] {
    const h = this.heap;
    const top: [number, number] = [h[0], h[1]];
    const lastD = h.pop()!;
    const lastI = h.pop()!;
    if (h.length > 0) {
      h[0] = lastI;
      h[1] = lastD;
      let i = 0;
      const n = h.length / 2;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < n && h[l * 2 + 1] < h[m * 2 + 1]) m = l;
        if (r < n && h[r * 2 + 1] < h[m * 2 + 1]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number) {
    const h = this.heap;
    [h[a * 2], h[b * 2]] = [h[b * 2], h[a * 2]];
    [h[a * 2 + 1], h[b * 2 + 1]] = [h[b * 2 + 1], h[a * 2 + 1]];
  }
}
