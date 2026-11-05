import Phaser from "phaser";
import { generateTextures } from "../assets/textures";
import { SCENES } from "./keys";

/** 텍스처를 코드로 생성한 뒤 타이틀로 넘어간다 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create() {
    generateTextures(this);
    this.scene.start(SCENES.title);
  }
}
