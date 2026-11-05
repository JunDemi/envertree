"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { GAME_TAGS, isGameTag, type Game, type GameTag } from "@/lib/games";
import { GameCard } from "./game-card";

interface BrowserProps {
  games: Game[];
  tags: GameTag[];
}

/**
 * 검색어와 태그 필터. 상태는 URL(?q=...&tag=...)에도 반영해서
 * 새로고침하거나 링크를 공유해도 같은 결과가 보이게 한다.
 */
export function GameBrowser({ games, tags }: BrowserProps) {
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [tag, setTag] = useState<GameTag | null>(
    initialTag && isGameTag(initialTag) ? initialTag : null,
  );

  function syncUrl(nextQuery: string, nextTag: GameTag | null) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextTag) params.set("tag", nextTag);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }

  return (
    <BrowserView
      games={games}
      tags={tags}
      query={query}
      tag={tag}
      onQueryChange={(value) => {
        setQuery(value);
        syncUrl(value, tag);
      }}
      onTagChange={(value) => {
        setTag(value);
        syncUrl(query, value);
      }}
    />
  );
}

/** URL을 읽기 전(정적 HTML)에 보여줄 화면: 필터 없이 전체 목록 */
export function GameBrowserFallback({ games, tags }: BrowserProps) {
  return <BrowserView games={games} tags={tags} query="" tag={null} disabled />;
}

interface ViewProps extends BrowserProps {
  query: string;
  tag: GameTag | null;
  disabled?: boolean;
  onQueryChange?: (value: string) => void;
  onTagChange?: (value: GameTag | null) => void;
}

function BrowserView({ games, tags, query, tag, disabled, onQueryChange, onTagChange }: ViewProps) {
  const normalized = query.trim().toLowerCase();
  const filtered = games.filter(
    (game) =>
      (!tag || game.tags.includes(tag)) &&
      (!normalized || game.title.toLowerCase().includes(normalized)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          disabled={disabled}
          onChange={(e) => onQueryChange?.(e.target.value)}
          placeholder="게임 제목 검색"
          aria-label="게임 제목 검색"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:max-w-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div role="group" aria-label="태그 필터" className="flex flex-wrap gap-2">
          <TagButton active={tag === null} disabled={disabled} onClick={() => onTagChange?.(null)}>
            전체
          </TagButton>
          {tags.map((t) => (
            <TagButton
              key={t}
              active={tag === t}
              disabled={disabled}
              onClick={() => onTagChange?.(tag === t ? null : t)}
            >
              {GAME_TAGS[t]}
            </TagButton>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((game) => (
            <li key={game.slug} className="flex">
              <GameCard game={game} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-16 text-center text-zinc-500">조건에 맞는 게임이 없습니다.</p>
      )}
    </div>
  );
}

function TagButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm transition ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}
