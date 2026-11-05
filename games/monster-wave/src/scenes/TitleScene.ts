import Phaser from "phaser";
import { gameConfig, monsters, playerConfig } from "../config";
import { TEX, monsterTexture } from "../assets/keys";
import { notifyReady } from "../portal";
import { addShadow, placeOnGround } from "../view/depth";
import { FONT, textStyle } from "../ui/text";
import { SCENES } from "./keys";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super(SCENES.title);
  }

  create() {
    const { width, height } = gameConfig;
    const cx = width / 2;

    this.add.tileSprite(0, 0, width, height, TEX.floor).setOrigin(0).setAlpha(0.6);
    this.add.rectangle(0, 0, width, height, 0x000000, 0.35).setOrigin(0);

    this.add.text(cx, 110, "몬스터웨이브", textStyle(64, "#ffffff", true)).setOrigin(0.5);
    this.add.text(cx, 168, "MONSTER WAVE", textStyle(20, "#94a3b8")).setOrigin(0.5).setLetterSpacing(8);

    // 캐릭터 소개 줄: 플레이어 + 몬스터 4종
    const lineup: { key: string; name: string; footprint: { w: number; d: number } }[] = [
      { key: TEX.player, name: "나", footprint: playerConfig.footprint },
      ...Object.values(monsters).map((m) => ({ key: monsterTexture(m.id), name: m.name, footprint: m.footprint })),
    ];
    const groundY = 330;
    const gap = 120;
    const startX = cx - (gap * (lineup.length - 1)) / 2;
    lineup.forEach((c, i) => {
      const x = startX + gap * i;
      addShadow(this, x, groundY, c.footprint);
      const sprite = this.add.image(0, 0, c.key).setOrigin(0.5, 1).setScale(2);
      placeOnGround(sprite, x, groundY);
      this.add.text(x, groundY + 22, c.name, textStyle(16, i === 0 ? "#93c5fd" : "#e2e8f0")).setOrigin(0.5);
      // 살짝 들썩이는 대기 동작
      this.tweens.add({ targets: sprite, y: groundY - 4, duration: 420 + i * 60, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    });

    this.add
      .text(
        cx,
        440,
        "WASD 이동   ·   마우스 조준 / 클릭 사격   ·   1~9 · 휠 · Q/E 무기 교체   ·   ESC/P 일시정지",
        textStyle(15, "#cbd5e1"),
      )
      .setOrigin(0.5);

    const prompt = this.add.text(cx, height - 110, "클릭 또는 Space로 시작", textStyle(26, "#facc15", true)).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

    this.add.text(width - 12, height - 10, "Phase 0 프로토타입", { fontFamily: FONT, fontSize: "12px", color: "#64748b" }).setOrigin(1, 1);

    notifyReady();

    const start = () => this.scene.start(SCENES.game);
    this.input.once("pointerdown", start);
    this.input.keyboard?.once("keydown-SPACE", start);
  }
}
