import Phaser from "phaser";
import { combatConfig } from "../config";
import { TEX } from "../assets/keys";

/** 파편 같은 시각 효과. Phaser 파티클 이미터는 내부적으로 파티클을 재사용(풀링)한다 */
export class Effects {
  private readonly debris: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
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
  }

  /** 몬스터 사망 파편: 몸통 가운데쯤에서 몸 색으로 */
  burst(x: number, y: number, color: number, count: number = combatConfig.debrisCount) {
    this.debris.setParticleTint(color);
    this.debris.explode(count, x, y);
  }
}
