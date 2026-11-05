import Phaser from "phaser";
import { controls, debugState, gameConfig, playerConfig } from "../config";
import { textStyle } from "../ui/text";
import { SCENES } from "./keys";

/**
 * HUD + 일시정지. GameScene 위에 겹쳐 실행되며 카메라 이동의 영향을 받지 않는다.
 * GameScene이 일시정지되어 있어도 이 씬은 계속 돌아가므로 재개 입력을 여기서 받는다.
 */
export class UIScene extends Phaser.Scene {
  private pauseLayer!: Phaser.GameObjects.Container;
  private paused = false;

  constructor() {
    super(SCENES.ui);
  }

  create() {
    const { width, height } = gameConfig;
    this.paused = false;

    // HUD (값 연결은 Phase 2~4)
    this.add.text(16, 12, `체력 ${playerConfig.maxHp} / ${playerConfig.maxHp}`, textStyle(18, "#ffffff"));
    this.add.text(width / 2, 12, "WAVE 1", textStyle(22, "#facc15", true)).setOrigin(0.5, 0);
    this.add.text(width - 16, 12, "점수 0", textStyle(18, "#ffffff")).setOrigin(1, 0);
    this.add
      .text(width / 2, height - 16, "Phase 1 — WASD 이동 · 마우스 조준 · ESC/P 일시정지 · G 게임오버 테스트", textStyle(14, "#94a3b8"))
      .setOrigin(0.5, 1);
    if (debugState.enabled) {
      this.add.text(16, height - 16, "DEBUG", textStyle(14, "#f472b6", true)).setOrigin(0, 1);
    }

    // 일시정지 화면
    this.pauseLayer = this.add
      .container(0, 0, [
        this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0),
        this.add.text(width / 2, height / 2 - 40, "일시정지", textStyle(48, "#ffffff", true)).setOrigin(0.5),
        this.add.text(width / 2, height / 2 + 20, "ESC / P 또는 클릭으로 계속", textStyle(20, "#cbd5e1")).setOrigin(0.5),
        this.add.text(width / 2, height / 2 + 60, "T: 타이틀로", textStyle(16, "#94a3b8")).setOrigin(0.5),
      ])
      .setVisible(false);

    const kb = this.input.keyboard;
    for (const name of controls.pause) kb?.on(`keydown-${name}`, () => this.togglePause());
    kb?.on("keydown-T", () => {
      if (this.paused) this.toTitle();
    });
    this.input.on("pointerdown", () => {
      if (this.paused) this.setPaused(false);
    });

    // iframe(브라우저 창)이 포커스를 잃으면 자동 일시정지
    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
    });
  }

  private onBlur() {
    this.setPaused(true);
  }

  private togglePause() {
    this.setPaused(!this.paused);
  }

  private setPaused(value: boolean) {
    if (this.paused === value) return;
    this.paused = value;
    this.pauseLayer.setVisible(value);
    if (value) this.scene.pause(SCENES.game);
    else this.scene.resume(SCENES.game);
  }

  private toTitle() {
    this.scene.stop(SCENES.game);
    this.scene.start(SCENES.title);
  }
}
