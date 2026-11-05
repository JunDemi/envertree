import Image from "next/image";
import Link from "next/link";
import { GAME_TAGS, type Game } from "@/lib/games";

export function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/games/${game.slug}`}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="relative aspect-video overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <Image
          src={game.thumbnail}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="font-semibold">{game.title}</h2>
        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {game.description}
        </p>
        <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
          {game.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {GAME_TAGS[tag]}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
