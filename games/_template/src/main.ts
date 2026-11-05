import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./config";
import { GameOverScene } from "./scenes/GameOverScene";
import { GameScene } from "./scenes/GameScene";
import { StartScene } from "./scenes/StartScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#1e293b",
  scale: {
    // 비율을 유지하며 부모 요소(=iframe 화면)에 꽉 맞춘다
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  // 첫 번째 씬이 먼저 실행된다
  scene: [StartScene, GameScene, GameOverScene],
});
