/** 전투 공통 규칙 */
export const combatConfig = {
  /** 범위 폭발이 플레이어에게도 피해를 주는지 (false면 무기별 selfDamageRatio 무시) */
  selfExplosionDamage: true,
  /** 처치 시 아이템 드랍 확률 */
  drops: {
    ammoChance: 0.12,
    healthChance: 0.05,
    healAmount: 25,
    /** 바닥에 남아 있는 시간 (ms) */
    lifetimeMs: 12000,
  },
} as const;
