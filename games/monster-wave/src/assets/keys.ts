import type { MonsterId } from "../config";

/**
 * 텍스처 키. 지금은 BootScene이 코드로 그려서 만들지만,
 * 나중에 실제 스프라이트로 바꿀 때는 같은 키로 이미지를 로드하면 게임 코드는 그대로 동작한다.
 */
export const TEX = {
  /** 플레이어가 든 총. 조준 방향으로 회전 */
  gun: "gun",
  /** 발밑 그림자 (검은 타원, 크기는 스케일로 조절) */
  shadow: "shadow",
  /** 바닥 체크무늬 (2×2 타일, TileSprite로 반복) */
  floor: "floor",
  /** 벽/장애물 블록 1칸 */
  wall: "wall",
  bullet: "bullet",
  fireball: "fireball",
  /** 파편 파티클 (흰색, tint로 색 입힘) */
  particle: "particle",
  /** 설치물 */
  barricade: "barricade",
  barrel: "barrel",
  /** 투척/발사체 */
  grenade: "grenade",
  rocket: "rocket",
  /** 드랍 아이템 */
  ammoCrate: "ammo-crate",
  healthPack: "health-pack",
  /** 폭발 원 (흰색, 스케일과 tint로 사용) */
  blast: "blast",
} as const;

/**
 * 캐릭터가 바라보는 방향. 이 5방향만 그리고, 왼쪽 3방향은 좌우 반전해서 쓴다.
 */
export const FACINGS = ["down", "downRight", "right", "upRight", "up"] as const;
export type Facing = (typeof FACINGS)[number];

/** 플레이어. 조준 방향에 따라 바꿔 쓴다 */
export function playerTexture(facing: Facing = "down"): string {
  return `player-${facing}`;
}

export function monsterTexture(id: MonsterId, facing: Facing = "down"): string {
  return `monster-${id}-${facing}`;
}
