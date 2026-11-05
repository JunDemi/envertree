import Phaser from "phaser";
import { debugState, gameConfig } from "./config";
import { BootScene } from "./scenes/BootScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { GameScene } from "./scenes/GameScene";
import { TitleScene } from "./scenes/TitleScene";
import { UIScene } from "./scenes/UIScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: gameConfig.backgroundColor,
  scale: {
    // 고정 해상도를 비율 유지하며 iframe에 맞춘다
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: gameConfig.width,
    height: gameConfig.height,
  },
  // 카메라가 따라갈 때 상자 테두리가 번지지 않도록 정수 픽셀에 맞춘다
  roundPixels: true,
  // 우클릭 메뉴가 뜨지 않게 (게임 입력용)
  disableContextMenu: true,
  physics: {
    default: "arcade",
    // 디버그 모드(?debug)에서는 충돌 박스를 그린다
    arcade: { gravity: { x: 0, y: 0 }, debug: debugState.enabled },
  },
  // 첫 번째 씬이 먼저 실행된다
  scene: [BootScene, TitleScene, GameScene, UIScene, GameOverScene],
});

// 디버그 모드에서만: 브라우저 콘솔/자동 테스트에서 게임 상태를 볼 수 있게 노출
if (debugState.enabled) {
  (window as unknown as { __MW__: Phaser.Game }).__MW__ = game;
}
