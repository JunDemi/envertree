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
  type Explosion,
  type GunWeapon,
  type MonsterId,
  type PlaceableWeapon,
  type RocketWeapon,
  type ThrownWeapon,
} from "../config";
import { TEX } from "../assets/keys";
import { sfx } from "../audio/Sfx";
import { DamageNumbers } from "../effects/DamageNumbers";
import { Bullets, type Bullet } from "../combat/Bullets";
import { Grenades } from "../combat/Grenades";
import { WeaponController } from "../combat/WeaponController";
import { Effects } from "../effects/Effects";
import { Items, type ItemType } from "../entities/Items";
import type { Monster } from "../entities/Monster";
import { MonsterManager } from "../entities/MonsterManager";
import { Player } from "../entities/Player";
import { GameEvents } from "../events";
import { KeyboardMouseInput } from "../input/KeyboardMouseInput";
import type { InputSource, PlayerInput } from "../input/types";
import { notifyGameStart } from "../portal";
import { Combo } from "../systems/Combo";
import { WaveManager } from "../systems/WaveManager";
import { Arena } from "../world/Arena";
import { FlowField } from "../world/FlowField";
import { Placeables, type Placeable } from "../world/Placeables";
import { pickSpawnPoint } from "../world/spawn";
import { SCENES } from "./keys";

/**
 * 게임 화면.
 * Phase 2: 권총 사격, 플로우 필드 추적, 접촉 피해와 무적, 사망과 게임오버.
 * Phase 3: 웨이브 진행, 몬스터 4종, 임프 화염구(다른 몬스터에게도 피해).
 * Phase 4: 콤보와 점수 배율, 무기 해금, 탄약과 드랍, 바리케이드/드럼통/수류탄/로켓, 폭발.
 * 일시정지와 HUD는 위에 겹쳐 실행되는 UIScene이 담당한다.
 */
export class GameScene extends Phaser.Scene {
  /** 디버그/테스트/HUD에서 접근할 수 있도록 공개 */
  arena!: Arena;
  player!: Player;
  monsters!: MonsterManager;
  flow!: FlowField;
  waves!: WaveManager;
  weapon!: WeaponController;
  combo!: Combo;
  placeables!: Placeables;
  private bullets!: Bullets;
  private fireballs!: Bullets;
  private rockets!: Bullets;
  private grenades!: Grenades;
  private items!: Items;
  private effects!: Effects;
  private damageNumbers!: DamageNumbers;
  private kills = 0;
  private input1!: InputSource;
  /** 이번 프레임 입력 (수류탄 조준점 등에 사용) */
  private lastInput!: PlayerInput;
  private score = 0;
  private flowTimer = 0;
  private flowCol = -1;
  private flowRow = -1;
  private flowDirty = false;
  private ending = false;
  private lastRemaining = -1;
  private lastCountdown = -1;
  private placeFailNoticeAt = 0;
  private readonly touching: Monster[] = [];
  private readonly blastTargets: Monster[] = [];

  constructor() {
    super(SCENES.game);
  }

