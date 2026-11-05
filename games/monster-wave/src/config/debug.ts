/**
 * 디버그 모드. 켜는 방법:
 * - URL에 ?debug (예: /play/monster-wave/index.html?debug)
 * - 게임 중 F2 (controls.toggleDebug) — 포털 iframe 안에서도 사용 가능
 *
 * ?debug&wave=8 처럼 시작 웨이브를 지정할 수 있다.
 * 디버그를 한 번이라도 켠 판은 최고 점수를 저장하지 않는다 (usedThisRun).
 */
const params = new URLSearchParams(window.location.search);
const startWave = Number(params.get("wave"));

export const debugState = {
  enabled: params.has("debug"),
  /** 무적 (I) */
  invincible: false,
  /** 플로우 필드 화살표 표시 (F) */
  showFlow: false,
  /** 충돌 박스 표시 (C) */
  showBoxes: params.has("debug"),
  /** 이번 판에 디버그를 켠 적이 있는지 (최고 점수 저장 제외용) */
  usedThisRun: false,
  /** ?wave=N: 디버그 모드일 때 이 웨이브부터 시작 */
  startWave: Number.isInteger(startWave) && startWave > 1 ? startWave : 1,
};
