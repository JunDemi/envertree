import type { MonsterId } from "../config";

/**
 * 텍스처 키. 지금은 BootScene이 코드로 그려서 만들지만,
 * 나중에 실제 스프라이트로 바꿀 때는 같은 키로 이미지를 로드하면 게임 코드는 그대로 동작한다.
 */
export const TEX = {
  /** 플레이어 (앞모습: 눈 보임 / 뒷모습: 눈 없음). 조준 방향에 따라 바꿔 쓴다 */
  player: "player",
  playerBack: "player-back",
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
} as const;

export function monsterTexture(id: MonsterId): string {
  return `monster-${id}`;
}
