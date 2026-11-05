import Phaser from "phaser";
import { gameConfig } from "../config";
import { notifyGameOver } from "../portal";
import { storage } from "../storage";
import { textStyle } from "../ui/text";
import { SCENES } from "./keys";

interface GameOverData {
  score: number;
  wave: number;
  bestCombo?: number;
  kills?: number;
  /** 디버그를 켠 판이면 최고 점수를 저장하지 않는다 */
  debug?: boolean;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENES.gameOver);
  }

  create(data: GameOverData) {
    const { width, height } = gameConfig;
    const cx = width / 2;

    const previousBest = storage.getBestScore();
    const isNewBest = !data.debug && storage.submitScore(data.score);

    this.add.rectangle(0, 0, width, height, 0x0b0d12, 0.92).setOrigin(0);
    const title = this.add.text(cx, 130, "GAME OVER", textStyle(64, "#f87171", true)).setOrigin(0.5).setScale(1.4).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 380, ease: "Back.out" });

    const scoreText = this.add.text(cx, 225, `점수  ${data.score.toLocaleString()}`, textStyle(36, "#facc15", true)).setOrigin(0.5);
    if (isNewBest) {
      const badge = this.add.text(cx, 268, "NEW BEST!", textStyle(22, "#4ade80", true)).setOrigin(0.5);
      this.tweens.add({ targets: [badge, scoreText], scale: 1.08, duration: 420, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    } else if (data.debug) {
      this.add.text(cx, 268, "디버그 모드를 사용한 판은 최고 점수에 기록되지 않습니다", textStyle(15, "#f472b6")).setOrigin(0.5);
    } else if (previousBest > 0) {
      this.add.text(cx, 268, `최고 점수  ${previousBest.toLocaleString()}`, textStyle(18, "#94a3b8")).setOrigin(0.5);
    }

    const stats = [
      ["도달 웨이브", String(data.wave)],
      ["처치", String(data.kills ?? 0)],
      ["최고 콤보", String(data.bestCombo ?? 0)],
    ];
    stats.forEach(([label, value], i) => {
      const x = cx + (i - 1) * 170;
      this.add.text(x, 330, value, textStyle(28, "#ffffff", true)).setOrigin(0.5);
      this.add.text(x, 362, label, textStyle(15, "#94a3b8")).setOrigin(0.5);
    });

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
