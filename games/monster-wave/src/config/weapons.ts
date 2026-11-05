/**
 * 무기 정의. 배열 순서 = 무기 슬롯 번호(1~9) = 해금 순서.
 * 수치는 초기안이며 Phase 4/6에서 조정한다.
 */
export type WeaponId = "pistol" | "smg" | "shotgun" | "barricade" | "barrel" | "grenade" | "rocket";

export interface Explosion {
  damage: number;
  radius: number;
  /** 플레이어 자신이 받는 피해 비율 (0이면 자기 피해 없음). combat.selfExplosionDamage로 전체 끌 수 있음 */
  selfDamageRatio: number;
}

interface WeaponBase {
  id: WeaponId;
  name: string;
  /** 발사(사용) 간격 (ms). 버튼을 누르고 있으면 이 간격으로 연사 */
  fireIntervalMs: number;
  /** 최대 탄약. null = 무한 */
  maxAmmo: number | null;
  /** 해금될 때 받는 탄약 */
  startAmmo: number;
  /** 탄약 상자 하나로 채워지는 양 */
  ammoPerPickup: number;
  /** 이 콤보에 처음 도달하면 해금. 0 = 처음부터 사용 가능 */
  unlockCombo: number;
}

/** 총알을 쏘는 무기 */
export interface GunWeapon extends WeaponBase {
  kind: "gun";
  damage: number;
  /** 한 번에 나가는 총알 수 */
  pellets: number;
  /** 퍼짐 각도 (도). pellets가 여러 개면 이 각도 안에 부채꼴로 */
  spreadDeg: number;
  bulletSpeed: number;
  /** 사거리 (px) */
  range: number;
  /** 맞은 몬스터를 밀어내는 힘 (px) */
  knockback: number;
}

/** 바라보는 방향 앞에 설치하는 무기 */
export interface PlaceableWeapon extends WeaponBase {
  kind: "placeable";
  /** 플레이어로부터 설치 거리 (px) */
  placeDistance: number;
  placeable:
    | { type: "barricade"; maxHp: number }
    | { type: "barrel"; maxHp: number; explosion: Explosion };
}

/** 조준 지점으로 던지는 무기 */
export interface ThrownWeapon extends WeaponBase {
  kind: "thrown";
  maxThrowDistance: number;
  /** 던진 뒤 터지기까지 (ms) */
  fuseMs: number;
  explosion: Explosion;
}

/** 직선으로 날아가 부딪히면 터지는 무기 */
export interface RocketWeapon extends WeaponBase {
  kind: "rocket";
  speed: number;
  explosion: Explosion;
}

export type WeaponDef = GunWeapon | PlaceableWeapon | ThrownWeapon | RocketWeapon;

export const weapons: readonly WeaponDef[] = [
  {
    id: "pistol",
    name: "권총",
    kind: "gun",
    fireIntervalMs: 280,
    maxAmmo: null,
    startAmmo: 0,
    ammoPerPickup: 0,
    unlockCombo: 0,
    damage: 12,
    pellets: 1,
    spreadDeg: 2,
    bulletSpeed: 720,
    range: 520,
    knockback: 4,
  },
  {
    id: "smg",
    name: "기관단총",
    kind: "gun",
    fireIntervalMs: 85,
    maxAmmo: 300,
    startAmmo: 150,
    ammoPerPickup: 80,
    unlockCombo: 5,
    damage: 7,
    pellets: 1,
    spreadDeg: 8,
    bulletSpeed: 760,
    range: 480,
    knockback: 2,
  },
  {
    id: "shotgun",
    name: "샷건",
    kind: "gun",
    fireIntervalMs: 650,
    maxAmmo: 60,
    startAmmo: 24,
    ammoPerPickup: 12,
    unlockCombo: 10,
    damage: 9,
    pellets: 7,
    spreadDeg: 32,
    bulletSpeed: 650,
    range: 260,
    knockback: 26,
  },
  {
    id: "barricade",
    name: "바리케이드",
    kind: "placeable",
    fireIntervalMs: 400,
    maxAmmo: 15,
    startAmmo: 6,
    ammoPerPickup: 3,
    unlockCombo: 15,
    placeDistance: 40,
    placeable: { type: "barricade", maxHp: 120 },
  },
  {
    id: "barrel",
    name: "폭발 드럼통",
    kind: "placeable",
    fireIntervalMs: 400,
    maxAmmo: 10,
    startAmmo: 4,
    ammoPerPickup: 2,
    unlockCombo: 20,
    placeDistance: 40,
    placeable: { type: "barrel", maxHp: 1, explosion: { damage: 90, radius: 120, selfDamageRatio: 0.3 } },
  },
  {
    id: "grenade",
    name: "수류탄",
    kind: "thrown",
    fireIntervalMs: 700,
    maxAmmo: 12,
    startAmmo: 5,
    ammoPerPickup: 3,
    unlockCombo: 30,
    maxThrowDistance: 320,
    fuseMs: 1100,
    explosion: { damage: 80, radius: 110, selfDamageRatio: 0.3 },
  },
  {
    id: "rocket",
    name: "로켓",
    kind: "rocket",
    fireIntervalMs: 900,
    maxAmmo: 10,
    startAmmo: 4,
    ammoPerPickup: 2,
    unlockCombo: 40,
    speed: 520,
    explosion: { damage: 120, radius: 100, selfDamageRatio: 0.3 },
  },
];

/**
 * 무기 레벨업: 이미 연 무기는 콤보가 "unlockCombo × levelUpComboMultiplier"에 도달하면 레벨 +1 (최대 maxLevel).
 * 레벨업하면 콤보가 0으로 초기화된다 (resetComboOnLevelUp).
 * levelUpAfterAllUnlocked가 true면 모든 무기를 연 "다음 처치부터" 레벨업한다 (해금 우선):
 * 그 전에 레벨업과 초기화가 일어나면 콤보 30·40에 닿지 못해 수류탄·로켓을 열 수 없게 되기 때문.
 * 레벨마다 아래 배율이 한 번씩 곱해진다 (Lv.3 = 두 번). 권총처럼 unlockCombo가 0인 무기는 레벨업하지 않는다.
 *
 * 예 (배율 4): 기관단총 20, 샷건 40, 바리케이드 60, 폭발 드럼통 80, 수류탄 120, 로켓 160
 */
export const weaponUpgradeConfig = {
  maxLevel: 3,
  /** 레벨업에 필요한 콤보 = 해금 콤보 × 이 값 */
  levelUpComboMultiplier: 4,
  /** 레벨업하면 콤보를 0으로 초기화 */
  resetComboOnLevelUp: true,
  /** 모든 무기를 연 뒤에만 레벨업 (해금 우선) */
  levelUpAfterAllUnlocked: true,
  /** 레벨업할 때 탄약을 최대치까지 채움 */
  refillAmmo: true,
  gun: {
    /** 발사 간격 배율 (작을수록 빠름) */
    fireIntervalMul: 0.9,
    damageMul: 1.15,
  },
  barricade: { maxHpMul: 1.25 },
  /** 드럼통, 수류탄, 로켓 폭발 */
  explosion: { radiusMul: 1.1, damageMul: 1.1 },
} as const;
