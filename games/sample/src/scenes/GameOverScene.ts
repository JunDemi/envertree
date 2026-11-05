import Phaser from "phaser";
import { gameOver } from "@envertree/game-sdk";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from "../config";

/** 게임 오버 화면: 최종 점수를 보여주고 포털에 전송. 클릭하면 다시 시작 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("gameover");
  }

  create(data: { score: number }) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add
      .text(cx, cy - 80, "게임 오버", { fontFamily: FONT_FAMILY, fontSize: "56px", color: "#ffffff" })
      .setOrigin(0.5);
    this.add
      .text(cx, cy, `점수: ${data.score}`, { fontFamily: FONT_FAMILY, fontSize: "36px", color: "#facc15" })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 80, "클릭 또는 Space로 다시 시작", {
        fontFamily: FONT_FAMILY,
        fontSize: "22px",
        color: "#cbd5e1",
      })
      .setOrigin(0.5);

    // 포털에 최종 점수 전송
    gameOver({ score: data.score });

    // 실수로 바로 넘어가지 않도록 잠깐 기다린 뒤 입력을 받는다
    this.time.delayedCall(500, () => {
      const restart = () => this.scene.start("game");
      this.input.once("pointerdown", restart);
      this.input.keyboard?.once("keydown-SPACE", restart);
    });
  }
}
