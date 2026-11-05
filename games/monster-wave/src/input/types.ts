/**
 * 플레이어 한 명의 한 프레임 입력.
 * 플레이어는 이 값만 보고 움직인다. 입력 장치(키보드+마우스, 터치, 2P 키보드 등)는
 * InputSource 구현을 바꿔 끼우면 된다.
 */
export interface PlayerInput {
  /** 이동 방향. 길이 0(정지) 또는 1(정규화됨) */
  moveX: number;
  moveY: number;
  /** 조준 지점 (월드 좌표, 지면 기준) */
  aimX: number;
  aimY: number;
  /** 사격 버튼을 누르고 있는지 (누르고 있으면 연사) */
  fire: boolean;
  /** 이번 프레임에 숫자키로 고른 무기 슬롯 (0부터). 없으면 null */
  selectSlot: number | null;
  /** 이번 프레임의 무기 순환: -1 이전, +1 다음, 0 없음 */
  cycleWeapon: -1 | 0 | 1;
}

export interface InputSource {
  /** 매 프레임 한 번 호출. 현재 입력 상태를 돌려준다 */
  read(): PlayerInput;
  destroy(): void;
}
