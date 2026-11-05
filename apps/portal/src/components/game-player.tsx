"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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
 * 게임 → 포털 메시지는 Phase 4에서 origin과 source를 검증한다.
 */
export function GamePlayer({ title, src, width, height }: GamePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canFullscreen = useSyncExternalStore(
    noopSubscribe,
    () => document.fullscreenEnabled,
    () => false,
  );

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
            onLoad={(e) => e.currentTarget.focus()}
            className={`block h-full w-full border-0 ${isFullscreen ? "" : "rounded-xl"}`}
          />
        </div>
      </div>
      {canFullscreen && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ⛶ 전체화면
          </button>
        </div>
      )}
    </div>
  );
}

function noopSubscribe() {
  return () => {};
}
