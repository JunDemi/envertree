import type Phaser from "phaser";

/** 공통 글꼴 (한글은 시스템 폰트) */
export const FONT = 'system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

export function textStyle(size: number, color: string, bold = false): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? "bold" : "normal",
    stroke: "#0b0d12",
    strokeThickness: Math.max(2, Math.round(size / 8)),
  };
}
