import Phaser from "phaser";
import { combatConfig, type MonsterDef } from "../config";
import { monsterTexture, TEX } from "../assets/keys";
import { placeShadow, sizeShadow } from "../view/depth";

/**
 * 몬스터 한 마리. 풀에서 꺼내 spawn()으로 재사용한다 (MonsterManager가 관리).
 * 물리 엔진을 쓰지 않고 위치(x, y = 발밑)를 직접 갱신한다.
 */
export class Monster {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  def!: MonsterDef;
  active = false;
  x = 0;
  y = 0;
  hp = 0;
  maxHp = 0;
  speed = 0;
  /** 넉백으로 남은 밀림 (px/초), 매 프레임 감쇠 */
  pushX = 0;
  pushY = 0;
  private flashUntil = 0;
  /** 원거리 공격: 다음 발사 가능 시각 (0 = 아직 사거리에 들어온 적 없음) */
  nextAttackAt = 0;
  /** 원거리 공격: 시야 확인 캐시 */
  losCheckAt = 0;
  hasLos = false;

  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.image(0, 0, TEX.shadow).setAlpha(0.35).setVisible(false);
    this.sprite = scene.add.image(0, 0, TEX.particle).setOrigin(0.5, 1).setVisible(false);
  }

  spawn(def: MonsterDef, x: number, y: number, hpScale: number, speedScale: number) {
    this.def = def;
    this.active = true;
    this.x = x;
    this.y = y;
    this.maxHp = Math.round(def.maxHp * hpScale);
    this.hp = this.maxHp;
    this.speed = def.speed * speedScale;
    this.pushX = 0;
    this.pushY = 0;
    this.flashUntil = 0;
    this.nextAttackAt = 0;
    this.losCheckAt = 0;
    this.hasLos = false;
    this.sprite.setTexture(monsterTexture(def.id)).clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    this.sprite.setVisible(true);
    sizeShadow(this.shadow, def.footprint);
    this.shadow.setVisible(true);
    this.syncView(0);
  }

  despawn() {
    this.active = false;
    this.sprite.setVisible(false);
    this.shadow.setVisible(false);
  }

  /** 피해를 입힌다. 죽었으면 true */
  damage(amount: number, now: number): boolean {
    this.hp -= amount;
    this.flashUntil = now + combatConfig.hitFlashMs;
    this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    return this.hp <= 0;
  }

  /** 넉백: (dirX, dirY) 방향으로 force(px)만큼 밀어낸다. 저항만큼 줄어든다 */
  knockback(dirX: number, dirY: number, force: number) {
    const f = force * (1 - this.def.knockbackResist) * 10; // px → px/초 (감쇠하며 약 force px 이동)
    this.pushX += dirX * f;
    this.pushY += dirY * f;
  }

  syncView(now: number) {
    this.sprite.setPosition(this.x, this.y).setDepth(this.y);
    placeShadow(this.shadow, this.x, this.y, this.def.footprint);
    if (this.flashUntil !== 0 && now >= this.flashUntil) {
      this.flashUntil = 0;
      this.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    }
  }
}
