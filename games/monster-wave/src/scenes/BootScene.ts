import Phaser from "phaser";
import { checkImages, loadImages } from "../assets/images";
import { generateTextures } from "../assets/textures";
import { SCENES } from "./keys";

/** 그림 파일을 불러오고, 나머지 텍스처를 코드로 생성한 뒤 타이틀로 넘어간다 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload() {
    loadImages(this);
  }

  create() {
    checkImages(this);
    generateTextures(this);
    this.scene.start(SCENES.title);
  }
}
