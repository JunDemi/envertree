import type Phaser from "phaser";
import type { Grid } from "./Grid";

/**
 * 스폰 위치 고르기: 아레나 가장자리 띠(바깥벽 안쪽 edgeBand칸) 안의 빈 칸 중에서
 * 카메라 화면(+margin) 밖에 있는 칸을 무작위로 고른다. 없으면 null.
 * (Phase 3에서 사방 스폰 지점 방식으로 확장)
 */
export function pickSpawnPoint(
  grid: Grid,
  view: Phaser.Geom.Rectangle,
  margin: number,
  edgeBand = 3,
): { x: number; y: number } | null {
  const candidates: { col: number; row: number }[] = [];
  for (let r = 1; r < grid.rows - 1; r++) {
    for (let c = 1; c < grid.cols - 1; c++) {
      const nearEdge = c <= edgeBand || r <= edgeBand || c >= grid.cols - 1 - edgeBand || r >= grid.rows - 1 - edgeBand;
      if (!nearEdge || grid.isBlocked(c, r)) continue;
      const { x, y } = grid.tileCenter(c, r);
      const onScreen =
        x > view.x - margin && x < view.right + margin && y > view.y - margin && y < view.bottom + margin;
      if (!onScreen) candidates.push({ col: c, row: r });
    }
  }
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const center = grid.tileCenter(pick.col, pick.row);
  // 발밑 기준점: 칸 가운데보다 약간 아래
  return { x: center.x, y: center.y + 8 };
}