  create() {
    this.score = 0;
    this.kills = 0;
    this.flowTimer = 0;
    this.flowCol = -1;
    this.flowRow = -1;
    this.flowDirty = false;
    this.ending = false;
    this.lastRemaining = -1;
    this.lastCountdown = -1;
    this.placeFailNoticeAt = 0;

    this.arena = new Arena(this);
    const grid = this.arena.grid;
    this.flow = new FlowField(grid, combatConfig.obstacles.flowCost);
    this.monsters = new MonsterManager(this, grid, this.flow);
    this.monsters.obstacleAttackIntervalMs = combatConfig.obstacles.attackIntervalMs;
    this.monsters.onRangedAttack = (m) => this.fireFireball(m);
    this.monsters.onAttackObstacle = (m, col, row) => {
      const p = this.placeables.at(col, row);
      if (p) this.placeables.damage(p, m.def.contactDamage);
    };
    this.effects = new Effects(this);
    this.damageNumbers = new DamageNumbers(this);
    this.items = new Items(this);
    this.combo = new Combo();

    this.bullets = new Bullets(this, TEX.bullet, viewConfig.gunHeight);
    this.fireballs = new Bullets(this, TEX.fireball, viewConfig.fireballHeight, false);
    this.rockets = new Bullets(this, TEX.rocket, viewConfig.rocketHeight);
    this.grenades = new Grenades(this, (x, y, ex) => this.explode(x, y, ex));
    this.placeables = new Placeables(this, grid, this.arena.walls, {
      onGridChanged: () => {
        this.flowDirty = true;
      },
      onBarrelExplode: (p) => {
        if (p.explosion) this.explode((p.col + 0.5) * grid.tile, (p.row + 0.5) * grid.tile, p.explosion);
      },
      onBarricadeBroken: (p) => this.effects.burst((p.col + 0.5) * grid.tile, (p.row + 1) * grid.tile - 20, 0xa16207, 14),
    });

    this.weapon = new WeaponController({
      fireGun: (def, offset) => this.fireGun(def, offset),
      place: (def) => this.place(def),
      throwGrenade: (def) => this.throwGrenade(def),
      fireRocket: (def) => this.fireRocket(def),
      onFired: (def) => sfx.play(def.id),
      onChanged: () => this.events.emit(GameEvents.weapons),
      onUnlocked: (def, slot) => {
        sfx.play("unlock");
        this.events.emit(GameEvents.unlock, def.name, slot);
      },
    });

    this.waves = new WaveManager({
      spawn: (id, hpScale, speedScale) => this.spawnMonster(id, hpScale, speedScale),
      aliveCount: () => this.monsters.alive.length,
      onWaveStart: (wave) => {
        sfx.play("waveStart");
        this.events.emit(GameEvents.waveStart, wave);
      },
      onWaveClear: (wave) => {
        sfx.play("waveClear");
        this.events.emit(GameEvents.waveClear, wave);
      },
    });

    const start = grid.tileCenter(arenaConfig.playerStart.col, arenaConfig.playerStart.row);
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
      // 디버그 (Phase 6에서 정리): K 그런트 50마리, N 웨이브 건너뛰기, U 전 무기 해금
      const kb = this.input.keyboard;
      kb?.on("keydown-K", () => {
        for (let i = 0; i < 50; i++) this.spawnMonster("grunt");
      });
      kb?.on("keydown-N", () => this.debugSkipWave());
      kb?.on("keydown-U", () => this.weapon.unlockAll());
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
    this.lastInput = input;

    this.player.update(input, dt);
    if (!this.player.dead) {
      if (input.selectSlot !== null) this.weapon.select(input.selectSlot);
      if (input.cycleWeapon !== 0) this.weapon.cycle(input.cycleWeapon);
      if (input.fire) this.weapon.tryFire(now);
    }

    this.updateFlowField(deltaMs);
    // 몬스터는 플레이어 발밑을 향한다
    this.monsters.update(dt, this.player.x, this.player.y, playerConfig.footprint.w);
    this.bullets.update(dt, (b) => this.bulletStep(b, now));
    this.fireballs.update(dt, (b) => this.fireballStep(b, now));
    this.rockets.update(dt, (b) => this.rocketStep(b));
    this.grenades.update();
    this.damageNumbers.update();
    this.items.update(this.player.x, this.player.y, (type, x, y) => this.pickup(type, x, y));
    this.checkContactDamage();
    if (this.combo.update(now)) this.events.emit(GameEvents.combo, 0, 1);
    this.updateWaves(deltaMs);
  }

  // ───────────────────────── 웨이브, 길찾기 ─────────────────────────

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

  /** 플레이어가 다른 칸으로 옮겼거나, 설치물이 바뀌었거나, 일정 시간이 지났으면 플로우 필드 재계산 */
  private updateFlowField(deltaMs: number) {
    const grid = this.arena.grid;
    const { col, row } = grid.worldToTile(this.player.x, this.player.y - playerConfig.footprint.d / 2);
    this.flowTimer -= deltaMs;
    if (this.flowDirty || col !== this.flowCol || row !== this.flowRow || this.flowTimer <= 0) {
      this.flow.compute(col, row);
      this.flowCol = col;
      this.flowRow = row;
      this.flowTimer = aiConfig.flowFieldRefreshMs;
      this.flowDirty = false;
    }
  }

