/**
 * GameScene → UIScene(HUD) 이벤트. GameScene의 events로 보낸다.
 *   gameScene.events.emit(GameEvents.hp, hp, maxHp)
 */
export const GameEvents = {
  /** (hp: number, maxHp: number) */
  hp: "hud-hp",
  /** (score: number) */
  score: "hud-score",
  /** (alive: number) 살아 있는 몬스터 수 */
  monsters: "hud-monsters",
} as const;
