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
  /** (combo: number, multiplier: number) 콤보가 바뀜 (0 = 끊김). 남은 시간 게이지는 HUD가 매 프레임 직접 읽는다 */
  combo: "hud-combo",
  /** () 무기 목록/탄약/선택이 바뀜. HUD는 gameScene.weapon을 읽어 다시 그린다 */
  weapons: "hud-weapons",
  /** (name: string, slot: number) 새 무기 해금 */
  unlock: "hud-unlock",
} as const;
