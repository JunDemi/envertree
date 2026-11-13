import { comboConfig } from "../config";

/**
 * 콤보: 처치할 때마다 +1, 마지막 처치 후 windowMs 안에 다음 처치가 없으면 0으로.
 * 점수 배율은 config/combo.ts의 multiplierSteps.
 *
 * 경과 시간은 게임이 진행된 프레임의 delta만 더해서 잰다.
 * (scene.time.now는 일시정지 중에도 흐른 것처럼 보여서 쓰지 않는다)
 */
export class Combo {
  count = 0;
  best = 0;
  /** 마지막 처치 후 흐른 게임 시간 (ms) */
  private sinceKillMs = 0;

  /** 처치 기록. 새 콤보 수를 돌려준다 */
  registerKill(): number {
    this.count += 1;
    this.best = Math.max(this.best, this.count);
    this.sinceKillMs = 0;
    return this.count;
  }

  /** 게임 프레임마다 호출. 시간이 지나 콤보가 끊겼으면 true */
  update(deltaMs: number): boolean {
    if (this.count === 0) return false;
    this.sinceKillMs += deltaMs;
    if (this.sinceKillMs > comboConfig.windowMs) {
      this.count = 0;
      return true;
    }
    return false;
  }

  /** 콤보를 0으로 (무기 레벨업 시) */
  reset() {
    this.count = 0;
  }

  get multiplier(): number {
    let m = 1;
    for (const step of comboConfig.multiplierSteps) if (this.count >= step.minCombo) m = step.multiplier;
    return m;
  }

  /** 콤보 유지 시간 남은 비율 (1 → 0) */
  remainingRatio(): number {
    if (this.count === 0) return 0;
    return Math.max(0, 1 - this.sinceKillMs / comboConfig.windowMs);
  }
}
