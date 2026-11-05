import Phaser from "phaser";
import { viewConfig } from "../config";
import { TEX } from "../assets/keys";

/** 날아가는 총알 하나 (풀에서 재사용) */
export interface Bullet {
  active: boolean;
  /** 지면 좌표 (충돌 판정 기준) */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 남은 사거리 (px) */
  range: number;
  damage: number;
  knockback: number;
  image: Phaser.GameObjects.Image;
}

/**
 * 총알 풀. 총알은 지면 좌표로 움직이고, 그림은 총 높이만큼 위에 그린다.
 * 충돌 판정은 GameScene이 매 프레임 forEachActive로 처리한다.
 */
export class Bullets {
  private readonly scene: Phaser.Scene;
  private readonly items: Bullet[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  fire(x: number, y: number, angle: number, speed: number, range: number, damage: number, knockback: number) {
    let b = this.items.find((it) => !it.active);
    if (!b) {
      b = {
        active: false, x: 0, y: 0, vx: 0, vy: 0, range: 0, damage: 0, knockback: 0,
        image: this.scene.add.image(0, 0, TEX.bullet),
      };
      this.items.push(b);
    }
    b.active = true;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.range = range;
    b.damage = damage;
    b.knockback = knockback;
    b.image.setVisible(true).setRotation(angle);
    this.sync(b);
  }

  release(b: Bullet) {
    b.active = false;
    b.image.setVisible(false);
  }

  /** 이동 후 각 총알에 대해 onStep 호출. onStep이 false를 돌려주면 총알 제거 */
  update(dt: number, onStep: (b: Bullet) => boolean) {
    for (const b of this.items) {
      if (!b.active) continue;
      const stepX = b.vx * dt;
      const stepY = b.vy * dt;
      b.x += stepX;
      b.y += stepY;
      b.range -= Math.hypot(stepX, stepY);
      if (b.range <= 0 || !onStep(b)) {
        this.release(b);
        continue;
      }
      this.sync(b);
    }
  }

  get activeCount() {
    let n = 0;
    for (const b of this.items) if (b.active) n++;
    return n;
  }

  private sync(b: Bullet) {
    b.image.setPosition(b.x, b.y - viewConfig.gunHeight).setDepth(b.y);
  }
}
