/** 콤보 규칙 */
export const comboConfig = {
  /** 마지막 처치 후 이 시간 안에 다음 처치가 없으면 콤보가 0으로 (ms) */
  windowMs: 2000,
  /**
   * 점수 배율: 콤보가 minCombo 이상이면 multiplier 적용 (가장 큰 단계).
   * 점수 = 몬스터 기본 점수 × 배율
   */
  multiplierSteps: [
    { minCombo: 0, multiplier: 1 },
    { minCombo: 5, multiplier: 1.5 },
    { minCombo: 10, multiplier: 2 },
    { minCombo: 20, multiplier: 3 },
    { minCombo: 40, multiplier: 4 },
  ],
  // 무기 해금 임계값은 weapons.ts의 각 무기 unlockCombo에 있다.
} as const;
