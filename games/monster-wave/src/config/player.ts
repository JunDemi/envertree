/** 플레이어 수치 */
export const playerConfig = {
  maxHp: 100,
  /** 이동 속도 (px/초). 대각선도 같은 속도로 정규화한다. */
  speed: 190,
  /** 피격 후 무적 시간 (ms) */
  invincibleMs: 400,
  /** 몬스터에게 접촉 피해를 입을 때 밀려나는 거리 (px). 0이면 넉백 없음 */
  contactKnockback: 44,

  /** 발자국(충돌 영역)과 겉모습 */
  footprint: { w: 22, d: 14 },
  bodyHeight: 20,
  head: { w: 18, d: 12, height: 14 },
  color: 0x3b82f6,
  headColor: 0x60a5fa,
} as const;
