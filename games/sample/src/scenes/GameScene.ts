import Phaser from "phaser";
import { gameStart } from "@envertree/game-sdk";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from "../config";

const START_LIVES = 3;
const BASKET_SPEED = 600; // 키보드 이동 속도 (px/초)

/** 떨어지는 별을 바구니로 받는다. 놓치면 목숨 -1, 받을수록 빨라진다. */
export class GameScene extends Phaser.Scene {
  private score = 0;
  private lives = START_LIVES;
  private basket!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private stars!: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private over = false;

  constructor() {
    super("game");
  }

  create() {
    this.score = 0;
    this.lives = START_LIVES;
    this.over = false;

    const style = { fontFamily: FONT_FAMILY, fontSize: "26px", color: "#ffffff" };
    this.scoreText = this.add.text(20, 16, "점수: 0", style);
    this.livesText = this.add.text(GAME_WIDTH - 20, 16, this.livesLabel(), style).setOrigin(1, 0);

    this.basket = this.physics.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 40, "basket");
    this.basket.setImmovable(true).setCollideWorldBounds(true);

    this.stars = this.physics.add.group();
    this.physics.add.overlap(this.basket, this.stars, (_basket, star) => {
      (star as Phaser.Physics.Arcade.Image).destroy();
      this.score += 1;
      this.scoreText.setText(`점수: ${this.score}`);
    });

    this.cursors = this.input.keyboard?.createCursorKeys();
    // 마우스/터치: 포인터가 움직이면 바구니가 따라간다
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.basket.x = Phaser.Math.Clamp(pointer.x, 60, GAME_WIDTH - 60);
    });

    this.spawnStar();

    gameStart();
  }

  update() {
    if (this.over) return;

    // 키보드 이동
    let vx = 0;
    if (this.cursors?.left.isDown) vx -= BASKET_SPEED;
    if (this.cursors?.right.isDown) vx += BASKET_SPEED;
    this.basket.setVelocityX(vx);

    // 바닥까지 떨어진 별 = 놓침
    for (const obj of this.stars.getChildren()) {
      const star = obj as Phaser.Physics.Arcade.Image;
      if (star.y > GAME_HEIGHT + 30) {
        star.destroy();
        this.loseLife();
        if (this.over) return;
      }
    }
  }

  private spawnStar() {
    const x = Phaser.Math.Between(30, GAME_WIDTH - 30);
    const star = this.stars.create(x, -30, "star") as Phaser.Physics.Arcade.Image;
    // 점수가 오를수록 빠르게 떨어진다
    star.setVelocityY(180 + this.score * 12);
    star.setAngularVelocity(Phaser.Math.Between(-120, 120));
    // 다음 별 예약. 점수가 오를수록 간격이 줄어든다 (최소 350ms)
    const delay = Math.max(350, 900 - this.score * 20);
    this.spawnTimer = this.time.delayedCall(delay, () => this.spawnStar());
  }

  private loseLife() {
    this.lives -= 1;
    this.livesText.setText(this.livesLabel());
    this.cameras.main.shake(150, 0.01);
    if (this.lives <= 0) {
      this.over = true;
      this.physics.pause();
      this.spawnTimer?.remove();
      this.time.delayedCall(400, () => this.scene.start("gameover", { score: this.score }));
    }
  }

  private livesLabel() {
    return "♥".repeat(this.lives) + "♡".repeat(START_LIVES - this.lives);
  }
}
