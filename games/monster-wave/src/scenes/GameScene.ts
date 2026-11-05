import Phaser from "phaser";
import {
  aiConfig,
  arenaConfig,
  arenaHeight,
  arenaWidth,
  combatConfig,
  debugState,
  gameConfig,
  monsters as monsterDefs,
  playerConfig,
  viewConfig,
  waveConfig,
  type MonsterId,
} from "../config";
import { TEX } from "../assets/keys";
import { Bullets, type Bullet } from "../combat/Bullets";
import { WeaponController } from "../combat/WeaponController";
import { Effects } from "../effects/Effects";
import type { Monster } from "../entities/Monster";
import { MonsterManager } from "../entities/MonsterManager";
import { Player } from "../entities/Player";
import { GameEvents } from "../events";
import { KeyboardMouseInput } from "../input/KeyboardMouseInput";
import type { InputSource } from "../input/types";
import { notifyGameStart } from "../portal";
import { Arena } from "../world/Arena";
import { FlowField } from "../world/FlowField";
import { pickSpawnPoint } from "../world/spawn";
import { WaveManager } from "../systems/WaveManager";
import { SCENES } from "./keys";

/**
 * 게임 화면.
 * Phase 2: 권총 사격, 플로우 필드 추적, 접촉 피해와 무적, 사망과 게임오버.
 * Phase 3: 웨이브 진행, 몬스터 4종, 임프 화염구(다른 몬스터에게도 피해).
 * 일시정지와 HUD는 위에 겹쳐 실행되는 UIScene이 담당한다.
 */
export class GameScene extends Phaser.Scene {
  arena!: Arena;
  /** 디버그/테스트에서 접근할 수 있도록 공개 */
  player!: Player;
  monsters!: MonsterManager;
  flow!: FlowField;
  private bullets!: Bullets;
  private fireballs!: Bullets;
  waves!: WaveManager;
  private weapon!: WeaponController;
  private effects!: Effects;
  private input1!: InputSource;
  private score = 0;
  private flowTimer = 0;
  private flowCol = -1;
  private flowRow = -1;
  private ending = false;
  private lastRemaining = -1;
  private lastCountdown = -1;
  private readonly touching: Monster[] = [];

  constructor() {
    super(SCENES.game);
  }

