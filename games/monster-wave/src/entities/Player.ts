import Phaser from "phaser";
import { playerConfig, viewConfig } from "../config";
import { TEX } from "../assets/keys";
import type { PlayerInput } from "../input/types";
import { addShadow, placeShadow } from "../view/depth";

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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const { w, d } = playerConfig.footprint;

    this.shadow = addShadow(scene, x, y, playerConfig.footprint);

    this.sprite = scene.physics.add.image(x, y, TEX.player).setOrigin(0.5, 1);
    // 몸체를 발자국 크기로 줄이고 스프라이트 맨 아래에 붙인다
    const frameW = this.sprite.width;
    const frameH = this.sprite.height;
    this.sprite.body.setSize(w, d, false);
    this.sprite.body.setOffset((frameW - w) / 2, frameH - d);

    this.gun = scene.add.image(x, y, TEX.gun).setOrigin(0.15, 0.5);
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  update(input: PlayerInput) {
    const body = this.sprite.body;
    body.setVelocity(input.moveX * playerConfig.speed, input.moveY * playerConfig.speed);

    // 조준: 총을 드는 높이에서 마우스 지점을 향한다
    const gunY = this.y - viewConfig.gunHeight;
    this.aimAngle = Math.atan2(input.aimY - gunY, input.aimX - this.x);
  }

  /** 물리 이동이 끝난 뒤 그림을 맞춘다 (scene의 update 끝에서 호출) */
  syncView() {
    const { x, y } = this;
    const facingUp = Math.sin(this.aimAngle) < -0.2;

    // 위를 볼 때는 뒷모습(눈 없음), 아래를 볼 때는 앞모습
    this.sprite.setTexture(facingUp ? TEX.playerBack : TEX.player);
    this.sprite.setDepth(y);
    placeShadow(this.shadow, x, y, playerConfig.footprint);

    // 총: 몸통 옆, 조준 방향으로 회전. 위를 볼 때는 몸 뒤에 그린다
    const reach = 8;
    this.gun.setPosition(x + Math.cos(this.aimAngle) * reach, y - viewConfig.gunHeight + Math.sin(this.aimAngle) * reach * 0.5);
    this.gun.setRotation(this.aimAngle);
    // 왼쪽을 볼 때 총이 뒤집혀 보이지 않게
    this.gun.setFlipY(Math.cos(this.aimAngle) < 0);
    this.gun.setDepth(facingUp ? y - 0.5 : y + 0.5);
  }
}
