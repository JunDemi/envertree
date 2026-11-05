/**
 * 포털 연동을 한곳에 모은 래퍼. 게임 코드는 game-sdk를 직접 부르지 않고 이 함수들을 쓴다.
 * (포털 밖 단독 실행 시에는 SDK가 콘솔에만 기록한다)
 */
import { gameOver, gameStart, ready } from "@envertree/game-sdk";

let readySent = false;

/** 로딩이 끝났을 때. 타이틀로 여러 번 돌아와도 한 번만 보낸다 */
export function notifyReady() {
  if (readySent) return;
  readySent = true;
  ready();
}

export function notifyGameStart() {
  gameStart();
}

/**
 * 한 판 종료. wave는 Phase 5에서 SDK 메시지 규약에 추가할 예정이라
 * 지금은 받기만 하고 score만 보낸다.
 */
export function notifyGameOver(result: { score: number; wave: number }) {
  gameOver({ score: result.score });
}
