import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          🎮 {siteConfig.name}
        </Link>
        {/* 로그인 버튼 자리: Phase 3에서 Supabase Auth와 연결 */}
        <button
          type="button"
          disabled
          title="곧 지원 예정"
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-500 dark:border-zinc-700"
        >
          로그인
        </button>
      </div>
    </header>
  );
}
