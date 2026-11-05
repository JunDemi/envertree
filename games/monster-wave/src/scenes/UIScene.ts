import Phaser from "phaser";
import { gameConfig, playerConfig } from "../config";
import { textStyle } from "../ui/text";
import { SCENES } from "./keys";

/**
 * HUD. GameScene 위에 겹쳐 실행되며 카메라 이동의 영향을 받지 않는다.
 * Phase 0에서는 자리만 잡아둔다. (실제 값 연결은 Phase 2~4)
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super(SCENES.ui);
  }

  create() {
    const { width, height } = gameConfig;
    this.add.text(16, 12, `체력 ${playerConfig.maxHp} / ${playerConfig.maxHp}`, textStyle(18, "#ffffff"));
    this.add.text(width / 2, 12, "WAVE 1", textStyle(22, "#facc15", true)).setOrigin(0.5, 0);
    this.add.text(width - 16, 12, "점수 0", textStyle(18, "#ffffff")).setOrigin(1, 0);
    this.add
      .text(width / 2, height - 16, "Phase 0 미리보기 — ESC: 타이틀로   ·   G: 게임오버 화면 테스트", textStyle(14, "#94a3b8"))
      .setOrigin(0.5, 1);
  }
}
