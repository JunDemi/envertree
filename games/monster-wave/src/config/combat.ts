/** 전투 공통 규칙 */
export const combatConfig = {
  /** 총알이 몬스터 발자국에 닿았다고 보는 여유 (px). 키 큰 그림을 쏘는 느낌을 맞추기 위해 */
  bulletHitPadding: 5,
  /** 몬스터가 맞았을 때 흰색으로 깜빡이는 시간 (ms) */
  hitFlashMs: 70,
  /** 사망 시 파편 개수 */
  debrisCount: 10,
  /** 프레임 시간이 튀어도(탭 전환 등) 한 번에 이 이상 진행하지 않음 (초) */
  maxStepSeconds: 0.05,
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
