import Phaser from "phaser";
import { ready } from "@envertree/game-sdk";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from "../config";

/** 시작 화면: 리소스를 불러오고, 클릭(또는 Space)하면 게임 시작 */
export class StartScene extends Phaser.Scene {
  constructor() {
    super("start");
  }

  preload() {
    // public/ 폴더 기준 상대 경로. vite.config.ts의 base: "./" 덕분에
    // 포털의 /play/<slug>/ 아래에서도 올바르게 로드된다.
    this.load.svg("star", "assets/star.svg", { width: 64, height: 64 });
  }

  create() {
    const cx = GAME_WIDTH / 2;
    this.add.image(cx, GAME_HEIGHT / 2 - 120, "star").setScale(1.5);
    this.add
      .text(cx, GAME_HEIGHT / 2, "게임 템플릿", { fontFamily: FONT_FAMILY, fontSize: "48px", color: "#ffffff" })
      .setOrigin(0.5);
    this.add
      .text(cx, GAME_HEIGHT / 2 + 70, "클릭 또는 Space로 시작", {
        fontFamily: FONT_FAMILY,
        fontSize: "24px",
        color: "#cbd5e1",
      })
      .setOrigin(0.5);

    // 포털에 "로딩 끝" 알림
    ready();

    const start = () => this.scene.start("game");
    this.input.once("pointerdown", start);
    this.input.keyboard?.once("keydown-SPACE", start);
  }
}
