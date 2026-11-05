/**
 * 게임(iframe) → 포털 메시지 규약.
 *
 * 모든 메시지는 아래 형태의 객체이며 window.parent.postMessage로 보낸다.
 *   { source: "game-portal", version: 1, type: "...", payload?: {...} }
 *
 * 규약을 바꿀 때:
 * - 필드를 "추가"하는 것은 그대로 version 1에서 해도 된다 (받는 쪽은 모르는 필드를 무시).
 * - 기존 필드의 의미나 타입을 바꾸면 PROTOCOL_VERSION을 올리고 포털에서 두 버전을 모두 처리한다.
 */

/** 다른 출처의 postMessage(브라우저 확장 등)와 구분하기 위한 식별자 */
export const MESSAGE_SOURCE = "game-portal";
export const PROTOCOL_VERSION = 1;

interface MessageBase<T extends string> {
  source: typeof MESSAGE_SOURCE;
  version: typeof PROTOCOL_VERSION;
  type: T;
}

/** 게임 로딩이 끝나 플레이할 수 있는 상태 */
export type ReadyMessage = MessageBase<"ready">;

/** 한 판이 시작됨 */
export type GameStartMessage = MessageBase<"gameStart">;

/**
 * 한 판이 끝남.
 * - score: 0 이상의 유한한 숫자 (필수)
 * - wave: 도달한 웨이브/스테이지 (선택, 1 이상의 정수). 웨이브 개념이 없는 게임은 생략
 */
export interface GameOverMessage extends MessageBase<"gameOver"> {
  payload: { score: number; wave?: number };
}

export type GameMessage = ReadyMessage | GameStartMessage | GameOverMessage;
export type GameMessageType = GameMessage["type"];

/**
 * 받은 데이터가 올바른 게임 메시지인지 검사한다. 아니면 null.
 * (포털이 사용. origin과 보낸 창(source)은 받는 쪽에서 따로 확인해야 한다)
 */
export function parseGameMessage(data: unknown): GameMessage | null {
  if (!isObject(data)) return null;
  if (data.source !== MESSAGE_SOURCE || data.version !== PROTOCOL_VERSION) return null;

  switch (data.type) {
    case "ready":
    case "gameStart":
      return { source: MESSAGE_SOURCE, version: PROTOCOL_VERSION, type: data.type };
    case "gameOver": {
      const payload = data.payload;
      if (!isObject(payload)) return null;
      const score = payload.score;
      if (typeof score !== "number" || !Number.isFinite(score) || score < 0) return null;
      const wave = payload.wave;
      if (wave !== undefined && (typeof wave !== "number" || !Number.isInteger(wave) || wave < 1)) return null;
      return {
        source: MESSAGE_SOURCE,
        version: PROTOCOL_VERSION,
        type: "gameOver",
        payload: wave === undefined ? { score } : { score, wave },
      };
    }
    default:
      return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
