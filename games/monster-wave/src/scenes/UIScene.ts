import Phaser from "phaser";
import { controls, debugState, gameConfig, playerConfig } from "../config";
import { GameEvents } from "../events";
import { textStyle } from "../ui/text";
import { SCENES } from "./keys";

const HP_BAR = { x: 16, y: 16, w: 200, h: 16 };

/**
 * HUD + 일시정지. GameScene 위에 겹쳐 실행되며 카메라 이동의 영향을 받지 않는다.
 * GameScene이 일시정지되어 있어도 이 씬은 계속 돌아가므로 재개 입력을 여기서 받는다.
 * 값은 GameScene이 보내는 이벤트(GameEvents)로 받는다.
 */
export class UIScene extends Phaser.Scene {
  private pauseLayer!: Phaser.GameObjects.Container;
  private paused = false;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private monstersText!: Phaser.GameObjects.Text;
  private fpsText?: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.ui);
  }

  create() {
    const { width, height } = gameConfig;
    this.paused = false;

    // 체력 게이지
    this.add.rectangle(HP_BAR.x - 2, HP_BAR.y - 2, HP_BAR.w + 4, HP_BAR.h + 4, 0x0b0d12, 0.85).setOrigin(0);
    this.hpFill = this.add.rectangle(HP_BAR.x, HP_BAR.y, HP_BAR.w, HP_BAR.h, 0x22c55e).setOrigin(0);
    this.hpText = this.add
      .text(HP_BAR.x + HP_BAR.w / 2, HP_BAR.y + HP_BAR.h / 2, "", textStyle(12, "#ffffff", true))
      .setOrigin(0.5);

    this.add.text(width / 2, 12, "WAVE 1", textStyle(22, "#facc15", true)).setOrigin(0.5, 0);
    this.scoreText = this.add.text(width - 16, 12, "", textStyle(20, "#ffffff", true)).setOrigin(1, 0);
    this.monstersText = this.add.text(width - 16, 40, "", textStyle(15, "#cbd5e1")).setOrigin(1, 0);
    this.add
      .text(width / 2, height - 16, "Phase 2 — WASD 이동 · 마우스 조준 · 클릭 사격 · ESC/P 일시정지", textStyle(14, "#94a3b8"))
      .setOrigin(0.5, 1);
    if (debugState.enabled) {
      this.add.text(16, height - 16, "DEBUG  K: 그런트 +50", textStyle(14, "#f472b6", true)).setOrigin(0, 1);
      this.fpsText = this.add.text(16, 40, "", textStyle(14, "#f472b6"));
    }
    this.setHp(playerConfig.maxHp, playerConfig.maxHp);
    this.setScore(0);
    this.setMonsters(0);

    // GameScene 이벤트 구독
    const game = this.scene.get(SCENES.game);
    game.events.on(GameEvents.hp, this.setHp, this);
    game.events.on(GameEvents.score, this.setScore, this);
    game.events.on(GameEvents.monsters, this.setMonsters, this);

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
      game.events.off(GameEvents.hp, this.setHp, this);
      game.events.off(GameEvents.score, this.setScore, this);
      game.events.off(GameEvents.monsters, this.setMonsters, this);
    });
  }

  update() {
    this.fpsText?.setText(`FPS ${Math.round(this.game.loop.actualFps)}`);
  }

  private setHp(hp: number, max: number) {
    const ratio = Phaser.Math.Clamp(hp / max, 0, 1);
    this.hpFill.width = HP_BAR.w * ratio;
    this.hpFill.fillColor = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xf59e0b : 0xef4444;
    this.hpText.setText(`${Math.ceil(hp)} / ${max}`);
  }

  private setScore(score: number) {
    this.scoreText.setText(`점수 ${score.toLocaleString()}`);
  }

  private setMonsters(alive: number) {
    this.monstersText.setText(`몬스터 ${alive}`);
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
