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

  /** 겉모습: 발자국 크기, 높이, 색 */
  footprint: { w: number; d: number };
  height: number;
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
    footprint: { w: 24, d: 14 },
    height: 26,
    color: 0x4ade80,
  },
  runner: {
    id: "runner",
    name: "러너",
    maxHp: 14,
    speed: 135,
    contactDamage: 6,
    knockbackResist: 0,
    score: 15,
    footprint: { w: 16, d: 10 },
    height: 16,
    color: 0xfacc15,
  },
  brute: {
    id: "brute",
    name: "브루트",
    maxHp: 160,
    speed: 38,
    contactDamage: 25,
    knockbackResist: 0.8,
    score: 50,
    footprint: { w: 38, d: 22 },
    height: 40,
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
    footprint: { w: 22, d: 13 },
    height: 24,
    color: 0xef4444,
    horns: true,
  },
};
