import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./config";
import { GameOverScene } from "./scenes/GameOverScene";
import { GameScene } from "./scenes/GameScene";
import { StartScene } from "./scenes/StartScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0f172a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 } },
  },
  scene: [StartScene, GameScene, GameOverScene],
});
