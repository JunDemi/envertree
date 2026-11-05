import { comboConfig } from "../config";

/**
 * 콤보: 처치할 때마다 +1, 마지막 처치 후 windowMs 안에 다음 처치가 없으면 0으로.
 * 점수 배율은 config/combo.ts의 multiplierSteps.
 */
export class Combo {
  count = 0;
  best = 0;
  private lastKillAt = 0;

  /** 처치 기록. 새 콤보 수를 돌려준다 */
  registerKill(now: number): number {
    this.count += 1;
    this.best = Math.max(this.best, this.count);
    this.lastKillAt = now;
    return this.count;
  }

  /** 시간이 지나 콤보가 끊겼으면 true */
  update(now: number): boolean {
    if (this.count > 0 && now - this.lastKillAt > comboConfig.windowMs) {
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
  remainingRatio(now: number): number {
    if (this.count === 0) return 0;
    return Math.max(0, 1 - (now - this.lastKillAt) / comboConfig.windowMs);
  }
}
