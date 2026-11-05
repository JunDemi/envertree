"use client";

import Link from "next/link";
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
  const [rotateDismissed, setRotateDismissed] = useState(false);
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
  // 가로형 게임만 "터치 기기 가로 화면 = 화면 꽉 채우기"와 "세로로 들면 돌려달라는 안내"를 적용한다
  const landscape = width >= height;

  // 크기 규칙 (CSS 변수 --ratio = 가로/세로 비율)
  // - 기본: 헤더와 버튼 줄을 뺀 화면 높이 안에 들어가게
  // - 전체화면(data-fullscreen) / 터치 기기 가로 화면(immersive): 화면 전체 안에 들어가게
  const containerClass = landscape
    ? "group relative flex items-center justify-center rounded-xl bg-black data-[fullscreen=true]:h-dvh data-[fullscreen=true]:w-dvw data-[fullscreen=true]:rounded-none immersive:fixed immersive:inset-0 immersive:z-50 immersive:rounded-none immersive:pr-[env(safe-area-inset-right)] immersive:pl-[env(safe-area-inset-left)]"
    : "group relative flex items-center justify-center rounded-xl bg-black data-[fullscreen=true]:h-dvh data-[fullscreen=true]:w-dvw data-[fullscreen=true]:rounded-none";
  const frameClass = landscape
    ? "w-[min(100%,calc((100dvh_-_9rem)*var(--ratio)))] group-data-[fullscreen=true]:w-[min(100vw,calc(100dvh*var(--ratio)))] immersive:w-[min(100%,calc(100dvh*var(--ratio)))]"
    : "w-[min(100%,calc((100dvh_-_9rem)*var(--ratio)))] group-data-[fullscreen=true]:w-[min(100vw,calc(100dvh*var(--ratio)))]";

  return (
    <div data-game-player={landscape ? "landscape" : "portrait"} className="flex flex-col gap-2">
      <div
        ref={containerRef}
        data-fullscreen={isFullscreen}
        className={containerClass}
        style={{ "--ratio": ratio } as React.CSSProperties}
      >
        <div className={frameClass} style={{ aspectRatio: `${width} / ${height}` }}>
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
            className="block h-full w-full rounded-xl border-0 group-data-[fullscreen=true]:rounded-none immersive:rounded-none"
          />
        </div>

        {landscape && (
          <>
            {/* 터치 기기 가로 화면: 헤더가 가려지므로 나가기 버튼만 남긴다 */}
            <Link
              href="/"
              aria-label="게임 목록으로"
              className="absolute top-2 left-[max(0.5rem,env(safe-area-inset-left))] hidden size-9 items-center justify-center rounded-full bg-black/45 text-lg text-white/90 backdrop-blur-sm immersive:flex"
            >
              ←
            </Link>

            {/* 터치 기기 세로 화면: 가로로 돌려달라는 안내 (닫고 그냥 할 수도 있음) */}
            {!rotateDismissed && (
              <div className="absolute inset-0 z-10 hidden flex-col items-center justify-center gap-3 rounded-xl bg-black/85 p-6 text-center text-white touch-portrait:flex">
                <span aria-hidden className="text-4xl motion-safe:animate-[rotate-hint_1.6s_ease-in-out_infinite]">
                  📱
                </span>
                <p className="text-base font-semibold">화면을 가로로 돌려주세요</p>
                <p className="text-sm text-zinc-300">가로로 돌리면 게임이 화면 전체에 크게 보여요</p>
                <button
                  type="button"
                  onClick={() => setRotateDismissed(true)}
                  className="mt-1 rounded-full border border-white/30 px-4 py-1.5 text-sm text-zinc-200"
                >
                  세로로 그냥 할게요
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3 immersive:hidden">
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
