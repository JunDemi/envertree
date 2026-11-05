"use client";

import { parseGameMessage, type GameMessage } from "@envertree/game-sdk/protocol";
import { useEffect, useEffectEvent, type RefObject } from "react";

/**
 * iframe 안의 게임이 보낸 메시지를 받는다.
 *
 * 세 가지를 모두 확인한 메시지만 onMessage로 넘긴다.
 *  1. origin: 게임은 포털과 같은 출처(/play/...)에서 서비스되므로 같은 출처만 허용
 *  2. source: 이 페이지의 게임 iframe이 보낸 것인지 (다른 창/확장 프로그램 차단)
 *  3. 형식: game-sdk의 규약(source, version, type, payload)에 맞는지
 *
 * 나중에 점수 저장을 붙일 때는 onMessage에서 gameOver를 받아 서버 액션을 호출하면 된다.
 */
export function useGameMessages(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  onMessage: (message: GameMessage) => void,
) {
  const handle = useEffectEvent(onMessage);

  useEffect(() => {
    function onWindowMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

      const message = parseGameMessage(event.data);
      if (!message) {
        console.warn("[game] 형식이 맞지 않는 메시지를 무시했습니다:", event.data);
        return;
      }
      console.info("[game]", message.type, "payload" in message ? message.payload : "");
      handle(message);
    }

    window.addEventListener("message", onWindowMessage);
    return () => window.removeEventListener("message", onWindowMessage);
  }, [iframeRef]);
}
