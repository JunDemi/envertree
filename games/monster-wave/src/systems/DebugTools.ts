import Phaser from "phaser";
import { controls, debugState } from "../config";
import type { GameScene } from "../scenes/GameScene";

/**
 * 디버그 도구 (밸런스 확인용). GameScene이 만들고 매 프레임 draw()를 부른다.
 *   F2 디버그 켜기/끄기 · I 무적 · N 다음 웨이브 · Shift+N 5웨이브 건너뛰기
 *   U 전 무기 해금 · K 그런트 50마리 · F 플로우 필드 · C 충돌 박스
 * 디버그가 꺼져 있으면 F2 외의 키는 무시한다.
 */
export class DebugTools {
  private readonly game: GameScene;
  private readonly overlay: Phaser.GameObjects.Graphics;
  /** 상태가 바뀌면 HUD가 패널을 다시 그리도록 알림 */
  static readonly CHANGED = "debug-changed";

  constructor(game: GameScene) {
    this.game = game;
    this.overlay = game.add.graphics().setDepth(2e6);
    if (debugState.enabled) debugState.usedThisRun = true;

    const kb = game.input.keyboard;
    if (!kb) return;
    // Phaser는 한 프레임에 키 이벤트가 여러 개 쌓이면(예: Shift 누른 채 N) 같은 이벤트를 다시 보낼 때가 있다.
    // 누를 때마다 값이 쌓이는 동작(Shift+N = +5 웨이브)이 중복되지 않게 이벤트 객체 단위로 한 번만 처리한다.
    const seen = new WeakSet<KeyboardEvent>();
    const once = (fn: (e: KeyboardEvent) => void) => (e: KeyboardEvent) => {
      if (seen.has(e)) return;
      seen.add(e);
      fn(e);
    };
    for (const name of controls.toggleDebug) kb.on(`keydown-${name}`, once(() => this.toggle()));
    const when = (key: string, fn: (e: KeyboardEvent) => void) =>
      kb.on(
        `keydown-${key}`,
        once((e) => {
          if (debugState.enabled) fn(e);
        }),
      );
    when("I", () => this.set("invincible", !debugState.invincible));
    when("N", (e) => this.skipWaves(e.shiftKey ? 5 : 1));
    when("U", () => game.weapon.unlockAll());
    when("K", () => {
      for (let i = 0; i < 50; i++) game.spawnMonster("grunt");
    });
    when("F", () => this.set("showFlow", !debugState.showFlow));
    when("C", () => this.set("showBoxes", !debugState.showBoxes));
    this.applyBoxes();
  }

  private toggle() {
    debugState.enabled = !debugState.enabled;
    if (debugState.enabled) debugState.usedThisRun = true;
    else {
      debugState.invincible = false;
      debugState.showFlow = false;
      debugState.showBoxes = false;
    }
    this.applyBoxes();
    this.game.events.emit(DebugTools.CHANGED);
  }

  private set(key: "invincible" | "showFlow" | "showBoxes", value: boolean) {
    debugState[key] = value;
    this.applyBoxes();
    this.game.events.emit(DebugTools.CHANGED);
  }

  /** 지금 웨이브를 끝내고 n-1개를 더 건너뛴다. 다음 웨이브는 1초 뒤 시작 */
  private skipWaves(n: number) {
    const w = this.game.waves;
    w.jumpTo(Math.max(w.wave, 0) + n, 1000);
    this.game.debugClearField();
  }

  /** 플레이어 충돌 박스는 Phaser Arcade 디버그 그리기로 표시 */
  private applyBoxes() {
    const world = this.game.physics.world;
    if (debugState.enabled && debugState.showBoxes && !world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = debugState.enabled && debugState.showBoxes;
    if (world.debugGraphic) {
      world.debugGraphic.setVisible(world.drawDebug);
      if (!world.drawDebug) world.debugGraphic.clear();
    }
  }

  /** 매 프레임: 플로우 필드 화살표, 몬스터/설치물 발자국 */
  draw() {
    const g = this.overlay;
    g.clear();
    if (!debugState.enabled) return;
    const game = this.game;
    const grid = game.arena.grid;
    const t = grid.tile;

    if (debugState.showFlow) {
      // 화면에 보이는 칸만 그린다
      const view = game.cameras.main.worldView;
      const c0 = Math.max(0, Math.floor(view.x / t));
      const c1 = Math.min(grid.cols - 1, Math.floor(view.right / t));
      const r0 = Math.max(0, Math.floor(view.y / t));
      const r1 = Math.min(grid.rows - 1, Math.floor(view.bottom / t));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          if (grid.isWall(c, r)) continue;
          const i = r * grid.cols + c;
          const dx = game.flow.dirX[i];
          const dy = game.flow.dirY[i];
          const cx = (c + 0.5) * t;
          const cy = (r + 0.5) * t;
          if (grid.isObstacle(c, r)) g.fillStyle(0xf97316, 0.25).fillRect(c * t, r * t, t, t);
          if (dx === 0 && dy === 0) {
            g.fillStyle(0x22d3ee, 0.8).fillCircle(cx, cy, 3);
            continue;
          }
          const len = t * 0.32;
          g.lineStyle(1.5, 0x22d3ee, 0.6).lineBetween(cx - dx * len, cy - dy * len, cx + dx * len, cy + dy * len);
          g.fillStyle(0x22d3ee, 0.9).fillCircle(cx + dx * len, cy + dy * len, 2);
        }
      }
    }

    if (debugState.showBoxes) {
      for (const m of game.monsters.alive) {
        const { w, d } = m.def.footprint;
        g.lineStyle(1, m.def.ranged ? 0xf43f5e : 0x84cc16, 0.9).strokeRect(m.x - w / 2, m.y - d, w, d);
        if (m.def.ranged) g.lineStyle(1, 0xf43f5e, 0.2).strokeCircle(m.x, m.y - d / 2, m.def.ranged.preferredDistance);
      }
      for (const p of game.placeables.all) g.lineStyle(1, 0xf97316, 0.9).strokeRect(p.col * t, p.row * t, t, t);
    }
  }

  /** HUD 패널에 표시할 줄들 */
  static panelLines(game: GameScene): string[] {
    const on = (v: boolean) => (v ? "ON " : "off");
    return [
      `DEBUG (F2)   웨이브 ${game.waves.wave}   몬스터 ${game.monsters.alive.length}`,
      `I 무적 ${on(debugState.invincible)}   F 플로우 ${on(debugState.showFlow)}   C 박스 ${on(debugState.showBoxes)}`,
      `N 다음 웨이브 · Shift+N +5 · U 전 무기 · K 그런트+50`,
      `?debug&wave=${Math.max(2, game.waves.wave)} 로 해당 웨이브부터 시작`,
    ];
  }
}
