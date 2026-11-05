"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useGameMessages } from "@/lib/use-game-messages";

interface GamePlayerProps {
  title: string;
  src: string;
  width: number;
  height: number;
}

/**
 * 게임 iframe. 게임의 원래 비율(width:height)을 유지하면서
 * 화면 너비와 높이 중 먼저 닿는 쪽에 맞춰 크기를 정한다.
 *
 * 참고: 게임은 같은 출처의 정적 파일이라 sandbox를 걸지 않는다.
 * (sandbox에 allow-scripts + allow-same-origin을 같이 주면 보안 효과가 없고,
 * allow-same-origin을 빼면 게임에서 localStorage를 쓸 수 없다.)
 * 게임 → 포털 메시지는 useGameMessages에서 origin, source, 형식을 검증한다.
 */

type GameStatus = "loading" | "ready" | "playing" | "over";

const STATUS_LABEL: Record<GameStatus, string> = {
  loading: "불러오는 중…",
  ready: "준비 완료",
  playing: "플레이 중",
  over: "게임 오버",
};

const STATUS_DOT: Record<GameStatus, string> = {
  loading: "bg-zinc-400",
  ready: "bg-blue-500",
  playing: "bg-green-500",
  over: "bg-red-500",
};
export function GamePlayer({ title, src, width, height }: GamePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState<GameStatus>("loading");
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [lastWave, setLastWave] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);

  useGameMessages(iframeRef, (message) => {
    switch (message.type) {
      case "ready":
        setStatus("ready");
        break;
      case "gameStart":
        setStatus("playing");
        break;
      case "gameOver": {
        const { score, wave } = message.payload;
        setStatus("over");
        setLastScore(score);
        setLastWave(wave ?? null);
        setBestScore((best) => (best === null ? score : Math.max(best, score)));
        break;
      }
    }
  });
  const canFullscreen = useSyncExternalStore(
    noopSubscribe,
    () => document.fullscreenEnabled,
    () => false,
  );

  // 포털 화면이 준비(hydration)되기 전에 iframe 로드가 먼저 끝나면
  // onLoad 이벤트와 게임의 ready 메시지를 둘 다 놓친다. 준비된 시점에 이미 로드돼 있으면 준비 완료로 본다.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const doc = iframeRef.current?.contentDocument;
      const loaded = doc?.readyState === "complete" && doc.URL === new URL(src, window.location.href).href;
      if (loaded) setStatus((s) => (s === "loading" ? "ready" : s));
    });
    return () => cancelAnimationFrame(frame);
  }, [src]);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
      // 전체화면 전환 후에도 키보드 입력이 게임으로 가도록
      iframeRef.current?.focus();
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
  }

  const ratio = width / height;
  // 일반 모드: 헤더와 버튼 줄을 뺀 화면 높이 안에 들어가게
  // 전체화면: 화면 전체 안에 들어가게
  const frameWidth = isFullscreen
    ? `min(100vw, calc(100dvh * ${ratio}))`
    : `min(100%, calc((100dvh - 9rem) * ${ratio}))`;

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className={`flex items-center justify-center bg-black ${
          isFullscreen ? "h-dvh w-dvw" : "rounded-xl"
        }`}
      >
        <div style={{ width: frameWidth, aspectRatio: `${width} / ${height}` }}>
          <iframe
            ref={iframeRef}
            src={src}
            title={title}
            allow="fullscreen; autoplay; gamepad"
            onLoad={(e) => {
              e.currentTarget.focus();
              // SDK의 ready()를 보내지 않는 게임도 로드가 끝나면 준비 완료로 표시
              setStatus((s) => (s === "loading" ? "ready" : s));
            }}
            className={`block h-full w-full border-0 ${isFullscreen ? "" : "rounded-xl"}`}
          />
        </div>
      </div>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-sm" aria-live="polite">
          <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className={`size-2 rounded-full ${STATUS_DOT[status]}`} />
            {STATUS_LABEL[status]}
          </span>
          {lastScore !== null && (
            <span>
              점수 <strong className="font-semibold tabular-nums">{lastScore.toLocaleString()}</strong>
            </span>
          )}
          {lastWave !== null && (
            <span className="text-zinc-600 dark:text-zinc-400">
              웨이브 <strong className="font-semibold tabular-nums">{lastWave}</strong>
            </span>
          )}
          {bestScore !== null && (
            <span className="text-zinc-600 dark:text-zinc-400">
              최고 <strong className="font-semibold tabular-nums">{bestScore.toLocaleString()}</strong>
            </span>
          )}
        </div>
        {canFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ⛶ 전체화면
          </button>
        )}
      </div>
    </div>
  );
}

function noopSubscribe() {
  return () => {};
}
