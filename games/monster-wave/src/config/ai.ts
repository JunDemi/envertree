/** 몬스터 이동(길찾기) 관련 설정 */
export const aiConfig = {
  /** 플로우 필드 재계산 간격 (ms). 플레이어가 다른 칸으로 옮기면 즉시 재계산 */
  flowFieldRefreshMs: 300,
  /** 플레이어와 이 칸 수 이내면 플로우 필드 대신 플레이어를 향해 직진 */
  directChaseTiles: 1.5,
  /** 몬스터끼리 겹쳤을 때 밀어내는 세기 (0~1, 클수록 빨리 떨어짐) */
  separationStrength: 0.35,
  /** 몬스터 근처 찾기용 공간 해시 칸 크기 (px) */
  spatialCellSize: 64,
} as const;
