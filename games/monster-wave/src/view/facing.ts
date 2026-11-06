import type { Facing } from "../assets/keys";

const SECTOR = Math.PI / 8; // 22.5°

/**
 * 방향 벡터(화면 기준, y는 아래가 +)를 5방향 + 좌우 반전으로 바꾼다.
 * 위·아래는 반전하지 않는다.
 */
export function facingFromVector(dx: number, dy: number): { facing: Facing; flip: boolean } {
  // 오른쪽 반을 기준으로 각도를 구한다: -90°(위) ~ 90°(아래)
  const a = Math.atan2(dy, Math.abs(dx));
  let facing: Facing;
  if (a > SECTOR * 3) facing = "down";
  else if (a > SECTOR) facing = "downRight";
  else if (a > -SECTOR) facing = "right";
  else if (a > -SECTOR * 3) facing = "upRight";
  else facing = "up";
  const flip = dx < 0 && facing !== "down" && facing !== "up";
  return { facing, flip };
}
