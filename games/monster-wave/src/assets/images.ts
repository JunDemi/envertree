import Phaser from "phaser";
import { monsters, type MonsterId } from "../config";
import { FACINGS, TEX, heldWeaponTexture, monsterTexture, playerTexture, type Facing, type PlayerPose } from "./keys";

/**
 * 실제 그림 파일. 코드로 만든 프로토타입 텍스처와 같은 키로 불러온다.
 * 그림은 표시 크기의 2배로 제작되므로 화면에서는 viewConfig.artScale을 곱해서 그린다.
 *
 * 플레이어: files/player/player-<동작>-<방향>.png 를 모두 불러온다.
 * - 동작: stand(서 있기), walk(발 뻗기), walk2(반대 발 뻗기, 옆 방향용·선택)
 * - 방향: down, rightdown, right, rightup, up (왼쪽은 좌우 반전)
 * 파일만 추가하면 코드 수정 없이 쓰인다.
 */
const playerFiles = import.meta.glob<string>("./files/player/*.png", { eager: true, import: "default" });

/** 파일 이름의 방향 표기 → 게임 방향 */
const FILE_FACING: Record<string, Facing> = {
  down: "down",
  rightdown: "downRight",
  right: "right",
  rightup: "upRight",
  up: "up",
};
const POSES: readonly PlayerPose[] = ["stand", "walk", "walk2"];

/**
 * 몬스터: files/monsters/<id>/<id>-<동작>-<방향>.png
 * - 지금은 stand(서 있기)만 쓴다. 걷거나 공격할 때도 서 있기 그림을 보여 준다.
 * - 방향 표기는 플레이어와 같다. 그림이 없는 방향은 코드로 그린 임시 그림을 쓴다.
 * - 화면 크기는 config/monsters.ts의 art × artScale에 맞춰진다.
 */
const monsterFiles = import.meta.glob<string>("./files/monsters/*/*.png", { eager: true, import: "default" });

/**
 * 무기: files/weapon/<이름>.png → 텍스처 키.
 * 총 4종은 손에 든 그림, 나머지는 던진 수류탄·설치물 그림 (수류탄은 손에 들 때도 같은 그림)
 */
const weaponFiles = import.meta.glob<string>("./files/weapon/*.png", { eager: true, import: "default" });
const WEAPON_FILE_KEYS: Record<string, string> = {
  pistol: heldWeaponTexture("pistol"),
  rifle: heldWeaponTexture("smg"),
  shotgun: heldWeaponTexture("shotgun"),
  rpg: heldWeaponTexture("rocket"),
  granade: TEX.grenade,
  barrel: TEX.barrel,
  barricade: TEX.barricade,
};

/**
 * 화면에 그릴 너비 (px). 이 너비에 맞춰 비율대로 줄인다.
 * 그림 크기가 제각각이어도 되고, 코드로 만든 대체 그림은 원래 이 너비라 그대로 그려진다.
 */
const DISPLAY_WIDTH: Record<string, number> = {
  [TEX.barricade]: 40,
  [TEX.barrel]: 30,
  [TEX.grenade]: 12,
};

/** key 그림을 화면 너비에 맞추는 배율 */
export function displayScale(scene: Phaser.Scene, key: string, width = DISPLAY_WIDTH[key]): number {
  const frameW = scene.textures.getFrame(key)?.width;
  return width && frameW ? width / frameW : 1;
}

export function loadImages(scene: Phaser.Scene) {
  for (const [path, url] of Object.entries(playerFiles)) {
    const m = /player-([a-z0-9]+)-([a-z]+)\.png$/.exec(path);
    const pose = m?.[1] as PlayerPose | undefined;
    const facing = m ? FILE_FACING[m[2]] : undefined;
    if (!pose || !POSES.includes(pose) || !facing) {
      console.warn(`[images] 이름 규칙에 맞지 않는 파일: ${path}`);
      continue;
    }
    scene.load.image(playerTexture(facing, pose), url);
  }
  for (const [path, url] of Object.entries(monsterFiles)) {
    const m = /([a-z]+)-([a-z0-9]+)-([a-z]+)\.png$/.exec(path);
    const id = m?.[1] as MonsterId | undefined;
    const facing = m ? FILE_FACING[m[3]] : undefined;
    if (!m || !id || !(id in monsters) || !facing) {
      console.warn(`[images] 이름 규칙에 맞지 않는 파일: ${path}`);
      continue;
    }
    if (m[2] !== "stand") continue; // 걷기·공격 그림은 아직 쓰지 않는다
    scene.load.image(monsterTexture(id, facing), url);
  }
  for (const [path, url] of Object.entries(weaponFiles)) {
    const name = /([a-z0-9]+)\.png$/.exec(path)?.[1] ?? "";
    const key = WEAPON_FILE_KEYS[name];
    if (!key) {
      console.warn(`[images] 쓰이지 않는 무기 그림: ${path}`);
      continue;
    }
    scene.load.image(key, url);
  }
}

/** 빠진 서 있기 그림이 있으면 알려 준다 (개발 중 확인용) */
export function checkImages(scene: Phaser.Scene) {
  for (const f of FACINGS) {
    if (!scene.textures.exists(playerTexture(f, "stand"))) console.warn(`[images] 플레이어 서 있기 그림 없음: ${f}`);
  }
}