  create() {
    this.score = 0;
    this.flowTimer = 0;
    this.flowCol = -1;
    this.flowRow = -1;
    this.ending = false;
    this.lastRemaining = -1;
    this.lastCountdown = -1;

    this.arena = new Arena(this);
    this.flow = new FlowField(this.arena.grid);
    this.monsters = new MonsterManager(this, this.arena.grid, this.flow);
    this.bullets = new Bullets(this, TEX.bullet, viewConfig.gunHeight);
    this.fireballs = new Bullets(this, TEX.fireball, viewConfig.fireballHeight, false);
    this.weapon = new WeaponController(this.bullets);
    this.monsters.onRangedAttack = (m) => this.fireFireball(m);
    this.waves = new WaveManager({
      spawn: (id, hpScale, speedScale) => this.spawnMonster(id, hpScale, speedScale),
      aliveCount: () => this.monsters.alive.length,
      onWaveStart: (wave) => this.events.emit(GameEvents.waveStart, wave),
      onWaveClear: (wave) => this.events.emit(GameEvents.waveClear, wave),
    });
    this.effects = new Effects(this);

    const start = this.arena.grid.tileCenter(arenaConfig.playerStart.col, arenaConfig.playerStart.row);
    this.player = new Player(this, start.x, start.y);
    this.physics.add.collider(this.player.sprite, this.arena.walls);

    this.input1 = new KeyboardMouseInput(this);

    // 카메라: 플레이어를 부드럽게 따라가고, 맵 경계에서 멈춘다.
    // 맨 윗줄 벽은 위로 솟아 있으므로 그만큼 경계를 위로 넓힌다.
    const cam = this.cameras.main;
    cam.setBounds(0, -viewConfig.wallHeight, arenaWidth, arenaHeight + viewConfig.wallHeight);
    cam.startFollow(this.player.sprite, true, gameConfig.cameraLerp, gameConfig.cameraLerp, 0, viewConfig.cameraFocusHeight);

    // HUD + 일시정지 담당 씬을 위에 겹쳐 실행
    this.scene.launch(SCENES.ui);
    this.scene.bringToTop(SCENES.ui);

    // 물리 엔진이 POST_UPDATE에서 몸체 위치를 스프라이트에 반영한 "뒤에" 그림자/총/depth를 맞춘다.
    // (물리 플러그인의 리스너가 먼저 등록되어 있으므로 이 리스너가 나중에 실행된다)
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncView, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncView, this);
      this.input1.destroy();
    });

    if (debugState.enabled) {
      // 디버그 (Phase 6에서 정리): K = 그런트 50마리 추가, N = 웨이브 건너뛰기
      this.input.keyboard?.on("keydown-K", () => {
        for (let i = 0; i < 50; i++) this.spawnMonster("grunt");
      });
      this.input.keyboard?.on("keydown-N", () => this.debugSkipWave());
    }

    // HUD 초기값 (UIScene이 같은 프레임에 구독을 마친 뒤 받도록 다음 틱에 보냄)
    this.time.delayedCall(0, () => this.emitHud());

    notifyGameStart();
  }

  update(_time: number, deltaMs: number) {
    if (this.ending) return;
    const dt = Math.min(deltaMs / 1000, combatConfig.maxStepSeconds);
    const now = this.time.now;
    const input = this.input1.read();

    this.player.update(input, dt);
    if (input.fire && !this.player.dead) {
      const m = this.player.muzzle();
      this.weapon.tryFire(now, m.x, m.y, this.player.aimAngle);
    }

    this.updateFlowField(deltaMs);
    // 몬스터는 플레이어 발자국 가운데를 향한다
    this.monsters.update(dt, this.player.x, this.player.y, playerConfig.footprint.w);
    this.bullets.update(dt, (b) => this.bulletStep(b, now));
    this.fireballs.update(dt, (b) => this.fireballStep(b, now));
    this.checkContactDamage();
    this.updateWaves(deltaMs);
  }

  private updateWaves(deltaMs: number) {
    const w = this.waves;
    w.update(deltaMs);
    const remaining = w.remaining;
    if (remaining !== this.lastRemaining) {
      this.lastRemaining = remaining;
      this.events.emit(GameEvents.monsters, remaining);
    }
    const countdown = w.phase === "countdown" ? Math.ceil(w.countdownMs / 1000) : -1;
    if (countdown !== this.lastCountdown) {
      this.lastCountdown = countdown;
      if (countdown > 0) this.events.emit(GameEvents.countdown, countdown, w.wave + 1);
    }
  }

  /** 플레이어가 다른 칸으로 옮겼거나 일정 시간이 지났으면 플로우 필드 재계산 */
  private updateFlowField(deltaMs: number) {
    const grid = this.arena.grid;
    const { col, row } = grid.worldToTile(this.player.x, this.player.y - playerConfig.footprint.d / 2);
    this.flowTimer -= deltaMs;
    if (col !== this.flowCol || row !== this.flowRow || this.flowTimer <= 0) {
      this.flow.compute(col, row);
      this.flowCol = col;
      this.flowRow = row;
      this.flowTimer = aiConfig.flowFieldRefreshMs;
    }
  }

  /** 총알 한 발 처리. false를 돌려주면 총알이 사라진다 */
  private bulletStep(b: Bullet, now: number): boolean {
    const grid = this.arena.grid;
    const { col, row } = grid.worldToTile(b.x, b.y);
    if (grid.isBlocked(col, row)) return false;

    const target = this.monsters.hitTest(b.x, b.y);
    if (!target) return true;

    const speed = Math.hypot(b.vx, b.vy) || 1;
    target.knockback(b.vx / speed, b.vy / speed, b.knockback);
    if (target.damage(b.damage, now)) this.killMonster(target);
    return false;
  }

  private killMonster(m: Monster) {
    const { def } = m;
    // 이 몬스터가 쏜 화염구가 날아가는 중이면 owner 연결을 끊는다.
    // (풀로 돌아간 몬스터 객체가 다른 몬스터로 재사용되면 그 몬스터가 화염구에 안 맞게 되므로)
    for (const b of this.fireballs.items) if (b.owner === m) b.owner = null;
    this.effects.burst(m.x, m.y - def.height / 2, def.color);
    this.monsters.kill(m);
    this.score += def.score;
    this.events.emit(GameEvents.score, this.score);
  }

  private checkContactDamage() {
    const p = this.player;
    if (p.dead || p.isInvincible) return;
    // 몸이 닿는 거리 + 3px 여유 안에 있으면 접촉
    this.monsters.touching(p.x, p.y, playerConfig.footprint.w, 3, this.touching);
    if (this.touching.length === 0) return;
    const damage = Math.max(...this.touching.map((m) => m.def.contactDamage));
    if (p.takeDamage(damage)) {
      // 플레이어는 부딪힌 몬스터들의 반대쪽으로 밀려난다 (몬스터는 밀리지 않음)
      let awayX = 0;
      let awayY = 0;
      for (const m of this.touching) {
        const dx = m.x - p.x;
        const dy = m.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        awayX -= dx / len;
        awayY -= dy / len;
      }
      const awayLen = Math.hypot(awayX, awayY);
      if (!p.dead && awayLen > 0.001) {
        p.knockback(awayX / awayLen, awayY / awayLen, playerConfig.contactKnockback);
      }
      this.cameras.main.shake(120, 0.006);
      this.events.emit(GameEvents.hp, p.hp, playerConfig.maxHp);
      if (p.dead) this.onPlayerDead();
    }
  }

  /** 임프 화염구: 플레이어 쪽으로 발사 */
  private fireFireball(m: Monster) {
    const ranged = m.def.ranged;
    if (!ranged) return;
    const sx = m.x;
    const sy = m.y - m.def.footprint.d / 2;
    const tx = this.player.x;
    const ty = this.player.y - playerConfig.footprint.d / 2;
    this.fireballs.fire({
      x: sx,
      y: sy,
      angle: Math.atan2(ty - sy, tx - sx),
      speed: ranged.projectileSpeed,
      range: ranged.preferredDistance * 2.5,
      damage: ranged.damage,
      owner: m,
    });
  }

  /** 화염구 한 발 처리: 벽, 플레이어, (friendlyFire면) 다른 몬스터 */
  private fireballStep(b: Bullet, now: number): boolean {
    const grid = this.arena.grid;
    const { col, row } = grid.worldToTile(b.x, b.y);
    if (grid.isBlocked(col, row)) return false;

    const p = this.player;
    if (!p.dead) {
      const reach = playerConfig.footprint.w / 2 + 6;
      if (Math.hypot(b.x - p.x, b.y - (p.y - playerConfig.footprint.d / 2)) < reach) {
        if (p.takeDamage(b.damage)) {
          const speed = Math.hypot(b.vx, b.vy) || 1;
          p.knockback(b.vx / speed, b.vy / speed, playerConfig.contactKnockback * 0.6);
          this.cameras.main.shake(120, 0.006);
          this.events.emit(GameEvents.hp, p.hp, playerConfig.maxHp);
          if (p.dead) this.onPlayerDead();
        }
        return false;
      }
    }

    const friendlyFire = b.owner?.def.ranged?.friendlyFire ?? monsterDefs.imp.ranged?.friendlyFire ?? true;
    if (friendlyFire) {
      const target = this.monsters.hitTest(b.x, b.y, b.owner);
      if (target) {
        if (target.damage(b.damage, now)) this.killMonster(target);
        return false;
      }
    }
    return true;
  }

  /** 스폰 지점에 몬스터 하나. 자리가 없으면 false */
  spawnMonster(id: MonsterId, hpScale = 1, speedScale = 1): boolean {
    const view = this.cameras.main.worldView;
    const point = pickSpawnPoint(this.arena.grid, view, waveConfig.spawnOffscreenMargin, this.player.x, this.player.y);
    if (!point) return false;
    this.monsters.spawn(monsterDefs[id], point.x, point.y, hpScale, speedScale);
    return true;
  }

  /** 디버그: 살아 있는 몬스터와 대기열을 모두 없애 웨이브를 바로 끝낸다 (점수 없음) */
  private debugSkipWave() {
    this.waves.skipWave();
    this.monsters.clear();
    this.fireballs.releaseAll();
  }

  private onPlayerDead() {
    this.ending = true;
    this.player.syncView();
    this.effects.burst(this.player.x, this.player.y - 20, playerConfig.color, 16);
    this.player.hide();
    this.time.delayedCall(900, () => this.endGame());
  }

  private emitHud() {
    this.events.emit(GameEvents.hp, this.player.hp, playerConfig.maxHp);
    this.events.emit(GameEvents.score, this.score);
  }

  /** 물리 계산이 끝난 뒤 그림 위치/depth를 맞춘다 */
  private syncView() {
    if (!this.player.dead) this.player.syncView();
    const p = this.player.sprite;
    this.arena.updateOcclusion(p.x, p.y, p.width);
  }

  endGame() {
    this.scene.stop(SCENES.ui);
    this.scene.start(SCENES.gameOver, { score: this.score, wave: Math.max(1, this.waves.wave) });
  }

  toTitle() {
    this.scene.stop(SCENES.ui);
    this.scene.start(SCENES.title);
  }
}
