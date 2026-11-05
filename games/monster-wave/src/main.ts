import Phaser from "phaser";
import { sfx } from "./audio/Sfx";
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
    // 충돌 박스 표시는 DebugTools가 켜고 끈다 (F2 → C)
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  // 첫 번째 씬이 먼저 실행된다
  scene: [BootScene, TitleScene, GameScene, UIScene, GameOverScene],
});

// 효과음 (Phaser 사운드 매니저의 Web Audio 사용, 음소거 설정 불러오기)
sfx.init(game);

// 디버그 모드에서만: 브라우저 콘솔/자동 테스트에서 게임 상태를 볼 수 있게 노출
if (debugState.enabled) {
  (window as unknown as { __MW__: Phaser.Game }).__MW__ = game;
}
