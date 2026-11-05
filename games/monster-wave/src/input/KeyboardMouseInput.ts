import Phaser from "phaser";
import { controls, type KeyName } from "../config";
import type { InputSource, PlayerInput } from "./types";

/** 게임 씬에 이 이벤트를 보내면, 마우스 버튼을 한 번 뗄 때까지 사격하지 않는다 */
export const DISARM_FIRE_EVENT = "input-disarm-fire";

/**
 * 키보드(이동, 무기 교체) + 마우스(조준, 사격, 휠) 입력.
 * 키 매핑은 config/controls.ts에서 가져온다.
 */
export class KeyboardMouseInput implements InputSource {
  private readonly keys: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key[]>;
  private readonly allKeys: Phaser.Input.Keyboard.Key[] = [];
  /**
   * 무기 선택/순환은 "누른 순간" 이벤트로 받아 두었다가 다음 read()에서 처리한다.
   * (매 프레임 JustDown으로 확인하면, 한 프레임 안에 눌렀다 뗀 짧은 입력을 놓친다)
   */
  private pendingSlot: number | null = null;
  private pendingCycle: -1 | 0 | 1 = 0;
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
    const add = (names: readonly KeyName[]) =>
      names.map((n) => {
        const key = kb.addKey(n);
        this.allKeys.push(key);
        return key;
      });
    this.keys = {
      up: add(controls.moveUp),
      down: add(controls.moveDown),
      left: add(controls.moveLeft),
      right: add(controls.moveRight),
    };
    for (const key of add(controls.prevWeapon)) key.on("down", () => (this.pendingCycle = -1));
    for (const key of add(controls.nextWeapon)) key.on("down", () => (this.pendingCycle = 1));
    controls.weaponSlots.forEach((name, i) => {
      for (const key of add([name])) key.on("down", () => (this.pendingSlot = i));
    });
    scene.input.on("wheel", this.onWheel);
    // 일시정지에서 돌아올 때(클릭으로 재개할 수 있음)도 다시 버튼을 떼야 사격
    scene.events.on(Phaser.Scenes.Events.RESUME, this.disarmFire);
    // HUD 버튼(소리 켜기/끄기 등)을 클릭했을 때도 그 클릭으로 사격하지 않게
    scene.events.on(DISARM_FIRE_EVENT, this.disarmFire);
  }

  read(): PlayerInput {
    const down = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((k) => k.isDown);

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

    const selectSlot = this.pendingSlot;
    let cycle = this.pendingCycle;
    if (cycle === 0 && this.wheelDelta !== 0) cycle = this.wheelDelta < 0 ? -1 : 1;
    this.pendingSlot = null;
    this.pendingCycle = 0;
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
    for (const key of this.allKeys) key.removeAllListeners();
    this.scene.events.off(Phaser.Scenes.Events.RESUME, this.disarmFire);
    this.scene.events.off(DISARM_FIRE_EVENT, this.disarmFire);
  }
}