  /** 스폰 지점에 몬스터 하나. 자리가 없으면 false */
  spawnMonster(id: MonsterId, hpScale = 1, speedScale = 1): boolean {
    const view = this.cameras.main.worldView;
    const point = pickSpawnPoint(this.arena.grid, view, waveConfig.spawnOffscreenMargin, this.player.x, this.player.y);
    if (!point) return false;
    this.monsters.spawn(monsterDefs[id], point.x, point.y, hpScale, speedScale);
    return true;
  }

  // ───────────────────────── 무기 ─────────────────────────

  /** 플레이어 발자국 가운데 (지면 좌표) */
  private playerCenter() {
    return { x: this.player.x, y: this.player.y - playerConfig.footprint.d / 2 };
  }

  private fireGun(def: GunWeapon, angleOffset: number) {
    const m = this.player.muzzle();
    this.bullets.fire({
      x: m.x,
      y: m.y,
      angle: this.player.aimAngle + angleOffset,
      speed: def.bulletSpeed,
      range: def.range,
      damage: def.damage,
      knockback: def.knockback,
    });
  }

  private fireRocket(def: RocketWeapon) {
    const m = this.player.muzzle();
    this.rockets.fire({
      x: m.x,
      y: m.y,
      angle: this.player.aimAngle,
      speed: def.speed,
      range: 1200,
      damage: 0,
      explosion: def.explosion,
    });
  }

  /** 바라보는 방향 앞 칸에 바리케이드/드럼통 설치. 자리가 없으면 false */
  private place(def: PlaceableWeapon): boolean {
    const grid = this.arena.grid;
    const t = grid.tile;
    const c = this.playerCenter();
    const ang = this.player.aimAngle;
    const { w: pw, d: pd } = playerConfig.footprint;

    // 앞쪽으로 조금씩 더 멀리 시도해서 처음 비어 있는 칸에 설치
    for (const dist of [def.placeDistance, def.placeDistance + t * 0.5]) {
      const { col, row } = grid.worldToTile(c.x + Math.cos(ang) * dist, c.y + Math.sin(ang) * dist);
      if (grid.isBlocked(col, row)) continue;
      const left = col * t;
      const top = row * t;
      // 플레이어 몸과 겹치면 안 됨
      const px0 = this.player.x - pw / 2;
      const py0 = this.player.y - pd;
      if (px0 < left + t && px0 + pw > left && py0 < top + t && this.player.y > top) continue;
      // 몬스터와 겹치면 안 됨
      const blocked = this.monsters.alive.some((m) => {
        const mw = m.def.footprint.w;
        const md = m.def.footprint.d;
        return m.x - mw / 2 < left + t && m.x + mw / 2 > left && m.y - md < top + t && m.y > top;
      });
      if (blocked) continue;

      const pl = def.placeable;
      if (pl.type === "barricade") this.placeables.place("barricade", col, row, pl.maxHp);
      else this.placeables.place("barrel", col, row, pl.maxHp, pl.explosion);
      return true;
    }

    const now = this.time.now;
    if (now > this.placeFailNoticeAt) {
      this.placeFailNoticeAt = now + 700;
      this.effects.floatText(c.x + Math.cos(ang) * 40, c.y + Math.sin(ang) * 40 - 20, "설치할 수 없음", "#fca5a5");
    }
    return false;
  }

