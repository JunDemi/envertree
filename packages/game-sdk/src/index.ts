/**
 * 게임에서 포털로 이벤트를 보내는 헬퍼.
 *
 *   import { ready, gameStart, gameOver } from "@envertree/game-sdk";
 *   ready();                    // 로딩 끝
 *   gameStart();                // 한 판 시작
 *   gameOver({ score: 120 });   // 한 판 끝 (웨이브가 있는 게임은 { score, wave })
 *
 * 포털 밖에서 단독 실행(pnpm dev)하면 부모 창이 없으므로 콘솔에만 기록한다.
 */
import {
  MESSAGE_SOURCE,
  PROTOCOL_VERSION,
  type GameMessage,
  type GameOverMessage,
} from "./protocol";

export * from "./protocol";

/** 로딩이 끝나 플레이할 수 있을 때 한 번 호출 */
export function ready(): void {
  send({ source: MESSAGE_SOURCE, version: PROTOCOL_VERSION, type: "ready" });
}

/** 한 판을 시작할 때 호출 */
export function gameStart(): void {
  send({ source: MESSAGE_SOURCE, version: PROTOCOL_VERSION, type: "gameStart" });
}

/** 한 판이 끝났을 때 최종 점수(와 선택적으로 도달 웨이브)와 함께 호출 */
export function gameOver(result: GameOverMessage["payload"]): void {
  const score = Math.max(0, Math.floor(result.score));
  const payload: GameOverMessage["payload"] = { score };
  if (result.wave !== undefined) payload.wave = Math.max(1, Math.floor(result.wave));
  send({ source: MESSAGE_SOURCE, version: PROTOCOL_VERSION, type: "gameOver", payload });
}

/** 포털 안(iframe)에서 실행 중인지 */
export function isEmbedded(): boolean {
  return typeof window !== "undefined" && window.parent !== window;
}

function send(message: GameMessage): void {
  if (!isEmbedded()) {
    console.info("[game-sdk] 포털 밖에서 실행 중 — 전송 생략:", message);
    return;
  }
  // 게임은 포털과 같은 출처에서 서비스된다. targetOrigin을 자기 출처로 지정해서
  // 다른 사이트가 이 게임을 iframe으로 넣어도 메시지를 받지 못하게 한다.
  window.parent.postMessage(message, window.location.origin);
}
