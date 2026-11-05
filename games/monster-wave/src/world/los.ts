import type { Grid } from "./Grid";

/**
 * (x0, y0) → (x1, y1) 직선이 막힌 칸을 지나지 않는지 (시야 확인).
 * 타일 크기의 1/4 간격으로 점을 찍어 검사한다. 몇 마리의 원거리 몬스터용이라 이 정도면 충분히 가볍다.
 */
export function hasLineOfSight(grid: Grid, x0: number, y0: number, x1: number, y1: number): boolean {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const step = grid.tile / 4;
  const n = Math.ceil(dist / step);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const { col, row } = grid.worldToTile(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    if (grid.isBlocked(col, row)) return false;
  }
  return true;
}
