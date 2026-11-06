import Phaser from "phaser";
import { gameConfig, monsters, viewConfig, type MonsterDef } from "../config";
import { darken, lighten } from "./color";
import { FACINGS, TEX, monsterTexture, type Facing } from "./keys";

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

  // ── 총: 짧은 막대 (오른쪽을 향함, 회전해서 사용) ──
  bake(TEX.gun, 18, 6, () => {
    g.fillStyle(0x1f2937).fillRect(0, 1, 18, 4);
    g.fillStyle(0x4b5563).fillRect(0, 1, 18, 1.5);
    g.fillStyle(0x111827).fillRect(14, 0, 4, 6);
  });

  // ── 몬스터 ──
  for (const def of Object.values(monsters)) {
    for (const facing of FACINGS) bakeMonster(g, def, facing);
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

  // ── 바리케이드: 나무 상자 (발자국 = 타일 1칸) ──
  const bh = viewConfig.barricadeHeight;
  bake(TEX.barricade, t, t + bh, () => {
    drawBox(g, 0, 0, t, t, bh, 0xa16207);
    // 판자 무늬
    g.lineStyle(2, 0x713f12, 0.8);
    g.lineBetween(4, t + bh * 0.35, t - 4, t + bh * 0.35);
    g.lineBetween(4, t + bh * 0.7, t - 4, t + bh * 0.7);
    g.lineStyle(2, 0x713f12, 0.5).strokeRect(5, 5, t - 10, t - 10);
    g.lineBetween(5, 5, t - 5, t - 5);
  });

  // ── 드럼통: 빨간 통 (발자국보다 작게, 위에서 보면 원) ──
  const rh = viewConfig.barrelHeight;
  const rw = 28;
  bake(TEX.barrel, rw + 2, rw * 0.6 + rh + 2, () => {
    const top = rw * 0.3;
    g.fillStyle(0x991b1b).fillRect(1, top, rw, rh);
    g.fillStyle(0x7f1d1d).fillEllipse(1 + rw / 2, top + rh, rw, rw * 0.6);
    g.fillStyle(0xdc2626).fillEllipse(1 + rw / 2, top, rw, rw * 0.6);
    g.fillStyle(0xfacc15).fillRect(1, top + rh * 0.4, rw, 4);
    g.fillStyle(0x111111).fillCircle(1 + rw / 2, top + rh * 0.4 + 2, 3);
  });

  // ── 수류탄, 로켓 ──
  bake(TEX.grenade, 12, 12, () => {
    g.fillStyle(0x3f6212).fillCircle(6, 7, 5);
    g.fillStyle(0x84cc16).fillCircle(5, 6, 2);
    g.fillStyle(0x9ca3af).fillRect(4, 0, 4, 3);
  });
  bake(TEX.rocket, 18, 8, () => {
    g.fillStyle(0x6b7280).fillRect(2, 2, 12, 4);
    g.fillStyle(0xef4444).fillTriangle(14, 1, 18, 4, 14, 7);
    g.fillStyle(0x374151).fillTriangle(0, 0, 4, 2, 0, 2).fillTriangle(0, 8, 4, 6, 0, 6);
    g.fillStyle(0xfbbf24).fillRect(0, 3, 2, 2);
  });

  // ── 드랍 아이템: 탄약 상자(초록), 회복(흰 상자에 빨간 십자) ──
  bake(TEX.ammoCrate, 22, 22, () => {
    drawBox(g, 1, 1, 20, 8, 12, 0x65a30d);
    g.fillStyle(0xfef08a).fillRect(6, 12, 3, 6).fillRect(10, 12, 3, 6).fillRect(14, 12, 3, 6);
  });
  bake(TEX.healthPack, 22, 22, () => {
    drawBox(g, 1, 1, 20, 8, 12, 0xf1f5f9);
    g.fillStyle(0xdc2626).fillRect(9, 10, 4, 10).fillRect(6, 13, 10, 4);
  });

  // ── 폭발 원 ──
  bake(TEX.blast, 64, 64, () => {
    g.fillStyle(0xffffff, 0.35).fillCircle(32, 32, 32);
    g.fillStyle(0xffffff, 0.8).fillCircle(32, 32, 22);
    g.fillStyle(0xffffff, 1).fillCircle(32, 32, 12);
  });

  g.destroy();
}

