import Phaser from "phaser";
import {
  weaponUpgradeConfig,
  weapons,
  type Explosion,
  type GunWeapon,
  type PlaceableWeapon,
  type RocketWeapon,
  type ThrownWeapon,
  type WeaponDef,
} from "../config";

export interface WeaponState {
  def: WeaponDef;
  unlocked: boolean;
  /** 남은 탄약. null = 무한 */
  ammo: number | null;
  /** 이 무기를 다시 쏠 수 있는 시각 (무기마다 따로: 로켓을 쏘고 바로 바꾼 무기는 기다리지 않음) */
  nextFireAt: number;
  /** 레벨 (1부터). 레벨이 반영된 수치는 effective */
  level: number;
  /** 레벨이 반영된 무기 정의 (레벨이 바뀔 때마다 다시 계산) */
  effective: WeaponDef;
}

/** 레벨 배율을 적용한 무기 정의를 만든다 (원본 config는 바꾸지 않음) */
export function applyLevel(def: WeaponDef, level: number): WeaponDef {
  const n = level - 1;
  if (n <= 0) return def;
  const u = weaponUpgradeConfig;
  const boom = (e: Explosion): Explosion => ({
    ...e,
    radius: e.radius * u.explosion.radiusMul ** n,
    damage: e.damage * u.explosion.damageMul ** n,
  });
  switch (def.kind) {
    case "gun":
      return {
        ...def,
        fireIntervalMs: def.fireIntervalMs * u.gun.fireIntervalMul ** n,
        damage: def.damage * u.gun.damageMul ** n,
      };
    case "placeable":
      return {
        ...def,
        placeable:
          def.placeable.type === "barricade"
            ? { ...def.placeable, maxHp: Math.round(def.placeable.maxHp * u.barricade.maxHpMul ** n) }
            : { ...def.placeable, explosion: boom(def.placeable.explosion) },
      };
    case "thrown":
    case "rocket":
      return { ...def, explosion: boom(def.explosion) };
  }
}

/**
 * 무기 종류별 실제 동작. GameScene이 구현한다.
 * placeable/thrown은 실패할 수 있다 (설치할 자리가 없음 등) → false면 탄약을 쓰지 않는다.
 */
export interface WeaponHandlers {
  fireGun(def: GunWeapon, angleOffset: number): void;
  place(def: PlaceableWeapon): boolean;
  throwGrenade(def: ThrownWeapon): boolean;
  fireRocket(def: RocketWeapon): void;
  /** 무기를 실제로 사용함 (효과음 등) */
  onFired(def: WeaponDef): void;
  /** 무기 목록/탄약/선택이 바뀜 (HUD 갱신용) */
  onChanged(): void;
  /** 새 무기 해금 */
  onUnlocked(def: WeaponDef, slot: number): void;
  /** 무기 레벨업 */
  onLevelUp(def: WeaponDef, level: number): void;
}

/**
 * 무기 슬롯 관리: 해금, 탄약, 선택, 발사 간격.
 * 슬롯 순서 = config/weapons.ts 배열 순서 (1~9번 키).
 */
export class WeaponController {
  readonly states: WeaponState[];
  currentIndex = 0;
  private readonly h: WeaponHandlers;

  constructor(handlers: WeaponHandlers) {
    this.h = handlers;
    this.states = weapons.map((def) => ({
      def,
      unlocked: def.unlockCombo === 0,
      ammo: def.maxAmmo === null ? null : def.unlockCombo === 0 ? def.startAmmo : 0,
      nextFireAt: 0,
      level: 1,
      effective: def,
    }));
  }

  get current(): WeaponState {
    return this.states[this.currentIndex];
  }

  /** 버튼을 누르고 있는 동안 매 프레임 호출. 발사 간격이 지났고 탄약이 있으면 쏜다 */
  tryFire(now: number) {
    const st = this.current;
    if (now < st.nextFireAt) return;
    if (st.ammo !== null && st.ammo <= 0) return;
    // 레벨이 반영된 수치로 쏜다
    const def = st.effective;

    let used = true;
    switch (def.kind) {
      case "gun": {
        const spread = Phaser.Math.DegToRad(def.spreadDeg);
        for (let i = 0; i < def.pellets; i++) {
          // 여러 발이면 부채꼴로 고르게(약간 흔들림), 한 발이면 퍼짐 범위 안에서 무작위
          const offset =
            def.pellets > 1
              ? -spread / 2 + (spread * i) / (def.pellets - 1) + (Math.random() - 0.5) * (spread / def.pellets)
              : (Math.random() - 0.5) * spread;
          this.h.fireGun(def, offset);
        }
        break;
      }
      case "placeable":
        used = this.h.place(def);
        break;
      case "thrown":
        used = this.h.throwGrenade(def);
        break;
      case "rocket":
        this.h.fireRocket(def);
        break;
    }

    if (!used) {
      // 설치/투척 실패: 탄약은 그대로, 연타 방지용 짧은 대기
      st.nextFireAt = now + 150;
      return;
    }
    st.nextFireAt = now + def.fireIntervalMs;
    this.h.onFired(def);
    if (st.ammo !== null) {
      st.ammo -= 1;
      // 탄약이 떨어지면 권총(1번)으로 자동 전환
      if (st.ammo <= 0) this.currentIndex = 0;
      this.h.onChanged();
    }
  }

