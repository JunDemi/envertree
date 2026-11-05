import Phaser from "phaser";
import { arenaHeight, arenaWidth, gameConfig, playerConfig } from "../config";
import { TEX } from "../assets/keys";
import { notifyGameStart } from "../portal";
import { addShadow, placeOnGround } from "../view/depth";
import { SCENES } from "./keys";

/**
 * 게임 화면. Phase 0에서는 바닥, 블록 몇 개, 플레이어를 놓아
 * 3/4 시점 렌더링과 씬 흐름만 확인한다. (이동/전투는 Phase 1부터)
 */
export class GameScene extends Phaser.Scene {
  private score = 0;
  private wave = 1;

  constructor() {
    super(SCENES.game);
  }

  create() {
    this.score = 0;
    this.wave = 1;
    const t = gameConfig.tileSize;

    // 바닥
    this.add.tileSprite(0, 0, arenaWidth, arenaHeight, TEX.floor).setOrigin(0).setDepth(-1e6);

    // 미리보기용 블록: 플레이어 위아래에 놓아 앞뒤 가림을 확인
    const cx = arenaWidth / 2;
    const cy = arenaHeight / 2;
    for (const [col, row] of [
      [-3, -2], [-2, -2], [-1, -2],
      [2, 1], [2, 2],
      [-4, 2], [-3, 2],
    ]) {
      // 블록의 발자국 = 타일 1칸, 기준점은 발자국 아래쪽 가운데
      const x = cx + col * t + t / 2;
      const y = cy + row * t + t;
      placeOnGround(this.add.image(0, 0, TEX.wall).setOrigin(0.5, 1), x, y);
    }

    // 플레이어 (정지 상태)
    addShadow(this, cx, cy, playerConfig.footprint);
    placeOnGround(this.add.image(0, 0, TEX.player).setOrigin(0.5, 1), cx, cy);
    const gun = this.add.image(cx + 8, cy - 12, TEX.gun).setOrigin(0.1, 0.5);
    gun.setDepth(cy + 0.5);

    // 카메라: 맵 경계 안에서 플레이어 위치를 비춘다
    this.cameras.main.setBounds(0, 0, arenaWidth, arenaHeight);
    this.cameras.main.centerOn(cx, cy - 20);

    // HUD 씬을 위에 겹쳐 실행
    this.scene.launch(SCENES.ui);
    this.scene.bringToTop(SCENES.ui);

    // Phase 0 확인용 키
    this.input.keyboard?.on("keydown-ESC", () => this.toTitle());
    this.input.keyboard?.on("keydown-G", () => this.endGame());

    notifyGameStart();
  }

  private endGame() {
    this.scene.stop(SCENES.ui);
    this.scene.start(SCENES.gameOver, { score: this.score, wave: this.wave });
  }

  private toTitle() {
    this.scene.stop(SCENES.ui);
    this.scene.start(SCENES.title);
  }
}
