import Phaser from "phaser";
import { arenaHeight, arenaWidth, viewConfig } from "../config";
import { TEX } from "../assets/keys";
import { Grid } from "./Grid";

/**
 * 아레나: 바닥, 벽 그림, 벽 충돌 몸체.
 * - 그림: 막힌 칸마다 벽 블록 이미지 (윗면 + 앞면). depth = 칸의 아래쪽 y
 * - 충돌: 바닥 면적(칸)만. 이어진 칸은 하나의 보이지 않는 몸체로 합친다.
 */
export class Arena {
  readonly grid = new Grid();
  readonly walls: Phaser.Physics.Arcade.StaticGroup;
  /** 칸별 벽 그림 (index = row * cols + col) */
  private readonly wallImages: (Phaser.GameObjects.Image | undefined)[] = [];
  /** 지금 반투명 처리된 벽 */
  private faded = new Set<Phaser.GameObjects.Image>();

  constructor(scene: Phaser.Scene) {
    const { grid } = this;
    const t = grid.tile;

    // 바닥: 아레나 전체 + 맨 윗줄 벽이 위로 솟은 만큼
    scene.add
      .tileSprite(0, -viewConfig.wallHeight, arenaWidth, arenaHeight + viewConfig.wallHeight, TEX.floor)
      .setOrigin(0)
      .setDepth(-1e7);

    // 벽 그림
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (!grid.isWall(c, r)) continue;
        const bottom = (r + 1) * t;
        this.wallImages[r * grid.cols + c] = scene.add
          .image(c * t + t / 2, bottom, TEX.wall)
          .setOrigin(0.5, 1)
          .setDepth(bottom);
      }
    }

    // 벽 충돌 몸체
    this.walls = scene.physics.add.staticGroup();
    for (const rect of grid.blockedRects()) {
      const zone = scene.add.zone((rect.col + rect.w / 2) * t, (rect.row + rect.h / 2) * t, rect.w * t, rect.h * t);
      this.walls.add(zone);
    }
  }

  /**
   * 대상(플레이어) 그림을 가리는 벽을 반투명하게 만든다. 매 프레임 호출.
   * 가리는 벽 = 대상보다 앞(depth가 큼)에 있으면서 그림 영역이 겹치는 칸.
   * (x, y)는 대상의 발밑, w는 그림 너비.
   */
  updateOcclusion(x: number, y: number, w: number) {
    const { grid } = this;
    const t = grid.tile;
    const wallSpriteH = t + viewConfig.wallHeight;
    const next = new Set<Phaser.GameObjects.Image>();

    const colStart = Math.floor((x - w / 2) / t);
    const colEnd = Math.floor((x + w / 2) / t);
    // 벽 칸 r의 그림은 세로로 [bottom − wallSpriteH, bottom] (bottom = (r+1)·t).
    // 가리려면: bottom > y (대상보다 앞) 이고, 그림 위쪽이 대상 그림 아래쪽(y)보다 위
    // (대상 그림은 [y − h, y]이므로 bottom > y 이면 아래쪽 겹침은 항상 성립)
    const rowStart = Math.floor(y / t);
    const rowEnd = Math.floor((y + wallSpriteH) / t);

    for (let r = rowStart; r <= rowEnd; r++) {
      const bottom = (r + 1) * t;
      if (bottom <= y || bottom - wallSpriteH >= y) continue;
      for (let c = colStart; c <= colEnd; c++) {
        if (!grid.inBounds(c, r)) continue;
        const img = this.wallImages[r * grid.cols + c];
        if (img) next.add(img);
      }
    }

    for (const img of this.faded) if (!next.has(img)) img.setAlpha(1);
    for (const img of next) img.setAlpha(viewConfig.occludingWallAlpha);
    this.faded = next;
  }
}
