import type Phaser from "phaser";
import { aiConfig, combatConfig, type MonsterDef } from "../config";
import { moveWithWalls } from "../world/collide";
import { hasLineOfSight } from "../world/los";
import type { FlowField } from "../world/FlowField";
import type { Grid } from "../world/Grid";
import { SpatialHash } from "../world/SpatialHash";
import { Monster } from "./Monster";

/**
 * 몬스터 풀 + 이동(플로우 필드 추적, 벽 충돌, 서로 밀어내기).
 * 죽은 몬스터는 숨겨서 풀에 돌려놓고 다음 스폰 때 재사용한다.
 */
export class MonsterManager {
  private readonly scene: Phaser.Scene;
  private readonly grid: Grid;
  private readonly flow: FlowField;
  private readonly pool: Monster[] = [];
  readonly alive: Monster[] = [];
  readonly hash = new SpatialHash<Monster>(aiConfig.spatialCellSize);
  private readonly nearby: Monster[] = [];
  private readonly moved = { x: 0, y: 0 };
  /** 원거리 몬스터가 발사할 때 호출 (GameScene이 투사체를 만든다) */
  onRangedAttack: ((m: Monster) => void) | null = null;

  constructor(scene: Phaser.Scene, grid: Grid, flow: FlowField) {
    this.scene = scene;
    this.grid = grid;
    this.flow = flow;
  }

  spawn(def: MonsterDef, x: number, y: number, hpScale = 1, speedScale = 1): Monster {
    const m = this.pool.pop() ?? new Monster(this.scene);
    m.spawn(def, x, y, hpScale, speedScale);
    this.alive.push(m);
    return m;
  }

  kill(m: Monster) {
    const i = this.alive.indexOf(m);
    if (i >= 0) {
      // 순서는 중요하지 않으므로 마지막 원소와 바꿔서 제거 (O(1))
      this.alive[i] = this.alive[this.alive.length - 1];
      this.alive.pop();
    }
    m.despawn();
    this.pool.push(m);
  }

  clear() {
    while (this.alive.length > 0) this.kill(this.alive[this.alive.length - 1]);
  }

