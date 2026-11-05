import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GameCard } from "@/components/game-card";
import { GamePlayer } from "@/components/game-player";
import { GAME_TAGS, games, getGameBySlug, getPlayUrl, getRelatedGames } from "@/lib/games";
import { siteConfig } from "@/lib/site";

/**
 * 게임 페이지만: 화면을 노치/홈 표시줄 영역까지 쓰게 한다 (가로 화면에서 게임을 최대한 크게).
 * 노치에 가려지면 안 되는 버튼은 env(safe-area-inset-*)로 피한다.
 */
export const viewport: Viewport = { viewportFit: "cover" };

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: PageProps<"/games/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) return {};
  // openGraph는 부모 값과 합쳐지지 않고 통째로 바뀌므로 공통 값도 다시 적는다.
  // 이미지는 같은 폴더의 opengraph-image.tsx가 자동으로 붙인다.
  return {
    title: game.title,
    description: game.description,
    openGraph: {
      title: game.title,
      description: game.description,
      siteName: siteConfig.name,
      locale: "ko_KR",
      type: "website",
    },
  };
}

/** 빌드된 게임 파일이 있는지 확인 (아직 빌드 전이면 안내 화면을 보여준다) */
function hasPlayFiles(slug: string): boolean {
  return existsSync(join(process.cwd(), "public", "play", slug, "index.html"));
}

/**
 * 페이지 본체는 params를 기다리지 않고, 게임 내용만 Suspense 안에서 그린다.
 * 카드를 눌러 이동할 때 Next.js는 모든 /games/* 가 공유하는 뼈대(App Shell)를 먼저 보여주는데,
 * params(어떤 게임인지)는 그 뼈대에 들어갈 수 없으므로 여기서 기다리면 이동이 즉시 일어나지 않는다.
 * (알려진 slug는 generateStaticParams로 미리 만들어지므로 직접 접속 시에는 바로 완성된 화면이 나온다)
 */
export default function GamePage({ params }: PageProps<"/games/[slug]">) {
  return (
    <Suspense fallback={<GamePageSkeleton />}>
      <GameContent params={params} />
    </Suspense>
  );
}

/** 게임 정보를 읽는 동안 보여줄 자리 (실제 화면과 비슷한 배치) */
function GamePageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6" aria-busy="true">
      <div className="aspect-video w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col gap-3">
        <div className="h-7 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

async function GameContent({ params }: { params: PageProps<"/games/[slug]">["params"] }) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();

  const related = getRelatedGames(slug);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6">
      {hasPlayFiles(slug) ? (
        <GamePlayer
          title={game.title}
          src={getPlayUrl(slug)}
          width={game.size.width}
          height={game.size.height}
        />
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl bg-zinc-900 text-center text-zinc-300">
          <p className="text-lg font-semibold">게임 준비 중입니다</p>
          <p className="text-sm text-zinc-500">빌드된 파일이 없습니다: public{getPlayUrl(slug)}</p>
        </div>
      )}

      <section className="grid gap-8 md:grid-cols-[1fr_16rem]">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold">{game.title}</h1>
          <ul className="flex flex-wrap gap-1.5">
            {game.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/?tag=${tag}`}
                  className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  {GAME_TAGS[tag]}
                </Link>
              </li>
            ))}
          </ul>
          <p className="leading-7 text-zinc-700 dark:text-zinc-300">{game.description}</p>
        </div>

        <div>
          <h2 className="mb-3 font-semibold">조작법</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {game.controls.map((control) => (
              <div key={control.input} className="contents">
                <dt>
                  <kbd className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900">
                    {control.input}
                  </kbd>
                </dt>
                <dd className="text-zinc-600 dark:text-zinc-400">{control.action}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">다른 게임</h2>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((g) => (
              <li key={g.slug} className="flex">
                <GameCard game={g} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
