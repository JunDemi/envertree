import type Phaser from "phaser";
import { combatConfig } from "../config";
import { TEX } from "../assets/keys";

export type ItemType = "ammo" | "health";

interface Item {
  active: boolean;
  type: ItemType;
  x: number;
  y: number;
  expireAt: number;
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
}

/** 바닥에 떨어진 아이템 (탄약 상자, 회복). 플레이어가 가까이 가면 줍는다. 풀링 */
export class Items {
  private readonly scene: Phaser.Scene;
  private readonly items: Item[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  drop(type: ItemType, x: number, y: number) {
    let it = this.items.find((i) => !i.active);
    if (!it) {
      it = {
        active: false, type, x: 0, y: 0, expireAt: 0,
        shadow: this.scene.add.image(0, 0, TEX.shadow).setAlpha(0.3).setDisplaySize(24, 9),
        image: this.scene.add.image(0, 0, TEX.ammoCrate).setOrigin(0.5, 1),
      };
      this.items.push(it);
    }
    it.active = true;
    it.type = type;
    it.x = x;
    it.y = y;
    it.expireAt = this.scene.time.now + combatConfig.drops.lifetimeMs;
    it.image.setTexture(type === "ammo" ? TEX.ammoCrate : TEX.healthPack).setVisible(true).setAlpha(1);
    it.image.setPosition(x, y).setDepth(y);
    it.shadow.setPosition(x, y - 3).setDepth(y - 0.5).setVisible(true);
    // 떨어질 때 살짝 튐
    it.image.y = y - 16;
    this.scene.tweens.add({ targets: it.image, y, duration: 260, ease: "Bounce.out" });
  }

  /** 줍기/만료 처리. 주운 아이템마다 onPickup 호출 (false를 돌려주면 줍지 않음, 예: 체력이 가득) */
  update(px: number, py: number, onPickup: (type: ItemType, x: number, y: number) => boolean) {
    const now = this.scene.time.now;
    const r = combatConfig.drops.pickupRadius;
    for (const it of this.items) {
      if (!it.active) continue;
      if (now >= it.expireAt) {
        this.release(it);
        continue;
      }
      // 사라지기 3초 전부터 깜빡임
      it.image.setAlpha(it.expireAt - now < 3000 && Math.floor(now / 120) % 2 === 0 ? 0.3 : 1);
      if (Math.hypot(it.x - px, it.y - py) <= r && onPickup(it.type, it.x, it.y)) this.release(it);
    }
  }

  clear() {
    for (const it of this.items) if (it.active) this.release(it);
  }

  private release(it: Item) {
    it.active = false;
    it.image.setVisible(false);
    it.shadow.setVisible(false);
  }
}
