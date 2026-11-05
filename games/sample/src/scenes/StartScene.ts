import Phaser from "phaser";
import { ready } from "@envertree/game-sdk";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from "../config";

export class StartScene extends Phaser.Scene {
  constructor() {
    super("start");
  }

  preload() {
    this.load.svg("star", "assets/star.svg", { width: 48, height: 48 });
  }

  create() {
    // 바구니 텍스처는 이미지 파일 없이 도형으로 만든다
    if (!this.textures.exists("basket")) {
      const g = this.add.graphics();
      g.fillStyle(0x38bdf8).fillRoundedRect(0, 0, 120, 24, 8);
      g.generateTexture("basket", 120, 24);
      g.destroy();
    }

    const cx = GAME_WIDTH / 2;
    this.add.image(cx, 170, "star").setScale(2);
    this.add
      .text(cx, 270, "별 받기", { fontFamily: FONT_FAMILY, fontSize: "56px", color: "#ffffff" })
      .setOrigin(0.5);
    this.add
      .text(cx, 340, "← → 또는 마우스로 바구니를 움직여 별을 받으세요\n3개를 놓치면 끝!", {
        fontFamily: FONT_FAMILY,
        fontSize: "22px",
        color: "#cbd5e1",
        align: "center",
        lineSpacing: 8,
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(cx, GAME_HEIGHT - 120, "클릭 또는 Space로 시작", {
        fontFamily: FONT_FAMILY,
        fontSize: "26px",
        color: "#facc15",
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    ready();

    const start = () => this.scene.start("game");
    this.input.once("pointerdown", start);
    this.input.keyboard?.once("keydown-SPACE", start);
  }
}
