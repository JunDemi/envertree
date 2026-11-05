import Phaser from "phaser";
import { controls, type KeyName } from "../config";
import type { InputSource, PlayerInput } from "./types";

/**
 * 키보드(이동, 무기 교체) + 마우스(조준, 사격, 휠) 입력.
 * 키 매핑은 config/controls.ts에서 가져온다.
 */
export class KeyboardMouseInput implements InputSource {
  private readonly keys: Record<"up" | "down" | "left" | "right" | "prev" | "next", Phaser.Input.Keyboard.Key[]>;
  private readonly slotKeys: Phaser.Input.Keyboard.Key[][];
  private wheelDelta = 0;
  /**
   * 사격 버튼을 한 번 뗀 뒤에만 사격을 허용한다.
   * 타이틀/일시정지 화면을 클릭해서 넘어오면 그 클릭이 아직 눌린 상태라 첫 발이 나가기 때문.
   */
  private fireArmed = false;
  private readonly disarmFire = () => {
    this.fireArmed = false;
  };
  private readonly onWheel = (_p: unknown, _o: unknown, _dx: number, dy: number) => {
    this.wheelDelta += dy;
  };

  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard;
    if (!kb) throw new Error("키보드 입력을 사용할 수 없습니다.");
    const add = (names: readonly KeyName[]) => names.map((n) => kb.addKey(n));
    this.keys = {
      up: add(controls.moveUp),
      down: add(controls.moveDown),
      left: add(controls.moveLeft),
      right: add(controls.moveRight),
      prev: add(controls.prevWeapon),
      next: add(controls.nextWeapon),
    };
    this.slotKeys = controls.weaponSlots.map((n) => [kb.addKey(n)]);
    scene.input.on("wheel", this.onWheel);
    // 일시정지에서 돌아올 때(클릭으로 재개할 수 있음)도 다시 버튼을 떼야 사격
    scene.events.on(Phaser.Scenes.Events.RESUME, this.disarmFire);
  }

  read(): PlayerInput {
    const down = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((k) => k.isDown);
    const pressed = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((k) => Phaser.Input.Keyboard.JustDown(k));

    // 이동: 8방향, 대각선도 같은 속도가 되도록 정규화
    let mx = (down(this.keys.right) ? 1 : 0) - (down(this.keys.left) ? 1 : 0);
    let my = (down(this.keys.down) ? 1 : 0) - (down(this.keys.up) ? 1 : 0);
    if (mx !== 0 && my !== 0) {
      mx *= Math.SQRT1_2;
      my *= Math.SQRT1_2;
    }

    // 조준: 화면의 마우스 위치를 월드 좌표로 (카메라가 움직여도 매 프레임 다시 계산)
    const pointer = this.scene.input.activePointer;
    const buttonDown = pointer.leftButtonDown();
    if (!buttonDown) this.fireArmed = true;
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

    let selectSlot: number | null = null;
    this.slotKeys.forEach((keys, i) => {
      if (pressed(keys)) selectSlot = i;
    });

    let cycle: -1 | 0 | 1 = 0;
    if (pressed(this.keys.prev) || this.wheelDelta < 0) cycle = -1;
    else if (pressed(this.keys.next) || this.wheelDelta > 0) cycle = 1;
    this.wheelDelta = 0;

    return {
      moveX: mx,
      moveY: my,
      aimX: world.x,
      aimY: world.y,
      fire: buttonDown && this.fireArmed,
      selectSlot,
      cycleWeapon: cycle,
    };
  }

  destroy() {
    this.scene.input.off("wheel", this.onWheel);
    this.scene.events.off(Phaser.Scenes.Events.RESUME, this.disarmFire);
  }
}
