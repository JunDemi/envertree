import { waveConfig, type MonsterId, type WaveMonsterEntry } from "../config";

export type WavePhase = "countdown" | "fighting";

export interface WaveCallbacks {
  /** 몬스터 하나를 스폰해 달라는 요청. 스폰에 실패하면(자리가 없으면) false */
  spawn(id: MonsterId, hpScale: number, speedScale: number): boolean;
  /** 지금 살아 있는 몬스터 수 */
  aliveCount(): number;
  /** 웨이브 시작 */
  onWaveStart(wave: number): void;
  /** 웨이브 클리어 → 휴식 시작 */
  onWaveClear(wave: number): void;
}

/**
 * 웨이브 진행.
 *   countdown(대기) → fighting(스폰 대기열을 간격마다 내보냄) → 모두 처치 → countdown → 다음 웨이브
 * 웨이브 구성 규칙은 config/waves.ts.
 */
export class WaveManager {
  wave = 0;
  phase: WavePhase = "countdown";
  /** countdown 남은 시간 (ms) */
  countdownMs: number = waveConfig.firstWaveDelaySeconds * 1000;
  /** 이번 웨이브에서 아직 스폰되지 않은 몬스터 */
  private queue: MonsterId[] = [];
  private spawnTimer = 0;
  private hpScale = 1;
  private speedScale = 1;
  private spawnInterval: number = waveConfig.spawnIntervalMs;
  private readonly cb: WaveCallbacks;

  constructor(cb: WaveCallbacks) {
    this.cb = cb;
  }

  /** 남은 몬스터 = 아직 안 나온 수 + 살아 있는 수 */
  get remaining() {
    return this.queue.length + this.cb.aliveCount();
  }

  update(deltaMs: number) {
    if (this.phase === "countdown") {
      this.countdownMs -= deltaMs;
      if (this.countdownMs <= 0) this.startWave(this.wave + 1);
      return;
    }

    // 스폰: 간격마다 하나씩, 동시에 살아 있는 수 제한
    this.spawnTimer -= deltaMs;
    while (this.queue.length > 0 && this.spawnTimer <= 0 && this.cb.aliveCount() < waveConfig.maxAlive) {
      const id = this.queue[this.queue.length - 1];
      if (!this.cb.spawn(id, this.hpScale, this.speedScale)) break; // 자리가 없으면 다음 프레임에 다시
      this.queue.pop();
      this.spawnTimer += this.spawnInterval;
    }
    if (this.spawnTimer < 0) this.spawnTimer = 0;

    if (this.queue.length === 0 && this.cb.aliveCount() === 0) {
      this.phase = "countdown";
      this.countdownMs = waveConfig.restSeconds * 1000;
      this.cb.onWaveClear(this.wave);
    }
  }

  /** 디버그: 지금 웨이브를 건너뛴다 (남은 대기열 비우기, 살아 있는 몬스터는 호출하는 쪽에서 정리) */
  skipWave() {
    this.queue.length = 0;
  }

  private startWave(wave: number) {
    this.wave = wave;
    this.phase = "fighting";
    const n = wave - 1;
    this.hpScale = 1 + waveConfig.hpScalePerWave * n;
    this.speedScale = Math.min(waveConfig.maxSpeedScale, 1 + waveConfig.speedScalePerWave * n);
    this.spawnInterval = Math.max(
      waveConfig.minSpawnIntervalMs,
      waveConfig.spawnIntervalMs - waveConfig.spawnIntervalDecreasePerWave * n,
    );
    this.queue = buildWave(wave);
    this.spawnTimer = 0;
    this.cb.onWaveStart(wave);
  }
}

/** 웨이브 n의 몬스터 목록 (섞인 순서) */
export function buildWave(wave: number): MonsterId[] {
  const override = waveConfig.overrides[wave];
  const count = override?.count ?? waveConfig.baseCount + waveConfig.countPerWave * (wave - 1);
  const entries: readonly WaveMonsterEntry[] = (override?.composition ?? waveConfig.composition).filter(
    (e) => e.fromWave <= wave,
  );
  if (entries.length === 0) return [];

  const list: MonsterId[] = [];
  // 처음 등장하는 종류는 최소 수량 보장
  for (const e of entries) {
    if (e.fromWave === wave) for (let i = 0; i < waveConfig.introMinCount && list.length < count; i++) list.push(e.monster);
  }
  // 나머지는 비중에 따라 무작위
  const total = entries.reduce((sum, e) => sum + e.weight, 0);
  while (list.length < count) {
    let r = Math.random() * total;
    const pick = entries.find((e) => (r -= e.weight) < 0) ?? entries[entries.length - 1];
    list.push(pick.monster);
  }
  // 섞기 (Fisher–Yates)
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
