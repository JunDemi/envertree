/** 화면과 아레나 크기 */
export const gameConfig = {
  /** 고정 해상도. 포털 레지스트리의 size와 같아야 한다. FIT으로 iframe에 맞춰진다. */
  width: 960,
  height: 640,
  backgroundColor: "#11131a",

  /** 아레나(맵). 격자 단위로 정의하며, 플로우 필드 격자와 같은 크기를 쓴다. */
  tileSize: 40,
  arenaCols: 48, // 48 × 40 = 1920px
  arenaRows: 36, // 36 × 40 = 1440px

  /** 카메라가 플레이어를 따라가는 부드러움 (0~1, 클수록 빠르게 따라감) */
  cameraLerp: 0.12,
} as const;

export const arenaWidth = gameConfig.arenaCols * gameConfig.tileSize;
export const arenaHeight = gameConfig.arenaRows * gameConfig.tileSize;
