import Phaser from "phaser";
import { weapons, type WeaponDef } from "../config";
import type { Bullets } from "./Bullets";

/**
 * 현재 무기와 발사 간격을 관리한다. Phase 2에서는 총 종류(gun)만 발사한다.
 * (해금, 탄약, 무기 교체, 설치/투척/로켓은 Phase 4)
 */
export class WeaponController {
  private readonly bullets: Bullets;
  current: WeaponDef = weapons[0];
  private nextFireAt = 0;

  constructor(bullets: Bullets) {
    this.bullets = bullets;
  }

  /** 버튼을 누르고 있는 동안 매 프레임 호출. 발사 간격이 지났으면 쏜다 */
  tryFire(now: number, x: number, y: number, angle: number) {
    if (now < this.nextFireAt) return;
    const w = this.current;
    if (w.kind !== "gun") return;
    this.nextFireAt = now + w.fireIntervalMs;

    const spread = Phaser.Math.DegToRad(w.spreadDeg);
    for (let i = 0; i < w.pellets; i++) {
      // 여러 발이면 부채꼴로 고르게, 한 발이면 퍼짐 범위 안에서 무작위
      const offset =
        w.pellets > 1 ? -spread / 2 + (spread * i) / (w.pellets - 1) + (Math.random() - 0.5) * (spread / w.pellets) : (Math.random() - 0.5) * spread;
      this.bullets.fire({ x, y, angle: angle + offset, speed: w.bulletSpeed, range: w.range, damage: w.damage, knockback: w.knockback });
    }
  }
}