/**
 * 몬스터 방향별 얼굴. 위치는 몸 너비 기준 0~1.
 * - eyes: 눈 가운데 위치. 눈동자(pupil)는 -1(왼쪽)~1(오른쪽)만큼 보는 쪽으로 쏠린다
 * - mouth: 입 가운데 위치 (없으면 null)
 * - back: 위쪽을 볼 때 보이는 등 무늬 가운데 위치 (없으면 null)
 */
const FACES: Record<Facing, { eyes: number[]; pupil: number; mouth: number | null; back: number | null }> = {
  down: { eyes: [0.3, 0.7], pupil: 0, mouth: 0.5, back: null },
  downRight: { eyes: [0.48, 0.8], pupil: 1, mouth: 0.66, back: null },
  right: { eyes: [0.78], pupil: 1, mouth: 0.86, back: null },
  upRight: { eyes: [], pupil: 0, mouth: null, back: 0.36 },
  up: { eyes: [], pupil: 0, mouth: null, back: 0.5 },
};

/** 몬스터: 상자 + 앞면 얼굴(또는 등 무늬) (+ 임프는 뿔). 방향마다 얼굴이 다르다 */
function bakeMonster(g: Phaser.GameObjects.Graphics, def: MonsterDef, facing: Facing) {
  const { w, d } = def.footprint;
  const hornSpace = def.horns ? 7 : 0;
  const width = w + 2;
  const height = hornSpace + d + def.height + 1;
  const face = FACES[facing];

  g.clear();
  const top = hornSpace;
  drawBox(g, 1, top, w, d, def.height, def.color);

  const frontY = top + d; // 앞면 위쪽
  const h = def.height;
  // 몸 안쪽으로 자른 사각형 (테두리 1px 안쪽)
  const fill = (x: number, y: number, rw: number, rh: number) => {
    const l = Math.max(2, Math.round(x));
    const r = Math.min(w, Math.round(x + rw));
    if (r > l) g.fillRect(l, Math.round(y), r - l, Math.round(rh));
  };

  // 눈: 흰자 + 눈동자. 크기는 몸집에 비례
  const eye = Math.max(3, Math.round(w / 5));
  const pupil = Math.max(1, Math.ceil(eye / 2));
  const eyeY = frontY + Math.max(2, Math.round(h * 0.18));
  for (const ex of face.eyes) {
    const left = 1 + w * ex - eye / 2;
    g.fillStyle(0xf8fafc);
    fill(left, eyeY, eye, eye + 1);
    g.fillStyle(0x111111);
    const px = left + ((eye - pupil) / 2) * (1 + face.pupil);
    fill(px, eyeY + eye + 1 - pupil - 1, pupil, pupil + 1);
  }

  // 입
  if (face.mouth !== null) {
    const mw = Math.max(3, Math.round(w * (facing === "right" ? 0.18 : 0.32)));
    const mh = Math.max(1, Math.round(h / 20));
    g.fillStyle(0x111111, 0.85);
    fill(1 + w * face.mouth - mw / 2, eyeY + eye + 1 + Math.max(2, Math.round(h * 0.14)), mw, mh);
  }

  // 등 무늬: 얼굴 대신 어두운 세로 줄 (뒷모습이라는 표시)
  if (face.back !== null) {
    const bw = Math.max(3, Math.round(w * 0.26));
    g.fillStyle(darken(def.color, 0.55));
    fill(1 + w * face.back - bw / 2, frontY + h * 0.12, bw, h * 0.62);
  }

  if (def.horns) {
    // 윗면 양쪽 끝에서 솟은 뿔
    g.fillStyle(0xfef3c7);
    g.fillTriangle(3, top + d / 2, 7, top + d / 2, 4, 0);
    g.fillTriangle(w - 5, top + d / 2, w - 1, top + d / 2, w - 2, 0);
  }

  g.generateTexture(monsterTexture(def.id, facing), width, height);
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
