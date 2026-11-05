/**
 * 게임 화면의 기본 해상도.
 * 포털 레지스트리(apps/portal/src/lib/games.ts)의 size와 같은 값으로 맞춘다.
 * 실제 화면에서는 이 비율을 유지한 채 iframe 크기에 맞춰 늘어나거나 줄어든다.
 */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

/** 공통 글꼴 (한글은 시스템 폰트 사용) */
export const FONT_FAMILY = 'system-ui, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
