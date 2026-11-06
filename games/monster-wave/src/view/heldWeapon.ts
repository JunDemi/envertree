import type Phaser from "phaser";
import type { WeaponId } from "../config";
import { heldWeaponTexture, TEX } from "../assets/keys";

/**
 * 손에 든 무기 그림 설정.
 * - originX/Y: 손으로 쥐는 곳 (그림 기준 0~1). 이 점이 손 위치에 오고, 이 점을 중심으로 회전한다
 * - width: 화면에 그릴 너비 (px)
 * null이면 손에 아무것도 들지 않는다 (설치물).
 */
interface HeldArt {
  key: string;
  originX: number;
  originY: number;
  width: number;
}

/** 실제 그림(48×24, 오른쪽을 향함) 기준 */
const HELD: Record<WeaponId, HeldArt | null> = {
  pistol: { key: heldWeaponTexture("pistol"), originX: 0.56, originY: 0.5, width: 24 },
  smg: { key: heldWeaponTexture("smg"), originX: 0.42, originY: 0.5, width: 24 },
  shotgun: { key: heldWeaponTexture("shotgun"), originX: 0.3, originY: 0.5, width: 24 },
  rocket: { key: heldWeaponTexture("rocket"), originX: 0.45, originY: 0.5, width: 24 },
  grenade: { key: TEX.grenade, originX: 0.5, originY: 0.5, width: 8 },
  barricade: null,
  barrel: null,
};

/** 코드로 만든 대체 총 (실제 그림이 없을 때) */
const FALLBACK: HeldArt = { key: TEX.gun, originX: 0.15, originY: 0.5, width: 18 };

export function heldWeaponArt(scene: Phaser.Scene, id: WeaponId): HeldArt | null {
  const art = HELD[id];
  if (!art) return null;
  return scene.textures.exists(art.key) ? art : FALLBACK;
}
