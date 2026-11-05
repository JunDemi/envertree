/**
 * 균일 격자 공간 해시. 매 프레임 clear() 후 insert()로 다시 채우고,
 * query()로 어떤 점 근처의 항목만 빠르게 찾는다 (몬스터 수백 마리용).
 */
export class SpatialHash<T extends { x: number; y: number }> {
  private readonly cellSize: number;
  private readonly cells = new Map<number, T[]>();
  private readonly pool: T[][] = [];

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number) {
    // 아레나 좌표는 음수가 아니고 수천 px 이내이므로 단순 결합으로 충분
    return cx * 4096 + cy;
  }

  clear() {
    for (const list of this.cells.values()) {
      list.length = 0;
      this.pool.push(list);
    }
    this.cells.clear();
  }

  insert(item: T) {
    const k = this.key(Math.floor(item.x / this.cellSize), Math.floor(item.y / this.cellSize));
    let list = this.cells.get(k);
    if (!list) {
      list = this.pool.pop() ?? [];
      this.cells.set(k, list);
    }
    list.push(item);
  }

  /** (x, y)에서 radius 안쪽 칸들에 있는 항목을 out에 담는다 (정확한 거리 판정은 호출하는 쪽에서) */
  query(x: number, y: number, radius: number, out: T[]): T[] {
    out.length = 0;
    const cs = this.cellSize;
    const x0 = Math.floor((x - radius) / cs);
    const x1 = Math.floor((x + radius) / cs);
    const y0 = Math.floor((y - radius) / cs);
    const y1 = Math.floor((y + radius) / cs);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const list = this.cells.get(this.key(cx, cy));
        if (list) for (const item of list) out.push(item);
      }
    }
    return out;
  }
}
