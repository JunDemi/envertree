import type Phaser from "phaser";
import { viewConfig } from "../config";
import { TEX } from "../assets/keys";

/**
 * 3/4 시점 렌더링 도우미.
 * 모든 오브젝트는 발밑(footprint의 아래쪽 가운데)을 기준점으로 놓고,
 * depth = 발밑 y 로 정렬한다. 아래(화면 앞)에 있는 것이 위에 그려진다.
 */

/** 그림자는 같은 y의 오브젝트보다 항상 아래에 그려지도록 큰 음수 오프셋 */
const SHADOW_DEPTH_OFFSET = -100000;

export interface Footprint {
  w: number;
  d: number;
}

/** 발밑에 반투명 타원 그림자를 만든다 */
export function addShadow(scene: Phaser.Scene, x: number, y: number, footprint: Footprint) {
  const shadow = scene.add.image(x, y, TEX.shadow);
  shadow.setAlpha(viewConfig.shadowAlpha);
  sizeShadow(shadow, footprint);
  placeShadow(shadow, x, y, footprint);
  return shadow;
}

export function sizeShadow(shadow: Phaser.GameObjects.Image, footprint: Footprint) {
  shadow.setDisplaySize(footprint.w * viewConfig.shadowScaleX, footprint.d * viewConfig.shadowScaleY);
}

/** 그림자를 발자국 가운데에 놓는다 */
export function placeShadow(shadow: Phaser.GameObjects.Image, x: number, y: number, footprint: Footprint) {
  shadow.setPosition(x, y - footprint.d / 2);
  shadow.setDepth(SHADOW_DEPTH_OFFSET + y);
}

/** 발밑 기준으로 스프라이트를 놓고 depth를 맞춘다 */
export function placeOnGround(obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, x: number, y: number) {
  obj.setPosition(x, y);
  obj.setDepth(y);
}
