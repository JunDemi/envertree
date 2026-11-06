import type Phaser from "phaser";
import { viewConfig, type Explosion } from "../config";
import { TEX } from "../assets/keys";
import { displayScale } from "../assets/images";

interface Grenade {
  active: boolean;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  /** 던진 시각, 착지 시각, 폭발 시각 (scene time, ms) */
  throwAt: number;
  landAt: number;
  fuseAt: number;
  explosion: Explosion;
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
}

/**
 * 수류탄: 조준 지점으로 포물선을 그리며 날아가 착지하고, 던진 지 fuseMs 후 터진다.
 * 지면 좌표(x, y)는 직선으로 보간하고, 그림만 높이(arc)를 더해 그린다.
 */
export class Grenades {
  private readonly scene: Phaser.Scene;
  private readonly items: Grenade[] = [];
  private readonly onExplode: (x: number, y: number, ex: Explosion) => void;

  constructor(scene: Phaser.Scene, onExplode: (x: number, y: number, ex: Explosion) => void) {
    this.scene = scene;
    this.onExplode = onExplode;
  }

  throw(sx: number, sy: number, tx: number, ty: number, fuseMs: number, explosion: Explosion) {
    let g = this.items.find((it) => !it.active);
    if (!g) {
      g = {
        active: false, sx: 0, sy: 0, tx: 0, ty: 0, throwAt: 0, landAt: 0, fuseAt: 0, explosion,
        shadow: this.scene.add.image(0, 0, TEX.shadow).setAlpha(0.3).setDisplaySize(10, 5),
        image: this.scene.add.image(0, 0, TEX.grenade).setScale(displayScale(this.scene, TEX.grenade)),
      };
      this.items.push(g);
    }
    const now = this.scene.time.now;
    const dist = Math.hypot(tx - sx, ty - sy);
    Object.assign(g, {
      active: true, sx, sy, tx, ty, explosion,
      throwAt: now,
      // 비행 시간: 거리에 비례 (최소 0.25초), 신관보다 짧게
      landAt: now + Math.min(fuseMs * 0.7, Math.max(250, dist * 1.6)),
      fuseAt: now + fuseMs,
    });
    g.image.setVisible(true);
    g.shadow.setVisible(true);
  }

  update() {
    const now = this.scene.time.now;
    for (const g of this.items) {
      if (!g.active) continue;
      const flight = Math.min(1, (now - g.throwAt) / Math.max(1, g.landAt - g.throwAt));
      const x = g.sx + (g.tx - g.sx) * flight;
      const y = g.sy + (g.ty - g.sy) * flight;
      const h = Math.sin(flight * Math.PI) * viewConfig.grenadeArcHeight + 4;
      g.image.setPosition(x, y - h).setDepth(y).setRotation(flight * 8);
      g.shadow.setPosition(x, y).setDepth(y - 0.5);
      // 착지 후 신관이 다 되면 폭발. 터지기 직전에는 빨갛게 깜빡임
      if (flight >= 1) g.image.setTint(Math.floor(now / 90) % 2 === 0 ? 0xff4444 : 0xffffff);
      if (now >= g.fuseAt) {
        g.active = false;
        g.image.setVisible(false).clearTint();
        g.shadow.setVisible(false);
        this.onExplode(x, y, g.explosion);
      }
    }
  }

  clear() {
    for (const g of this.items) {
      g.active = false;
      g.image.setVisible(false);
      g.shadow.setVisible(false);
    }
  }
}
