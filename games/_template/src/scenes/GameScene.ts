import Phaser from "phaser";
import { gameStart } from "@envertree/game-sdk";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from "../config";

const DURATION_SEC = 15;

/**
 * 실제 게임 화면. 템플릿에서는 예시로 "나타나는 별을 15초 동안 클릭하기"를 구현했다.
 * 새 게임을 만들 때는 이 파일의 내용을 바꾸면 된다.
 */
export class GameScene extends Phaser.Scene {
  private score = 0;
  private timeLeft = DURATION_SEC;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private star!: Phaser.GameObjects.Image;

  constructor() {
    super("game");
  }

  create() {
    // 씬은 재사용되므로 상태를 create에서 초기화한다
    this.score = 0;
    this.timeLeft = DURATION_SEC;

    const style = { fontFamily: FONT_FAMILY, fontSize: "28px", color: "#ffffff" };
    this.scoreText = this.add.text(20, 16, "점수: 0", style);
    this.timerText = this.add.text(GAME_WIDTH - 20, 16, `${DURATION_SEC}초`, style).setOrigin(1, 0);

    this.star = this.add.image(0, 0, "star").setInteractive({ useHandCursor: true });
    this.star.on("pointerdown", () => {
      this.score += 1;
      this.scoreText.setText(`점수: ${this.score}`);
      this.moveStar();
    });
    this.moveStar();

    this.time.addEvent({
      delay: 1000,
      repeat: DURATION_SEC - 1,
      callback: () => {
        this.timeLeft -= 1;
        this.timerText.setText(`${this.timeLeft}초`);
        if (this.timeLeft <= 0) {
          this.scene.start("gameover", { score: this.score });
        }
      },
    });

    // 포털에 "한 판 시작" 알림
    gameStart();
  }

  private moveStar() {
    const margin = 60;
    this.star.setPosition(
      Phaser.Math.Between(margin, GAME_WIDTH - margin),
      Phaser.Math.Between(margin + 40, GAME_HEIGHT - margin),
    );
  }
}
