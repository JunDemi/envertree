import Phaser from "phaser";
import { combatConfig } from "../config";
import { TEX } from "../assets/keys";
import { textStyle } from "../ui/text";

/** 파편 같은 시각 효과. Phaser 파티클 이미터는 내부적으로 파티클을 재사용(풀링)한다 */
export class Effects {
  private readonly scene: Phaser.Scene;
  private readonly debris: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly fire: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.debris = scene.add.particles(0, 0, TEX.particle, {
      speed: { min: 60, max: 180 },
      angle: { min: 200, max: 340 }, // 위쪽으로 튀어오름
      gravityY: 420,
      lifespan: { min: 350, max: 650 },
      scale: { start: 1.2, end: 0.4 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    this.debris.setDepth(1e6);

    this.fire = scene.add.particles(0, 0, TEX.particle, {
      speed: { min: 80, max: 260 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 250, max: 500 },
      scale: { start: 2.2, end: 0.2 },
      alpha: { start: 1, end: 0 },
      tint: [0xfef08a, 0xfb923c, 0xef4444, 0x9ca3af],
      emitting: false,
    });
    this.fire.setDepth(1e6 + 1);
  }

  /** 폭발: 바닥에 퍼지는 원 + 불꽃 파편 */
  explosion(x: number, y: number, radius: number) {
    const ring = this.scene.add.image(x, y, TEX.blast).setTint(0xfb923c).setDepth(1e6);
    ring.setDisplaySize(radius * 0.4, radius * 0.25);
    this.scene.tweens.add({
      targets: ring,
      displayWidth: radius * 2,
      displayHeight: radius * 1.3,
      alpha: 0,
      duration: 320,
      ease: "Quad.out",
      onComplete: () => ring.destroy(),
    });
    const flash = this.scene.add.image(x, y - 14, TEX.blast).setTint(0xfef9c3).setDepth(1e6 + 2);
    flash.setDisplaySize(radius * 0.9, radius * 0.9);
    this.scene.tweens.add({ targets: flash, alpha: 0, scale: flash.scale * 1.3, duration: 160, onComplete: () => flash.destroy() });
    this.fire.explode(Math.round(radius / 4), x, y - 10);
  }

  /** 월드 좌표에 떠올랐다 사라지는 글자 (아이템 획득 등) */
  floatText(x: number, y: number, text: string, color: string) {
    const t = this.scene.add.text(x, y, text, textStyle(14, color, true)).setOrigin(0.5, 1).setDepth(1e6 + 3);
    this.scene.tweens.add({ targets: t, y: y - 28, alpha: 0, duration: 800, ease: "Quad.out", onComplete: () => t.destroy() });
  }

  /** 몬스터 사망 파편: 몸통 가운데쯤에서 몸 색으로 */
  burst(x: number, y: number, color: number, count: number = combatConfig.debrisCount) {
    this.debris.setParticleTint(color);
    this.debris.explode(count, x, y);
  }
}
