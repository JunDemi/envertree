/**
 * localStorage 래퍼. iframe 설정이나 사생활 보호 모드에서는 localStorage 접근이 막혀
 * 예외가 날 수 있으므로 항상 try/catch로 감싸고, 실패하면 기본값을 쓴다.
 */
const PREFIX = "monster-wave:";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // 저장 실패는 무시 (기록이 남지 않을 뿐 게임은 계속)
  }
}

export const storage = {
  getBestScore(): number {
    const n = Number(read("best-score"));
    return Number.isFinite(n) && n > 0 ? n : 0;
  },
  /** 최고 점수 갱신. 새 기록이면 true */
  submitScore(score: number): boolean {
    if (score <= this.getBestScore()) return false;
    write("best-score", String(Math.floor(score)));
    return true;
  },
  getMuted(): boolean {
    return read("muted") === "1";
  },
  setMuted(muted: boolean) {
    write("muted", muted ? "1" : "0");
  },
};
