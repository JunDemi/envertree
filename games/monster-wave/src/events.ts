/**
 * GameScene → UIScene(HUD) 이벤트. GameScene의 events로 보낸다.
 *   gameScene.events.emit(GameEvents.hp, hp, maxHp)
 */
export const GameEvents = {
  /** (hp: number, maxHp: number) */
  hp: "hud-hp",
  /** (score: number) */
  score: "hud-score",
  /** (remaining: number) 이번 웨이브에 남은 몬스터 (아직 안 나온 수 + 살아 있는 수) */
  monsters: "hud-monsters",
  /** (wave: number) 웨이브 시작 */
  waveStart: "hud-wave-start",
  /** (wave: number) 웨이브 클리어 */
  waveClear: "hud-wave-clear",
  /** (seconds: number, nextWave: number) 다음 웨이브까지 남은 초 (정수가 바뀔 때마다) */
  countdown: "hud-countdown",
} as const;
