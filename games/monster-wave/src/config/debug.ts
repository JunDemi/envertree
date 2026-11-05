/**
 * 디버그 모드. URL에 ?debug 를 붙이면 켜진다 (예: /play/monster-wave/index.html?debug).
 * 게임 중 controls.toggleDebug 키로도 켜고 끌 수 있다 (Phase 6).
 */
export const debugState = {
  enabled: new URLSearchParams(window.location.search).has("debug"),
};
