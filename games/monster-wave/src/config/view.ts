/**
 * 3/4 하이앵글 시점 상수.
 *
 * 게임 로직은 평면 탑다운 좌표(x, y)를 그대로 쓴다. 렌더링만 다음처럼 한다.
 * - 모든 오브젝트는 "발밑 발자국"(footprint: 가로 w × 세로 d)만 충돌한다.
 * - 그림은 발자국을 위로 height만큼 밀어올린 윗면 + 그 아래 앞면으로 그린다.
 *   (스프라이트 크기 = w × (d + height), origin은 발자국 아래쪽 가운데)
 * - depth = 발자국 아래쪽 y. 아래(앞)에 있는 것이 위에 그려진다.
 */
export const viewConfig = {
  /** 벽/장애물 블록의 높이 (px) */
  wallHeight: 44,

  /** 윗면은 원래 색보다 밝게, 앞면은 어둡게 (0~1, 섞는 비율) */
  topLighten: 0.25,
  frontDarken: 0.3,
  /** 블록 테두리 */
  outlineColor: 0x0b0d12,
  outlineAlpha: 0.55,

  /** 발밑 그림자: 발자국보다 조금 넓은 타원 */
  shadowAlpha: 0.35,
  shadowScaleX: 1.25,
  shadowScaleY: 1.6,

  /** 바닥 체크무늬 두 색 */
  floorColorA: 0x2a2f3a,
  floorColorB: 0x262a34,
} as const;
