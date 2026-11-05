import Link from "next/link";
import { Suspense } from "react";
import { siteConfig } from "@/lib/site";
import { UserMenu, UserMenuSkeleton } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          🎮 {siteConfig.name}
        </Link>
        {/* 로그인 정보는 쿠키를 읽어야 하므로 요청 시점에 따로 그린다.
            Suspense로 감싸서 나머지 페이지는 정적으로 유지된다. */}
        <Suspense fallback={<UserMenuSkeleton />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}
