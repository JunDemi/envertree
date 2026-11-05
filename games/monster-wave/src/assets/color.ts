/** 0xRRGGBB 색을 target 쪽으로 t(0~1)만큼 섞는다 */
export function mix(color: number, target: number, t: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const tr = (target >> 16) & 0xff;
  const tg = (target >> 8) & 0xff;
  const tb = target & 0xff;
  return (
    (Math.round(r + (tr - r) * t) << 16) |
    (Math.round(g + (tg - g) * t) << 8) |
    Math.round(b + (tb - b) * t)
  );
}

export const lighten = (color: number, t: number) => mix(color, 0xffffff, t);
export const darken = (color: number, t: number) => mix(color, 0x000000, t);
