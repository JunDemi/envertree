import type { Grid } from "./Grid";

const EPS = 0.01;

/**
 * 발자국(가로 w × 세로 d, 기준점은 아래쪽 가운데)을 (dx, dy)만큼 움직이되 막힌 칸에 막히게 한다.
 * x축과 y축을 따로 처리해서 벽을 따라 미끄러진다. 결과 좌표를 out에 쓴다.
 * (한 번에 움직이는 거리가 타일 크기보다 작다고 가정)
 */
export function moveWithWalls(
  grid: Grid,
  x: number,
  y: number,
  w: number,
  d: number,
  dx: number,
  dy: number,
  out: { x: number; y: number },
) {
  const t = grid.tile;
  const hw = w / 2;

  // x축
  let nx = x + dx;
  if (dx !== 0) {
    const r0 = Math.floor((y - d) / t);
    const r1 = Math.floor((y - EPS) / t);
    const edge = dx > 0 ? nx + hw - EPS : nx - hw;
    const col = Math.floor(edge / t);
    for (let r = r0; r <= r1; r++) {
      if (grid.isBlocked(col, r)) {
        nx = dx > 0 ? col * t - hw : (col + 1) * t + hw;
        break;
      }
    }
  }

  // y축
  let ny = y + dy;
  if (dy !== 0) {
    const c0 = Math.floor((nx - hw) / t);
    const c1 = Math.floor((nx + hw - EPS) / t);
    const edge = dy > 0 ? ny - EPS : ny - d;
    const row = Math.floor(edge / t);
    for (let c = c0; c <= c1; c++) {
      if (grid.isBlocked(c, row)) {
        ny = dy > 0 ? row * t : (row + 1) * t + d;
        break;
      }
    }
  }

  out.x = nx;
  out.y = ny;
}
