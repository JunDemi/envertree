import Phaser from "phaser";
import { controls, debugState, gameConfig, playerConfig } from "../config";
import { GameEvents } from "../events";
import type { GameScene } from "./GameScene";
import { textStyle } from "../ui/text";
import { SCENES } from "./keys";

const HP_BAR = { x: 16, y: 16, w: 200, h: 16 };
const SLOT = { w: 92, h: 46, gap: 6, bottom: 12 };
const COMBO_BAR = { w: 150, h: 6 };

interface SlotView {
  bg: Phaser.GameObjects.Rectangle;
  num: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
  ammo: Phaser.GameObjects.Text;
}

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
  private waveText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private subBanner!: Phaser.GameObjects.Text;
  private fpsText?: Phaser.GameObjects.Text;
  private gameScene!: GameScene;
  private slots: SlotView[] = [];
  private comboLayer!: Phaser.GameObjects.Container;
  private comboText!: Phaser.GameObjects.Text;
  private comboMult!: Phaser.GameObjects.Text;
  private comboFill!: Phaser.GameObjects.Rectangle;
  private notice!: Phaser.GameObjects.Text;
  private subNotice!: Phaser.GameObjects.Text;

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

    this.waveText = this.add.text(width / 2, 12, "", textStyle(22, "#facc15", true)).setOrigin(0.5, 0);
    // 화면 가운데 알림 (웨이브 시작/클리어, 카운트다운)
    this.banner = this.add.text(width / 2, height * 0.3, "", textStyle(52, "#ffffff", true)).setOrigin(0.5).setAlpha(0);
    this.subBanner = this.add.text(width / 2, height * 0.3 + 50, "", textStyle(20, "#e2e8f0")).setOrigin(0.5).setAlpha(0);
    this.scoreText = this.add.text(width - 16, 12, "", textStyle(20, "#ffffff", true)).setOrigin(1, 0);
    this.monstersText = this.add.text(width - 16, 40, "", textStyle(15, "#cbd5e1")).setOrigin(1, 0);
    if (debugState.enabled) {
      this.add.text(16, 64, "DEBUG  K 그런트+50 · N 웨이브 건너뛰기 · U 전 무기", textStyle(13, "#f472b6", true));
      this.fpsText = this.add.text(16, 40, "", textStyle(14, "#f472b6"));
    }

    // 콤보 (오른쪽, 점수 아래). 콤보가 0이면 숨김
    this.comboText = this.add.text(0, 0, "", textStyle(30, "#fb923c", true)).setOrigin(1, 0);
    this.comboMult = this.add.text(0, 36, "", textStyle(16, "#fde68a", true)).setOrigin(1, 0);
    const comboBg = this.add.rectangle(-COMBO_BAR.w, 60, COMBO_BAR.w, COMBO_BAR.h, 0x0b0d12, 0.85).setOrigin(0);
    this.comboFill = this.add.rectangle(-COMBO_BAR.w, 60, COMBO_BAR.w, COMBO_BAR.h, 0xfb923c).setOrigin(0);
    this.comboLayer = this.add.container(width - 16, 66, [this.comboText, this.comboMult, comboBg, this.comboFill]).setVisible(false);

    // 무기 슬롯 (아래 가운데)
    this.createSlots();

    // 새 무기 알림 (가운데 아래쪽)
    this.notice = this.add.text(width / 2, height * 0.62, "", textStyle(34, "#67e8f9", true)).setOrigin(0.5).setAlpha(0);
    this.subNotice = this.add.text(width / 2, height * 0.62 + 40, "", textStyle(18, "#e2e8f0")).setOrigin(0.5).setAlpha(0);
    this.setHp(playerConfig.maxHp, playerConfig.maxHp);
    this.setScore(0);
    this.setMonsters(0);
    this.setWave(0);

    // GameScene 이벤트 구독
    const game = this.scene.get(SCENES.game) as GameScene;
    this.gameScene = game;
    game.events.on(GameEvents.hp, this.setHp, this);
    game.events.on(GameEvents.score, this.setScore, this);
    game.events.on(GameEvents.monsters, this.setMonsters, this);
    game.events.on(GameEvents.waveStart, this.onWaveStart, this);
    game.events.on(GameEvents.waveClear, this.onWaveClear, this);
    game.events.on(GameEvents.countdown, this.onCountdown, this);
    game.events.on(GameEvents.combo, this.onCombo, this);
    game.events.on(GameEvents.weapons, this.refreshSlots, this);
    game.events.on(GameEvents.unlock, this.onUnlock, this);

    // 일시정지 화면
    this.pauseLayer = this.add
      .container(0, 0, [
        this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0),
        this.add.text(width / 2, height / 2 - 40, "일시정지", textStyle(48, "#ffffff", true)).setOrigin(0.5),
        this.add.text(width / 2, height / 2 + 20, "ESC / P 또는 클릭으로 계속", textStyle(20, "#cbd5e1")).setOrigin(0.5),
        this.add.text(width / 2, height / 2 + 60, "T: 타이틀로", textStyle(16, "#94a3b8")).setOrigin(0.5),
        this.add
          .text(
            width / 2,
            height / 2 + 120,
            "WASD 이동 · 마우스 조준 · 클릭 사격 · 1~9 / 휠 / Q·E 무기 교체",
            textStyle(15, "#94a3b8"),
          )
          .setOrigin(0.5),
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
      game.events.off(GameEvents.waveStart, this.onWaveStart, this);
      game.events.off(GameEvents.waveClear, this.onWaveClear, this);
      game.events.off(GameEvents.countdown, this.onCountdown, this);
      game.events.off(GameEvents.combo, this.onCombo, this);
      game.events.off(GameEvents.weapons, this.refreshSlots, this);
      game.events.off(GameEvents.unlock, this.onUnlock, this);
    });
  }

  update() {
    this.fpsText?.setText(`FPS ${Math.round(this.game.loop.actualFps)}`);
    // 콤보 남은 시간 게이지는 매 프레임 직접 읽는다
    const combo = this.gameScene.combo;
    if (combo && combo.count > 0) this.comboFill.width = COMBO_BAR.w * combo.remainingRatio(this.gameScene.time.now);
  }

  private createSlots() {
    const { width, height } = gameConfig;
    const n = this.gameScene ? this.gameScene.weapon.states.length : 7;
    const total = n * SLOT.w + (n - 1) * SLOT.gap;
    const x0 = (width - total) / 2;
    const y = height - SLOT.bottom - SLOT.h;
    this.slots = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (SLOT.w + SLOT.gap);
      this.slots.push({
        bg: this.add.rectangle(x, y, SLOT.w, SLOT.h, 0x0b0d12, 0.75).setOrigin(0).setStrokeStyle(2, 0x334155),
        num: this.add.text(x + 5, y + 3, String(i + 1), textStyle(11, "#94a3b8", true)),
        name: this.add.text(x + SLOT.w / 2, y + 17, "", textStyle(13, "#ffffff", true)).setOrigin(0.5),
        ammo: this.add.text(x + SLOT.w / 2, y + 35, "", textStyle(12, "#cbd5e1")).setOrigin(0.5),
      });
    }
  }

  /** 무기 슬롯 다시 그리기: 잠김(해금 콤보 표시) / 선택됨(노란 테두리) / 탄약 */
  private refreshSlots() {
    const w = this.gameScene?.weapon;
    if (!w) return;
    if (this.slots.length !== w.states.length) {
      for (const s of this.slots) [s.bg, s.num, s.name, s.ammo].forEach((o) => o.destroy());
      this.createSlots();
    }
    w.states.forEach((st, i) => {
      const v = this.slots[i];
      const selected = i === w.currentIndex;
      const empty = st.ammo !== null && st.ammo <= 0;
      if (!st.unlocked) {
        v.bg.setFillStyle(0x0b0d12, 0.45).setStrokeStyle(2, 0x1e293b);
        v.name.setText("잠김").setColor("#475569");
        v.ammo.setText(`콤보 ${st.def.unlockCombo}`).setColor("#64748b");
        v.num.setColor("#475569");
        return;
      }
      v.bg.setFillStyle(selected ? 0x1e293b : 0x0b0d12, 0.85).setStrokeStyle(selected ? 3 : 2, selected ? 0xfacc15 : 0x334155);
      v.num.setColor(selected ? "#facc15" : "#94a3b8");
      v.name.setText(st.def.name).setColor(empty ? "#64748b" : "#ffffff");
      v.ammo.setText(st.ammo === null ? "∞" : String(st.ammo)).setColor(empty ? "#f87171" : "#cbd5e1");
    });
  }

  private onCombo(combo: number, multiplier: number) {
    if (combo <= 0) {
      this.comboLayer.setVisible(false);
      return;
    }
    this.comboLayer.setVisible(true);
    this.comboText.setText(`${combo} COMBO`);
    this.comboMult.setText(multiplier > 1 ? `점수 ×${multiplier}` : "");
    this.comboFill.width = COMBO_BAR.w;
    // 콤보가 오를 때마다 살짝 튀게
    this.tweens.killTweensOf(this.comboText);
    this.comboText.setScale(1.25);
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 140, ease: "Quad.out" });
  }

  private onUnlock(name: string, slot: number) {
    this.tweens.killTweensOf([this.notice, this.subNotice]);
    this.notice.setText(`NEW WEAPON: ${name}!`).setAlpha(1).setScale(0.6);
    this.subNotice.setText(`${slot}번 키로 선택`).setAlpha(1);
    this.tweens.add({ targets: this.notice, scale: 1, duration: 260, ease: "Back.out" });
    this.tweens.add({ targets: [this.notice, this.subNotice], alpha: 0, delay: 2000, duration: 400 });
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

  private setMonsters(remaining: number) {
    this.monstersText.setText(`남은 몬스터 ${remaining}`);
  }

  private setWave(wave: number) {
    this.waveText.setText(wave > 0 ? `WAVE ${wave}` : "준비");
  }

  private onWaveStart(wave: number) {
    this.setWave(wave);
    this.showBanner(`WAVE ${wave}`, "몬스터가 몰려온다!", "#facc15", 1600);
  }

  private onWaveClear(wave: number) {
    this.showBanner(`WAVE ${wave} 클리어`, "", "#4ade80", 1400);
  }

  /** 다음 웨이브까지 카운트다운 (마지막 3초만 크게 표시) */
  private onCountdown(seconds: number, nextWave: number) {
    if (seconds <= 3) this.showBanner(String(seconds), `WAVE ${nextWave} 시작까지`, "#ffffff", 900);
  }

  private showBanner(text: string, sub: string, color: string, durationMs: number) {
    this.tweens.killTweensOf([this.banner, this.subBanner]);
    this.banner.setText(text).setColor(color).setAlpha(1).setScale(1.25);
    this.subBanner.setText(sub).setAlpha(sub ? 1 : 0);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 180, ease: "Back.out" });
    this.tweens.add({ targets: [this.banner, this.subBanner], alpha: 0, delay: durationMs - 300, duration: 300 });
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
