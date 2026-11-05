import type { MonsterId } from "./monsters";

/** 웨이브에 섞여 나오는 몬스터와 비중 */
export interface WaveMonsterEntry {
  monster: MonsterId;
  /** 이 웨이브부터 등장 */
  fromWave: number;
  /** 등장 비중 (클수록 자주) */
  weight: number;
}

/**
 * 웨이브 구성 규칙. 웨이브 n의 몬스터 수 = baseCount + countPerWave × (n − 1).
 * 종류는 composition에서 해당 웨이브에 등장 가능한 것들 중 weight 비율로 무작위로 고른다.
 * 특정 웨이브만 따로 정하고 싶으면 overrides에 { count, composition }을 넣는다.
 */
export const waveConfig = {
  /** 게임 시작 후 첫 웨이브까지 대기 (초) */
  firstWaveDelaySeconds: 3,
  /** 웨이브 사이 휴식 (초) */
  restSeconds: 5,
  /** 몬스터 종류가 처음 등장하는 웨이브에는 그 종류를 최소 이만큼 넣는다 */
  introMinCount: 2,
  baseCount: 8,
  countPerWave: 4,
  /** 동시에 살아 있을 수 있는 최대 수 (나머지는 대기했다가 순차 등장) */
  maxAlive: 80,
  /** 스폰 간격 (ms): 첫 웨이브 값에서 웨이브마다 줄어들고 최솟값에서 멈춘다 */
  spawnIntervalMs: 700,
  spawnIntervalDecreasePerWave: 40,
  minSpawnIntervalMs: 180,
  /** 웨이브마다 체력/속도에 곱해지는 증가율 */
  hpScalePerWave: 0.08,
  speedScalePerWave: 0.02,
  maxSpeedScale: 1.5,
  /** 플레이어 화면 가장자리에서 이만큼 바깥에서만 스폰 (px) */
  spawnOffscreenMargin: 60,

  composition: [
    { monster: "grunt", fromWave: 1, weight: 10 },
    { monster: "runner", fromWave: 3, weight: 5 },
    { monster: "brute", fromWave: 5, weight: 1 },
    { monster: "imp", fromWave: 5, weight: 2 },
  ] satisfies WaveMonsterEntry[],

  overrides: {} as Record<number, { count?: number; composition?: WaveMonsterEntry[] }>,
} as const;
