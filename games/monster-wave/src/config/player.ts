/** 플레이어 수치 */
export const playerConfig = {
  maxHp: 100,
  /** 이동 속도 (px/초). 대각선도 같은 속도로 정규화한다. */
  speed: 190,
  /** 피격 후 무적 시간 (ms) */
  invincibleMs: 900,

  /** 발자국(충돌 영역)과 겉모습 */
  footprint: { w: 22, d: 14 },
  bodyHeight: 20,
  head: { w: 18, d: 12, height: 14 },
  color: 0x3b82f6,
  headColor: 0x60a5fa,
} as const;