  /**
   * 이동. dt는 초. (targetX, targetY)는 쫓아갈 대상(플레이어)의 발밑,
   * targetW는 대상 발자국 너비 (몬스터가 대상 몸을 파고들지 않게 밀어내는 데 사용)
   */
  update(dt: number, targetX: number, targetY: number, targetW = 0) {
    const { grid, flow } = this;
    const t = grid.tile;

    // 공간 해시 다시 채우기 (밀어내기, 총알 충돌, 접촉 피해에 사용)
    this.hash.clear();
    for (const m of this.alive) this.hash.insert(m);

    const directDist = aiConfig.directChaseTiles * t;
    const now = this.scene.time.now;
    for (const m of this.alive) {
      const { w, d } = m.def.footprint;
      // 발자국 가운데 기준으로 방향 계산
      const cy = m.y - d / 2;
      let dirX = 0;
      let dirY = 0;
      const toX = targetX - m.x;
      const toY = targetY - m.y;
      const distToTarget = Math.hypot(toX, toY);
      const col = Math.floor(m.x / t);
      const row = Math.floor(cy / t);

      // 원거리 몬스터: 사거리 안이고 시야가 트였으면 멈춰서 쏜다
      let holding = false;
      const ranged = m.def.ranged;
      if (ranged && distToTarget <= ranged.preferredDistance) {
        if (now >= m.losCheckAt) {
          m.hasLos = hasLineOfSight(grid, m.x, cy, targetX, targetY - 7);
          m.losCheckAt = now + 200;
        }
        if (m.hasLos) {
          holding = true;
          // 사거리에 처음 들어오면 약간의 무작위 지연 후 첫 발 (여러 마리가 동시에 쏘지 않게)
          if (m.nextAttackAt === 0) m.nextAttackAt = now + 300 + Math.random() * 600;
          if (now >= m.nextAttackAt) {
            m.nextAttackAt = now + ranged.fireIntervalMs;
            this.onRangedAttack?.(m);
          }
        }
      }

      if (holding) {
        // 제자리 (밀어내기만 적용)
      } else if (distToTarget < directDist || flow.distanceAt(col, row) === Infinity) {
        // 가까우면(또는 길이 없으면) 직진
        if (distToTarget > 0.001) {
          dirX = toX / distToTarget;
          dirY = toY / distToTarget;
        }
      } else {
        // 플로우 필드가 가리키는 "다음 칸의 가운데"를 향한다.
        // 방향만 그대로 따르면 몸 폭 때문에 벽 모서리에 걸리므로, 칸 가운데로 끌어당겨 비켜 돌게 한다.
        const idx = row * grid.cols + col;
        const nextCol = col + Math.round(flow.dirX[idx] * 1.42);
        const nextRow = row + Math.round(flow.dirY[idx] * 1.42);
        const tx = (nextCol + 0.5) * t - m.x;
        const ty = (nextRow + 0.5) * t - cy;
        const len = Math.hypot(tx, ty);
        if (len > 0.001) {
          dirX = tx / len;
          dirY = ty / len;
        }
      }

      let vx = dirX * m.speed + m.pushX;
      let vy = dirY * m.speed + m.pushY;

      // 서로 밀어내기: 발자국이 겹치는 이웃에게서 멀어진다
      const radius = w;
      this.hash.query(m.x, m.y, radius + 40, this.nearby);
      for (const o of this.nearby) {
        if (o === m) continue;
        const dx = m.x - o.x;
        const dy = m.y - o.y;
        const minDist = (w + o.def.footprint.w) * 0.5;
        const distSq = dx * dx + dy * dy;
        if (distSq >= minDist * minDist || distSq < 0.0001) continue;
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        const push = (overlap / dt) * aiConfig.separationStrength;
        vx += (dx / dist) * push;
        vy += (dy / dist) * push;
      }

      // 대상(플레이어) 몸을 파고들지 않게: 겹치면 대상 쪽으로 가는 성분을 없애고 바깥으로 민다
      if (targetW > 0) {
        const minDist = (w + targetW) * 0.5;
        if (distToTarget < minDist && distToTarget > 0.001) {
          const nx = -toX / distToTarget;
          const ny = -toY / distToTarget;
          const inward = vx * -nx + vy * -ny;
          if (inward > 0) {
            vx += nx * inward;
            vy += ny * inward;
          }
          // 겹친 만큼을 이번 프레임에 모두 밀어낸다 (플레이어가 걸어 들어오면 몬스터가 바로 밀려남)
          const push = (minDist - distToTarget) / dt;
          vx += nx * push;
          vy += ny * push;
        }
      }

      // 한 프레임 이동량이 너무 크면(겹침이 심할 때) 타일 크기의 절반 이하로 제한
      let stepX = vx * dt;
      let stepY = vy * dt;
      const stepLen = Math.hypot(stepX, stepY);
      const maxStep = t * 0.45;
      if (stepLen > maxStep) {
        stepX *= maxStep / stepLen;
        stepY *= maxStep / stepLen;
      }

      moveWithWalls(grid, m.x, m.y, w, d, stepX, stepY, this.moved);
      m.x = this.moved.x;
      m.y = this.moved.y;

      // 넉백 감쇠
      const decay = Math.exp(-10 * dt);
      m.pushX *= decay;
      m.pushY *= decay;
    }

    for (const m of this.alive) m.syncView(now);
  }

  /** (x, y) 지점(지면)에 닿은 몬스터. ignore는 제외 (투사체를 쏜 몬스터). 없으면 null */
  hitTest(x: number, y: number, ignore: Monster | null = null): Monster | null {
    const pad = combatConfig.bulletHitPadding;
    this.hash.query(x, y, 48, this.nearby);
    for (const m of this.nearby) {
      if (!m.active || m === ignore) continue;
      const { w, d } = m.def.footprint;
      if (x >= m.x - w / 2 - pad && x <= m.x + w / 2 + pad && y >= m.y - d - pad && y <= m.y + pad) return m;
    }
    return null;
  }

  /**
   * 대상(플레이어)에 닿아 있는 몬스터들.
   * 몬스터는 대상과 (몬스터 폭 + 대상 폭)/2 거리에서 멈추므로(update 참고) 같은 기준에 여유를 더해 판정한다.
   * (발자국 사각형 겹침으로 판정하면 세로가 짧아서 위아래에서 붙은 몬스터를 놓친다)
   */
  touching(x: number, y: number, targetW: number, margin: number, out: Monster[]): Monster[] {
    out.length = 0;
    this.hash.query(x, y, targetW + 64, this.nearby);
    for (const m of this.nearby) {
      if (!m.active) continue;
      const reach = (m.def.footprint.w + targetW) * 0.5 + margin;
      const dx = m.x - x;
      const dy = m.y - y;
      if (dx * dx + dy * dy <= reach * reach) out.push(m);
    }
    return out;
  }

}
