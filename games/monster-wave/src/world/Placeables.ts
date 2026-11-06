import Phaser from "phaser";
import type { Explosion } from "../config";
import { TEX } from "../assets/keys";
import { displayScale } from "../assets/images";
import type { Grid } from "./Grid";

export type PlaceableType = "barricade" | "barrel";

export interface Placeable {
  type: PlaceableType;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  explosion?: Explosion;
  /** 폭발이 이미 예약/진행됨 (연쇄 폭발 중복 방지) */
  exploding: boolean;
  image: Phaser.GameObjects.Image;
  /** 플레이어 충돌용 보이지 않는 몸체 (아레나 벽 그룹에 들어감) */
  zone: Phaser.GameObjects.Zone;
}

export interface PlaceableCallbacks {
  /** 설치/파괴로 격자가 바뀜 → 플로우 필드 재계산 */
  onGridChanged(): void;
  /** 드럼통이 터져야 함 (폭발 처리는 호출하는 쪽에서) */
  onBarrelExplode(p: Placeable): void;
  /** 바리케이드가 부서짐 (효과용) */
  onBarricadeBroken(p: Placeable): void;
}

/**
 * 바리케이드와 폭발 드럼통. 칸 하나를 차지하며 격자의 설치물 층(obstacle)에 기록된다.
 * - 바리케이드: 몬스터 이동을 막고, 몬스터가 공격하면 hp가 줄어 부서진다.
 * - 드럼통: 이동을 막고, 총/폭발/몬스터 공격에 맞으면 터진다.
 */
export class Placeables {
  private readonly scene: Phaser.Scene;
  private readonly grid: Grid;
  private readonly walls: Phaser.Physics.Arcade.StaticGroup;
  private readonly cb: PlaceableCallbacks;
  private readonly byTile = new Map<number, Placeable>();
  private readonly faded = new Set<Placeable>();

  constructor(scene: Phaser.Scene, grid: Grid, walls: Phaser.Physics.Arcade.StaticGroup, cb: PlaceableCallbacks) {
    this.scene = scene;
    this.grid = grid;
    this.walls = walls;
    this.cb = cb;
  }

  at(col: number, row: number): Placeable | undefined {
    return this.byTile.get(row * this.grid.cols + col);
  }

  get all(): IterableIterator<Placeable> {
    return this.byTile.values();
  }

  place(type: PlaceableType, col: number, row: number, maxHp: number, explosion?: Explosion): Placeable {
    const t = this.grid.tile;
    const bottom = (row + 1) * t;
    const cx = (col + 0.5) * t;
    const key = type === "barricade" ? TEX.barricade : TEX.barrel;
    const image = this.scene.add.image(cx, type === "barricade" ? bottom : bottom - 6, key).setOrigin(0.5, 1);
    const scale = displayScale(this.scene, key);
    image.setDepth(bottom);

    const zone = this.scene.add.zone(cx, (row + 0.5) * t, t, t);
    this.walls.add(zone);

    const p: Placeable = { type, col, row, hp: maxHp, maxHp, explosion, exploding: false, image, zone };
    this.byTile.set(row * this.grid.cols + col, p);
    this.grid.setObstacle(col, row, true);
    this.cb.onGridChanged();

    // 설치 연출: 살짝 튀어오름
    image.setScale(scale, scale * 0.6);
    this.scene.tweens.add({ targets: image, scaleY: scale, duration: 140, ease: "Back.out" });
    return p;
  }

  /** 피해를 준다. 바리케이드는 hp 0이면 부서지고, 드럼통은 바로 터진다 */
  damage(p: Placeable, amount: number) {
    if (!this.byTile.has(p.row * this.grid.cols + p.col) || amount <= 0) return;
    if (p.type === "barrel") {
      this.explode(p);
      return;
    }
    p.hp -= amount;
    if (p.hp <= 0) {
      this.remove(p);
      this.cb.onBarricadeBroken(p);
      return;
    }
    // 금이 간 느낌: 체력이 줄수록 어둡게
    const ratio = Math.max(0, p.hp / p.maxHp);
    const shade = Math.round(0x70 + 0x8f * ratio);
    p.image.setTint((shade << 16) | (shade << 8) | shade);
    this.scene.tweens.add({ targets: p.image, x: p.image.x + 2, duration: 40, yoyo: true, repeat: 1 });
  }

  /** 드럼통 폭발 (delayMs 후). 이미 터지는 중이면 무시 */
  explode(p: Placeable, delayMs = 0) {
    if (p.type !== "barrel" || p.exploding) return;
    p.exploding = true;
    const run = () => {
      this.remove(p);
      this.cb.onBarrelExplode(p);
    };
    if (delayMs > 0) this.scene.time.delayedCall(delayMs, run);
    else run();
  }

  remove(p: Placeable) {
    const key = p.row * this.grid.cols + p.col;
    if (this.byTile.get(key) !== p) return;
    this.byTile.delete(key);
    this.faded.delete(p);
    this.grid.setObstacle(p.col, p.row, false);
    this.walls.remove(p.zone, true, true);
    p.image.destroy();
    this.cb.onGridChanged();
  }

  /** (x, y) 중심 반경 r과 겹치는 설치물 */
  inRadius(x: number, y: number, r: number): Placeable[] {
    const t = this.grid.tile;
    const out: Placeable[] = [];
    for (const p of this.byTile.values()) {
      // 칸 사각형과 원의 최근접점 거리
      const nx = Phaser.Math.Clamp(x, p.col * t, (p.col + 1) * t);
      const ny = Phaser.Math.Clamp(y, p.row * t, (p.row + 1) * t);
      if (Math.hypot(nx - x, ny - y) <= r) out.push(p);
    }
    return out;
  }

  /**
   * 대상(플레이어)을 가리는 설치물을 반투명하게 (Arena.updateOcclusion과 같은 규칙).
   * (x, y)는 대상 발밑, w는 대상 그림 너비.
   */
  updateOcclusion(x: number, y: number, w: number, alpha: number) {
    const t = this.grid.tile;
    for (const p of this.byTile.values()) {
      const img = p.image;
      const bottom = img.y;
      const top = bottom - img.height;
      const occludes = bottom > y && top < y && x + w / 2 > p.col * t && x - w / 2 < (p.col + 1) * t;
      if (occludes) {
        img.setAlpha(alpha);
        this.faded.add(p);
      } else if (this.faded.has(p)) {
        img.setAlpha(1);
        this.faded.delete(p);
      }
    }
  }
}
