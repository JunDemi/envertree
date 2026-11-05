import { Suspense } from "react";
import { GameBrowser, GameBrowserFallback } from "@/components/game-browser";
import { getAllGames, getUsedTags } from "@/lib/games";
import { siteConfig } from "@/lib/site";

export default function Home() {
  const games = getAllGames();
  const tags = getUsedTags();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <section className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{siteConfig.name}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{siteConfig.description}</p>
      </section>
      {/* useSearchParams는 Suspense 안에 있어야 정적 빌드가 된다 */}
      <Suspense fallback={<GameBrowserFallback games={games} tags={tags} />}>
        <GameBrowser games={games} tags={tags} />
      </Suspense>
    </div>
  );
}
