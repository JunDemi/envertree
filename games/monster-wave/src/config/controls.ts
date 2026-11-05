import type Phaser from "phaser";

/** Phaser 키 이름 (예: "W", "ESC", "ONE") */
export type KeyName = keyof typeof Phaser.Input.Keyboard.KeyCodes;

/**
 * 키보드 매핑. 키를 바꾸고 싶으면 여기만 고친다.
 * 마우스: 조준 = 커서 방향, 사격 = 왼쪽 버튼(누르고 있으면 연사), 무기 교체 = 휠
 */
export const controls = {
  moveUp: ["W"],
  moveDown: ["S"],
  moveLeft: ["A"],
  moveRight: ["D"],
  prevWeapon: ["Q"],
  nextWeapon: ["E"],
  pause: ["ESC", "P"],
  /** 무기 슬롯 1~9 (배열 순서 = 슬롯 번호) */
  weaponSlots: ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"],
  /** 디버그 모드 켜기/끄기 (Phase 6에서 세부 기능 연결) */
  toggleDebug: ["F2"],
} as const satisfies Record<string, readonly KeyName[]>;

export type ControlAction = keyof typeof controls;
