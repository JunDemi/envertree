import Phaser from "phaser";
import { gameConfig, monsters, playerConfig, viewConfig, type MonsterDef } from "../config";
import { darken, lighten } from "./color";
import { TEX, monsterTexture } from "./keys";

/**
 * 프로토타입 텍스처를 코드로 그려서 만든다. 이미지 파일을 쓰지 않는다.
 *
 * 모든 캐릭터와 블록은 "상자"다 (view.ts 참고):
 *   ┌──────┐  ← 윗면 (밝게): 발자국(w × d)을 height만큼 위로 올린 것
 *   ├──────┤
 *   │      │  ← 앞면 (어둡게): 높이 height
 *   └──────┘  ← 이 아래쪽 가운데가 발밑(origin)
 */
export function generateTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const bake = (key: string, w: number, h: number, draw: () => void) => {
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };

  // ── 플레이어: 몸통 상자 + 머리 상자 ──
  for (const back of [false, true]) {
    const p = playerConfig;
    const { w, d } = p.footprint;
    const { w: hw, d: hd, height: hh } = p.head;
    // 머리 앞면 아래쪽이 몸통 윗면 가운데에 오도록 몸통 윗면 시작 위치(bodyTop)를 계산
    const bodyTop = hh + (hd - d) / 2;
    const width = w + 2;
    const height = Math.ceil(bodyTop + d + p.bodyHeight) + 1;
    bake(back ? TEX.playerBack : TEX.player, width, height, () => {
      drawBox(g, 1, bodyTop, w, d, p.bodyHeight, p.color);
      const headX = 1 + (w - hw) / 2;
      drawBox(g, headX, 0, hw, hd, hh, p.headColor);
      if (!back) {
        // 눈: 머리 앞면에 두 점 → 앞모습
        g.fillStyle(0x0f172a);
        g.fillRect(headX + 4, hd + 4, 3, 4);
        g.fillRect(headX + hw - 7, hd + 4, 3, 4);
      }
    });
  }

  // ── 총: 짧은 막대 (오른쪽을 향함, 회전해서 사용) ──
  bake(TEX.gun, 18, 6, () => {
    g.fillStyle(0x1f2937).fillRect(0, 1, 18, 4);
    g.fillStyle(0x4b5563).fillRect(0, 1, 18, 1.5);
    g.fillStyle(0x111827).fillRect(14, 0, 4, 6);
  });

  // ── 몬스터 ──
  for (const def of Object.values(monsters)) {
    bakeMonster(g, def);
  }

  // ── 그림자: 검은 타원 (알파는 스프라이트에서 조절) ──
  bake(TEX.shadow, 64, 32, () => {
    g.fillStyle(0x000000).fillEllipse(32, 16, 64, 32);
  });

  // ── 바닥: 2×2 체크무늬 ──
  const t = gameConfig.tileSize;
  bake(TEX.floor, t * 2, t * 2, () => {
    g.fillStyle(viewConfig.floorColorA).fillRect(0, 0, t * 2, t * 2);
    g.fillStyle(viewConfig.floorColorB).fillRect(t, 0, t, t).fillRect(0, t, t, t);
    // 아주 옅은 줄눈
    g.lineStyle(1, 0x000000, 0.12).strokeRect(0.5, 0.5, t * 2 - 1, t * 2 - 1);
    g.lineBetween(t, 0, t, t * 2).lineBetween(0, t, t * 2, t);
  });

  // ── 벽 블록 1칸: 발자국 = 타일 1칸 ──
  const wh = viewConfig.wallHeight;
  bake(TEX.wall, t, t + wh, () => {
    drawBox(g, 0, 0, t, t, wh, 0x64748b);
    // 앞면 벽돌 줄
    g.lineStyle(1, 0x000000, 0.18);
    for (let y = t + wh / 3; y < t + wh - 1; y += wh / 3) g.lineBetween(1, y, t - 1, y);
  });

  // ── 총알, 화염구, 파티클 ──
  bake(TEX.bullet, 10, 4, () => {
    g.fillStyle(0xfde68a).fillRoundedRect(0, 0, 10, 4, 2);
    g.fillStyle(0xffffff).fillRect(6, 1, 3, 2);
  });
  bake(TEX.fireball, 14, 14, () => {
    g.fillStyle(0xea580c).fillCircle(7, 7, 7);
    g.fillStyle(0xfacc15).fillCircle(7, 7, 4);
  });
  bake(TEX.particle, 4, 4, () => {
    g.fillStyle(0xffffff).fillRect(0, 0, 4, 4);
  });

  g.destroy();
}

/** 몬스터: 상자 + 앞면 눈 (+ 임프는 뿔) */
function bakeMonster(g: Phaser.GameObjects.Graphics, def: MonsterDef) {
  const { w, d } = def.footprint;
  const hornSpace = def.horns ? 7 : 0;
  const width = w + 2;
  const height = hornSpace + d + def.height + 1;

  g.clear();
  const top = hornSpace;
  drawBox(g, 1, top, w, d, def.height, def.color);

  // 눈: 앞면 위쪽에 두 점. 크기는 몸집에 비례
  const eye = Math.max(2, Math.round(w / 8));
  const eyeY = top + d + Math.round(def.height * 0.22);
  g.fillStyle(0x111111);
  g.fillRect(1 + w * 0.28 - eye / 2, eyeY, eye, eye + 1);
  g.fillRect(1 + w * 0.72 - eye / 2, eyeY, eye, eye + 1);

  if (def.horns) {
    // 윗면 양쪽 끝에서 솟은 뿔
    g.fillStyle(0xfef3c7);
    g.fillTriangle(3, top + d / 2, 7, top + d / 2, 4, 0);
    g.fillTriangle(w - 5, top + d / 2, w - 1, top + d / 2, w - 2, 0);
  }

  g.generateTexture(monsterTexture(def.id), width, height);
}

/**
 * 상자 하나를 그린다. (x, y)는 윗면의 왼쪽 위.
 * 윗면: w × d (밝게), 앞면: w × h (어둡게), 바깥 테두리.
 */
export function drawBox(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  color: number,
) {
  g.fillStyle(lighten(color, viewConfig.topLighten)).fillRect(x, y, w, d);
  g.fillStyle(darken(color, viewConfig.frontDarken)).fillRect(x, y + d, w, h);
  // 윗면과 앞면 사이 모서리 하이라이트
  g.fillStyle(lighten(color, viewConfig.topLighten + 0.2)).fillRect(x, y + d - 1, w, 1);
  g.lineStyle(1, viewConfig.outlineColor, viewConfig.outlineAlpha).strokeRect(x + 0.5, y + 0.5, w - 1, d + h - 1);
}