  /** 조준 지점으로 수류탄 투척 (최대 거리 제한, 벽 속에 떨어지지 않게) */
  private throwGrenade(def: ThrownWeapon): boolean {
    const grid = this.arena.grid;
    const c = this.playerCenter();
    let dx = this.lastInput.aimX - c.x;
    let dy = this.lastInput.aimY + viewConfig.gunHeight - c.y; // 커서는 지면보다 총 높이만큼 위를 가리킨다
    const dist = Math.hypot(dx, dy);
    if (dist > def.maxThrowDistance) {
      dx *= def.maxThrowDistance / dist;
      dy *= def.maxThrowDistance / dist;
    }
    // 착지점이 벽이면 플레이어 쪽으로 당겨온다
    let tx = c.x + dx;
    let ty = c.y + dy;
    const len = Math.hypot(dx, dy) || 1;
    for (let back = 0; back < len; back += 8) {
      tx = c.x + dx * (1 - back / len);
      ty = c.y + dy * (1 - back / len);
      const { col, row } = grid.worldToTile(tx, ty);
      if (!grid.isWall(col, row)) break;
    }
    this.grenades.throw(c.x, c.y, tx, ty, def.fuseMs, def.explosion);
    return true;
  }

  // ───────────────────────── 투사체 ─────────────────────────

  /** 플레이어 총알. 벽에 막히고, 바리케이드는 넘어가고, 드럼통은 터뜨린다 */
  private bulletStep(b: Bullet, now: number): boolean {
    const grid = this.arena.grid;
    const { col, row } = grid.worldToTile(b.x, b.y);
    if (grid.isWall(col, row)) return false;
    if (grid.isObstacle(col, row)) {
      const p = this.placeables.at(col, row);
      if (p?.type === "barrel") {
        this.placeables.damage(p, b.damage);
        return false;
      }
    }

    const target = this.monsters.hitTest(b.x, b.y);
    if (!target) return true;
    const speed = Math.hypot(b.vx, b.vy) || 1;
    target.knockback(b.vx / speed, b.vy / speed, b.knockback);
    this.damageMonster(target, b.damage, now);
    return false;
  }

  /** 로켓: 벽, 설치물, 몬스터 중 먼저 닿는 곳에서 폭발 */
  private rocketStep(b: Bullet): boolean {
    const grid = this.arena.grid;
    const { col, row } = grid.worldToTile(b.x, b.y);
    const hitWall = grid.isWall(col, row);
    if (hitWall || grid.isObstacle(col, row) || this.monsters.hitTest(b.x, b.y)) {
      // 벽 속에서 터지지 않게 진행 방향 반대로 조금 물러난 곳에서 폭발
      const speed = Math.hypot(b.vx, b.vy) || 1;
      const back = hitWall ? 12 : 0;
      if (b.explosion) this.explode(b.x - (b.vx / speed) * back, b.y - (b.vy / speed) * back, b.explosion);
      return false;
    }
    return true;
  }

  /** 임프 화염구: 플레이어 쪽으로 발사 */
  private fireFireball(m: Monster) {
    const ranged = m.def.ranged;
    if (!ranged) return;
    const sx = m.x;
    const sy = m.y - m.def.footprint.d / 2;
    const c = this.playerCenter();
    sfx.play("fireball");
    this.fireballs.fire({
      x: sx,
      y: sy,
      angle: Math.atan2(c.y - sy, c.x - sx),
      speed: ranged.projectileSpeed,
      range: ranged.preferredDistance * 2.5,
      damage: ranged.damage,
      owner: m,
    });
  }

  /** 화염구: 벽에 막히고, 설치물에 피해(드럼통은 폭발), 플레이어와 (friendlyFire면) 다른 몬스터에게 피해 */
  private fireballStep(b: Bullet, now: number): boolean {
    const grid = this.arena.grid;
    const { col, row } = grid.worldToTile(b.x, b.y);
    if (grid.isWall(col, row)) return false;
    if (grid.isObstacle(col, row)) {
      const p = this.placeables.at(col, row);
      if (p) this.placeables.damage(p, b.damage);
      return false;
    }

    const p = this.player;
    if (!p.dead) {
      const c = this.playerCenter();
      if (Math.hypot(b.x - c.x, b.y - c.y) < playerConfig.footprint.w / 2 + 6) {
        const speed = Math.hypot(b.vx, b.vy) || 1;
        this.hurtPlayer(b.damage, b.vx / speed, b.vy / speed, playerConfig.contactKnockback * 0.6);
        return false;
      }
    }

    const friendlyFire = b.owner?.def.ranged?.friendlyFire ?? monsterDefs.imp.ranged?.friendlyFire ?? true;
    if (friendlyFire) {
      const target = this.monsters.hitTest(b.x, b.y, b.owner);
      if (target) {
        this.damageMonster(target, b.damage, now, "#fdba74");
        return false;
      }
    }
    return true;
  }

