/**
 * 몬스터 정의. 새 몬스터는 MonsterId에 이름을 추가하고 monsters에 항목을 넣는다.
 * 웨이브에 따른 체력/속도 증가는 waves.ts에서 정한다.
 */
export type MonsterId = "grunt" | "runner" | "brute" | "imp";

export interface RangedAttack {
  /** 이 거리 안으로 들어오면 멈추고 쏜다 (px) */
  preferredDistance: number;
  /** 발사 간격 (ms) */
  fireIntervalMs: number;
  projectileSpeed: number;
  damage: number;
  /** 투사체가 다른 몬스터에게도 피해를 주는지 */
  friendlyFire: boolean;
}

export interface MonsterDef {
  id: MonsterId;
  name: string;
  maxHp: number;
  /** 이동 속도 (px/초) */
  speed: number;
  /** 접촉 시 플레이어에게 주는 피해 */
  contactDamage: number;
  /** 넉백 저항 (0 = 그대로 밀림, 1 = 전혀 안 밀림) */
  knockbackResist: number;
  /** 처치 시 기본 점수 (콤보 배율 적용 전) */
  score: number;
  ranged?: RangedAttack;

  /**
   * 충돌 발자국(히트박스) 크기 (px). 그림 크기(art)와 따로 정한다.
   * 타일(40) 한 칸 틈을 지나갈 수 있게 타일보다 조금 작게 둔다 (딱 40이면 1px만 어긋나도 걸린다).
   */
  footprint: { w: number; d: number };
  /**
   * 그림 한 칸 크기 (실제 그림 파일 기준 px, 2배 제작).
   * 화면에는 viewConfig.artScale(0.5)을 곱한 크기로 보인다. 코드로 만든 임시 그림도 이 크기에 맞춘다.
   */
  art: { w: number; h: number };
  /** 처치 파편 색 (코드 임시 그림의 몸 색으로도 쓴다) */
  color: number;
  /** 머리 위 뿔 (임프) */
  horns?: boolean;
}

export const monsters: Record<MonsterId, MonsterDef> = {
  grunt: {
    id: "grunt",
    name: "그런트",
    maxHp: 30,
    speed: 62,
    contactDamage: 10,
    knockbackResist: 0,
    score: 10,
    footprint: { w: 36, d: 36 },
    art: { w: 96, h: 96 },
    color: 0x5c3a1e, // 짙은 갈색
  },
  runner: {
    id: "runner",
    name: "러너",
    maxHp: 14,
    speed: 135,
    contactDamage: 6,
    knockbackResist: 0,
    score: 15,
    footprint: { w: 36, d: 24 },
    art: { w: 64, h: 64 },
    color: 0x1e3a8a, // 남색
  },
  brute: {
    id: "brute",
    name: "브루트",
    maxHp: 160,
    speed: 38,
    contactDamage: 25,
    knockbackResist: 0.8,
    score: 50,
    footprint: { w: 36, d: 36 },
    art: { w: 148, h: 128 },
    color: 0xa855f7,
  },
  imp: {
    id: "imp",
    name: "임프",
    maxHp: 40,
    speed: 72,
    contactDamage: 8,
    knockbackResist: 0.2,
    score: 30,
    ranged: {
      preferredDistance: 230,
      fireIntervalMs: 2200,
      projectileSpeed: 260,
      damage: 12,
      friendlyFire: true,
    },
    footprint: { w: 36, d: 36 },
    art: { w: 96, h: 96 },
    color: 0xef4444,
    horns: true,
  },
};
