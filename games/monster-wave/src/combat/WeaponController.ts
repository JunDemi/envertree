import Phaser from "phaser";
import {
  weapons,
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
  /** 무기 목록/탄약/선택이 바뀜 (HUD 갱신용) */
  onChanged(): void;
  /** 새 무기 해금 */
  onUnlocked(def: WeaponDef, slot: number): void;
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
    const def = st.def;

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

  /** 콤보가 올랐을 때: 임계값에 처음 도달한 무기를 해금 */
  checkUnlocks(combo: number) {
    this.states.forEach((st, i) => {
      if (st.unlocked || combo < st.def.unlockCombo) return;
      st.unlocked = true;
      st.ammo = st.def.maxAmmo === null ? null : st.def.startAmmo;
      this.h.onUnlocked(st.def, i + 1);
      this.h.onChanged();
    });
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