  // ───────────────────────── 폭발 ─────────────────────────

  /**
   * 범위 폭발: 몬스터(가운데 100% → 가장자리 explosionEdgeDamage), 플레이어(selfDamageRatio),
   * 바리케이드에 피해, 범위 안 드럼통은 연쇄 폭발.
   */
  explode(x: number, y: number, ex: Explosion) {
    const now = this.time.now;
    const r = ex.radius;
    const falloff = (dist: number) => 1 - (1 - combatConfig.explosionEdgeDamage) * Phaser.Math.Clamp(dist / r, 0, 1);

    this.effects.explosion(x, y, r);
    this.cameras.main.shake(200, 0.014);
    sfx.play("explosion");

    // 몬스터: 대상 목록을 먼저 모은 뒤 처리 (처리 중 처치로 목록이 바뀌므로)
    this.blastTargets.length = 0;
    for (const m of this.monsters.alive) {
      const dist = Math.hypot(m.x - x, m.y - m.def.footprint.d / 2 - y) - m.def.footprint.w / 2;
      if (dist <= r) this.blastTargets.push(m);
    }
    for (const m of this.blastTargets) {
      if (!m.active) continue;
      const cx = m.x - x;
      const cy = m.y - m.def.footprint.d / 2 - y;
      const dist = Math.hypot(cx, cy);
      m.knockback(cx / (dist || 1), cy / (dist || 1), combatConfig.explosionKnockback);
      this.damageMonster(m, ex.damage * falloff(dist), now, "#fde047");
    }

    // 플레이어 자기 피해
    if (combatConfig.selfExplosionDamage && ex.selfDamageRatio > 0 && !this.player.dead) {
      const c = this.playerCenter();
      const dist = Math.hypot(c.x - x, c.y - y);
      if (dist <= r + playerConfig.footprint.w / 2) {
        this.hurtPlayer(ex.damage * ex.selfDamageRatio * falloff(dist), (c.x - x) / (dist || 1), (c.y - y) / (dist || 1), playerConfig.contactKnockback);
      }
    }

    // 설치물
    for (const p of this.placeables.inRadius(x, y, r)) {
      if (p.type === "barrel") this.placeables.explode(p, combatConfig.barrelChainDelayMs);
      else this.placeables.damage(p, ex.damage * falloff(this.distToPlaceable(p, x, y)));
    }
  }

  private distToPlaceable(p: Placeable, x: number, y: number) {
    const t = this.arena.grid.tile;
    return Math.hypot((p.col + 0.5) * t - x, (p.row + 0.5) * t - y);
  }

  // ───────────────────────── 피해, 처치, 아이템 ─────────────────────────

  /** 몬스터 피해 공통 처리: 피해 숫자, 효과음, 처치 */
  private damageMonster(m: Monster, amount: number, now: number, color = "#ffffff") {
    this.damageNumbers.show(m, m.x, m.y - m.def.height - m.def.footprint.d, amount, color);
    if (m.damage(amount, now)) this.killMonster(m);
    else sfx.play("hit");
  }

  /** 플레이어 피해 공통 처리 (무적이면 무시). 넉백 방향 (dirX, dirY) */
  private hurtPlayer(amount: number, dirX: number, dirY: number, knockback: number) {
    const p = this.player;
    if (!p.takeDamage(Math.round(amount))) return;
    if (!p.dead && knockback > 0) p.knockback(dirX, dirY, knockback);
    this.cameras.main.shake(140, 0.008);
    sfx.play("hurt");
    this.events.emit(GameEvents.hp, p.hp, playerConfig.maxHp);
    if (p.dead) this.onPlayerDead();
  }