  /** 숫자키로 슬롯 선택 (열린 무기만) */
  select(index: number) {
    const st = this.states[index];
    if (!st || !st.unlocked || index === this.currentIndex) return;
    this.currentIndex = index;
    this.h.onChanged();
  }

  /** 휠/Q/E: 열려 있고 탄약이 있는 다음(이전) 무기로 */
  cycle(dir: -1 | 1) {
    const n = this.states.length;
    for (let step = 1; step < n; step++) {
      const i = (this.currentIndex + dir * step + n) % n;
      const st = this.states[i];
      if (st.unlocked && (st.ammo === null || st.ammo > 0)) {
        this.currentIndex = i;
        this.h.onChanged();
        return;
      }
    }
  }

  /** 모든 무기가 열렸는지 */
  get allUnlocked(): boolean {
    return this.states.every((st) => st.unlocked);
  }

  /**
   * 이 무기가 다음 레벨이 되는 콤보.
   * 레벨업 대상이 아니거나, 최대 레벨이거나, (해금 우선 설정에서) 아직 안 열린 무기가 있으면 null
   */
  levelUpCombo(st: WeaponState): number | null {
    if (!st.unlocked || st.def.unlockCombo <= 0 || st.level >= weaponUpgradeConfig.maxLevel) return null;
    if (weaponUpgradeConfig.levelUpAfterAllUnlocked && !this.allUnlocked) return null;
    return Math.round(st.def.unlockCombo * weaponUpgradeConfig.levelUpComboMultiplier);
  }

  /**
   * 콤보가 1 올랐을 때 호출.
   * - 아직 잠긴 무기: 콤보가 unlockCombo 이상이면 해금
   * - 이미 연 무기: 콤보가 레벨업 콤보(해금 콤보 × 배율)에 막 도달하면 레벨업
   *   (해금 우선 설정이면, 이번 처치 "전에" 이미 모든 무기가 열려 있었을 때만)
   * 레벨업이 하나라도 일어났으면 true (호출하는 쪽에서 콤보를 초기화한다)
   */
  checkUnlocks(combo: number): boolean {
    let leveledUp = false;
    const levelUpAllowed = !weaponUpgradeConfig.levelUpAfterAllUnlocked || this.allUnlocked;
    this.states.forEach((st, i) => {
      const t = st.def.unlockCombo;
      if (t <= 0) return;
      if (!st.unlocked) {
        if (combo < t) return;
        st.unlocked = true;
        st.ammo = st.def.maxAmmo === null ? null : st.def.startAmmo;
        this.h.onUnlocked(st.def, i + 1);
        this.h.onChanged();
        return;
      }
      if (levelUpAllowed && combo === this.levelUpCombo(st)) {
        st.level += 1;
        st.effective = applyLevel(st.def, st.level);
        if (weaponUpgradeConfig.refillAmmo && st.def.maxAmmo !== null) st.ammo = st.def.maxAmmo;
        leveledUp = true;
        this.h.onLevelUp(st.def, st.level);
        this.h.onChanged();
      }
    });
    return leveledUp;
  }

  /** 탄약 제한 무기가 하나라도 열려 있는지 (탄약 상자 드랍 조건) */
  hasLimitedUnlocked(): boolean {
    return this.states.some((st) => st.unlocked && st.def.maxAmmo !== null);
  }

  /** 탄약 상자: 열린 탄약 제한 무기 모두에 ammoPerPickup만큼 (최대치까지) */
  addAmmoAll() {
    for (const st of this.states) {
      if (!st.unlocked || st.ammo === null || st.def.maxAmmo === null) continue;
      st.ammo = Math.min(st.def.maxAmmo, st.ammo + st.def.ammoPerPickup);
    }
    this.h.onChanged();
  }

  /** 디버그: 모든 무기 해금 + 탄약 가득 */
  unlockAll() {
    this.states.forEach((st, i) => {
      const wasLocked = !st.unlocked;
      st.unlocked = true;
      st.ammo = st.def.maxAmmo;
      if (wasLocked) this.h.onUnlocked(st.def, i + 1);
    });
    this.h.onChanged();
  }
}
