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
  /** 폭발 가장자리 피해 비율 (가운데 100% → 가장자리 이 값) */
  explosionEdgeDamage: 0.5,
  /** 폭발이 몬스터를 밀어내는 힘 (px) */
  explosionKnockback: 40,
  /** 드럼통이 다른 드럼통 폭발에 휘말려 터지기까지 지연 (ms) — 연쇄 폭발이 보이도록 */
  barrelChainDelayMs: 120,

  /** 설치물(바리케이드/드럼통) */
  obstacles: {
    /** 길찾기에서 설치물 칸의 추가 비용 (직선 1칸 = 10). 클수록 몬스터가 더 멀리 돌아간다 */
    flowCost: 120,
    /** 몬스터가 설치물을 공격하는 간격 (ms). 피해량은 몬스터의 contactDamage */
    attackIntervalMs: 900,
  },
  /** 처치 시 아이템 드랍 확률 */
  drops: {
    /** 탄약 상자: 탄약 제한 무기가 하나라도 열려 있을 때만 떨어진다 */
    ammoChance: 0.12,
    healthChance: 0.05,
    healAmount: 25,
    /** 바닥에 남아 있는 시간 (ms). 마지막 3초는 깜빡인다 */
    lifetimeMs: 12000,
    /** 이 거리(px) 안으로 들어오면 줍는다 */
    pickupRadius: 26,
  },
} as const;
