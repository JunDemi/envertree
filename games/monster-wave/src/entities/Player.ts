import Phaser from "phaser";
import { debugState, playerConfig, viewConfig } from "../config";
import { TEX, playerTexture } from "../assets/keys";
import type { PlayerInput } from "../input/types";
import { addShadow, placeShadow } from "../view/depth";
import { facingFromVector } from "../view/facing";

/**
 * 플레이어. 물리 몸체는 발자국(footprint) 크기이고, 그림은 그 위로 솟아 있다.
 * 입력은 직접 읽지 않고 update(input)으로 받는다 (입력 장치와 분리).
 */
export class Player {
  readonly sprite: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly gun: Phaser.GameObjects.Image;
  /** 조준 각도 (라디안, 0 = 오른쪽) */
  aimAngle = Math.PI / 2;
  hp: number = playerConfig.maxHp;
  /** 이 시각(scene time, ms)까지 무적 */
  private invincibleUntil = 0;
  dead = false;
  /** 넉백으로 남은 밀림 속도 (px/초). 이동 입력에 더해지고 매 프레임 감쇠 */
  private pushX = 0;
  private pushY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const { w, d } = playerConfig.footprint;

    this.shadow = addShadow(scene, x, y, playerConfig.footprint);

    const scale = viewConfig.artScale;
    this.sprite = scene.physics.add.image(x, y, playerTexture("down")).setOrigin(0.5, 1).setScale(scale);
    // 몸체를 발자국 크기로 줄이고 스프라이트 맨 아래에 붙인다.
    // 물리 몸체의 크기·위치는 그림 원본 픽셀 기준이라 축소 비율만큼 나눠서 준다
    const frameW = this.sprite.width;
    const frameH = this.sprite.height;
    this.sprite.body.setSize(w / scale, d / scale, false);
    this.sprite.body.setOffset((frameW - w / scale) / 2, frameH - d / scale);

    this.gun = scene.add.image(x, y, TEX.gun).setOrigin(0.15, 0.5);
  }

  /**
   * 발밑 좌표. 스프라이트 위치는 물리 계산 후(POST_UPDATE)에야 갱신되므로
   * 게임 로직은 이번 프레임에 이미 이동한 물리 몸체에서 직접 읽는다.
   */
  get x() {
    return this.sprite.body.center.x;
  }

  get y() {
    return this.sprite.body.bottom;
  }

  get isInvincible() {
    return this.sprite.scene.time.now < this.invincibleUntil;
  }

  /** 피해를 입는다. 무적 중이면 무시. 실제로 피해를 입었으면 true */
  takeDamage(amount: number): boolean {
    if (this.dead || this.isInvincible || amount <= 0 || debugState.invincible) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invincibleUntil = this.sprite.scene.time.now + playerConfig.invincibleMs;
    if (this.hp === 0) {
      this.dead = true;
      this.pushX = 0;
      this.pushY = 0;
      this.sprite.body.setVelocity(0, 0);
    }
    return true;
  }

  /** (dirX, dirY) 방향으로 약 force(px)만큼 밀려난다. 벽에는 물리 충돌로 막힌다 */
  knockback(dirX: number, dirY: number, force: number) {
    // 감쇠 계수 10/초 → 초기 속도 force×10 이면 총 이동 거리 ≈ force
    this.pushX += dirX * force * 10;
    this.pushY += dirY * force * 10;
  }

  update(input: PlayerInput, dt: number) {
    if (this.dead) return;
    const body = this.sprite.body;
    body.setVelocity(input.moveX * playerConfig.speed + this.pushX, input.moveY * playerConfig.speed + this.pushY);
    const decay = Math.exp(-10 * dt);
    this.pushX *= decay;
    this.pushY *= decay;

    // 조준: 총을 쥔 높이에서 마우스 지점을 향한다
    // (총알은 발자국 가운데에서 출발해 gunHeight 높이로 그려지므로 같은 기준점을 쓴다)
    const gunY = this.y - playerConfig.footprint.d / 2 - viewConfig.gunHeight;
    this.aimAngle = Math.atan2(input.aimY - gunY, input.aimX - this.x);
  }

  /** 물리 이동이 끝난 뒤 그림을 맞춘다 (scene의 update 끝에서 호출) */
  syncView() {
    const { x, y } = this;
    // 몸은 조준 방향을 본다 (5방향 + 좌우 반전)
    const { facing, flip } = facingFromVector(Math.cos(this.aimAngle), Math.sin(this.aimAngle));
    const facingUp = facing === "up" || facing === "upRight";
    this.sprite.setTexture(playerTexture(facing)).setFlipX(flip);
    this.sprite.setDepth(y);
    placeShadow(this.shadow, x, y, playerConfig.footprint);

    // 총: 몸통 옆, 조준 방향으로 회전. 위를 볼 때는 몸 뒤에 그린다
    const { gunHeight, gunReach, gunReachYScale } = viewConfig;
    const handY = y - playerConfig.footprint.d / 2 - gunHeight;
    this.gun.setPosition(
      x + Math.cos(this.aimAngle) * gunReach,
      handY + Math.sin(this.aimAngle) * gunReach * gunReachYScale,
    );
    this.gun.setRotation(this.aimAngle);
    // 왼쪽을 볼 때 총이 뒤집혀 보이지 않게
    this.gun.setFlipY(Math.cos(this.aimAngle) < 0);
    this.gun.setDepth(facingUp ? y - 0.5 : y + 0.5);

    // 무적 중에는 깜빡임
    const blink = this.isInvincible && Math.floor(this.sprite.scene.time.now / 80) % 2 === 0;
    this.sprite.setAlpha(blink ? 0.35 : 1);
    this.gun.setAlpha(blink ? 0.35 : 1);
  }

  /** 사망 연출용: 몸, 총, 그림자를 모두 숨긴다 */
  hide() {
    this.sprite.setVisible(false);
    this.gun.setVisible(false);
    this.shadow.setVisible(false);
  }

  /** 총구 위치(지면 좌표): 발자국 가운데에서 조준 방향으로 조금 앞 */
  muzzle() {
    const muzzleDist = 14;
    return {
      x: this.x + Math.cos(this.aimAngle) * muzzleDist,
      y: this.y - playerConfig.footprint.d / 2 + Math.sin(this.aimAngle) * muzzleDist,
    };
  }
}
