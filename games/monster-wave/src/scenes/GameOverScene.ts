import Phaser from "phaser";
import { gameConfig } from "../config";
import { notifyGameOver } from "../portal";
import { textStyle } from "../ui/text";
import { SCENES } from "./keys";

interface GameOverData {
  score: number;
  wave: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENES.gameOver);
  }

  create(data: GameOverData) {
    const { width, height } = gameConfig;
    const cx = width / 2;

    this.add.rectangle(0, 0, width, height, 0x0b0d12, 0.92).setOrigin(0);
    this.add.text(cx, 170, "GAME OVER", textStyle(64, "#f87171", true)).setOrigin(0.5);
    this.add.text(cx, 270, `점수  ${data.score.toLocaleString()}`, textStyle(32, "#facc15", true)).setOrigin(0.5);
    this.add.text(cx, 320, `도달 웨이브  ${data.wave}`, textStyle(24, "#e2e8f0")).setOrigin(0.5);
    this.add.text(cx, height - 150, "클릭 또는 Space: 다시하기", textStyle(24, "#ffffff")).setOrigin(0.5);
    this.add.text(cx, height - 110, "T: 타이틀로", textStyle(18, "#94a3b8")).setOrigin(0.5);

    notifyGameOver({ score: data.score, wave: data.wave });

    // 게임 중 누르던 입력으로 바로 넘어가지 않도록 잠깐 기다린다
    this.time.delayedCall(500, () => {
      const restart = () => this.scene.start(SCENES.game);
      this.input.once("pointerdown", restart);
      this.input.keyboard?.once("keydown-SPACE", restart);
      this.input.keyboard?.once("keydown-T", () => this.scene.start(SCENES.title));
    });
  }
}
