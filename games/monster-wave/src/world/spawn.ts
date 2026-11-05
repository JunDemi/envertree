import type Phaser from "phaser";
import { arenaConfig } from "../config";
import type { Grid } from "./Grid";

/**
 * 스폰 지점 고르기 (config/arena.ts의 spawnPoints).
 * 카메라 화면(+margin) 밖에 있는 지점 중 무작위로 고른다.
 * 모두 화면 안이면 플레이어에게서 가장 먼 지점을 쓴다.
 * 몬스터끼리 완전히 겹치지 않게 칸 안에서 약간 흩뿌린다.
 */
export function pickSpawnPoint(
  grid: Grid,
  view: Phaser.Geom.Rectangle,
  margin: number,
  playerX: number,
  playerY: number,
): { x: number; y: number } | null {
  const open = arenaConfig.spawnPoints.filter((p) => !grid.isBlocked(p.col, p.row));
  if (open.length === 0) return null;

  const offscreen = open.filter((p) => {
    const { x, y } = grid.tileCenter(p.col, p.row);
    return x < view.x - margin || x > view.right + margin || y < view.y - margin || y > view.bottom + margin;
  });

  let pick;
  if (offscreen.length > 0) {
    pick = offscreen[Math.floor(Math.random() * offscreen.length)];
  } else {
    pick = open.reduce((far, p) => {
      const a = grid.tileCenter(p.col, p.row);
      const b = grid.tileCenter(far.col, far.row);
      return Math.hypot(a.x - playerX, a.y - playerY) > Math.hypot(b.x - playerX, b.y - playerY) ? p : far;
    });
  }

  const c = grid.tileCenter(pick.col, pick.row);
  const jitter = grid.tile * 0.3;
  return { x: c.x + (Math.random() - 0.5) * jitter, y: c.y + 10 + (Math.random() - 0.5) * jitter };
}