  private checkContactDamage() {
    const p = this.player;
    if (p.dead || p.isInvincible) return;
    // 몸이 닿는 거리 + 3px 여유 안에 있으면 접촉
    this.monsters.touching(p.x, p.y, playerConfig.footprint.w, 3, this.touching);
    if (this.touching.length === 0) return;
    const damage = Math.max(...this.touching.map((m) => m.def.contactDamage));
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
    const awayLen = Math.hypot(awayX, awayY) || 1;
    this.hurtPlayer(damage, awayX / awayLen, awayY / awayLen, playerConfig.contactKnockback);
  }

  /** 몬스터 처치: 콤보 +1, 점수(배율 적용), 무기 해금 확인, 아이템 드랍 */
  private killMonster(m: Monster) {
    const { def } = m;
    // 이 몬스터가 쏜 화염구가 날아가는 중이면 owner 연결을 끊는다.
    // (풀로 돌아간 몬스터 객체가 다른 몬스터로 재사용되면 그 몬스터가 화염구에 안 맞게 되므로)
    for (const b of this.fireballs.items) if (b.owner === m) b.owner = null;
    const x = m.x;
    const y = m.y;
    this.effects.burst(x, y - def.height / 2, def.color);
    this.monsters.kill(m);

    this.kills += 1;
    sfx.play("kill");
    const combo = this.combo.registerKill(this.time.now);
    this.score += Math.round(def.score * this.combo.multiplier);
    this.events.emit(GameEvents.score, this.score);
    this.events.emit(GameEvents.combo, combo, this.combo.multiplier);
    this.weapon.checkUnlocks(combo);

    const drops = combatConfig.drops;
    const roll = Math.random();
    if (roll < drops.healthChance) this.items.drop("health", x, y);
    else if (roll < drops.healthChance + drops.ammoChance && this.weapon.hasLimitedUnlocked()) this.items.drop("ammo", x, y);
  }

  /** 아이템 줍기. 체력이 가득이면 회복 아이템은 그대로 둔다 */
  private pickup(type: ItemType, x: number, y: number): boolean {
    if (type === "health") {
      const p = this.player;
      if (p.hp >= playerConfig.maxHp) return false;
      p.hp = Math.min(playerConfig.maxHp, p.hp + combatConfig.drops.healAmount);
      this.events.emit(GameEvents.hp, p.hp, playerConfig.maxHp);
      this.effects.floatText(x, y - 20, `+${combatConfig.drops.healAmount} HP`, "#86efac");
      sfx.play("pickup");
    } else {
      this.weapon.addAmmoAll();
      this.effects.floatText(x, y - 20, "탄약 +", "#fde047");
      sfx.play("pickup");
    }
    return true;
  }

  private onPlayerDead() {
    this.ending = true;
    this.player.syncView();
    this.effects.burst(this.player.x, this.player.y - 20, playerConfig.color, 16);
    this.player.hide();
    this.time.delayedCall(900, () => this.endGame());
  }

  /** 디버그: 살아 있는 몬스터와 대기열을 모두 없애 웨이브를 바로 끝낸다 (점수 없음) */
  private debugSkipWave() {
    this.waves.skipWave();
    this.monsters.clear();
    this.fireballs.releaseAll();
  }

  private emitHud() {
    this.events.emit(GameEvents.hp, this.player.hp, playerConfig.maxHp);
    this.events.emit(GameEvents.score, this.score);
    this.events.emit(GameEvents.weapons);
  }

  /** 물리 계산이 끝난 뒤 그림 위치/depth를 맞춘다 */
  private syncView() {
    if (!this.player.dead) this.player.syncView();
    const p = this.player.sprite;
    this.arena.updateOcclusion(p.x, p.y, p.width);
    this.placeables.updateOcclusion(p.x, p.y, p.width, viewConfig.occludingWallAlpha);
  }

  endGame() {
    this.scene.stop(SCENES.ui);
    this.scene.start(SCENES.gameOver, {
      score: this.score,
      wave: Math.max(1, this.waves.wave),
      bestCombo: this.combo.best,
      kills: this.kills,
    });
  }

  toTitle() {
    this.scene.stop(SCENES.ui);
    this.scene.start(SCENES.title);
  }
}
