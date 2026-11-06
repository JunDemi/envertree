import Phaser from "phaser";
import type { Facing } from "./keys";
import { playerTexture } from "./keys";
import playerDown from "./files/player/player-stand-down.png";
import playerDownRight from "./files/player/player-stand-rightdown.png";
import playerRight from "./files/player/player-stand-right.png";
import playerUpRight from "./files/player/player-stand-rightup.png";
import playerUp from "./files/player/player-stand-up.png";

/**
 * 실제 그림 파일. 코드로 만든 프로토타입 텍스처와 같은 키로 불러온다.
 * 그림은 표시 크기의 2배로 제작되므로 화면에서는 viewConfig.artScale을 곱해서 그린다.
 */
const PLAYER_IMAGES: Record<Facing, string> = {
  down: playerDown,
  downRight: playerDownRight,
  right: playerRight,
  upRight: playerUpRight,
  up: playerUp,
};

export function loadImages(scene: Phaser.Scene) {
  for (const [facing, url] of Object.entries(PLAYER_IMAGES) as [Facing, string][]) {
    scene.load.image(playerTexture(facing), url);
  }
}
