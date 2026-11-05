import Phaser from "phaser";
import type { Explosion } from "../config";
import type { Monster } from "../entities/Monster";

/** 날아가는 투사체 하나 (풀에서 재사용) */
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
  /** 쏜 몬스터 (몬스터 투사체일 때). 자기 자신은 맞지 않는다 */
  owner: Monster | null;
  /** 부딪히면 터지는 투사체(로켓)의 폭발 정보 */
  explosion: Explosion | null;
  image: Phaser.GameObjects.Image;
}

export interface FireOptions {
  x: number;
  y: number;
  angle: number;
  speed: number;
  range: number;
  damage: number;
  knockback?: number;
  owner?: Monster | null;
  explosion?: Explosion | null;
}

/**
 * 투사체 풀 (플레이어 총알, 임프 화염구 등 종류별로 하나씩).
 * 투사체는 지면 좌표로 움직이고, 그림은 height만큼 위에 그린다.
 * 충돌 판정은 GameScene이 update의 onStep 콜백으로 처리한다.
 */
export class Bullets {
  private readonly scene: Phaser.Scene;
  private readonly texture: string;
  private readonly height: number;
  private readonly rotate: boolean;
  readonly items: Bullet[] = [];

  constructor(scene: Phaser.Scene, texture: string, height: number, rotate = true) {
    this.scene = scene;
    this.texture = texture;
    this.height = height;
    this.rotate = rotate;
  }

  fire(o: FireOptions) {
    let b = this.items.find((it) => !it.active);
    if (!b) {
      b = {
        active: false, x: 0, y: 0, vx: 0, vy: 0, range: 0, damage: 0, knockback: 0, owner: null, explosion: null,
        image: this.scene.add.image(0, 0, this.texture),
      };
      this.items.push(b);
    }
    b.active = true;
    b.x = o.x;
    b.y = o.y;
    b.vx = Math.cos(o.angle) * o.speed;
    b.vy = Math.sin(o.angle) * o.speed;
    b.range = o.range;
    b.damage = o.damage;
    b.knockback = o.knockback ?? 0;
    b.owner = o.owner ?? null;
    b.explosion = o.explosion ?? null;
    b.image.setVisible(true).setRotation(this.rotate ? o.angle : 0);
    this.sync(b);
  }

  release(b: Bullet) {
    b.active = false;
    b.owner = null;
    b.image.setVisible(false);
  }

  releaseAll() {
    for (const b of this.items) if (b.active) this.release(b);
  }

  /** 이동 후 각 투사체에 대해 onStep 호출. onStep이 false를 돌려주면 제거 */
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
    b.image.setPosition(b.x, b.y - this.height).setDepth(b.y);
  }
}
