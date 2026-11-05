import Phaser from "phaser";
import { arenaConfig, arenaHeight, arenaWidth, gameConfig, viewConfig } from "../config";
import { Player } from "../entities/Player";
import { KeyboardMouseInput } from "../input/KeyboardMouseInput";
import type { InputSource } from "../input/types";
import { notifyGameStart } from "../portal";
import { Arena } from "../world/Arena";
import { SCENES } from "./keys";

/**
 * 게임 화면. Phase 1: 아레나, 3/4 시점, 플레이어 이동과 조준, 카메라 추적.
 * 일시정지와 HUD는 위에 겹쳐 실행되는 UIScene이 담당한다.
 */
export class GameScene extends Phaser.Scene {
  private arena!: Arena;
  /** 디버그/테스트에서 접근할 수 있도록 공개 */
  player!: Player;
  private input1!: InputSource;
  private score = 0;
  private wave = 1;

  constructor() {
    super(SCENES.game);
  }

  create() {
    this.score = 0;
    this.wave = 1;

    this.arena = new Arena(this);

    const start = this.arena.grid.tileCenter(arenaConfig.playerStart.col, arenaConfig.playerStart.row);
    this.player = new Player(this, start.x, start.y);
    this.physics.add.collider(this.player.sprite, this.arena.walls);

    this.input1 = new KeyboardMouseInput(this);

    // 카메라: 플레이어를 부드럽게 따라가고, 맵 경계에서 멈춘다.
    // 맨 윗줄 벽은 위로 솟아 있으므로 그만큼 경계를 위로 넓힌다.
    const cam = this.cameras.main;
    cam.setBounds(0, -viewConfig.wallHeight, arenaWidth, arenaHeight + viewConfig.wallHeight);
    cam.startFollow(this.player.sprite, true, gameConfig.cameraLerp, gameConfig.cameraLerp, 0, viewConfig.cameraFocusHeight);

    // HUD + 일시정지 담당 씬을 위에 겹쳐 실행
    this.scene.launch(SCENES.ui);
    this.scene.bringToTop(SCENES.ui);

    // 임시: 게임오버 화면 테스트 (Phase 2에서 체력 0으로 대체)
    this.input.keyboard?.on("keydown-G", () => this.endGame());

    // 물리 엔진이 POST_UPDATE에서 몸체 위치를 스프라이트에 반영한 "뒤에" 그림자/총/depth를 맞춘다.
    // (물리 플러그인의 리스너가 먼저 등록되어 있으므로 이 리스너가 나중에 실행된다)
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncView, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncView, this);
      this.input1.destroy();
    });

    notifyGameStart();
  }

  update() {
    this.player.update(this.input1.read());
  }

  /** 물리 계산이 끝난 뒤 그림 위치/depth를 맞춘다 */
  private syncView() {
    this.player.syncView();
    const p = this.player.sprite;
    this.arena.updateOcclusion(p.x, p.y, p.width);
  }

  endGame() {
    this.scene.stop(SCENES.ui);
    this.scene.start(SCENES.gameOver, { score: this.score, wave: this.wave });
  }

  toTitle() {
    this.scene.stop(SCENES.ui);
    this.scene.start(SCENES.title);
  }
}
